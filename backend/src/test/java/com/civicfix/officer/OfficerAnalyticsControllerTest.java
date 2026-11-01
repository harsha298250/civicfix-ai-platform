package com.civicfix.officer;

import com.civicfix.config.SecurityConfig;
import com.civicfix.officer.dto.OfficerAnalyticsSummaryResponse;
import com.civicfix.officer.dto.OfficerAnalyticsSummaryResponse.AiAdjudicationCounts;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;

import java.lang.reflect.Method;
import java.util.Collections;
import java.util.Map;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class OfficerAnalyticsControllerTest {

    @Mock
    private OfficerAnalyticsService service;

    @InjectMocks
    private OfficerAnalyticsController controller;

    @Test
    @DisplayName("OfficerAnalyticsController is strictly annotated with @PreAuthorize(hasAnyRole('OFFICER', 'SUPERVISOR', 'ADMIN'))")
    void testClassLevelSecurityAnnotation() {
        PreAuthorize classAnnotation = OfficerAnalyticsController.class.getAnnotation(PreAuthorize.class);
        assertNotNull(classAnnotation, "OfficerAnalyticsController must have class-level @PreAuthorize");
        assertEquals("hasAnyRole('OFFICER', 'SUPERVISOR', 'ADMIN')", classAnnotation.value(),
                "Access must be restricted to OFFICER, SUPERVISOR, and ADMIN roles");
    }

    @Test
    @DisplayName("getAnalyticsSummary method enforces @PreAuthorize(hasAnyRole('OFFICER', 'ADMIN'))")
    void testMethodLevelSecurityAnnotation() throws NoSuchMethodException {
        Method method = OfficerAnalyticsController.class.getMethod("getAnalyticsSummary",
                String.class, String.class, String.class, String.class);
        PreAuthorize methodAnnotation = method.getAnnotation(PreAuthorize.class);
        assertNotNull(methodAnnotation, "getAnalyticsSummary must have method-level @PreAuthorize");
        assertEquals("hasAnyRole('OFFICER', 'ADMIN')", methodAnnotation.value());
    }

    @Test
    @DisplayName("getClosureTrustScores method enforces @PreAuthorize(hasAnyRole('OFFICER', 'SUPERVISOR', 'ADMIN'))")
    void testTrustScoreMethodLevelSecurityAnnotation() throws NoSuchMethodException {
        Method method = OfficerAnalyticsController.class.getMethod("getClosureTrustScores",
                String.class, String.class, String.class);
        PreAuthorize methodAnnotation = method.getAnnotation(PreAuthorize.class);
        assertNotNull(methodAnnotation, "getClosureTrustScores must have method-level @PreAuthorize");
        assertEquals("hasAnyRole('OFFICER', 'SUPERVISOR', 'ADMIN')", methodAnnotation.value());
    }

    @Test
    @DisplayName("GET /api/officer/analytics/summary delegates to service with filters and returns 200 OK")
    void testGetAnalyticsSummary_Success() {
        OfficerAnalyticsSummaryResponse mockResponse = new OfficerAnalyticsSummaryResponse(
                40L,
                Map.of("SUBMITTED", 10L, "RESOLVED", 20L),
                Map.of("Ward 10, T. Nagar", 25L),
                Map.of("Roads", 30L),
                Collections.emptyList(),
                31.4,
                24.0,
                5.2,
                3L,
                new AiAdjudicationCounts(25L, 3L, 2L, 10L),
                null
        );

        when(service.getAnalyticsSummary(eq("2026-01-01"), eq("2026-12-31"), eq("Ward 10"), eq("Roads")))
                .thenReturn(mockResponse);

        ResponseEntity<OfficerAnalyticsSummaryResponse> response = controller.getAnalyticsSummary(
                "2026-01-01", "2026-12-31", "Ward 10", "Roads"
        );

        assertEquals(HttpStatus.OK, response.getStatusCode());
        assertNotNull(response.getBody());
        assertEquals(40L, response.getBody().totalComplaints());
        assertEquals(31.4, response.getBody().averageResolutionHours());
        assertEquals(5.2, response.getBody().reworkRate());
        assertEquals(3L, response.getBody().duplicatesLinked());
        assertNull(response.getBody().slaAdherenceRate());

        verify(service).getAnalyticsSummary(eq("2026-01-01"), eq("2026-12-31"), eq("Ward 10"), eq("Roads"));
    }

    @Test
    @DisplayName("GET /api/officer/analytics/trust delegates to service with filters and returns 200 OK")
    void testGetClosureTrustScores_Success() {
        com.civicfix.officer.dto.OfficerTrustAnalyticsResponse mockResponse = new com.civicfix.officer.dto.OfficerTrustAnalyticsResponse(
                "2026-01-01", "2026-12-31",
                new com.civicfix.officer.dto.TrustScoreMetric.OverallTrustScore(8L, 1L, 1L, 10L, 80.0, "Calculated"),
                Collections.emptyList(),
                Collections.emptyList()
        );

        when(service.getClosureTrustScores(eq("2026-01-01"), eq("2026-12-31"), eq("Ward 10")))
                .thenReturn(mockResponse);

        ResponseEntity<com.civicfix.officer.dto.OfficerTrustAnalyticsResponse> response = controller.getClosureTrustScores(
                "2026-01-01", "2026-12-31", "Ward 10"
        );

        assertEquals(HttpStatus.OK, response.getStatusCode());
        assertNotNull(response.getBody());
        assertEquals(80.0, response.getBody().getOverall().trustScore());
        assertEquals(10L, response.getBody().getOverall().totalClosures());
        assertEquals("Calculated", response.getBody().getOverall().statusMessage());

        verify(service).getClosureTrustScores(eq("2026-01-01"), eq("2026-12-31"), eq("Ward 10"));
    }
}

