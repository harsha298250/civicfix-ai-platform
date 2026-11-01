package com.civicfix.officer;

import com.civicfix.officer.dto.OfficerTrustAnalyticsResponse;
import com.civicfix.officer.dto.PublicTrustAnalyticsResponse;
import com.civicfix.officer.dto.TrustScoreMetric;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.mockito.junit.jupiter.MockitoSettings;
import org.mockito.quality.Strictness;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.jdbc.core.ResultSetExtractor;
import org.springframework.jdbc.core.RowMapper;

import java.util.*;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

/**
 * Fixture-based tests verifying the Closure Trust Score calculation,
 * threshold logic (< 5 closures), and SQL aggregate mapping.
 */
@ExtendWith(MockitoExtension.class)
@MockitoSettings(strictness = Strictness.LENIENT)
class ClosureTrustScoreTest {

    @Mock
    private JdbcTemplate jdbcTemplate;

    @InjectMocks
    private OfficerAnalyticsService service;

    @Test
    @DisplayName("Formula verification: confirmed / (confirmed + rejected + reopened)")
    void testCalculateScoreFormulaAndThresholds() {
        // Sufficient data (>= 5 closures)
        // 8 confirmed out of 10 total = 80.0%
        assertEquals(80.0, service.calculateScore(8, 10), 0.001);

        // 4 confirmed, 1 rejected = 4/5 = 80.0%
        assertEquals(80.0, service.calculateScore(4, 5), 0.001);

        // 5 confirmed, 0 rejected = 5/5 = 100.0%
        assertEquals(100.0, service.calculateScore(5, 5), 0.001);

        // 0 confirmed, 5 rejected = 0/5 = 0.0%
        assertEquals(0.0, service.calculateScore(0, 5), 0.001);

        // 7 confirmed, 2 rejected, 1 reopened = 7/10 = 70.0%
        assertEquals(70.0, service.calculateScore(7, 10), 0.001);

        // Fewer than 5 closures strictly returns null
        assertNull(service.calculateScore(2, 3), "Total of 3 (< 5) must return null");
        assertNull(service.calculateScore(4, 4), "Total of 4 (< 5) must return null");
        assertNull(service.calculateScore(1, 1), "Total of 1 (< 5) must return null");
        assertNull(service.calculateScore(0, 0), "Total of 0 (< 5) must return null");
    }

    @Test
    @DisplayName("Manual Calculation Match: 8 confirmed, 1 rejected, 1 reopened gives exactly 80.0% trust score")
    void testTrustScoreCalculation_SufficientData() {
        UUID officer1 = UUID.randomUUID();

        TrustScoreMetric.OverallTrustScore mockOverall = new TrustScoreMetric.OverallTrustScore(
                8L, 1L, 1L, 10L, 80.0, "Calculated"
        );
        TrustScoreMetric.WardTrustScore mockWard = new TrustScoreMetric.WardTrustScore(
                "Ward 10, T. Nagar", 8L, 1L, 1L, 10L, 80.0, "Calculated"
        );
        TrustScoreMetric.OfficerTrustScore mockOfficer = new TrustScoreMetric.OfficerTrustScore(
                officer1, "Elena Vance", "elena.vance@metro.gov", "Public Works", "Ward 10",
                8L, 1L, 1L, 10L, 80.0, "Calculated"
        );

        when(jdbcTemplate.query(contains("FROM closure_events ce"), any(ResultSetExtractor.class), any(Object[].class)))
                .thenReturn(mockOverall);
        when(jdbcTemplate.query(contains("GROUP BY COALESCE(ce.ward, 'Unknown')"), any(RowMapper.class), any(Object[].class)))
                .thenReturn(List.of(mockWard));
        when(jdbcTemplate.query(contains("JOIN users u ON u.id = ce.officer_id"), any(RowMapper.class), any(Object[].class)))
                .thenReturn(List.of(mockOfficer));

        OfficerTrustAnalyticsResponse response = service.getClosureTrustScores("2026-01-01", "2026-12-31", null);

        assertNotNull(response);
        // Manual calculation check: 8 / (8 + 1 + 1) = 8 / 10 = 0.80 = 80.0%
        assertEquals(10L, response.getOverall().totalClosures());
        assertEquals(8L, response.getOverall().confirmedClosures());
        assertEquals(1L, response.getOverall().citizenRejections());
        assertEquals(1L, response.getOverall().reopenedAfterResolution());
        assertEquals(80.0, response.getOverall().trustScore(), 0.001);
        assertEquals("Calculated", response.getOverall().statusMessage());

        // Ward check
        assertEquals(1, response.getByWard().size());
        TrustScoreMetric.WardTrustScore ward = response.getByWard().get(0);
        assertEquals("Ward 10, T. Nagar", ward.ward());
        assertEquals(80.0, ward.trustScore(), 0.001);
        assertEquals("Calculated", ward.statusMessage());

        // Officer check
        assertEquals(1, response.getByOfficer().size());
        TrustScoreMetric.OfficerTrustScore off = response.getByOfficer().get(0);
        assertEquals(officer1, off.officerId());
        assertEquals("Elena Vance", off.officerName());
        assertEquals(80.0, off.trustScore(), 0.001);
        assertEquals("Calculated", off.statusMessage());
    }

