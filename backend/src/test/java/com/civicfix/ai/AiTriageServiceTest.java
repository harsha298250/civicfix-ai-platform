package com.civicfix.ai;

import com.civicfix.ai.dto.AiTriageResult;
import com.civicfix.ai.duplicate.DuplicateDetectionEngine;
import com.civicfix.ai.triage.DeterministicTriageEngine;
import com.civicfix.complaint.Complaint;
import com.civicfix.complaint.ComplaintPriority;
import com.civicfix.complaint.ComplaintStatus;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.math.BigDecimal;
import java.util.Collections;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class AiTriageServiceTest {

    @Mock
    private DeterministicTriageEngine triageEngine;

    @Mock
    private DuplicateDetectionEngine duplicateEngine;

    private AiTriageService triageService;

    @BeforeEach
    void setUp() {
        triageService = new AiTriageService(triageEngine, duplicateEngine);
    }

    @Test
    @DisplayName("Advisory Integrity: Service sets AI fields without mutating official category, priority, or status")
    void testAdvisoryIntegrityDoesNotMutateOfficialFields() {
        Complaint complaint = new Complaint();
        complaint.setId(UUID.randomUUID());
        complaint.setReferenceId("CF-2026-TEST");
        complaint.setTitle("Broken pavement");
        complaint.setDescription("Cracked curb near bus stop");
        complaint.setCategory("ROADS"); // Official category
        complaint.setPriority(ComplaintPriority.MEDIUM); // Official priority
        complaint.setStatus(ComplaintStatus.SUBMITTED); // Official status

        AiTriageResult mockResult = new AiTriageResult();
        mockResult.setDetectedCategory("ROADS");
        mockResult.setRecommendedPriority(ComplaintPriority.HIGH); // AI recommends HIGH
        mockResult.setConfidence(BigDecimal.valueOf(82.50));
        mockResult.setHazardScore("P2 - Elevated Risk");
        mockResult.setExplanation("Evaluated as high due to bus route vulnerability.");

        when(triageEngine.evaluate(any(), any(), any(), any())).thenReturn(mockResult);
        when(duplicateEngine.findCandidates(any(), any(), any(), any(), any(), any(), any()))
                .thenReturn(Collections.emptyList());

        AiTriageResult result = triageService.triageComplaint(complaint);

        assertNotNull(result);
        // Verify official complaint properties were NOT overwritten
        assertEquals("ROADS", complaint.getCategory(), "Official category must remain unchanged");
        assertEquals(ComplaintPriority.MEDIUM, complaint.getPriority(), "Official priority must NOT be altered without officer approval");
        assertEquals(ComplaintStatus.SUBMITTED, complaint.getStatus(), "Official status must remain SUBMITTED");

        // Verify advisory AI fields were populated
        assertEquals("ROADS", complaint.getAiDetectedCategory());
        assertEquals(ComplaintPriority.HIGH, complaint.getAiRecommendedPriority());
        assertEquals(BigDecimal.valueOf(82.50), complaint.getAiConfidence());
        assertEquals("P2 - Elevated Risk", complaint.getAiHazardScore());
        assertEquals("PENDING", complaint.getAiAdjudicationStatus());
        assertNotNull(complaint.getAiTriagedAt());
    }

    @Test
    @DisplayName("Safe Fallback: Unexpected exception in engine does not throw; returns safe fallback and preserves complaint")
    void testUnexpectedExceptionHandlesGracefully() {
        Complaint complaint = new Complaint();
        complaint.setId(UUID.randomUUID());
        complaint.setReferenceId("CF-2026-ERR");
        complaint.setTitle("Test");
        complaint.setDescription("Test");
        complaint.setCategory("GARBAGE");
        complaint.setPriority(ComplaintPriority.LOW);

        when(triageEngine.evaluate(any(), any(), any(), any()))
                .thenThrow(new RuntimeException("Simulated engine failure"));

        AiTriageResult result = triageService.triageComplaint(complaint);

        assertNotNull(result);
        assertEquals("GARBAGE", result.getDetectedCategory());
        assertEquals(ComplaintPriority.LOW, result.getRecommendedPriority());
        assertTrue(result.getExplanation().contains("bypassed"));
        assertEquals("PENDING", complaint.getAiAdjudicationStatus());
    }

    @Test
    @DisplayName("Null Input: Null complaint returns fallback without throwing")
    void testNullComplaint() {
        AiTriageResult result = triageService.triageComplaint(null);
        assertNotNull(result);
        assertEquals("GENERAL", result.getDetectedCategory());
    }
}
