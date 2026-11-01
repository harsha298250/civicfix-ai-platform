package com.civicfix.ai.triage;

import com.civicfix.ai.dto.AiTriageResult;
import com.civicfix.complaint.ComplaintPriority;
import org.springframework.stereotype.Component;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.OffsetDateTime;
import java.util.*;

/**
 * Local deterministic triage engine providing category classification,
 * hazard-rule evaluation, and transparent rule-based explanations.
 * 
 * Integrity Guarantee: Confidence scores represent rule-based heuristic match metrics
 * calculated from lexical density and hazard matching, never fabricated as a neural model output.
 */
@Component
public class DeterministicTriageEngine {

    public AiTriageResult evaluate(String title, String description, String categoryHint, ComplaintPriority priorityHint) {
        if ((title == null || title.isBlank()) && (description == null || description.isBlank())) {
            return AiTriageResult.fallback(categoryHint, priorityHint, "Insufficient textual data provided for automated evaluation.");
        }

        String safeTitle = title != null ? title.trim() : "";
        String safeDesc = description != null ? description.trim() : "";
        String combinedLower = (safeTitle + " " + safeTitle + " " + safeDesc).toLowerCase(); // title weighted 2x

        List<String> ruleMatches = new ArrayList<>();

        // 1. Category Classification
        CategoryMatch bestCategory = classifyCategory(combinedLower, categoryHint);

        // 2. Hazard Rule Evaluation & Priority Recommendation
        HazardEvaluation hazardEval = evaluateHazards(combinedLower, priorityHint);

        // 3. Transparent Explanation Synthesis
        String explanation = buildExplanation(bestCategory, hazardEval, ruleMatches);

        // 4. Rule-Based Heuristic Match Score (Clamped 50.00% to 95.00%)
        BigDecimal confidence = calculateHeuristicScore(bestCategory.matchCount(), hazardEval.hasExplicitHazardMatch());

        AiTriageResult result = new AiTriageResult();
        result.setDetectedCategory(bestCategory.category());
        result.setRecommendedPriority(hazardEval.recommendedPriority());
        result.setConfidence(confidence);
        result.setHazardScore(hazardEval.hazardScore());
        result.setExplanation(explanation);
        result.setRuleMatches(ruleMatches);
        result.setTriagedAt(OffsetDateTime.now());

        return result;
    }

    private CategoryMatch classifyCategory(String combinedLower, String categoryHint) {
        Map<String, Integer> categoryScores = new HashMap<>();

        for (Map.Entry<String, List<String>> entry : CivicLexicon.CATEGORY_KEYWORDS.entrySet()) {
            String cat = entry.getKey();
            int score = 0;
            List<String> matchedTokens = new ArrayList<>();
            for (String kw : entry.getValue()) {
                if (combinedLower.contains(kw)) {
                    score += kw.contains(" ") ? 3 : 2; // Multi-word phrases give higher specificity
                    matchedTokens.add(kw);
                }
            }
            if (score > 0) {
                categoryScores.put(cat, score);
            }
        }

        if (categoryScores.isEmpty()) {
            // Ambiguous / No keyword match -> Fallback to valid category hint or general
            String fallbackCat = isValidCategory(categoryHint) ? normalizeCategory(categoryHint) : CivicLexicon.CAT_ROADS;
            return new CategoryMatch(fallbackCat, 0, Collections.emptyList(), true);
        }

        // Find highest score
        String topCategory = null;
        int maxScore = -1;
        for (Map.Entry<String, Integer> e : categoryScores.entrySet()) {
            if (e.getValue() > maxScore) {
                maxScore = e.getValue();
                topCategory = e.getKey();
            }
        }

        List<String> matchedTokens = CivicLexicon.CATEGORY_KEYWORDS.get(topCategory).stream()
                .filter(combinedLower::contains)
                .toList();

        return new CategoryMatch(topCategory, maxScore, matchedTokens, false);
    }

