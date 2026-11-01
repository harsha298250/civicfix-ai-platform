package com.civicfix.officer.dto;

import java.util.List;
import java.util.Map;

public record OfficerAnalyticsSummaryResponse(
    long totalComplaints,
    Map<String, Long> countsByStatus,
    Map<String, Long> countsByWard,
    Map<String, Long> countsByCategory,
    List<WardCategoryCount> countsByWardAndCategory,
    Double averageResolutionHours,
    Double medianResolutionHours,
    Double reworkRate,
    long duplicatesLinked,
    AiAdjudicationCounts aiAdjudicationCounts,
    Double slaAdherenceRate
) {
    public record AiAdjudicationCounts(
        long accepted,
        long overridden,
        long dismissed,
        long pending
    ) {}

    public record WardCategoryCount(
        String ward,
        String category,
        long count
    ) {}
}

