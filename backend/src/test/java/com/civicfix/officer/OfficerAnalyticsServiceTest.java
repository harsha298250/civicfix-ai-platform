package com.civicfix.officer;

import com.civicfix.common.exception.BadRequestException;
import com.civicfix.officer.dto.OfficerAnalyticsSummaryResponse;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.mockito.junit.jupiter.MockitoSettings;
import org.mockito.quality.Strictness;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.jdbc.core.RowCallbackHandler;
import org.springframework.jdbc.core.RowMapper;
import org.springframework.jdbc.core.ResultSetExtractor;

import java.sql.ResultSet;
import java.util.*;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
@MockitoSettings(strictness = Strictness.LENIENT)
class OfficerAnalyticsServiceTest {

    @Mock
    private JdbcTemplate jdbcTemplate;

    @InjectMocks
    private OfficerAnalyticsService service;

    @Test
    @DisplayName("Aggregates match known fixtures and SQL results")
    void testGetAnalyticsSummary_MatchesKnownFixtures() throws Exception {
        // 1. Mock Status query: startsWith("SELECT c.status,")
        doAnswer(invocation -> {
            RowCallbackHandler handler = invocation.getArgument(1);
            ResultSet rs1 = mock(ResultSet.class);
            when(rs1.getString("status")).thenReturn("SUBMITTED");
            when(rs1.getLong("cnt")).thenReturn(10L);
            handler.processRow(rs1);

            ResultSet rs2 = mock(ResultSet.class);
            when(rs2.getString("status")).thenReturn("RESOLVED");
            when(rs2.getLong("cnt")).thenReturn(20L);
            handler.processRow(rs2);

            ResultSet rs3 = mock(ResultSet.class);
            when(rs3.getString("status")).thenReturn("REWORK_REQUESTED");
            when(rs3.getLong("cnt")).thenReturn(2L);
            handler.processRow(rs3);
            return null;
        }).when(jdbcTemplate).query(startsWith("SELECT c.status,"), any(RowCallbackHandler.class), any(Object[].class));

        // 2. Mock Ward query: startsWith("SELECT COALESCE(c.ward, 'Unknown') AS ward_name, COUNT(*)")
        doAnswer(invocation -> {
            RowCallbackHandler handler = invocation.getArgument(1);
            ResultSet rs1 = mock(ResultSet.class);
            when(rs1.getString("ward_name")).thenReturn("Ward 10, T. Nagar");
            when(rs1.getLong("cnt")).thenReturn(18L);
            handler.processRow(rs1);

            ResultSet rs2 = mock(ResultSet.class);
            when(rs2.getString("ward_name")).thenReturn("Ward 13, Adyar");
            when(rs2.getLong("cnt")).thenReturn(14L);
            handler.processRow(rs2);
            return null;
        }).when(jdbcTemplate).query(startsWith("SELECT COALESCE(c.ward, 'Unknown') AS ward_name, COUNT(*)"), any(RowCallbackHandler.class), any(Object[].class));

        // 3. Mock Category query: startsWith("SELECT c.category, COUNT(*)")
        doAnswer(invocation -> {
            RowCallbackHandler handler = invocation.getArgument(1);
            ResultSet rs1 = mock(ResultSet.class);
            when(rs1.getString("category")).thenReturn("Roads & Pavements");
            when(rs1.getLong("cnt")).thenReturn(20L);
            handler.processRow(rs1);

            ResultSet rs2 = mock(ResultSet.class);
            when(rs2.getString("category")).thenReturn("Water Supply & Drainage");
            when(rs2.getLong("cnt")).thenReturn(12L);
            handler.processRow(rs2);
            return null;
        }).when(jdbcTemplate).query(startsWith("SELECT c.category, COUNT(*)"), any(RowCallbackHandler.class), any(Object[].class));

        // 4. Mock Ward & Category list query: startsWith("SELECT COALESCE(c.ward, 'Unknown') AS ward_name, c.category")
        when(jdbcTemplate.query(startsWith("SELECT COALESCE(c.ward, 'Unknown') AS ward_name, c.category"), any(RowMapper.class), any(Object[].class)))
                .thenReturn(List.of(
                        new OfficerAnalyticsSummaryResponse.WardCategoryCount("Ward 10, T. Nagar", "Roads & Pavements", 12L),
                        new OfficerAnalyticsSummaryResponse.WardCategoryCount("Ward 13, Adyar", "Water Supply & Drainage", 10L)
                ));

        // 5. Mock Duplicates linked: startsWith("SELECT COUNT(*) FROM complaints c")
        when(jdbcTemplate.queryForObject(contains("duplicate_of_id IS NOT NULL"), eq(Long.class), any(Object[].class)))
                .thenReturn(3L);

        // 6. Mock AI adjudication counts: startsWith("SELECT UPPER(COALESCE(c.ai_adjudication_status")
        doAnswer(invocation -> {
            RowCallbackHandler handler = invocation.getArgument(1);
            ResultSet rs1 = mock(ResultSet.class);
            when(rs1.getString("adj_status")).thenReturn("ACCEPTED");
            when(rs1.getLong("cnt")).thenReturn(25L);
            handler.processRow(rs1);

            ResultSet rs2 = mock(ResultSet.class);
            when(rs2.getString("adj_status")).thenReturn("OVERRIDDEN");
            when(rs2.getLong("cnt")).thenReturn(4L);
            handler.processRow(rs2);

            ResultSet rs3 = mock(ResultSet.class);
            when(rs3.getString("adj_status")).thenReturn("DISMISSED");
            when(rs3.getLong("cnt")).thenReturn(2L);
            handler.processRow(rs3);
            return null;
        }).when(jdbcTemplate).query(startsWith("SELECT UPPER(COALESCE(c.ai_adjudication_status"), any(RowCallbackHandler.class), any(Object[].class));

        // 7. Mock Resolution Hours: average=28.4, median=24.0
        when(jdbcTemplate.query(contains("PERCENTILE_CONT"), any(ResultSetExtractor.class), any(Object[].class)))
                .thenReturn(new Double[]{ 28.4111, 24.0 });

        // 8. Mock Rework Rate: rework_cnt=2, verified_cnt=22 -> 2 * 100 / 22 = 9.09% -> 9.1%
        when(jdbcTemplate.query(contains("rework_cnt"), any(ResultSetExtractor.class), any(Object[].class)))
                .thenReturn(9.1);

        OfficerAnalyticsSummaryResponse response = service.getAnalyticsSummary(
                "2026-10-01", "2026-10-31", "Ward 10, T. Nagar", "Roads & Pavements"
        );

        assertNotNull(response);
        assertEquals(32L, response.totalComplaints());
        assertEquals(10L, response.countsByStatus().get("SUBMITTED"));
        assertEquals(20L, response.countsByStatus().get("RESOLVED"));
        assertEquals(2L, response.countsByStatus().get("REWORK_REQUESTED"));
        assertEquals(18L, response.countsByWard().get("Ward 10, T. Nagar"));
        assertEquals(20L, response.countsByCategory().get("Roads & Pavements"));
        assertEquals(2, response.countsByWardAndCategory().size());
        assertEquals(3L, response.duplicatesLinked());
        assertEquals(25L, response.aiAdjudicationCounts().accepted());
        assertEquals(4L, response.aiAdjudicationCounts().overridden());
        assertEquals(2L, response.aiAdjudicationCounts().dismissed());
        assertEquals(28.4, response.averageResolutionHours());
        assertEquals(24.0, response.medianResolutionHours());
        assertEquals(9.1, response.reworkRate());
        assertNull(response.slaAdherenceRate(), "SLA adherence rate must be null (not invented)");
    }

    @Test
    @DisplayName("Empty resolution data returns null for average and median hours")
    void testEmptyResolutionData_ReturnsNullHours() {
        when(jdbcTemplate.query(contains("PERCENTILE_CONT"), any(ResultSetExtractor.class), any(Object[].class)))
                .thenReturn(new Double[]{ null, null });
        when(jdbcTemplate.query(contains("rework_cnt"), any(ResultSetExtractor.class), any(Object[].class)))
                .thenReturn(0.0);

        OfficerAnalyticsSummaryResponse response = service.getAnalyticsSummary(null, null, null, null);

        assertNotNull(response);
        assertNull(response.averageResolutionHours());
        assertNull(response.medianResolutionHours());
        assertEquals(0.0, response.reworkRate());
    }

    @Test
    @DisplayName("Invalid date formats throw BadRequestException")
    void testInvalidDates_ThrowsBadRequest() {
        assertThrows(BadRequestException.class, () ->
                service.getAnalyticsSummary("invalid-date", null, null, null)
        );

        assertThrows(BadRequestException.class, () ->
                service.getAnalyticsSummary("2026-10-31", "2026-10-01", null, null)
        );
    }
}
