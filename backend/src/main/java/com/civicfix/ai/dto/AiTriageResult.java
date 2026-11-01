package com.civicfix.ai.dto;

import com.civicfix.complaint.ComplaintPriority;

import java.math.BigDecimal;
import java.time.OffsetDateTime;
import java.util.ArrayList;
import java.util.List;

/**
 * Structured DTO representing the outcome of an automated triage evaluation.
 * Note: Confidence represents a rule-based heuristic match score percentage,
 * not a fabricated probability from a black-box model.
 */
public class AiTriageResult {

    private String detectedCategory;
    private ComplaintPriority recommendedPriority;
    private BigDecimal confidence; // 0.00 to 100.00 rule-based heuristic score
    private String hazardScore;
    private String explanation;
    private List<String> ruleMatches = new ArrayList<>();
    private List<DuplicateCandidate> duplicateCandidates = new ArrayList<>();
    private OffsetDateTime triagedAt;

    public AiTriageResult() {
        this.triagedAt = OffsetDateTime.now();
    }

    public static AiTriageResult fallback(String categoryHint, ComplaintPriority priorityHint, String reason) {
        AiTriageResult fallback = new AiTriageResult();
        fallback.setDetectedCategory(categoryHint != null && !categoryHint.isBlank() ? categoryHint : "GENERAL");
        fallback.setRecommendedPriority(priorityHint != null ? priorityHint : ComplaintPriority.MEDIUM);
        fallback.setConfidence(BigDecimal.valueOf(50.00));
        fallback.setHazardScore("P3 - Standard Triage");
        fallback.setExplanation("Heuristic fallback triage: " + reason);
        fallback.setTriagedAt(OffsetDateTime.now());
        return fallback;
    }

    public String getDetectedCategory() {
        return detectedCategory;
    }

    public void setDetectedCategory(String detectedCategory) {
        this.detectedCategory = detectedCategory;
    }

    public ComplaintPriority getRecommendedPriority() {
        return recommendedPriority;
    }

    public void setRecommendedPriority(ComplaintPriority recommendedPriority) {
        this.recommendedPriority = recommendedPriority;
    }

    public BigDecimal getConfidence() {
        return confidence;
    }

    public void setConfidence(BigDecimal confidence) {
        this.confidence = confidence;
    }

    public String getHazardScore() {
        return hazardScore;
    }

    public void setHazardScore(String hazardScore) {
        this.hazardScore = hazardScore;
    }

    public String getExplanation() {
        return explanation;
    }

    public void setExplanation(String explanation) {
        this.explanation = explanation;
    }

    public List<String> getRuleMatches() {
        return ruleMatches;
    }

    public void setRuleMatches(List<String> ruleMatches) {
        this.ruleMatches = ruleMatches;
    }

    public List<DuplicateCandidate> getDuplicateCandidates() {
        return duplicateCandidates;
    }

    public void setDuplicateCandidates(List<DuplicateCandidate> duplicateCandidates) {
        this.duplicateCandidates = duplicateCandidates;
    }

    public OffsetDateTime getTriagedAt() {
        return triagedAt;
    }

    public void setTriagedAt(OffsetDateTime triagedAt) {
        this.triagedAt = triagedAt;
    }
}
