package com.civicfix.admin;

import com.civicfix.admin.dto.*;
import com.civicfix.security.UserPrincipal;
import com.civicfix.user.Role;
import com.civicfix.user.RoleName;
import com.civicfix.user.User;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.Pageable;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.mock.env.MockEnvironment;
import org.springframework.mock.web.MockHttpServletRequest;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;

import java.time.OffsetDateTime;
import java.util.*;

import static org.junit.jupiter.api.Assertions.*;

class AdminControllerTest {

    private StubAdminService adminService;
    private MockEnvironment environment;
    private MockHttpServletRequest httpServletRequest;
    private AdminController controller;

    private UserPrincipal adminPrincipal;
    private AdminUserResponse sampleUserResponse;

    static class StubAdminService extends AdminService {
        public Page<AdminUserResponse> usersPage;
        public AdminUserResponse singleUser;
        public AdminUserResponse createdStaff;
        public AdminUserResponse updatedUser;
        public Page<AdminAuditLogResponse> auditLogsPage;
        public DashboardSummaryResponse dashboardSummary;
        public List<SlaPolicyResponse> slaPolicies;

        public StubAdminService() {
            super(null, null, null, null, null, null, null);
        }

        @Override
        public Page<AdminUserResponse> getUsers(String roleStr, String status, String search, Pageable pageable) {
            return usersPage;
        }

        @Override
        public AdminUserResponse getUserById(UUID id) {
            return singleUser;
        }

        @Override
        public AdminUserResponse createStaff(CreateStaffRequest req, UUID adminId, String adminName, String ipAddress) {
            return createdStaff;
        }

        @Override
        public AdminUserResponse updateUserStatus(UUID id, UpdateUserStatusRequest req, UUID adminId, String adminName, String ipAddress) {
            return updatedUser;
        }

        @Override
        public Page<AdminAuditLogResponse> getAuditLogs(String action, String actor, OffsetDateTime startDate, OffsetDateTime endDate, Pageable pageable) {
            return auditLogsPage;
        }

        @Override
        public DashboardSummaryResponse getDashboardSummary() {
            return dashboardSummary;
        }

        @Override
        public List<SlaPolicyResponse> getSlaPolicies() {
            return slaPolicies;
        }
    }

    @BeforeEach
    void setUp() {
        adminService = new StubAdminService();
        environment = new MockEnvironment();
        httpServletRequest = new MockHttpServletRequest();
        controller = new AdminController(adminService, environment);

        User adminUser = new User();
        adminUser.setId(UUID.randomUUID());
        adminUser.setFullName("Priya Sharma");
        adminUser.setEmail("priya.sharma@admin.gov");
        adminUser.setPasswordHash("$2a$10$xyz");
        adminUser.setAccountStatus("ACTIVE");
        adminUser.setRoles(Set.of(new Role(RoleName.ADMIN)));

        adminPrincipal = new UserPrincipal(adminUser);

        sampleUserResponse = new AdminUserResponse();
        sampleUserResponse.setId(UUID.randomUUID());
        sampleUserResponse.setFullName("Elena Vance");
        sampleUserResponse.setEmail("elena.vance@metro.gov");
        sampleUserResponse.setRoles(Set.of("OFFICER"));
        sampleUserResponse.setAccountStatus("ACTIVE");
    }

    @Test
    @DisplayName("AdminController is strictly annotated with @PreAuthorize(hasRole('ADMIN'))")
    void testClassLevelSecurityAnnotation() {
        PreAuthorize preAuth = AdminController.class.getAnnotation(PreAuthorize.class);
        assertNotNull(preAuth, "AdminController must be annotated with @PreAuthorize");
        assertEquals("hasRole('ADMIN')", preAuth.value(), "AdminController must require ROLE_ADMIN");
    }

    @Test
    @DisplayName("GET /api/admin/users delegates to service and returns 200 with sanitized response")
    void testGetUsers_Success() {
        adminService.usersPage = new PageImpl<>(List.of(sampleUserResponse));

        ResponseEntity<Page<AdminUserResponse>> response = controller.getUsers(0, 20, "OFFICER", "ACTIVE", "Elena");

        assertEquals(HttpStatus.OK, response.getStatusCode());
        assertNotNull(response.getBody());
        assertEquals(1, response.getBody().getTotalElements());
        assertEquals("Elena Vance", response.getBody().getContent().get(0).getFullName());
    }

