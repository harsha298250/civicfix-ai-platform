package com.civicfix.notification;

import com.civicfix.complaint.Complaint;
import com.civicfix.complaint.ComplaintPriority;
import com.civicfix.complaint.ComplaintRepository;
import com.civicfix.complaint.ComplaintService;
import com.civicfix.complaint.ComplaintStatus;
import com.civicfix.complaint.dto.AssignComplaintRequest;
import com.civicfix.complaint.dto.ConfirmResolutionRequest;
import com.civicfix.complaint.dto.CreateComplaintRequest;
import com.civicfix.complaint.dto.LinkDuplicateRequest;
import com.civicfix.complaint.dto.UpdateStatusRequest;
import com.civicfix.security.UserPrincipal;
import com.civicfix.user.Role;
import com.civicfix.user.RoleName;
import com.civicfix.user.User;
import com.civicfix.user.UserRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.transaction.PlatformTransactionManager;
import org.springframework.transaction.TransactionStatus;
import org.springframework.transaction.support.DefaultTransactionDefinition;

import java.math.BigDecimal;
import java.util.Collections;
import java.util.List;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.*;

@SpringBootTest
public class NotificationEventIntegrationTest {

    @Autowired
    private ComplaintService complaintService;

    @Autowired
    private ComplaintRepository complaintRepository;

    @Autowired
    private NotificationRepository notificationRepository;

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private PlatformTransactionManager transactionManager;

    private User citizen;
    private User officer;
    private User worker;

    private UserPrincipal citizenPrincipal;
    private UserPrincipal officerPrincipal;
    private UserPrincipal workerPrincipal;

    @BeforeEach
    public void setUp() {
        citizen = userRepository.findByEmailIgnoreCase("alex.m@citizen.org")
                .orElseThrow(() -> new IllegalStateException("Seed citizen not found"));
        officer = userRepository.findByEmailIgnoreCase("elena.vance@metro.gov")
                .orElseThrow(() -> new IllegalStateException("Seed officer not found"));
        worker = userRepository.findByEmailIgnoreCase("marcus.chen@fieldops.gov")
                .orElseThrow(() -> new IllegalStateException("Seed worker not found"));

        citizenPrincipal = new UserPrincipal(citizen);
        officerPrincipal = new UserPrincipal(officer);
        workerPrincipal = new UserPrincipal(worker);
    }

    @Test
    @DisplayName("COMPLAINT_CREATED: Author citizen and municipal officers receive persistent notifications")
    public void testComplaintCreatedEvent() {
        long citizenInitialCount = notificationRepository.countByRecipientIdAndIsReadFalse(citizen.getId());
        long officerInitialCount = notificationRepository.countByRecipientIdAndIsReadFalse(officer.getId());

        CreateComplaintRequest req = new CreateComplaintRequest();
        req.setTitle("Pothole on 10th Cross Stage 3 Audit");
        req.setDescription("Deep pothole damaging vehicles on 10th Cross Street");
        req.setCategory("ROADS");
        req.setPriority(ComplaintPriority.HIGH);
        req.setAddress("10th Cross, Ward 04");
        req.setWard("Ward 04");
        req.setLatitude(new BigDecimal("13.0827000"));
        req.setLongitude(new BigDecimal("80.2707000"));

        var response = complaintService.createComplaint(req, null, citizenPrincipal, "127.0.0.1");
        assertNotNull(response);

        // Verify Author Citizen received notification
        long citizenNewCount = notificationRepository.countByRecipientIdAndIsReadFalse(citizen.getId());
        assertEquals(citizenInitialCount + 1, citizenNewCount, "Citizen must receive exactly 1 intake notification");

        List<Notification> citizenNotifs = notificationRepository.findByRecipientIdOrderByCreatedAtDesc(
                citizen.getId(), org.springframework.data.domain.PageRequest.of(0, 5)).getContent();
        Notification latestCitizenNotif = citizenNotifs.get(0);
        assertEquals(NotificationType.COMPLAINT_CREATED, latestCitizenNotif.getNotificationType());
        assertEquals(response.getReferenceId(), latestCitizenNotif.getReferenceId());
        assertTrue(latestCitizenNotif.getTitle().contains(response.getReferenceId()));

        // Verify Officer received notification
        long officerNewCount = notificationRepository.countByRecipientIdAndIsReadFalse(officer.getId());
        assertTrue(officerNewCount > officerInitialCount, "Officers must receive intake notification");

        List<Notification> officerNotifs = notificationRepository.findByRecipientIdOrderByCreatedAtDesc(
                officer.getId(), org.springframework.data.domain.PageRequest.of(0, 5)).getContent();
        Notification latestOfficerNotif = officerNotifs.get(0);
        assertEquals(NotificationType.COMPLAINT_CREATED, latestOfficerNotif.getNotificationType());
        assertEquals(NotificationSeverity.ACTION_REQUIRED, latestOfficerNotif.getSeverity()); // HIGH priority -> ACTION_REQUIRED
    }

