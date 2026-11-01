package com.civicfix.ai;

import com.civicfix.ai.dto.DuplicateCandidate;
import com.civicfix.ai.duplicate.DuplicateDetectionEngine;
import com.civicfix.complaint.Complaint;
import com.civicfix.complaint.ComplaintPriority;
import com.civicfix.complaint.ComplaintRepository;
import com.civicfix.complaint.ComplaintStatus;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.data.domain.PageImpl;

import java.lang.reflect.Proxy;
import java.math.BigDecimal;
import java.time.OffsetDateTime;
import java.util.Collections;
import java.util.List;
import java.util.UUID;
import java.util.concurrent.atomic.AtomicReference;

import static org.junit.jupiter.api.Assertions.*;

class DuplicateDetectionEngineTest {

    private ComplaintRepository complaintRepository;
    private DuplicateDetectionEngine duplicateEngine;
    private final AtomicReference<List<Complaint>> spatialReturn = new AtomicReference<>(Collections.emptyList());
    private final AtomicReference<List<Complaint>> statusReturn = new AtomicReference<>(Collections.emptyList());

    @BeforeEach
    void setUp() {
        spatialReturn.set(Collections.emptyList());
        statusReturn.set(Collections.emptyList());

        complaintRepository = (ComplaintRepository) Proxy.newProxyInstance(
                ComplaintRepository.class.getClassLoader(),
                new Class<?>[]{ComplaintRepository.class},
                (proxy, method, args) -> {
                    if ("findActiveComplaintsInSpatialBounds".equals(method.getName())) {
                        return spatialReturn.get();
                    }
                    if ("findByStatusOrderByCreatedAtDesc".equals(method.getName())) {
                        return new PageImpl<>(statusReturn.get());
                    }
                    return null;
                }
        );

        duplicateEngine = new DuplicateDetectionEngine(complaintRepository);
    }

    @Test
    @DisplayName("Proximity & Text Match: Complaint within 40m with similar text is flagged as duplicate candidate")
    void testNearbySimilarComplaintIsCandidate() {
        UUID existingId = UUID.randomUUID();
        Complaint existing = new Complaint();
        existing.setId(existingId);
        existing.setReferenceId("CF-2026-00042");
        existing.setTitle("Deep pothole on 2nd Avenue");
        existing.setDescription("Large crater in the asphalt road near junction.");
        existing.setCategory("ROADS");
        existing.setStatus(ComplaintStatus.UNDER_REVIEW);
        existing.setLatitude(BigDecimal.valueOf(13.082700));
        existing.setLongitude(BigDecimal.valueOf(80.270700));
        existing.setCreatedAt(OffsetDateTime.now().minusHours(4));

        spatialReturn.set(List.of(existing));

        // Evaluate target complaint ~35m away
        List<DuplicateCandidate> candidates = duplicateEngine.findCandidates(
                UUID.randomUUID(),
                BigDecimal.valueOf(13.082900), // ~22m north
                BigDecimal.valueOf(80.270900), // ~22m east -> ~31m total distance
                "Zone 08",
                "ROADS",
                "Pothole on 2nd Ave junction",
                "Crater on road near 2nd avenue."
        );

        assertNotNull(candidates);
        assertEquals(1, candidates.size());
        DuplicateCandidate candidate = candidates.get(0);
        assertEquals("CF-2026-00042", candidate.getReferenceId());
        assertTrue(candidate.getDistanceMeters() < 50.0);
        assertTrue(candidate.getSimilarityScore() >= 0.40);
    }

    @Test
    @DisplayName("Distance Boundary: Complaint beyond 150m is excluded from candidate list")
    void testDistantComplaintIsExcluded() {
        UUID existingId = UUID.randomUUID();
        Complaint existing = new Complaint();
        existing.setId(existingId);
        existing.setReferenceId("CF-2026-00099");
        existing.setTitle("Pothole on 2nd Avenue");
        existing.setDescription("Asphalt road crater.");
        existing.setCategory("ROADS");
        existing.setStatus(ComplaintStatus.ASSIGNED);
        // Approximately 500m away
        existing.setLatitude(BigDecimal.valueOf(13.087000));
        existing.setLongitude(BigDecimal.valueOf(80.275000));
        existing.setCreatedAt(OffsetDateTime.now().minusDays(1));

        spatialReturn.set(List.of(existing));

        List<DuplicateCandidate> candidates = duplicateEngine.findCandidates(
                UUID.randomUUID(),
                BigDecimal.valueOf(13.082700),
                BigDecimal.valueOf(80.270700),
                "Zone 08",
                "ROADS",
                "Pothole on 2nd Avenue",
                "Asphalt road crater."
        );

        assertNotNull(candidates);
        assertTrue(candidates.isEmpty(), "Complaints > 150m must be excluded");
    }

