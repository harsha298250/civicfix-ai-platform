package com.civicfix.notification;

import com.civicfix.complaint.Complaint;
import com.civicfix.complaint.ComplaintPriority;
import com.civicfix.complaint.ComplaintRepository;
import com.civicfix.complaint.ComplaintStatus;
import com.civicfix.user.User;
import com.civicfix.user.UserRepository;
import org.flywaydb.core.Flyway;
import org.flywaydb.core.api.MigrationInfo;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.OffsetDateTime;
import java.util.Arrays;
import java.util.Optional;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.*;

@SpringBootTest
public class NotificationPersistenceTest {

    @Autowired
    private Flyway flyway;

    @Autowired
    private JdbcTemplate jdbcTemplate;

    @Autowired
    private NotificationRepository notificationRepository;

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private ComplaintRepository complaintRepository;

    @Test
    @DisplayName("Verify Flyway V7 migration applies cleanly and table schema exists")
    public void testFlywayV7MigrationAndSchemaIntegrity() {
        MigrationInfo[] migrations = flyway.info().all();
        Optional<MigrationInfo> v7 = Arrays.stream(migrations)
                .filter(m -> "7".equals(m.getVersion().getVersion()))
                .findFirst();

        assertTrue(v7.isPresent(), "Flyway migration V7 must be present in migration history");
        assertTrue(v7.get().getState().isApplied(), "Migration V7 must be in applied state");
        assertEquals("create notifications table", v7.get().getDescription());

        // Verify PostgreSQL table and column metadata
        Integer columnCount = jdbcTemplate.queryForObject(
                "SELECT COUNT(*) FROM information_schema.columns WHERE table_name = 'notifications'",
                Integer.class
        );
        assertNotNull(columnCount);
        assertTrue(columnCount >= 13, "Notifications table must have at least 13 columns, found " + columnCount);

        // Verify specific required columns
        for (String col : Arrays.asList("id", "recipient_id", "actor_id", "complaint_id", "reference_id",
                "title", "message", "notification_type", "severity", "target_url", "is_read", "read_at", "created_at")) {
            Integer exists = jdbcTemplate.queryForObject(
                    "SELECT COUNT(*) FROM information_schema.columns WHERE table_name = 'notifications' AND column_name = ?",
                    Integer.class,
                    col
            );
            assertEquals(1, exists, "Column '" + col + "' must exist in notifications table");
        }
    }

    @Test
    @Transactional
    @DisplayName("Verify notification entity persistence, defaults, and retrieval")
    public void testNotificationEntityPersistenceAndRetrieval() {
        User citizen = userRepository.findByEmailIgnoreCase("alex.m@citizen.org")
                .orElseThrow(() -> new IllegalStateException("Seed citizen not found"));
        User officer = userRepository.findByEmailIgnoreCase("elena.vance@metro.gov")
                .orElseThrow(() -> new IllegalStateException("Seed officer not found"));

        Complaint complaint = createTestComplaint(citizen);

        Notification notif = new Notification(
                citizen,
                officer,
                complaint,
                complaint.getReferenceId(),
                "Work Order Dispatched",
                "Field team assigned to your defect report #" + complaint.getReferenceId(),
                NotificationType.WORKER_ASSIGNED,
                NotificationSeverity.INFO,
                "/citizen/complaints/" + complaint.getReferenceId()
        );

        Notification saved = notificationRepository.save(notif);
        assertNotNull(saved.getId(), "Persisted notification must have generated UUID");
        assertFalse(saved.isRead(), "Default is_read must be false");
        assertNull(saved.getReadAt(), "Default read_at must be null");
        assertNotNull(saved.getCreatedAt(), "created_at must be populated");
        assertEquals(NotificationSeverity.INFO, saved.getSeverity());
        assertEquals(NotificationType.WORKER_ASSIGNED, saved.getNotificationType());

        // Retrieve by ID
        Optional<Notification> fetched = notificationRepository.findById(saved.getId());
        assertTrue(fetched.isPresent());
        assertEquals(citizen.getId(), fetched.get().getRecipient().getId());
        assertEquals(officer.getId(), fetched.get().getActor().getId());
        assertEquals(complaint.getId(), fetched.get().getComplaint().getId());
    }

    @Test
    @Transactional
    @DisplayName("Verify unread count and pagination per recipient")
    public void testUnreadCountAndPagination() {
        User citizen = userRepository.findByEmailIgnoreCase("alex.m@citizen.org")
                .orElseThrow(() -> new IllegalStateException("Seed citizen not found"));

        long initialUnread = notificationRepository.countByRecipientIdAndIsReadFalse(citizen.getId());

        Notification n1 = new Notification(citizen, null, null, "CF-2026-TEST1",
                "Alert 1", "Message 1", NotificationType.STATUS_CHANGED, NotificationSeverity.INFO, "/citizen");
        Notification n2 = new Notification(citizen, null, null, "CF-2026-TEST2",
                "Alert 2", "Message 2", NotificationType.STATUS_CHANGED, NotificationSeverity.WARNING, "/citizen");

        notificationRepository.save(n1);
        notificationRepository.save(n2);

        assertEquals(initialUnread + 2, notificationRepository.countByRecipientIdAndIsReadFalse(citizen.getId()));

        Page<Notification> page = notificationRepository.findByRecipientIdOrderByCreatedAtDesc(
                citizen.getId(), PageRequest.of(0, 10));
        assertNotNull(page);
        assertTrue(page.getTotalElements() >= 2);
    }