    @Test
    @DisplayName("WORKER_ASSIGNED: Assigned worker and author citizen receive dispatch notifications")
    public void testWorkerAssignedEvent() {
        Complaint complaint = createTestComplaint();

        long workerInitial = notificationRepository.countByRecipientIdAndIsReadFalse(worker.getId());
        long citizenInitial = notificationRepository.countByRecipientIdAndIsReadFalse(citizen.getId());

        AssignComplaintRequest assignReq = new AssignComplaintRequest();
        assignReq.setWorkerId(worker.getId());
        assignReq.setNotes("Assigned for rapid asphalt compaction");

        complaintService.assignWorker(complaint.getId().toString(), assignReq, officerPrincipal, "127.0.0.1");

        // Worker received notification
        long workerNew = notificationRepository.countByRecipientIdAndIsReadFalse(worker.getId());
        assertEquals(workerInitial + 1, workerNew, "Assigned worker must receive 1 task dispatch notification");

        Notification workerNotif = notificationRepository.findByRecipientIdOrderByCreatedAtDesc(
                worker.getId(), org.springframework.data.domain.PageRequest.of(0, 1)).getContent().get(0);
        assertEquals(NotificationType.WORKER_ASSIGNED, workerNotif.getNotificationType());
        assertEquals(complaint.getReferenceId(), workerNotif.getReferenceId());

        // Citizen received notification
        long citizenNew = notificationRepository.countByRecipientIdAndIsReadFalse(citizen.getId());
        assertEquals(citizenInitial + 1, citizenNew, "Citizen must receive technician dispatched notification");
    }

    @Test
    @DisplayName("WORK_STARTED: Author citizen receives notification when worker starts on scene")
    public void testWorkStartedEvent() {
        Complaint complaint = createTestComplaint();
        assignWorkerToComplaint(complaint);

        long citizenInitial = notificationRepository.countByRecipientIdAndIsReadFalse(citizen.getId());

        UpdateStatusRequest statusReq = new UpdateStatusRequest();
        statusReq.setStatus(ComplaintStatus.IN_PROGRESS);
        statusReq.setNotes("Arrived with compaction rig T-12");

        complaintService.transitionStatus(complaint.getId().toString(), statusReq, workerPrincipal, "127.0.0.1");

        long citizenNew = notificationRepository.countByRecipientIdAndIsReadFalse(citizen.getId());
        assertEquals(citizenInitial + 1, citizenNew, "Citizen must receive status in-progress notification");

        Notification notif = notificationRepository.findByRecipientIdOrderByCreatedAtDesc(
                citizen.getId(), org.springframework.data.domain.PageRequest.of(0, 1)).getContent().get(0);
        assertEquals(NotificationType.STATUS_CHANGED, notif.getNotificationType());
        assertTrue(notif.getTitle().contains("Work Order In Progress"));
    }

