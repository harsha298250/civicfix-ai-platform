package com.civicfix.supervisor;

import com.civicfix.audit.AuditService;
import com.civicfix.common.exception.BadRequestException;
import com.civicfix.common.exception.ConflictException;
import com.civicfix.common.exception.ForbiddenException;
import com.civicfix.complaint.Complaint;
import com.civicfix.complaint.ComplaintPriority;
import com.civicfix.complaint.ComplaintRepository;
import com.civicfix.complaint.ComplaintStatus;
import com.civicfix.complaint.dto.ComplaintResponse;
import com.civicfix.notification.NotificationService;
import com.civicfix.security.UserPrincipal;
import com.civicfix.supervisor.dto.ReassignWorkerRequest;
import com.civicfix.user.Role;
import com.civicfix.user.RoleName;
import com.civicfix.user.User;
import com.civicfix.user.UserRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import java.lang.reflect.Proxy;
import java.util.*;
import java.util.concurrent.atomic.AtomicBoolean;

import static org.junit.jupiter.api.Assertions.*;

class SupervisorServiceTest {

    private ComplaintRepository complaintRepository;
    private UserRepository userRepository;
    private AuditService auditService;
    private NotificationService notificationService;
    private SupervisorService supervisorService;

    private User supervisorUser;
    private User citizenUser;
    private UserPrincipal supervisorPrincipal;
    private UserPrincipal citizenPrincipal;
    private User oldWorker;
    private User newWorker;
    private Complaint testComplaint;

    private final AtomicBoolean auditLogged = new AtomicBoolean(false);
    private final AtomicBoolean notificationSent = new AtomicBoolean(false);

    @BeforeEach
    void setUp() {
        auditLogged.set(false);
        notificationSent.set(false);

        UUID supervisorId = UUID.randomUUID();
        supervisorUser = new User();
        supervisorUser.setId(supervisorId);
        supervisorUser.setFullName("Sarah Jenkins");
        supervisorUser.setEmail("sarah.jenkins@metro.gov");
        supervisorUser.setRoles(Set.of(new Role(RoleName.SUPERVISOR)));
        supervisorPrincipal = new UserPrincipal(supervisorUser);

        UUID citizenId = UUID.randomUUID();
        citizenUser = new User();
        citizenUser.setId(citizenId);
        citizenUser.setFullName("Alex Morgan");
        citizenUser.setEmail("alex.m@citizen.org");
        citizenUser.setRoles(Set.of(new Role(RoleName.CITIZEN)));
        citizenPrincipal = new UserPrincipal(citizenUser);

        oldWorker = new User();
        oldWorker.setId(UUID.randomUUID());
        oldWorker.setFullName("Marcus Chen");
        oldWorker.setAccountStatus("ACTIVE");
        oldWorker.setRoles(Set.of(new Role(RoleName.WORKER)));

        newWorker = new User();
        newWorker.setId(UUID.randomUUID());
        newWorker.setFullName("David Kalu");
        newWorker.setAccountStatus("ACTIVE");
        newWorker.setRoles(Set.of(new Role(RoleName.WORKER)));

        testComplaint = new Complaint();
        testComplaint.setId(UUID.randomUUID());
        testComplaint.setReferenceId("CF-2026-00124");
        testComplaint.setTitle("Pothole on 2nd Avenue");
        testComplaint.setCategory("Pothole & Road Hazard");
        testComplaint.setPriority(ComplaintPriority.HIGH);
        testComplaint.setStatus(ComplaintStatus.IN_PROGRESS);
        testComplaint.setAssignedWorker(oldWorker);
        testComplaint.setVersion(1L);

        // Dynamic Proxy for UserRepository
        userRepository = (UserRepository) Proxy.newProxyInstance(
                UserRepository.class.getClassLoader(),
                new Class<?>[]{UserRepository.class},
                (proxy, method, args) -> {
                    if ("findById".equals(method.getName())) {
                        UUID target = (UUID) args[0];
                        if (target.equals(supervisorId)) return Optional.of(supervisorUser);
                        if (target.equals(citizenId)) return Optional.of(citizenUser);
                        if (target.equals(newWorker.getId())) return Optional.of(newWorker);
                        if (target.equals(oldWorker.getId())) return Optional.of(oldWorker);
                        return Optional.empty();
                    }
                    if ("findActiveUsersByRoleName".equals(method.getName())) {
                        return List.of(oldWorker, newWorker);
                    }
                    return null;
                }
        );

        // Dynamic Proxy for ComplaintRepository
        complaintRepository = (ComplaintRepository) Proxy.newProxyInstance(
                ComplaintRepository.class.getClassLoader(),
                new Class<?>[]{ComplaintRepository.class},
                (proxy, method, args) -> {
                    if ("findById".equals(method.getName())) {
                        UUID target = (UUID) args[0];
                        if (target.equals(testComplaint.getId())) return Optional.of(testComplaint);
                        return Optional.empty();
                    }
                    if ("save".equals(method.getName())) {
                        return args[0];
                    }
                    return null;
                }
        );

        // AuditService stub
        auditService = new AuditService(null) {
            @Override
            public void logAction(UUID userId, String userName, String userRole, String action, String resourceType, String resourceId, String details, String ipAddress, String status) {
                auditLogged.set(true);
            }
        };

        // NotificationService stub
        notificationService = new NotificationService(null, null) {
            @Override
            public void notifyWorkerReassigned(Complaint complaint, User oldW, User newW, User supervisor, String reason) {
                notificationSent.set(true);
            }
        };

        supervisorService = new SupervisorService(complaintRepository, userRepository, auditService, notificationService);
    }