    @Test
    @DisplayName("Self Exclusion: Target complaint does not flag itself as a duplicate candidate")
    void testSelfExclusion() {
        UUID selfId = UUID.randomUUID();
        Complaint selfComplaint = new Complaint();
        selfComplaint.setId(selfId);
        selfComplaint.setReferenceId("CF-2026-SELF");
        selfComplaint.setTitle("Pothole");
        selfComplaint.setDescription("Pothole on road");
        selfComplaint.setCategory("ROADS");
        selfComplaint.setStatus(ComplaintStatus.SUBMITTED);
        selfComplaint.setLatitude(BigDecimal.valueOf(13.082700));
        selfComplaint.setLongitude(BigDecimal.valueOf(80.270700));

        spatialReturn.set(List.of(selfComplaint));

        List<DuplicateCandidate> candidates = duplicateEngine.findCandidates(
                selfId, // Exclude self
                BigDecimal.valueOf(13.082700),
                BigDecimal.valueOf(80.270700),
                "Zone 08",
                "ROADS",
                "Pothole",
                "Pothole on road"
        );

        assertNotNull(candidates);
        assertTrue(candidates.isEmpty(), "Self must be excluded");
    }

    @Test
    @DisplayName("Missing Coordinates Fallback: Matches by ward and high text similarity when coordinates null")
    void testMissingCoordinatesWardMatch() {
        UUID existingId = UUID.randomUUID();
        Complaint existing = new Complaint();
        existing.setId(existingId);
        existing.setReferenceId("CF-2026-WARD-1");
        existing.setTitle("Damaged streetlight near park gate");
        existing.setDescription("Lamppost bulb fused and wire dangling near Gandhi Park gate.");
        existing.setCategory("STREET_LIGHT");
        existing.setStatus(ComplaintStatus.SUBMITTED);
        existing.setWard("Ward 114");
        existing.setCreatedAt(OffsetDateTime.now().minusHours(2));

        statusReturn.set(List.of(existing));

        List<DuplicateCandidate> candidates = duplicateEngine.findCandidates(
                UUID.randomUUID(),
                null, // Missing lat
                null, // Missing lng
                "Ward 114",
                "STREET_LIGHT",
                "Damaged streetlight near park gate",
                "Lamppost bulb fused near Gandhi Park."
        );

        assertNotNull(candidates);
        assertEquals(1, candidates.size());
        assertEquals("CF-2026-WARD-1", candidates.get(0).getReferenceId());
        assertNull(candidates.get(0).getDistanceMeters());
        assertTrue(candidates.get(0).getSimilarityScore() >= 0.70);
    }

    @Test
    @DisplayName("Missing Coordinates Different Ward: Excluded when ward does not match")
    void testMissingCoordinatesDifferentWardExcluded() {
        UUID existingId = UUID.randomUUID();
        Complaint existing = new Complaint();
        existing.setId(existingId);
        existing.setReferenceId("CF-2026-WARD-DIFF");
        existing.setTitle("Damaged streetlight");
        existing.setDescription("Lamppost bulb fused.");
        existing.setCategory("STREET_LIGHT");
        existing.setStatus(ComplaintStatus.SUBMITTED);
        existing.setWard("Ward 99"); // Different ward

        statusReturn.set(List.of(existing));

        List<DuplicateCandidate> candidates = duplicateEngine.findCandidates(
                UUID.randomUUID(),
                null,
                null,
                "Ward 114",
                "STREET_LIGHT",
                "Damaged streetlight",
                "Lamppost bulb fused."
        );

        assertNotNull(candidates);
        assertTrue(candidates.isEmpty());
    }

    @Test
    @DisplayName("Haversine Distance Accuracy: Validates known geographic coordinate distance")
    void testHaversineDistanceAccuracy() {
        // Point A: Chennai Central (13.0827, 80.2707)
        // Point B: ~111m north (13.0837, 80.2707)
        double dist = DuplicateDetectionEngine.calculateHaversineDistance(13.0827, 80.2707, 13.0837, 80.2707);
        assertTrue(dist >= 110.0 && dist <= 112.5, "Expected ~111m, got " + dist);
    }
}