    @Test
    @DisplayName("RESOLUTION_SUBMITTED: Officer receives verification request and citizen receives update")
    public void testResolutionSubmittedEvent() {
        Complaint complaint = createTestComplaint();
        complaint = assignWorkerToComplaint(complaint);
        complaint = startWorkOnComplaint(complaint);

        long officerInitial = notificationRepository.countByRecipientIdAndIsReadFalse(officer.getId());
        long citizenInitial = notificationRepository.countByRecipientIdAndIsReadFalse(citizen.getId());

        UpdateStatusRequest statusReq = new UpdateStatusRequest();
        statusReq.setStatus(ComplaintStatus.RESOLUTION_SUBMITTED);
        statusReq.setNotes("Repair complete; compaction depth verified");

        complaintService.transitionStatus(complaint.getId().toString(), statusReq, workerPrincipal, "127.0.0.1");

        long officerNew = notificationRepository.countByRecipientIdAndIsReadFalse(officer.getId());
        assertTrue(officerNew > officerInitial, "Officer must receive resolution verification notice");

        long citizenNew = notificationRepository.countByRecipientIdAndIsReadFalse(citizen.getId());
        assertEquals(citizenInitial + 1, citizenNew, "Citizen must receive repair completed notice");
    }

    @Test
    @DisplayName("COMPLAINT_RESOLVED: Officer approval requests citizen confirmation, and citizen confirmation resolves complaint and notifies worker/officer")
    public void testComplaintResolvedEvent() {
        Complaint complaint = createTestComplaint();
        complaint = assignWorkerToComplaint(complaint);
        complaint = startWorkOnComplaint(complaint);
        complaint = submitResolutionOnComplaint(complaint);

        long citizenInitial = notificationRepository.countByRecipientIdAndIsReadFalse(citizen.getId());
        long workerInitial = notificationRepository.countByRecipientIdAndIsReadFalse(worker.getId());
        long officerInitial = notificationRepository.countByRecipientIdAndIsReadFalse(officer.getId());

        // 1. Officer verifies repair evidence -> transitions to PENDING_CITIZEN_CONFIRMATION
        UpdateStatusRequest statusReq = new UpdateStatusRequest();
        statusReq.setStatus(ComplaintStatus.PENDING_CITIZEN_CONFIRMATION);
        statusReq.setNotes("Verified site; asphalt compaction level confirmed");

        complaintService.transitionStatus(complaint.getId().toString(), statusReq, officerPrincipal, "127.0.0.1");

        // Citizen receives FIX_PENDING_CONFIRMATION notice with ACTION_REQUIRED
        long citizenPendingCount = notificationRepository.countByRecipientIdAndIsReadFalse(citizen.getId());
        assertEquals(citizenInitial + 1, citizenPendingCount, "Citizen must receive fix pending confirmation notice");

        Notification pendingNotif = notificationRepository.findByRecipientIdOrderByCreatedAtDesc(
                citizen.getId(), org.springframework.data.domain.PageRequest.of(0, 1)).getContent().get(0);
        assertEquals(NotificationType.FIX_PENDING_CONFIRMATION, pendingNotif.getNotificationType());
        assertEquals(NotificationSeverity.ACTION_REQUIRED, pendingNotif.getSeverity());

        // 2. Owning citizen confirms resolution -> transitions complaint to RESOLVED
        ConfirmResolutionRequest confirmReq = new ConfirmResolutionRequest();
        confirmReq.setNotes("Inspected site; pothole fully sealed and road is level.");

        complaintService.confirmResolution(complaint.getId().toString(), confirmReq, citizenPrincipal, "127.0.0.1");

        // Assigned worker receives RESOLUTION_CONFIRMED notice with SUCCESS
        long workerNew = notificationRepository.countByRecipientIdAndIsReadFalse(worker.getId());
        assertEquals(workerInitial + 1, workerNew, "Worker must receive resolution confirmed notice");

        Notification workerNotif = notificationRepository.findByRecipientIdOrderByCreatedAtDesc(
                worker.getId(), org.springframework.data.domain.PageRequest.of(0, 1)).getContent().get(0);
        assertEquals(NotificationType.RESOLUTION_CONFIRMED, workerNotif.getNotificationType());
        assertEquals(NotificationSeverity.SUCCESS, workerNotif.getSeverity());

        // Assigned officer receives RESOLUTION_CONFIRMED notice with SUCCESS
        long officerNew = notificationRepository.countByRecipientIdAndIsReadFalse(officer.getId());
        assertEquals(officerInitial + 1, officerNew, "Officer must receive resolution confirmed notice");

        Notification officerNotif = notificationRepository.findByRecipientIdOrderByCreatedAtDesc(
                officer.getId(), org.springframework.data.domain.PageRequest.of(0, 1)).getContent().get(0);
        assertEquals(NotificationType.RESOLUTION_CONFIRMED, officerNotif.getNotificationType());
        assertEquals(NotificationSeverity.SUCCESS, officerNotif.getSeverity());
    }

