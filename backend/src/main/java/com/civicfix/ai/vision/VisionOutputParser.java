package com.civicfix.ai.vision;

import com.civicfix.ai.triage.CivicLexicon;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.util.Set;
import java.util.regex.Pattern;

/**
 * Strict parser and validator for raw JSON responses from multimodal vision providers.
 */
public final class VisionOutputParser {

    private static final ObjectMapper MAPPER = new ObjectMapper();
    private static final Pattern HTML_TAG_PATTERN = Pattern.compile("<[^>]*>");
    private static final Pattern CODE_FENCE_PATTERN = Pattern.compile("^```(?:json)?\\s*|\\s*```$", Pattern.MULTILINE);

    private static final Set<String> ALLOWED_CATEGORIES = Set.of(
            CivicLexicon.CAT_ROADS,
            CivicLexicon.CAT_WATER,
            CivicLexicon.CAT_STREET_LIGHT,
            CivicLexicon.CAT_GARBAGE,
            CivicLexicon.CAT_DRAINAGE,
            CivicLexicon.CAT_PUBLIC_TRANSPORT,
            CivicLexicon.CAT_PARKS,
            "UNKNOWN"
    );

    private VisionOutputParser() {}

    public static VisionTriageOutput parseAndValidate(String rawContent) throws Exception {
        if (rawContent == null || rawContent.isBlank()) {
            throw new IllegalArgumentException("Empty response received from vision model.");
        }

        // Clean any markdown code fences
        String cleaned = CODE_FENCE_PATTERN.matcher(rawContent.trim()).replaceAll("").trim();

        JsonNode root = MAPPER.readTree(cleaned);

        // 1. Category validation
        JsonNode catNode = root.get("category");
        if (catNode == null || catNode.isNull() || catNode.asText().isBlank()) {
            throw new IllegalArgumentException("Missing 'category' in vision model output.");
        }
        String rawCategory = catNode.asText().trim().toUpperCase();
        if (!ALLOWED_CATEGORIES.contains(rawCategory)) {
            throw new IllegalArgumentException("Invalid category '" + rawCategory + "' in vision model output.");
        }

        // 2. Severity validation & clamping [1, 5]
        JsonNode sevNode = root.get("severity");
        if (sevNode == null || !sevNode.isNumber()) {
            throw new IllegalArgumentException("Missing or non-numeric 'severity' in vision model output.");
        }
        int rawSeverity = sevNode.asInt();
        int clampedSeverity = Math.max(1, Math.min(5, rawSeverity));

        // 3. Confidence validation & clamping [0.00, 1.00]
        JsonNode confNode = root.get("confidence");
        if (confNode == null || !confNode.isNumber()) {
            throw new IllegalArgumentException("Missing or non-numeric 'confidence' in vision model output.");
        }
        double rawConfidence = confNode.asDouble();
        double clampedConfidence = Math.max(0.0, Math.min(1.0, rawConfidence));
        BigDecimal finalConfidence = BigDecimal.valueOf(clampedConfidence).setScale(2, RoundingMode.HALF_UP);

        // 4. Reason sanitization & length capping (max 300 characters, plain text only)
        JsonNode reasonNode = root.get("reason");
        String safeReason = "Visual defect analysis completed.";
        if (reasonNode != null && !reasonNode.isNull() && !reasonNode.asText().isBlank()) {
            String sanitized = HTML_TAG_PATTERN.matcher(reasonNode.asText()).replaceAll("").trim();
            if (sanitized.length() > 300) {
                sanitized = sanitized.substring(0, 300).trim();
            }
            if (!sanitized.isBlank()) {
                safeReason = sanitized;
            }
        }

        return new VisionTriageOutput(rawCategory, clampedSeverity, finalConfidence, safeReason);
    }
}