    @Test
    @DisplayName("Non-supervisor citizen receives 403 Forbidden")
    void testReassignWorker_CitizenForbidden() {
        ReassignWorkerRequest req = new ReassignWorkerRequest(newWorker.getId(), "Operational rebalancing", 1L);

        assertThrows(ForbiddenException.class, () ->
                supervisorService.reassignWorker(testComplaint.getId().toString(), req, citizenPrincipal, "127.0.0.1"));
    }

    @Test
    @DisplayName("Reassignment fails on terminal status complaint")
    void testReassignWorker_TerminalStatusFails() {
        testComplaint.setStatus(ComplaintStatus.RESOLVED);
        ReassignWorkerRequest req = new ReassignWorkerRequest(newWorker.getId(), "Too late", 1L);

        assertThrows(BadRequestException.class, () ->
                supervisorService.reassignWorker(testComplaint.getId().toString(), req, supervisorPrincipal, "127.0.0.1"));
    }

    @Test
    @DisplayName("Reassignment fails when complaint was never assigned to a worker")
    void testReassignWorker_UnassignedFails() {
        testComplaint.setAssignedWorker(null);
        ReassignWorkerRequest req = new ReassignWorkerRequest(newWorker.getId(), "No initial worker", 1L);

        assertThrows(BadRequestException.class, () ->
                supervisorService.reassignWorker(testComplaint.getId().toString(), req, supervisorPrincipal, "127.0.0.1"));
    }

    @Test
    @DisplayName("Reassignment fails when target worker account is inactive or not a worker")
    void testReassignWorker_InvalidTargetWorker() {
        newWorker.setAccountStatus("SUSPENDED");
        ReassignWorkerRequest req = new ReassignWorkerRequest(newWorker.getId(), "Reassign to suspended", 1L);

        assertThrows(BadRequestException.class, () ->
                supervisorService.reassignWorker(testComplaint.getId().toString(), req, supervisorPrincipal, "127.0.0.1"));

        newWorker.setAccountStatus("ACTIVE");
        newWorker.setRoles(Set.of(new Role(RoleName.CITIZEN))); // Not a worker!
        assertThrows(BadRequestException.class, () ->
                supervisorService.reassignWorker(testComplaint.getId().toString(), req, supervisorPrincipal, "127.0.0.1"));
    }

    @Test
    @DisplayName("Reassignment fails on version conflict (HTTP 409)")
    void testReassignWorker_VersionConflict() {
        ReassignWorkerRequest req = new ReassignWorkerRequest(newWorker.getId(), "Stale update", 999L);

        assertThrows(ConflictException.class, () ->
                supervisorService.reassignWorker(testComplaint.getId().toString(), req, supervisorPrincipal, "127.0.0.1"));
    }

    @Test
    @DisplayName("Successful worker reassignment updates assigned worker and dispatches notifications")
    void testReassignWorker_Success() {
        ReassignWorkerRequest req = new ReassignWorkerRequest(newWorker.getId(), "Priority rebalance across crews", 1L);

        ComplaintResponse response = supervisorService.reassignWorker(testComplaint.getId().toString(), req, supervisorPrincipal, "127.0.0.1");

        assertNotNull(response);
        assertEquals(newWorker.getId().toString(), response.getAssignedWorker().get("id"));
        assertTrue(auditLogged.get(), "Audit log must be written for reassignment");
        assertTrue(notificationSent.get(), "Notifications must be dispatched for worker reassignment");
    }
}