    @Test
    @DisplayName("REWORK_REQUESTED: Assigned worker receives rework warning with officer reason")
    public void testReworkRequestedEvent() {
        Complaint complaint = createTestComplaint();
        complaint = assignWorkerToComplaint(complaint);
        complaint = startWorkOnComplaint(complaint);
        complaint = submitResolutionOnComplaint(complaint);

        long workerInitial = notificationRepository.countByRecipientIdAndIsReadFalse(worker.getId());

        UpdateStatusRequest statusReq = new UpdateStatusRequest();
        statusReq.setStatus(ComplaintStatus.REWORK_REQUESTED);
        statusReq.setNotes("Surface compaction is uneven; apply additional binder coat");

        complaintService.transitionStatus(complaint.getId().toString(), statusReq, officerPrincipal, "127.0.0.1");

        long workerNew = notificationRepository.countByRecipientIdAndIsReadFalse(worker.getId());
        assertEquals(workerInitial + 1, workerNew, "Worker must receive rework notice");

        Notification wNotif = notificationRepository.findByRecipientIdOrderByCreatedAtDesc(
                worker.getId(), org.springframework.data.domain.PageRequest.of(0, 1)).getContent().get(0);
        assertEquals(NotificationType.REWORK_REQUESTED, wNotif.getNotificationType());
        assertEquals(NotificationSeverity.WARNING, wNotif.getSeverity());
        assertTrue(wNotif.getMessage().contains("apply additional binder coat"));
    }

    @Test
    @DisplayName("COMPLAINT_REJECTED: Citizen receives rejection notification with officer reason")
    public void testComplaintRejectedEvent() {
        Complaint complaint = createTestComplaint();

        long citizenInitial = notificationRepository.countByRecipientIdAndIsReadFalse(citizen.getId());

        UpdateStatusRequest statusReq = new UpdateStatusRequest();
        statusReq.setStatus(ComplaintStatus.REJECTED);
        statusReq.setNotes("Location is private property outside municipal jurisdiction");

        complaintService.transitionStatus(complaint.getId().toString(), statusReq, officerPrincipal, "127.0.0.1");

        long citizenNew = notificationRepository.countByRecipientIdAndIsReadFalse(citizen.getId());
        assertEquals(citizenInitial + 1, citizenNew, "Citizen must receive rejection notice");

        Notification cNotif = notificationRepository.findByRecipientIdOrderByCreatedAtDesc(
                citizen.getId(), org.springframework.data.domain.PageRequest.of(0, 1)).getContent().get(0);
        assertEquals(NotificationType.COMPLAINT_REJECTED, cNotif.getNotificationType());
        assertEquals(NotificationSeverity.WARNING, cNotif.getSeverity());
        assertTrue(cNotif.getMessage().contains("outside municipal jurisdiction"));
    }

    @Test
    @DisplayName("DUPLICATE_LINKED: Citizen receives notification with master ticket reference")
    public void testDuplicateLinkedEvent() {
        Complaint master = createTestComplaint();
        Complaint child = createTestComplaint();

        long citizenInitial = notificationRepository.countByRecipientIdAndIsReadFalse(citizen.getId());

        LinkDuplicateRequest linkReq = new LinkDuplicateRequest();
        linkReq.setParentComplaintId(master.getId().toString());
        linkReq.setReason("Confirmed same defect reported earlier");

        complaintService.linkDuplicate(child.getId().toString(), linkReq, officerPrincipal, "127.0.0.1");

        long citizenNew = notificationRepository.countByRecipientIdAndIsReadFalse(citizen.getId());
        assertEquals(citizenInitial + 1, citizenNew, "Citizen must receive duplicate linked notice");

        Notification cNotif = notificationRepository.findByRecipientIdOrderByCreatedAtDesc(
                citizen.getId(), org.springframework.data.domain.PageRequest.of(0, 1)).getContent().get(0);
        assertEquals(NotificationType.DUPLICATE_LINKED, cNotif.getNotificationType());
        assertTrue(cNotif.getMessage().contains(master.getReferenceId()));
    }

