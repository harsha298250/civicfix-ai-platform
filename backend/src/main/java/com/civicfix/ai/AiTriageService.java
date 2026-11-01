package com.civicfix.ai;

import com.civicfix.ai.dto.AiTriageResult;
import com.civicfix.ai.dto.DuplicateCandidate;
import com.civicfix.ai.duplicate.DuplicateDetectionEngine;
import com.civicfix.ai.triage.DeterministicTriageEngine;
import com.civicfix.complaint.Complaint;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;

import java.time.OffsetDateTime;
import java.util.List;

/**
 * High-level AI triage service coordinating deterministic triage rules
 * and proximity-based duplicate detection.
 * 
 * Safety Mandate: All evaluations produced by this service are advisory.
 * Official complaint category, priority, and status are never mutated without
 * explicit authorized officer action.
 */
@Service
public class AiTriageService {

    private static final Logger log = LoggerFactory.getLogger(AiTriageService.class);

    private final DeterministicTriageEngine triageEngine;
    private final DuplicateDetectionEngine duplicateEngine;

    public AiTriageService(DeterministicTriageEngine triageEngine, DuplicateDetectionEngine duplicateEngine) {
        this.triageEngine = triageEngine;
        this.duplicateEngine = duplicateEngine;
    }

    /**
     * Evaluate a complaint entity and populate its advisory triage fields.
     * Guaranteed non-blocking and safe against unexpected exceptions.
     */
    public AiTriageResult triageComplaint(Complaint complaint) {
        if (complaint == null) {
            return AiTriageResult.fallback("GENERAL", null, "Null complaint provided.");
        }

        try {
            // 1. Evaluate category and hazard rules
            AiTriageResult result = triageEngine.evaluate(
                    complaint.getTitle(),
                    complaint.getDescription(),
                    complaint.getCategory(),
                    complaint.getPriority()
            );

            // 2. Identify advisory duplicate candidates (non-destructive)
            List<DuplicateCandidate> duplicates = duplicateEngine.findCandidates(
                    complaint.getId(),
                    complaint.getLatitude(),
                    complaint.getLongitude(),
                    complaint.getWard(),
                    complaint.getCategory(),
                    complaint.getTitle(),
                    complaint.getDescription()
            );
            result.setDuplicateCandidates(duplicates);

            // 3. Populate advisory entity fields without altering official priority/category
            complaint.setAiDetectedCategory(result.getDetectedCategory());
            complaint.setAiRecommendedPriority(result.getRecommendedPriority());
            complaint.setAiConfidence(result.getConfidence());
            complaint.setAiHazardScore(result.getHazardScore());
            complaint.setAiExplanation(result.getExplanation());
            complaint.setAiTriagedAt(result.getTriagedAt() != null ? result.getTriagedAt() : OffsetDateTime.now());
            if (complaint.getAiAdjudicationStatus() == null || complaint.getAiAdjudicationStatus().isBlank()) {
                complaint.setAiAdjudicationStatus("PENDING");
            }

            return result;
        } catch (Exception e) {
            log.error("Triage evaluation encountered unexpected error for complaint: {}", complaint.getReferenceId(), e);
            AiTriageResult fallback = AiTriageResult.fallback(
                    complaint.getCategory(),
                    complaint.getPriority(),
                    "Triage execution bypassed due to internal processing error: " + e.getMessage()
            );
            complaint.setAiDetectedCategory(fallback.getDetectedCategory());
            complaint.setAiRecommendedPriority(fallback.getRecommendedPriority());
            complaint.setAiConfidence(fallback.getConfidence());
            complaint.setAiHazardScore(fallback.getHazardScore());
            complaint.setAiExplanation(fallback.getExplanation());
            complaint.setAiTriagedAt(OffsetDateTime.now());
            complaint.setAiAdjudicationStatus("PENDING");
            return fallback;
        }
    }

    /**
     * Retrieve ranked duplicate candidate recommendations for a given complaint.
     */
    public List<DuplicateCandidate> findDuplicateCandidates(Complaint complaint) {
        if (complaint == null) {
            return java.util.Collections.emptyList();
        }
        return duplicateEngine.findCandidates(
                complaint.getId(),
                complaint.getLatitude(),
                complaint.getLongitude(),
                complaint.getWard(),
                complaint.getCategory(),
                complaint.getTitle(),
                complaint.getDescription()
        );
    }
}