    private HazardEvaluation evaluateHazards(String combinedLower, ComplaintPriority priorityHint) {
        // Critical Hazards check
        for (CivicLexicon.HazardRule rule : CivicLexicon.CRITICAL_HAZARDS) {
            for (String trigger : rule.triggers()) {
                if (combinedLower.contains(trigger)) {
                    return new HazardEvaluation(
                            ComplaintPriority.CRITICAL,
                            "P1 - Critical Hazard: Life Safety Risk",
                            rule.label() + " ('" + trigger + "')",
                            true
                    );
                }
            }
        }

        // High Hazards check
        for (CivicLexicon.HazardRule rule : CivicLexicon.HIGH_HAZARDS) {
            for (String trigger : rule.triggers()) {
                if (combinedLower.contains(trigger)) {
                    return new HazardEvaluation(
                            ComplaintPriority.HIGH,
                            "P2 - Elevated Hazard: Infrastructure Risk",
                            rule.label() + " ('" + trigger + "')",
                            true
                    );
                }
            }
        }

        // Medium Hazards check
        for (CivicLexicon.HazardRule rule : CivicLexicon.MEDIUM_HAZARDS) {
            for (String trigger : rule.triggers()) {
                if (combinedLower.contains(trigger)) {
                    return new HazardEvaluation(
                            ComplaintPriority.MEDIUM,
                            "P3 - Standard Triage: Operational Defect",
                            rule.label() + " ('" + trigger + "')",
                            true
                    );
                }
            }
        }

        // Default: If citizen selected a priority, respect as advisory baseline; otherwise MEDIUM
        ComplaintPriority baseline = priorityHint != null ? priorityHint : ComplaintPriority.MEDIUM;
        String hazardLabel = baseline == ComplaintPriority.CRITICAL ? "P1 - Citizen Flagged Critical"
                : (baseline == ComplaintPriority.HIGH ? "P2 - Citizen Flagged High" : "P3 - Standard Triage");

        return new HazardEvaluation(baseline, hazardLabel, "Standard municipal report with no acute hazard triggers detected", false);
    }

    private String buildExplanation(CategoryMatch catMatch, HazardEvaluation hazardEval, List<String> ruleMatches) {
        StringBuilder sb = new StringBuilder();

        if (catMatch.isFallback()) {
            sb.append("Category defaulted to ").append(catMatch.category())
                    .append(" based on user submission (no specific municipal lexicon tokens matched). ");
        } else {
            sb.append("Classified under ").append(catMatch.category())
                    .append(" based on matched municipal keywords: ")
                    .append(String.join(", ", catMatch.matchedTokens())).append(". ");
            ruleMatches.add("Category Lexicon Match: " + catMatch.category() + " [" + String.join(", ", catMatch.matchedTokens()) + "]");
        }

        if (hazardEval.hasExplicitHazardMatch()) {
            sb.append("Priority evaluated as ").append(hazardEval.recommendedPriority())
                    .append(" due to identified hazard rule: ").append(hazardEval.hazardReason()).append(". ");
            ruleMatches.add("Hazard Rule: " + hazardEval.hazardReason());
        } else {
            sb.append("Assigned standard priority ").append(hazardEval.recommendedPriority())
                    .append(" as no acute life-safety or transit corridor obstruction keywords were detected. ");
        }

        sb.append("Advisory evaluation only; requires officer confirmation.");
        return sb.toString();
    }

    private BigDecimal calculateHeuristicScore(int matchCount, boolean hasHazardMatch) {
        if (matchCount == 0 && !hasHazardMatch) {
            return BigDecimal.valueOf(50.00).setScale(2, RoundingMode.HALF_UP);
        }
        // Base match score: 55.00 for minimal, scaling up to 92.50 for high lexical density + hazard match
        double score = 55.00;
        if (matchCount >= 6) {
            score += 25.00;
        } else if (matchCount >= 3) {
            score += 15.00;
        } else if (matchCount >= 1) {
            score += 8.00;
        }

        if (hasHazardMatch) {
            score += 10.00;
        }

        // Clamp between 50.00 and 92.50 (transparently avoiding fabricated 99.9% claims)
        double clamped = Math.max(50.00, Math.min(92.50, score));
        return BigDecimal.valueOf(clamped).setScale(2, RoundingMode.HALF_UP);
    }

    private boolean isValidCategory(String cat) {
        if (cat == null || cat.isBlank()) return false;
        String normalized = normalizeCategory(cat);
        return CivicLexicon.CATEGORY_KEYWORDS.containsKey(normalized);
    }

    private String normalizeCategory(String cat) {
        String clean = cat.trim().toUpperCase().replace(" ", "_").replace("&", "_");
        if (clean.contains("ROAD") || clean.contains("POTHOLE")) return CivicLexicon.CAT_ROADS;
        if (clean.contains("WATER") || clean.contains("SEWER")) return CivicLexicon.CAT_WATER;
        if (clean.contains("LIGHT") || clean.contains("LAMP")) return CivicLexicon.CAT_STREET_LIGHT;
        if (clean.contains("GARBAGE") || clean.contains("WASTE")) return CivicLexicon.CAT_GARBAGE;
        if (clean.contains("DRAIN")) return CivicLexicon.CAT_DRAINAGE;
        if (clean.contains("TRANSIT") || clean.contains("BUS")) return CivicLexicon.CAT_PUBLIC_TRANSPORT;
        if (clean.contains("PARK") || clean.contains("TREE")) return CivicLexicon.CAT_PARKS;
        return clean;
    }

    private record CategoryMatch(String category, int matchCount, List<String> matchedTokens, boolean isFallback) {}
    private record HazardEvaluation(ComplaintPriority recommendedPriority, String hazardScore, String hazardReason, boolean hasExplicitHazardMatch) {}
}