    @Test
    @DisplayName("TRANSACTION ROLLBACK SAFETY: No notification is persisted when originating transaction rolls back")
    public void testRollbackSafety() {
        long citizenInitialCount = notificationRepository.countByRecipientIdAndIsReadFalse(citizen.getId());

        DefaultTransactionDefinition def = new DefaultTransactionDefinition();
        TransactionStatus status = transactionManager.getTransaction(def);

        try {
            CreateComplaintRequest req = new CreateComplaintRequest();
            req.setTitle("Rollback Test Defect");
            req.setDescription("This transaction will be aborted deliberately");
            req.setCategory("ROADS");
            req.setPriority(ComplaintPriority.MEDIUM);
            req.setAddress("123 Test Lane");
            req.setWard("Ward 04");

            complaintService.createComplaint(req, null, citizenPrincipal, "127.0.0.1");

            // Deliberately roll back transaction
            transactionManager.rollback(status);
        } catch (Exception e) {
            if (!status.isCompleted()) {
                transactionManager.rollback(status);
            }
        }

        // Verify that AFTER_COMMIT listener was NOT executed, zero notifications created
        long citizenAfterRollback = notificationRepository.countByRecipientIdAndIsReadFalse(citizen.getId());
        assertEquals(citizenInitialCount, citizenAfterRollback,
                "No notification must be persisted when originating complaint transaction rolls back");
    }

    @Test
    @DisplayName("DEDUPLICATION: Identical rapid notifications are suppressed to prevent spam")
    public void testDeduplication() {
        Complaint complaint = createTestComplaint();

        long initialCount = notificationRepository.countByRecipientIdAndIsReadFalse(citizen.getId());

        // Publish two identical notifications in rapid succession directly via notification service
        NotificationService service = new NotificationService(notificationRepository, userRepository);
        boolean first = service.sendNotification(citizen, officer, complaint, complaint.getReferenceId(),
                "Duplicate Test", "Message", NotificationType.STATUS_CHANGED, NotificationSeverity.INFO, "/citizen");
        boolean second = service.sendNotification(citizen, officer, complaint, complaint.getReferenceId(),
                "Duplicate Test", "Message", NotificationType.STATUS_CHANGED, NotificationSeverity.INFO, "/citizen");

        assertTrue(first, "First notification must be persisted");
        assertFalse(second, "Second identical notification within deduplication window must be suppressed");
        assertEquals(initialCount + 1, notificationRepository.countByRecipientIdAndIsReadFalse(citizen.getId()));
    }

    private Complaint createTestComplaint() {
        Complaint c = new Complaint();
        c.setReferenceId("CF-2026-" + UUID.randomUUID().toString().substring(0, 6).toUpperCase());
        c.setCitizen(citizen);
        c.setTitle("Notification Integration Complaint " + c.getReferenceId());
        c.setDescription("Testing notification lifecycle event triggers");
        c.setCategory("ROADS");
        c.setPriority(ComplaintPriority.MEDIUM);
        c.setStatus(ComplaintStatus.SUBMITTED);
        c.setAddress("789 Civic Center, Ward 04");
        c.setLatitude(new BigDecimal("13.0827000"));
        c.setLongitude(new BigDecimal("80.2707000"));
        c.setWard("Ward 04");
        return complaintRepository.save(c);
    }

    private Complaint assignWorkerToComplaint(Complaint c) {
        Complaint refreshed = complaintRepository.findById(c.getId()).orElseThrow();
        refreshed.setAssignedOfficer(officer);
        refreshed.setAssignedWorker(worker);
        refreshed.setStatus(ComplaintStatus.ASSIGNED);
        return complaintRepository.save(refreshed);
    }

    private Complaint startWorkOnComplaint(Complaint c) {
        Complaint refreshed = complaintRepository.findById(c.getId()).orElseThrow();
        refreshed.setStatus(ComplaintStatus.IN_PROGRESS);
        return complaintRepository.save(refreshed);
    }

    private Complaint submitResolutionOnComplaint(Complaint c) {
        Complaint refreshed = complaintRepository.findById(c.getId()).orElseThrow();
        refreshed.setStatus(ComplaintStatus.RESOLUTION_SUBMITTED);
        return complaintRepository.save(refreshed);
    }
}
