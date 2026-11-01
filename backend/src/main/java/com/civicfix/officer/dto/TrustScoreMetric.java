package com.civicfix.officer.dto;

import java.util.UUID;

/**
 * Metric contracts for Closure Trust Scores.
 * 
 * Formula: confirmed closures / (confirmed closures + citizen rejections + reopened after resolution)
 * Minimum sample size threshold: 5 closures. If fewer than 5 closures exist, trustScore is null with a status message.
 */
public final class TrustScoreMetric {

    private TrustScoreMetric() {}

    public record WardTrustScore(
            String ward,
            long confirmedClosures,
            long citizenRejections,
            long reopenedAfterResolution,
            long totalClosures,
            Double trustScore, // null if totalClosures < 5; percentage 0.0 - 100.0 rounded to 1 decimal
            String statusMessage // "Calculated" or "Not enough data (< 5 closures)"
    ) {}

    public record OfficerTrustScore(
            UUID officerId,
            String officerName,
            String officerEmail,
            String department,
            String ward,
            long confirmedClosures,
            long citizenRejections,
            long reopenedAfterResolution,
            long totalClosures,
            Double trustScore, // null if totalClosures < 5; percentage 0.0 - 100.0 rounded to 1 decimal
            String statusMessage // "Calculated" or "Not enough data (< 5 closures)"
    ) {}

    public record OverallTrustScore(
            long confirmedClosures,
            long citizenRejections,
            long reopenedAfterResolution,
            long totalClosures,
            Double trustScore, // null if totalClosures < 5; percentage 0.0 - 100.0 rounded to 1 decimal
            String statusMessage // "Calculated" or "Not enough data (< 5 closures)"
    ) {}
}

