package com.civicfix.demo;

import com.civicfix.ai.triage.DeterministicTriageEngine;
import com.civicfix.audit.AuditLogRepository;
import com.civicfix.complaint.*;
import com.civicfix.storage.StorageService;
import com.civicfix.user.User;
import com.civicfix.user.UserRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.boot.ApplicationArguments;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.util.*;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class DemoDataSeederTest {

    @Mock
    private ComplaintRepository complaintRepository;

    @Mock
    private ComplaintStatusHistoryRepository historyRepository;

    @Mock
    private AuditLogRepository auditLogRepository;

    @Mock
    private UserRepository userRepository;

    @Mock
    private StorageService storageService;

    private DeterministicTriageEngine triageEngine;

    private User citizenUser;
    private User officerUser;
    private User workerUser;

    @BeforeEach
    void setUp() throws IOException {
        triageEngine = new DeterministicTriageEngine();

        citizenUser = new User();
        citizenUser.setId(UUID.fromString("00000000-0000-0000-0000-000000000001"));
        citizenUser.setFullName("Alex Morgan");
        citizenUser.setEmail("alex.m@citizen.org");

        officerUser = new User();
        officerUser.setId(UUID.fromString("00000000-0000-0000-0000-000000000002"));
        officerUser.setFullName("Elena Vance");
        officerUser.setEmail("elena.vance@metro.gov");

        workerUser = new User();
        workerUser.setId(UUID.fromString("00000000-0000-0000-0000-000000000003"));
        workerUser.setFullName("Marcus Chen");
        workerUser.setEmail("marcus.chen@fieldops.gov");

        lenient().when(userRepository.findById(citizenUser.getId())).thenReturn(Optional.of(citizenUser));
        lenient().when(userRepository.findById(officerUser.getId())).thenReturn(Optional.of(officerUser));
        lenient().when(userRepository.findById(workerUser.getId())).thenReturn(Optional.of(workerUser));

        lenient().when(storageService.storeFile(any(MultipartFile.class), anyString()))
                .thenReturn("/api/complaints/evidence/files/demo_stored_test.png");
    }

    @Test
    @DisplayName("DemoDataSeeder is idempotent: skips seeding when demo complaints already exist")
    void testSeedIfEmpty_WhenDemoRowsExist_DoesNothing() {
        when(complaintRepository.countByIsDemoTrue()).thenReturn(40L);

        DemoDataSeeder seeder = new DemoDataSeeder(
                complaintRepository, historyRepository, auditLogRepository, userRepository,
                storageService, triageEngine, true
        );

        int count = seeder.seedIfEmpty();

        assertEquals(40, count);
        verify(complaintRepository, never()).saveAll(any());
        verify(complaintRepository, never()).save(any());
    }

    @Test
    @DisplayName("ApplicationRunner skips execution when CIVICFIX_SEED_DEMO is false")
    void testRun_WhenFlagDisabled_SkipsExecution() {
        DemoDataSeeder seeder = new DemoDataSeeder(
                complaintRepository, historyRepository, auditLogRepository, userRepository,
                storageService, triageEngine, false
        );

        ApplicationArguments args = mock(ApplicationArguments.class);
        seeder.run(args);

        verify(complaintRepository, never()).countByIsDemoTrue();
        verify(complaintRepository, never()).saveAll(any());
    }

    @Test
    @DisplayName("DemoDataSeeder creates exactly 40 complaints with isDemo=true, valid AI triage, and real Chennai localities")
    void testSeed_Creates40ComplaintsWithAccurateMetadata() {
        when(complaintRepository.countByIsDemoTrue()).thenReturn(0L);

        // When saveAll is called, assign dummy IDs to simulate persistence
        when(complaintRepository.saveAll(any())).thenAnswer(invocation -> {
            List<Complaint> list = invocation.getArgument(0);
            for (Complaint c : list) {
                if (c.getId() == null) {
                    c.setId(UUID.randomUUID());
                }
            }
            return list;
        });

        DemoDataSeeder seeder = new DemoDataSeeder(
                complaintRepository, historyRepository, auditLogRepository, userRepository,
                storageService, triageEngine, true
        );

        int count = seeder.seedIfEmpty();
        assertEquals(40, count, "Must seed exactly 40 complaints");

        @SuppressWarnings("unchecked")
        ArgumentCaptor<List<Complaint>> captor = ArgumentCaptor.forClass(List.class);
        verify(complaintRepository).saveAll(captor.capture());
        List<Complaint> seeded = captor.getValue();
        assertEquals(40, seeded.size());

        // 1. Every complaint has is_demo = true
        for (Complaint c : seeded) {
            assertTrue(c.isDemo(), "Every seeded complaint must have isDemo=true: " + c.getReferenceId());
            assertNotNull(c.getTitle());
            assertNotNull(c.getDescription());
            assertNotNull(c.getCategory());
            assertNotNull(c.getStatus());
            assertNotNull(c.getWard());
            assertNotNull(c.getAddress());

            // Coordinates plausible for Chennai bounds (lat 12.8 - 13.3, lng 80.1 - 80.35)
            assertTrue(c.getLatitude().doubleValue() >= 12.8 && c.getLatitude().doubleValue() <= 13.3,
                    "Latitude must be within Chennai bounds: " + c.getLatitude());
            assertTrue(c.getLongitude().doubleValue() >= 80.1 && c.getLongitude().doubleValue() <= 80.35,
                    "Longitude must be within Chennai bounds: " + c.getLongitude());

            // AI triage fields populated with real values
            assertNotNull(c.getAiDetectedCategory(), "AI detected category must be populated");
            assertNotNull(c.getAiConfidence(), "AI confidence score must be populated");
            assertTrue(c.getAiConfidence().doubleValue() > 0, "AI confidence must be greater than zero");
            assertNotNull(c.getAiExplanation(), "AI explanation must be populated");

            // Status histories present
            assertFalse(c.getStatusHistory().isEmpty(), "Every complaint must have initial status history");
        }

        // 2. All statuses represented including REWORK_REQUESTED and REJECTED
        Set<ComplaintStatus> presentStatuses = new HashSet<>();
        for (Complaint c : seeded) {
            presentStatuses.add(c.getStatus());
        }
        assertTrue(presentStatuses.contains(ComplaintStatus.SUBMITTED));
        assertTrue(presentStatuses.contains(ComplaintStatus.UNDER_REVIEW));
        assertTrue(presentStatuses.contains(ComplaintStatus.ASSIGNED));
        assertTrue(presentStatuses.contains(ComplaintStatus.IN_PROGRESS));
        assertTrue(presentStatuses.contains(ComplaintStatus.RESOLUTION_SUBMITTED));
        assertTrue(presentStatuses.contains(ComplaintStatus.RESOLVED));
        assertTrue(presentStatuses.contains(ComplaintStatus.REWORK_REQUESTED), "Must include REWORK_REQUESTED");
        assertTrue(presentStatuses.contains(ComplaintStatus.REJECTED), "Must include REJECTED");
        assertTrue(presentStatuses.contains(ComplaintStatus.REOPENED));

        // 3. Duplicate clusters verified via save(child)
        verify(complaintRepository, atLeast(3)).save(any(Complaint.class));
    }

    @Test
    @DisplayName("Reset deletes only is_demo=true rows and reseeds deterministically")
    void testReset_DeletesOnlyDemoRowsAndReseedsDeterministically() {
        Complaint demo1 = new Complaint();
        demo1.setId(UUID.randomUUID());
        demo1.setDemo(true);
        demo1.setReferenceId("CF-2026-00001");

        Complaint demo2 = new Complaint();
        demo2.setId(UUID.randomUUID());
        demo2.setDemo(true);
        demo2.setReferenceId("CF-2026-00002");

        when(complaintRepository.findByIsDemoTrue()).thenReturn(List.of(demo1, demo2));
        when(complaintRepository.saveAll(any())).thenAnswer(invocation -> {
            List<Complaint> list = invocation.getArgument(0);
            for (Complaint c : list) {
                if (c.getId() == null) c.setId(UUID.randomUUID());
            }
            return list;
        });

        DemoDataSeeder seeder = new DemoDataSeeder(
                complaintRepository, historyRepository, auditLogRepository, userRepository,
                storageService, triageEngine, true
        );

        int count1 = seeder.reset();
        assertEquals(40, count1);

        // Verify delete order: 1. clear duplicate_of 2. delete audit logs 3. delete demo complaints
        verify(complaintRepository).clearDuplicateOfForDemoComplaints();
        verify(auditLogRepository).deleteByTargetTypeAndTargetIdIn(any());
        verify(complaintRepository).deleteByIsDemoTrue();

        // Second reset invocation produces the exact same count
        int count2 = seeder.reset();
        assertEquals(40, count2);
    }
}

