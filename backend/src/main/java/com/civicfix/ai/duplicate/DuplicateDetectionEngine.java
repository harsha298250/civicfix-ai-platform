package com.civicfix.ai.duplicate;

import com.civicfix.ai.dto.DuplicateCandidate;
import com.civicfix.ai.triage.TextSimilarityUtils;
import com.civicfix.complaint.Complaint;
import com.civicfix.complaint.ComplaintRepository;
import com.civicfix.complaint.ComplaintStatus;
import com.civicfix.common.util.GeoUtils;
import org.springframework.stereotype.Component;

import java.math.BigDecimal;
import java.time.OffsetDateTime;
import java.util.*;

/**
 * Spatial and categorical duplicate detection engine.
 * Computes advisory duplicate candidate clusters without performing destructive operations.
 */
@Component
public class DuplicateDetectionEngine {

    private static final double EARTH_RADIUS_METERS = 6371000.0;
    public static final double DEFAULT_RADIUS_METERS = 150.0; // 150m proximity window
    public static final int DEFAULT_LOOKBACK_DAYS = 14; // Past 14 days active window

    private static final List<ComplaintStatus> ACTIVE_STATUSES = List.of(
            ComplaintStatus.SUBMITTED,
            ComplaintStatus.UNDER_REVIEW,
            ComplaintStatus.ASSIGNED,
            ComplaintStatus.IN_PROGRESS,
            ComplaintStatus.REWORK_REQUESTED,
            ComplaintStatus.RESOLUTION_SUBMITTED,
            ComplaintStatus.PENDING_CITIZEN_CONFIRMATION,
            ComplaintStatus.REOPENED
    );

    private final ComplaintRepository complaintRepository;

    public DuplicateDetectionEngine(ComplaintRepository complaintRepository) {
        this.complaintRepository = complaintRepository;
    }

    /**
     * Identify potential duplicate candidate complaints for a target complaint.
     * Advisory query only — does not alter or merge records.
     */
    public List<DuplicateCandidate> findCandidates(
            UUID excludeId,
            BigDecimal latitude,
            BigDecimal longitude,
            String ward,
            String category,
            String title,
            String description) {

        List<Complaint> potentialMatches;
        OffsetDateTime cutoffDate = OffsetDateTime.now().minusDays(DEFAULT_LOOKBACK_DAYS);

        boolean hasCoords = latitude != null && longitude != null;

        if (hasCoords) {
            // Compute approx bounding box for 150m (~0.0015 deg lat/lng)
            double latDelta = DEFAULT_RADIUS_METERS / 111000.0;
            double lngDelta = DEFAULT_RADIUS_METERS / (111000.0 * Math.cos(Math.toRadians(latitude.doubleValue())));

            BigDecimal minLat = latitude.subtract(BigDecimal.valueOf(latDelta));
            BigDecimal maxLat = latitude.add(BigDecimal.valueOf(latDelta));
            BigDecimal minLng = longitude.subtract(BigDecimal.valueOf(lngDelta));
            BigDecimal maxLng = longitude.add(BigDecimal.valueOf(lngDelta));

            potentialMatches = complaintRepository.findActiveComplaintsInSpatialBounds(
                    ACTIVE_STATUSES,
                    minLat, maxLat, minLng, maxLng, cutoffDate
            );
        } else {
            // Coordinate-unavailable fallback: inspect active complaints in same ward or general queue
            potentialMatches = complaintRepository.findByStatusOrderByCreatedAtDesc(ComplaintStatus.SUBMITTED, null)
                    .getContent();
        }

        List<DuplicateCandidate> candidates = new ArrayList<>();
        String targetText = (title != null ? title : "") + " " + (description != null ? description : "");

        for (Complaint c : potentialMatches) {
            if (excludeId != null && c.getId().equals(excludeId)) {
                continue; // Exclude self
            }

            Double distanceMeters = null;
            if (hasCoords && c.getLatitude() != null && c.getLongitude() != null) {
                distanceMeters = calculateHaversineDistance(
                        latitude.doubleValue(), longitude.doubleValue(),
                        c.getLatitude().doubleValue(), c.getLongitude().doubleValue()
                );
                // Exclude if beyond radius
                if (distanceMeters > DEFAULT_RADIUS_METERS) {
                    continue;
                }
            } else if (!hasCoords && ward != null && c.getWard() != null) {
                if (!ward.equalsIgnoreCase(c.getWard())) {
                    continue; // Skip non-matching ward when coords are unavailable
                }
            }

            String candidateText = c.getTitle() + " " + c.getDescription();
            double textSim = TextSimilarityUtils.computeCombinedSimilarity(targetText, candidateText);

            boolean categoryMatch = category != null && c.getCategory() != null &&
                    category.equalsIgnoreCase(c.getCategory());

            // Inclusion criteria:
            // 1. High text similarity (>= 0.60) regardless of distance within 150m
            // 2. Or same category + very close proximity (<= 75m) + moderate text similarity (>= 0.35)
            // 3. Or coordinate-unavailable in same ward with very high text similarity (>= 0.70)
            boolean isCandidate = false;
            if (distanceMeters != null) {
                if (textSim >= 0.55) {
                    isCandidate = true;
                } else if (categoryMatch && distanceMeters <= 75.0 && textSim >= 0.25) {
                    isCandidate = true;
                }
            } else if (textSim >= 0.70) {
                isCandidate = true;
            }

            if (isCandidate) {
                Double roundedDist = distanceMeters != null ? (double) Math.round(distanceMeters * 10.0) / 10.0 : null;
                double roundedSim = Math.round(textSim * 100.0) / 100.0;

                String explanationText;
                if (roundedDist != null) {
                    explanationText = String.format("Proximity: %.1fm away, %.0f%% text match in %s",
                            roundedDist, roundedSim * 100, c.getCategory() != null ? c.getCategory() : "General");
                } else {
                    explanationText = String.format("Same ward (%s), %.0f%% text match in %s",
                            c.getWard() != null ? c.getWard() : "N/A", roundedSim * 100, c.getCategory() != null ? c.getCategory() : "General");
                }

                candidates.add(new DuplicateCandidate(
                        c.getId(),
                        c.getReferenceId(),
                        c.getTitle(),
                        c.getCategory(),
                        c.getStatus().name(),
                        roundedDist,
                        roundedSim,
                        c.getCreatedAt(),
                        explanationText
                ));
            }
        }

        // Sort candidates: highest similarity first, then closest distance
        candidates.sort((c1, c2) -> {
            int simComp = Double.compare(c2.getSimilarityScore(), c1.getSimilarityScore());
            if (simComp != 0) return simComp;
            if (c1.getDistanceMeters() != null && c2.getDistanceMeters() != null) {
                return Double.compare(c1.getDistanceMeters(), c2.getDistanceMeters());
            }
            return 0;
        });

        return candidates;
    }

    /**
     * Standard Great-Circle Haversine distance in meters (delegates to GeoUtils).
     */
    public static double calculateHaversineDistance(double lat1, double lon1, double lat2, double lon2) {
        return GeoUtils.haversineDistance(lat1, lon1, lat2, lon2);
    }
}
