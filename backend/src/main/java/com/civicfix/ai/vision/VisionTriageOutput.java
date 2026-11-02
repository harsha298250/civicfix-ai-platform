package com.civicfix.ai.vision;

import java.math.BigDecimal;

/**
 * Output of a multimodal vision triage evaluation.
 */
public class VisionTriageOutput {

    private final String category;
    private final int severity;
    private final BigDecimal confidence;
    private final String reason;

    public VisionTriageOutput(String category, int severity, BigDecimal confidence, String reason) {
        this.category = category;
        this.severity = severity;
        this.confidence = confidence;
        this.reason = reason;
    }

    public String getCategory() {
        return category;
    }

    public int getSeverity() {
        return severity;
    }

    public BigDecimal getConfidence() {
        return confidence;
    }

    public String getReason() {
        return reason;
    }
}

