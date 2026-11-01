package com.civicfix.officer;

import com.civicfix.officer.dto.OfficerAnalyticsSummaryResponse;
import com.civicfix.officer.dto.OfficerTrustAnalyticsResponse;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/officer/analytics")
@PreAuthorize("hasAnyRole('OFFICER', 'SUPERVISOR', 'ADMIN')")
public class OfficerAnalyticsController {

    private final OfficerAnalyticsService officerAnalyticsService;

    public OfficerAnalyticsController(OfficerAnalyticsService officerAnalyticsService) {
        this.officerAnalyticsService = officerAnalyticsService;
    }

    @GetMapping("/summary")
    @PreAuthorize("hasAnyRole('OFFICER', 'ADMIN')")
    public ResponseEntity<OfficerAnalyticsSummaryResponse> getAnalyticsSummary(
            @RequestParam(required = false) String from,
            @RequestParam(required = false) String to,
            @RequestParam(required = false) String ward,
            @RequestParam(required = false) String category
    ) {
        OfficerAnalyticsSummaryResponse response = officerAnalyticsService.getAnalyticsSummary(from, to, ward, category);
        return ResponseEntity.ok(response);
    }

    @GetMapping("/trust")
    @PreAuthorize("hasAnyRole('OFFICER', 'SUPERVISOR', 'ADMIN')")
    public ResponseEntity<OfficerTrustAnalyticsResponse> getClosureTrustScores(
            @RequestParam(required = false) String from,
            @RequestParam(required = false) String to,
            @RequestParam(required = false) String ward
    ) {
        OfficerTrustAnalyticsResponse response = officerAnalyticsService.getClosureTrustScores(from, to, ward);
        return ResponseEntity.ok(response);
    }
}