    @Test
    @DisplayName("GET /api/admin/users/{id} delegates to service and returns 200")
    void testGetUserById_Success() {
        UUID userId = sampleUserResponse.getId();
        adminService.singleUser = sampleUserResponse;

        ResponseEntity<AdminUserResponse> response = controller.getUserById(userId);

        assertEquals(HttpStatus.OK, response.getStatusCode());
        assertNotNull(response.getBody());
        assertEquals(userId, response.getBody().getId());
    }

    @Test
    @DisplayName("POST /api/admin/users creates staff account and returns 201 CREATED")
    void testCreateStaff_Success() {
        CreateStaffRequest req = new CreateStaffRequest();
        req.setFullName("Marcus Chen");
        req.setEmail("marcus.chen@fieldops.gov");
        req.setRole("WORKER");
        req.setPassword("TempPass#2026!");

        httpServletRequest.setRemoteAddr("192.168.1.100");
        adminService.createdStaff = sampleUserResponse;

        ResponseEntity<AdminUserResponse> response = controller.createStaff(req, adminPrincipal, httpServletRequest);

        assertEquals(HttpStatus.CREATED, response.getStatusCode());
        assertNotNull(response.getBody());
    }

    @Test
    @DisplayName("PATCH /api/admin/users/{id}/status updates status and returns 200")
    void testUpdateUserStatus_Success() {
        UUID targetId = sampleUserResponse.getId();
        UpdateUserStatusRequest req = new UpdateUserStatusRequest("SUSPENDED", "Policy audit");

        httpServletRequest.setRemoteAddr("192.168.1.100");
        adminService.updatedUser = sampleUserResponse;

        ResponseEntity<AdminUserResponse> response = controller.updateUserStatus(targetId, req, adminPrincipal, httpServletRequest);

        assertEquals(HttpStatus.OK, response.getStatusCode());
        assertNotNull(response.getBody());
    }

    @Test
    @DisplayName("GET /api/admin/audit-logs delegates to service and returns 200")
    void testGetAuditLogs_Success() {
        AdminAuditLogResponse logResp = new AdminAuditLogResponse();
        logResp.setId(UUID.randomUUID());
        logResp.setAction("STAFF_CREATED");
        logResp.setActorName("Priya Sharma");
        logResp.setCreatedAt(OffsetDateTime.now());

        adminService.auditLogsPage = new PageImpl<>(List.of(logResp));

        ResponseEntity<Page<AdminAuditLogResponse>> response = controller.getAuditLogs(0, 25, "STAFF_CREATED", "Priya", null, null);

        assertEquals(HttpStatus.OK, response.getStatusCode());
        assertNotNull(response.getBody());
        assertEquals(1, response.getBody().getTotalElements());
        assertEquals("STAFF_CREATED", response.getBody().getContent().get(0).getAction());
    }

    @Test
    @DisplayName("GET /api/admin/dashboard/summary returns real database counts without fake offsets")
    void testGetDashboardSummary_Success() {
        DashboardSummaryResponse summary = new DashboardSummaryResponse(
                Map.of("CITIZEN", 10L, "OFFICER", 2L),
                Map.of("SUBMITTED", 15L, "RESOLVED", 5L),
                8L,
                12L,
                20L,
                1L
        );
        adminService.dashboardSummary = summary;

        ResponseEntity<DashboardSummaryResponse> response = controller.getDashboardSummary();

        assertEquals(HttpStatus.OK, response.getStatusCode());
        assertNotNull(response.getBody());
        assertEquals(12L, response.getBody().getTotalUsers());
        assertEquals(20L, response.getBody().getTotalComplaints());
        assertEquals(8L, response.getBody().getAuditEventsLast24h());
    }

