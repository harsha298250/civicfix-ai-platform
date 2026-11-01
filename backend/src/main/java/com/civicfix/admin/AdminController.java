package com.civicfix.admin;

import com.civicfix.admin.dto.*;
import com.civicfix.security.UserPrincipal;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.Valid;
import org.springframework.core.env.Environment;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.time.OffsetDateTime;
import java.util.Arrays;
import java.util.List;
import java.util.Map;
import java.util.UUID;

/**
 * Controller exposing administrative capabilities for municipal system governance.
 * Requires ADMIN authority for all operations.
 */
@RestController
@RequestMapping("/api/admin")
@PreAuthorize("hasRole('ADMIN')")
public class AdminController {

    private final AdminService adminService;
    private final Environment environment;

    public AdminController(AdminService adminService, Environment environment) {
        this.adminService = adminService;
        this.environment = environment;
    }

    /**
     * Paged user directory query with optional filters for role, status, and search term.
     */
    @GetMapping("/users")
    public ResponseEntity<Page<AdminUserResponse>> getUsers(
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size,
            @RequestParam(required = false) String role,
            @RequestParam(required = false) String status,
            @RequestParam(required = false) String search
    ) {
        Pageable pageable = PageRequest.of(Math.max(0, page), Math.min(100, Math.max(1, size)));
        return ResponseEntity.ok(adminService.getUsers(role, status, search, pageable));
    }

    /**
     * Retrieve individual user account record by UUID.
     */
    @GetMapping("/users/{id}")
    public ResponseEntity<AdminUserResponse> getUserById(@PathVariable UUID id) {
        return ResponseEntity.ok(adminService.getUserById(id));
    }

    /**
     * Create verified OFFICER or WORKER staff account with a validated temporary password.
     */
    @PostMapping("/users")
    public ResponseEntity<AdminUserResponse> createStaff(
            @Valid @RequestBody CreateStaffRequest req,
            @AuthenticationPrincipal UserPrincipal principal,
            HttpServletRequest request
    ) {
        UUID adminId = principal != null ? principal.getId() : null;
        String adminName = principal != null ? principal.getFullName() : "Administrator";
        String ipAddress = request.getRemoteAddr();

        AdminUserResponse created = adminService.createStaff(req, adminId, adminName, ipAddress);
        return ResponseEntity.status(HttpStatus.CREATED).body(created);
    }

    /**
     * Update account status of a user (ACTIVE or SUSPENDED).
     * Prohibits an administrator from suspending their own account.
     */
    @PatchMapping("/users/{id}/status")
    public ResponseEntity<AdminUserResponse> updateUserStatus(
            @PathVariable UUID id,
            @Valid @RequestBody UpdateUserStatusRequest req,
            @AuthenticationPrincipal UserPrincipal principal,
            HttpServletRequest request
    ) {
        UUID adminId = principal != null ? principal.getId() : null;
        String adminName = principal != null ? principal.getFullName() : "Administrator";
        String ipAddress = request.getRemoteAddr();

        AdminUserResponse updated = adminService.updateUserStatus(id, req, adminId, adminName, ipAddress);
        return ResponseEntity.ok(updated);
    }

    /**
     * Query immutable audit trail logs with paged pagination and optional filters.
     */
    @GetMapping("/audit-logs")
    public ResponseEntity<Page<AdminAuditLogResponse>> getAuditLogs(
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "25") int size,
            @RequestParam(required = false) String action,
            @RequestParam(required = false) String actor,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) OffsetDateTime startDate,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) OffsetDateTime endDate
    ) {
        Pageable pageable = PageRequest.of(Math.max(0, page), Math.min(100, Math.max(1, size)));
        return ResponseEntity.ok(adminService.getAuditLogs(action, actor, startDate, endDate, pageable));
    }

    /**
     * Aggregate telemetry and counts computed directly from real database tables without fake offsets.
     */
    @GetMapping("/dashboard/summary")
    public ResponseEntity<DashboardSummaryResponse> getDashboardSummary() {
        return ResponseEntity.ok(adminService.getDashboardSummary());
    }

    /**
     * Retrieve live SLA policy matrix across all categories and priorities.
     * Strictly restricted to platform users with ADMIN role.
     */
    @GetMapping("/sla-policies")
    public ResponseEntity<List<SlaPolicyResponse>> getSlaPolicies() {
        return ResponseEntity.ok(adminService.getSlaPolicies());
    }

    /**
     * Query demo reset capability status.
     * Returns { "available": true } when running under the Spring 'dev' profile, and { "available": false } otherwise.
     */
    @GetMapping("/demo/status")
    public ResponseEntity<Map<String, Boolean>> getDemoStatus() {
        boolean available = Arrays.asList(environment.getActiveProfiles()).contains("dev");
        return ResponseEntity.ok(Map.of("available", available));
    }
}

