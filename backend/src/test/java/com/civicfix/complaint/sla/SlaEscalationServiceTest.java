package com.civicfix.complaint.sla;

import com.civicfix.audit.AuditService;
import com.civicfix.complaint.Complaint;
import com.civicfix.complaint.ComplaintPriority;
import com.civicfix.complaint.ComplaintRepository;
import com.civicfix.complaint.ComplaintStatus;
import com.civicfix.notification.NotificationService;
import com.civicfix.user.Role;
import com.civicfix.user.RoleName;
import com.civicfix.user.User;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import java.lang.reflect.Proxy;
import java.time.OffsetDateTime;
import java.util.*;
import java.util.concurrent.atomic.AtomicBoolean;
import java.util.concurrent.atomic.AtomicInteger;

import static org.junit.jupiter.api.Assertions.*;

class SlaEscalationServiceTest {

    private ComplaintRepository complaintRepository;
    private AuditService auditService;
    private NotificationService notificationService;
    private SlaEscalationService escalationService;

    private Complaint testComplaint;
    private User supervisorUser;
    private final AtomicInteger markEscalatedReturn = new AtomicInteger(1);
    private final AtomicBoolean auditLogged = new AtomicBoolean(false);
    private final AtomicBoolean notificationSent = new AtomicBoolean(false);

    @BeforeEach
    void setUp() {
        auditLogged.set(false);
        notificationSent.set(false);
        markEscalatedReturn.set(1);

        supervisorUser = new User();
        supervisorUser.setId(UUID.randomUUID());
        supervisorUser.setFullName("Sarah Jenkins");
        supervisorUser.setRoles(Set.of(new Role(RoleName.SUPERVISOR)));

        testComplaint = new Complaint();
        testComplaint.setId(UUID.randomUUID());
        testComplaint.setReferenceId("CF-2026-00124");
        testComplaint.setTitle("Broken pipeline");
        testComplaint.setCategory("Water Supply & Leakage");
        testComplaint.setPriority(ComplaintPriority.CRITICAL);
        testComplaint.setStatus(ComplaintStatus.IN_PROGRESS);

        complaintRepository = (ComplaintRepository) Proxy.newProxyInstance(
                ComplaintRepository.class.getClassLoader(),
                new Class<?>[]{ComplaintRepository.class},
                (proxy, method, args) -> {
                    if ("markEscalated".equals(method.getName())) {
                        return markEscalatedReturn.get();
                    }
                    if ("findById".equals(method.getName())) {
                        return Optional.of(testComplaint);
                    }
                    return null;
                }
        );

        auditService = new AuditService(null) {
            @Override
            public void logAction(UUID userId, String userName, String userRole, String action, String resourceType, String resourceId, String details, String ipAddress, String status) {
                auditLogged.set(true);
            }
        };

        notificationService = new NotificationService(null, null) {
            @Override
            public void notifyEscalation(Complaint c, String reason, User actor) {
                notificationSent.set(true);
            }
        };

        escalationService = new SlaEscalationService(complaintRepository, auditService, notificationService);
    }

    @Test
    @DisplayName("First escalation updates record, logs audit event, and sends notifications")
    void testFirstEscalation_Succeeds() {
        boolean result = escalationService.escalateComplaint(testComplaint.getId(), "Overdue SLA", supervisorUser, "127.0.0.1");

        assertTrue(result);
        assertTrue(auditLogged.get(), "Audit event must be recorded on first escalation");
        assertTrue(notificationSent.get(), "Notifications must be dispatched to supervisors");
    }

    @Test
    @DisplayName("Subsequent escalation is idempotent (returns false, skips audit & notifications)")
    void testSecondEscalation_Idempotent() {
        markEscalatedReturn.set(0); // Atomic DB update returned 0 rows

        boolean result = escalationService.escalateComplaint(testComplaint.getId(), "Overdue SLA", supervisorUser, "127.0.0.1");

        assertFalse(result, "Already escalated complaint must return false");
        assertFalse(auditLogged.get(), "No duplicate audit log must be written");
        assertFalse(notificationSent.get(), "No duplicate notifications must be sent");
    }
}