    @Test
    @Transactional
    @DisplayName("Verify mark individual notification as read and mark all as read")
    public void testMarkAsReadAndMarkAllAsRead() {
        User citizen = userRepository.findByEmailIgnoreCase("alex.m@citizen.org")
                .orElseThrow(() -> new IllegalStateException("Seed citizen not found"));

        Notification n1 = new Notification(citizen, null, null, "CF-2026-READ1",
                "Read Test 1", "Body", NotificationType.NOTE_ADDED, NotificationSeverity.INFO, null);
        Notification n2 = new Notification(citizen, null, null, "CF-2026-READ2",
                "Read Test 2", "Body", NotificationType.NOTE_ADDED, NotificationSeverity.INFO, null);

        Notification s1 = notificationRepository.save(n1);
        Notification s2 = notificationRepository.save(n2);

        // Mark individual notification read
        s1.markAsRead();
        notificationRepository.save(s1);

        Notification reloaded1 = notificationRepository.findById(s1.getId()).orElseThrow();
        assertTrue(reloaded1.isRead());
        assertNotNull(reloaded1.getReadAt());

        // Mark all as read
        int updated = notificationRepository.markAllAsReadByRecipientId(citizen.getId(), OffsetDateTime.now());
        assertTrue(updated >= 1, "Should have marked at least 1 notification read");
        assertEquals(0, notificationRepository.countByRecipientIdAndIsReadFalse(citizen.getId()));
    }

    @Test
    @Transactional
    @DisplayName("Verify tenant isolation: User cannot access other user's notification")
    public void testTenantIsolation() {
        User citizen = userRepository.findByEmailIgnoreCase("alex.m@citizen.org").orElseThrow();
        User officer = userRepository.findByEmailIgnoreCase("elena.vance@metro.gov").orElseThrow();

        Notification officerNotif = new Notification(officer, null, null, "CF-2026-SEC",
                "Officer Notice", "Restricted content", NotificationType.TRIAGE_ADJUDICATED, NotificationSeverity.CRITICAL, null);
        Notification saved = notificationRepository.save(officerNotif);

        // Citizen attempts to access officer's notification via recipient-scoped query
        Optional<Notification> unauthorizedAccess = notificationRepository.findByIdAndRecipientId(saved.getId(), citizen.getId());
        assertFalse(unauthorizedAccess.isPresent(), "Citizen must not be able to retrieve officer's notification");

        // Officer accesses own notification
        Optional<Notification> authorizedAccess = notificationRepository.findByIdAndRecipientId(saved.getId(), officer.getId());
        assertTrue(authorizedAccess.isPresent(), "Officer must access own notification");
    }

    @Test
    @Transactional
    @DisplayName("Verify deduplication query detects recent identical notifications")
    public void testDeduplicationQuery() {
        User citizen = userRepository.findByEmailIgnoreCase("alex.m@citizen.org").orElseThrow();
        Complaint complaint = createTestComplaint(citizen);

        Notification n = new Notification(citizen, null, complaint, complaint.getReferenceId(),
                "Intake Notification", "Body", NotificationType.COMPLAINT_CREATED, NotificationSeverity.INFO, null);
        notificationRepository.save(n);

        OffsetDateTime sixtySecondsAgo = OffsetDateTime.now().minusSeconds(60);
        boolean duplicateExists = notificationRepository.existsByRecipientIdAndComplaintIdAndNotificationTypeAndCreatedAtAfter(
                citizen.getId(), complaint.getId(), NotificationType.COMPLAINT_CREATED, sixtySecondsAgo);

        assertTrue(duplicateExists, "Deduplication query should detect recent duplicate notification");

        boolean differentTypeExists = notificationRepository.existsByRecipientIdAndComplaintIdAndNotificationTypeAndCreatedAtAfter(
                citizen.getId(), complaint.getId(), NotificationType.COMPLAINT_RESOLVED, sixtySecondsAgo);

        assertFalse(differentTypeExists, "Different notification type should not be flagged as duplicate");
    }

    private Complaint createTestComplaint(User citizen) {
        Complaint c = new Complaint();
        c.setReferenceId("CF-2026-" + UUID.randomUUID().toString().substring(0, 6).toUpperCase());
        c.setCitizen(citizen);
        c.setTitle("Notification Persistence Test Complaint");
        c.setDescription("Testing notification database entity and repository bindings");
        c.setCategory("ROADS");
        c.setPriority(ComplaintPriority.MEDIUM);
        c.setStatus(ComplaintStatus.SUBMITTED);
        c.setAddress("456 Municipal Blvd, Ward 04");
        c.setLatitude(new BigDecimal("13.0827000"));
        c.setLongitude(new BigDecimal("80.2707000"));
        c.setWard("Ward 04");
        return complaintRepository.save(c);
    }
}