    @Test
    @DisplayName("Fewer than 5 closures strictly returns null trustScore with 'Not enough data (< 5 closures)' message")
    void testTrustScoreCalculation_NotEnoughData() {
        UUID officer2 = UUID.randomUUID();

        TrustScoreMetric.OverallTrustScore mockOverall = new TrustScoreMetric.OverallTrustScore(
                2L, 1L, 0L, 3L, null, "Not enough data (< 5 closures)"
        );
        TrustScoreMetric.WardTrustScore mockWard = new TrustScoreMetric.WardTrustScore(
                "Ward 12, Adyar", 2L, 1L, 0L, 3L, null, "Not enough data (< 5 closures)"
        );
        TrustScoreMetric.OfficerTrustScore mockOfficer = new TrustScoreMetric.OfficerTrustScore(
                officer2, "Marcus Chen", "marcus.chen@metro.gov", "Field Engineering", "Ward 12",
                2L, 1L, 0L, 3L, null, "Not enough data (< 5 closures)"
        );

        when(jdbcTemplate.query(contains("FROM closure_events ce"), any(ResultSetExtractor.class), any(Object[].class)))
                .thenReturn(mockOverall);
        when(jdbcTemplate.query(contains("GROUP BY COALESCE(ce.ward, 'Unknown')"), any(RowMapper.class), any(Object[].class)))
                .thenReturn(List.of(mockWard));
        when(jdbcTemplate.query(contains("JOIN users u ON u.id = ce.officer_id"), any(RowMapper.class), any(Object[].class)))
                .thenReturn(List.of(mockOfficer));

        OfficerTrustAnalyticsResponse response = service.getClosureTrustScores(null, null, null);

        assertNotNull(response);
        assertEquals(3L, response.getOverall().totalClosures());
        assertNull(response.getOverall().trustScore(), "Trust score must be null when fewer than 5 closures exist");
        assertEquals("Not enough data (< 5 closures)", response.getOverall().statusMessage());

        TrustScoreMetric.WardTrustScore ward = response.getByWard().get(0);
        assertNull(ward.trustScore(), "Ward trust score must be null when < 5 closures exist");
        assertEquals("Not enough data (< 5 closures)", ward.statusMessage());

        TrustScoreMetric.OfficerTrustScore officer = response.getByOfficer().get(0);
        assertNull(officer.trustScore(), "Officer trust score must be null when < 5 closures exist");
        assertEquals("Not enough data (< 5 closures)", officer.statusMessage());
    }

    @Test
    @DisplayName("Public Transparency Response contains per-ward scores only and never exposes officer personnel data")
    void testPublicTransparencyResponse_ExcludesOfficerData() {
        TrustScoreMetric.OverallTrustScore mockOverall = new TrustScoreMetric.OverallTrustScore(
                5L, 0L, 0L, 5L, 100.0, "Calculated"
        );
        TrustScoreMetric.WardTrustScore mockWard = new TrustScoreMetric.WardTrustScore(
                "Ward 08, Anna Nagar", 5L, 0L, 0L, 5L, 100.0, "Calculated"
        );

        when(jdbcTemplate.query(contains("FROM closure_events ce"), any(ResultSetExtractor.class), any(Object[].class)))
                .thenReturn(mockOverall);
        when(jdbcTemplate.query(contains("GROUP BY COALESCE(ce.ward, 'Unknown')"), any(RowMapper.class), any(Object[].class)))
                .thenReturn(List.of(mockWard));
        when(jdbcTemplate.query(contains("JOIN users u ON u.id = ce.officer_id"), any(RowMapper.class), any(Object[].class)))
                .thenReturn(Collections.emptyList());

        PublicTrustAnalyticsResponse response = service.getPublicWardTrustScores("2026-10-01", "2026-10-31");

        assertNotNull(response);
        assertEquals(100.0, response.getOverall().trustScore());
        assertEquals(1, response.getByWard().size());
        assertEquals("Ward 08, Anna Nagar", response.getByWard().get(0).ward());
        assertEquals(100.0, response.getByWard().get(0).trustScore());

        // Verify PublicTrustAnalyticsResponse class has NO officer-related fields or methods
        assertThrows(NoSuchFieldException.class, () -> PublicTrustAnalyticsResponse.class.getDeclaredField("byOfficer"));
    }
}