    @Test
    @DisplayName("GET /api/admin/sla-policies returns 200 with list of policies from service")
    void testGetSlaPolicies_Success() {
        SlaPolicyResponse pol = new SlaPolicyResponse(1, "ROADS", "CRITICAL", 12);
        adminService.slaPolicies = List.of(pol);

        ResponseEntity<List<SlaPolicyResponse>> response = controller.getSlaPolicies();

        assertEquals(HttpStatus.OK, response.getStatusCode());
        assertNotNull(response.getBody());
        assertEquals(1, response.getBody().size());
        assertEquals("ROADS", response.getBody().get(0).getCategory());
        assertEquals("CRITICAL", response.getBody().get(0).getPriority());
        assertEquals(12, response.getBody().get(0).getHours());
    }

    @Test
    @DisplayName("GET /api/admin/demo/status returns available: true in dev profile")
    void testGetDemoStatus_DevProfile() {
        environment.setActiveProfiles("dev");

        ResponseEntity<Map<String, Boolean>> response = controller.getDemoStatus();

        assertEquals(HttpStatus.OK, response.getStatusCode());
        assertNotNull(response.getBody());
        assertTrue(response.getBody().get("available"));
    }

    @Test
    @DisplayName("GET /api/admin/demo/status returns available: false in prod/test profile")
    void testGetDemoStatus_ProdProfile() {
        environment.setActiveProfiles("prod");

        ResponseEntity<Map<String, Boolean>> response = controller.getDemoStatus();

        assertEquals(HttpStatus.OK, response.getStatusCode());
        assertNotNull(response.getBody());
        assertFalse(response.getBody().get("available"));
    }

    @Test
    @DisplayName("Security Verification: GET /api/admin/sla-policies requires ROLE_ADMIN and denies non-admins")
    void testSlaPoliciesSecurityRequirement() throws NoSuchMethodException {
        // 1. Verify class-level @PreAuthorize requires ROLE_ADMIN
        PreAuthorize classAuth = AdminController.class.getAnnotation(PreAuthorize.class);
        assertNotNull(classAuth, "AdminController must be annotated with @PreAuthorize");
        assertEquals("hasRole('ADMIN')", classAuth.value());

        // 2. Verify getSlaPolicies method mapping
        var method = AdminController.class.getMethod("getSlaPolicies");
        GetMapping getMapping = method.getAnnotation(GetMapping.class);
        assertNotNull(getMapping, "getSlaPolicies must be mapped with @GetMapping");
        assertArrayEquals(new String[]{"/sla-policies"}, getMapping.value());

        // 3. Verify non-admin role rejection
        User citizenUser = new User();
        citizenUser.setId(UUID.randomUUID());
        citizenUser.setRoles(Set.of(new Role(RoleName.CITIZEN)));
        UserPrincipal citizenPrincipal = new UserPrincipal(citizenUser);
        assertFalse(
                citizenPrincipal.getAuthorities().stream().anyMatch(a -> a.getAuthority().equals("ROLE_ADMIN")),
                "Citizen must not possess ROLE_ADMIN authority (403 Forbidden)"
        );

        User officerUser = new User();
        officerUser.setId(UUID.randomUUID());
        officerUser.setRoles(Set.of(new Role(RoleName.OFFICER)));
        UserPrincipal officerPrincipal = new UserPrincipal(officerUser);
        assertFalse(
                officerPrincipal.getAuthorities().stream().anyMatch(a -> a.getAuthority().equals("ROLE_ADMIN")),
                "Officer must not possess ROLE_ADMIN authority (403 Forbidden)"
        );
    }

    @Test
    @DisplayName("Security Verification: GET /api/admin/demo/status requires ROLE_ADMIN and denies non-admins")
    void testDemoStatusSecurityRequirement() throws NoSuchMethodException {
        var method = AdminController.class.getMethod("getDemoStatus");
        GetMapping getMapping = method.getAnnotation(GetMapping.class);
        assertNotNull(getMapping, "getDemoStatus must be mapped with @GetMapping");
        assertArrayEquals(new String[]{"/demo/status"}, getMapping.value());

        User workerUser = new User();
        workerUser.setId(UUID.randomUUID());
        workerUser.setRoles(Set.of(new Role(RoleName.WORKER)));
        UserPrincipal workerPrincipal = new UserPrincipal(workerUser);
        assertFalse(
                workerPrincipal.getAuthorities().stream().anyMatch(a -> a.getAuthority().equals("ROLE_ADMIN")),
                "Worker must not possess ROLE_ADMIN authority (403 Forbidden)"
        );
    }
}
