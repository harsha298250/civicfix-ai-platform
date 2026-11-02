package com.civicfix.ai.vision;

import com.civicfix.complaint.Complaint;
import com.civicfix.complaint.ComplaintPriority;
import com.civicfix.complaint.ComplaintRepository;
import com.civicfix.complaint.ComplaintStatus;
import com.civicfix.user.User;
import com.civicfix.user.UserRepository;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.OffsetDateTime;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.*;

@SpringBootTest
@ActiveProfiles("test")
class VisionConcurrentUpdateIntegrationTest {

    @Autowired
    private ComplaintRepository complaintRepository;

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private jakarta.persistence.EntityManager entityManager;

    @Test
    @DisplayName("Targeted vision update modifies only vision columns without incrementing JPA @Version")
    @Transactional
    void testVisionUpdateDoesNotBumpVersionOrConflictWithOfficer() {
        User citizen = userRepository.findByEmailIgnoreCase("alex.m@citizen.org")
                .orElseThrow(() -> new IllegalStateException("Seed citizen not found."));

        Complaint complaint = new Complaint();
        complaint.setReferenceId("CF-TEST-CONCUR-" + System.currentTimeMillis());
        complaint.setCitizen(citizen);
        complaint.setTitle("Test concurrent roadway complaint");
        complaint.setDescription("Roadway defect for testing non-conflicting targeted updates.");
        complaint.setCategory("ROADS");
        complaint.setPriority(ComplaintPriority.MEDIUM);
        complaint.setStatus(ComplaintStatus.SUBMITTED);
        complaint.setAddress("Anna Salai Road");
        complaint.setWard("Ward 10");
        complaint.setAiDetectedCategory("ROADS");
        complaint.setAiRecommendedPriority(ComplaintPriority.MEDIUM);
        complaint.setVisionConsent(true);
        complaint.setVisionStatus("NOT_RUN");
        complaint.setFinalPrioritySource("RULE_ENGINE");

        Complaint saved = complaintRepository.saveAndFlush(complaint);
        UUID complaintId = saved.getId();
        Long initialVersion = saved.getVersion();
        assertNotNull(initialVersion);

        // 1. Claim row atomically
        int claimed = complaintRepository.claimForVisionTriage(complaintId, OffsetDateTime.now());
        assertEquals(1, claimed, "Should atomically claim NOT_RUN complaint");

        // 2. Perform targeted vision success update
        int updated = complaintRepository.updateVisionSuccess(
                complaintId,
                "ROADS",
                5,
                new BigDecimal("0.95"),
                "Deep crater on roadway posing critical hazard.",
                "gemini-1.5-flash",
                "OK",
                OffsetDateTime.now(),
                false,
                "VISION_SEVERITY_5",
                ComplaintPriority.HIGH
        );
        assertEquals(1, updated, "Should update vision columns");

        // 3. Clear persistence context and reload entity
        complaintRepository.flush();
        entityManager.clear();

        Complaint reloaded = complaintRepository.findById(complaintId).orElseThrow();
        assertEquals(initialVersion, reloaded.getVersion(), "JPA @Version must NOT be incremented by targeted vision updates!");
        assertEquals("OK", reloaded.getVisionStatus());
        assertEquals("ROADS", reloaded.getVisionCategory());
        assertEquals(5, reloaded.getVisionSeverity());
        assertEquals("gemini-1.5-flash", reloaded.getVisionModel());
        assertEquals("VISION_SEVERITY_5", reloaded.getFinalPrioritySource());
        assertEquals(ComplaintPriority.HIGH, reloaded.getAiRecommendedPriority());
        assertFalse(reloaded.isDisagreement());

        // 4. Simulate concurrent officer action updating status; should succeed with expected initialVersion
        reloaded.setStatus(ComplaintStatus.ASSIGNED);
        Complaint afterOfficerUpdate = complaintRepository.saveAndFlush(reloaded);
        assertEquals(initialVersion + 1, afterOfficerUpdate.getVersion(), "Officer update should cleanly increment version by 1 without conflict");
    }
}
