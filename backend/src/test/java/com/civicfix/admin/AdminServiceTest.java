package com.civicfix.admin;

import com.civicfix.admin.dto.*;
import com.civicfix.audit.AuditLog;
import com.civicfix.audit.AuditLogRepository;
import com.civicfix.audit.AuditService;
import com.civicfix.common.exception.BadRequestException;
import com.civicfix.common.exception.ResourceNotFoundException;
import com.civicfix.complaint.ComplaintRepository;
import com.civicfix.complaint.ComplaintStatus;
import com.civicfix.complaint.sla.SlaPolicy;
import com.civicfix.complaint.sla.SlaPolicyRepository;
import com.civicfix.user.*;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.PageRequest;
import org.springframework.security.crypto.password.PasswordEncoder;

import java.time.OffsetDateTime;
import java.util.*;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class AdminServiceTest {

    @Mock
    private UserRepository userRepository;

    @Mock
    private RoleRepository roleRepository;

    @Mock
    private ComplaintRepository complaintRepository;

    @Mock
    private AuditLogRepository auditLogRepository;

    @Mock
    private AuditService auditService;

    @Mock
    private PasswordEncoder passwordEncoder;

    @Mock
    private SlaPolicyRepository slaPolicyRepository;

    private AdminService adminService;

    private User sampleUser;
    private Role officerRole;
    private Role workerRole;
    private UUID adminId;

    @BeforeEach
    void setUp() {
        adminService = new AdminService(
                userRepository,
                roleRepository,
                complaintRepository,
                auditLogRepository,
                auditService,
                passwordEncoder,
                slaPolicyRepository
        );

        adminId = UUID.randomUUID();

        officerRole = new Role(RoleName.OFFICER);
        workerRole = new Role(RoleName.WORKER);

        sampleUser = new User();
        sampleUser.setId(UUID.randomUUID());
        sampleUser.setFullName("Ravi Kumar");
        sampleUser.setEmail("ravi.k@metro.gov");
        sampleUser.setPhone("+91 94440 11223");
        sampleUser.setPasswordHash("$2a$10$SecretHashedPassword12345");
        sampleUser.setAccountStatus("ACTIVE");
        sampleUser.setDepartment("Electrical Division");
        sampleUser.setWard("Ward 10");
        sampleUser.setTrustScore(95);
        sampleUser.setRoles(Set.of(officerRole));
    }

    @Test
    @DisplayName("getUsers returns sanitized profiles and NEVER exposes password_hash")
    void testGetUsers_NeverReturnsPasswordHash() {
        Page<User> page = new PageImpl<>(List.of(sampleUser));
        when(userRepository.findUsersWithFilters(eq(RoleName.OFFICER), eq("ACTIVE"), any(), any()))
                .thenReturn(page);

        Page<AdminUserResponse> result = adminService.getUsers("OFFICER", "ACTIVE", null, PageRequest.of(0, 10));

        assertEquals(1, result.getTotalElements());
        AdminUserResponse resp = result.getContent().get(0);
        assertEquals("Ravi Kumar", resp.getFullName());
        assertEquals("ravi.k@metro.gov", resp.getEmail());
        assertTrue(resp.getRoles().contains("OFFICER"));

        // Verify that AdminUserResponse class has NO getPasswordHash method
        assertNull(Arrays.stream(AdminUserResponse.class.getDeclaredFields())
                .filter(f -> f.getName().toLowerCase().contains("password"))
                .findAny()
                .orElse(null), "AdminUserResponse must have no password field");
    }

    @Test
    @DisplayName("getUserById returns user without password hash or throws 404")
    void testGetUserById() {
        when(userRepository.findById(sampleUser.getId())).thenReturn(Optional.of(sampleUser));

        AdminUserResponse resp = adminService.getUserById(sampleUser.getId());
        assertNotNull(resp);
        assertEquals(sampleUser.getId(), resp.getId());

        UUID nonexistent = UUID.randomUUID();
        when(userRepository.findById(nonexistent)).thenReturn(Optional.empty());
        assertThrows(ResourceNotFoundException.class, () -> adminService.getUserById(nonexistent));
    }

    @Test
    @DisplayName("createStaff validates role, hashes password, writes audit log, and creates staff")
    void testCreateStaff_Success() {
        CreateStaffRequest req = new CreateStaffRequest();
        req.setFullName("Karthik S");
        req.setEmail("karthik.s@metro.gov");
        req.setPhone("+91 98401 55667");
        req.setPassword("TempPass#2026!");
        req.setRole("WORKER");
        req.setDepartment("Road Maintenance");
        req.setWard("Ward 08");

        when(userRepository.existsByEmailIgnoreCase("karthik.s@metro.gov")).thenReturn(false);
        when(userRepository.existsByPhone("+91 98401 55667")).thenReturn(false);
        when(roleRepository.findByName(RoleName.WORKER)).thenReturn(Optional.of(workerRole));
        when(passwordEncoder.encode("TempPass#2026!")).thenReturn("$2a$10$encodedTempPass");
        when(userRepository.save(any(User.class))).thenAnswer(invocation -> {
            User u = invocation.getArgument(0);
            u.setId(UUID.randomUUID());
            return u;
        });

        AdminUserResponse result = adminService.createStaff(req, adminId, "Priya Sharma", "127.0.0.1");

        assertNotNull(result);
        assertEquals("Karthik S", result.getFullName());
        assertEquals("karthik.s@metro.gov", result.getEmail());
        assertTrue(result.getRoles().contains("WORKER"));

        // Verify audit log written
        verify(auditService).logAction(
                eq(adminId),
                eq("Priya Sharma"),
                eq("ADMIN"),
                eq("STAFF_CREATED"),
                eq("USER"),
                eq(result.getId().toString()),
                anyString(),
                eq("127.0.0.1"),
                eq("SUCCESS")
        );
    }

    @Test
    @DisplayName("createStaff rejects invalid role (e.g. CITIZEN or ADMIN)")
    void testCreateStaff_RejectsInvalidRole() {
        CreateStaffRequest req = new CreateStaffRequest();
        req.setFullName("Test User");
        req.setEmail("test@citizen.org");
        req.setPassword("TempPass#2026!");
        req.setRole("CITIZEN");

        BadRequestException ex = assertThrows(BadRequestException.class, () ->
                adminService.createStaff(req, adminId, "Priya Sharma", "127.0.0.1")
        );
        assertTrue(ex.getMessage().contains("OFFICER, WORKER, or SUPERVISOR"));
    }

    @Test
    @DisplayName("createStaff accepts SUPERVISOR role")
    void testCreateStaff_AcceptsSupervisorRole() {
        Role supervisorRole = new Role(RoleName.SUPERVISOR);
        when(roleRepository.findByName(RoleName.SUPERVISOR)).thenReturn(Optional.of(supervisorRole));
        when(userRepository.existsByEmailIgnoreCase("sarah.j@metro.gov")).thenReturn(false);
        when(userRepository.save(any(User.class))).thenAnswer(i -> {
            User u = i.getArgument(0);
            u.setId(UUID.randomUUID());
            return u;
        });

        CreateStaffRequest req = new CreateStaffRequest();
        req.setFullName("Sarah Jenkins");
        req.setEmail("sarah.j@metro.gov");
        req.setPassword("SecureTemp#2026!");
        req.setRole("SUPERVISOR");
        req.setDepartment("Operations Command");

        AdminUserResponse result = adminService.createStaff(req, adminId, "Priya Sharma", "127.0.0.1");

        assertNotNull(result);
        assertEquals("Sarah Jenkins", result.getFullName());
        assertEquals("sarah.j@metro.gov", result.getEmail());
        assertTrue(result.getRoles().contains("SUPERVISOR"));

        verify(auditService).logAction(
                eq(adminId),
                eq("Priya Sharma"),
                eq("ADMIN"),
                eq("STAFF_CREATED"),
                eq("USER"),
                eq(result.getId().toString()),
                anyString(),
                eq("127.0.0.1"),
                eq("SUCCESS")
        );
    }

    @Test
    @DisplayName("updateUserStatus prohibits admin from suspending their own account")
    void testUpdateUserStatus_ProhibitsSelfSuspension() {
        UpdateUserStatusRequest req = new UpdateUserStatusRequest("SUSPENDED", "Self test");

        BadRequestException ex = assertThrows(BadRequestException.class, () ->
                adminService.updateUserStatus(adminId, req, adminId, "Priya Sharma", "127.0.0.1")
        );
        assertTrue(ex.getMessage().contains("prohibited from suspending or deactivating their own account"));
        verify(userRepository, never()).save(any());
        verify(auditService, never()).logAction(any(), any(), any(), any(), any(), any(), any(), any(), any());
    }

    @Test
    @DisplayName("updateUserStatus successfully changes status and records audit log")
    void testUpdateUserStatus_Success() {
        UUID targetId = sampleUser.getId();
        when(userRepository.findById(targetId)).thenReturn(Optional.of(sampleUser));
        when(userRepository.save(any(User.class))).thenAnswer(i -> i.getArgument(0));

        UpdateUserStatusRequest req = new UpdateUserStatusRequest("SUSPENDED", "Disciplinary review");
        AdminUserResponse resp = adminService.updateUserStatus(targetId, req, adminId, "Priya Sharma", "127.0.0.1");

        assertEquals("SUSPENDED", resp.getAccountStatus());
        verify(userRepository).save(sampleUser);
        verify(auditService).logAction(
                eq(adminId),
                eq("Priya Sharma"),
                eq("ADMIN"),
                eq("USER_STATUS_UPDATED"),
                eq("USER"),
                eq(targetId.toString()),
                contains("Disciplinary review"),
                eq("127.0.0.1"),
                eq("SUCCESS")
        );
    }

    @Test
    @DisplayName("getDashboardSummary returns accurate real counts from repositories without offsets")
    void testGetDashboardSummary_RealCounts() {
        when(userRepository.countByRoleName(RoleName.CITIZEN)).thenReturn(25L);
        when(userRepository.countByRoleName(RoleName.OFFICER)).thenReturn(3L);
        when(userRepository.countByRoleName(RoleName.WORKER)).thenReturn(5L);
        when(userRepository.countByRoleName(RoleName.ADMIN)).thenReturn(1L);
        when(userRepository.countByRoleName(RoleName.SUPERVISOR)).thenReturn(2L);

        when(userRepository.count()).thenReturn(36L);
        when(userRepository.countByAccountStatusIgnoreCase("PENDING_APPROVAL")).thenReturn(2L);
        when(complaintRepository.count()).thenReturn(40L);
        when(complaintRepository.countByStatus(any(ComplaintStatus.class))).thenAnswer(inv -> {
            ComplaintStatus st = inv.getArgument(0);
            if (st == ComplaintStatus.SUBMITTED) return 10L;
            if (st == ComplaintStatus.RESOLVED) return 5L;
            return 0L;
        });
        when(auditLogRepository.countByCreatedAtAfter(any())).thenReturn(18L);

        DashboardSummaryResponse summary = adminService.getDashboardSummary();

        assertNotNull(summary);
        assertEquals(36L, summary.getTotalUsers());
        assertEquals(40L, summary.getTotalComplaints());
        assertEquals(18L, summary.getAuditEventsLast24h());
        assertEquals(2L, summary.getPendingApprovalCount());
        assertEquals(25L, summary.getUsersByRole().get("CITIZEN"));
        assertEquals(3L, summary.getUsersByRole().get("OFFICER"));
        assertEquals(5L, summary.getUsersByRole().get("WORKER"));
        assertEquals(1L, summary.getUsersByRole().get("ADMIN"));
        assertEquals(2L, summary.getUsersByRole().get("SUPERVISOR"));
        assertEquals(10L, summary.getComplaintsByStatus().get("SUBMITTED"));
        assertEquals(5L, summary.getComplaintsByStatus().get("RESOLVED"));
    }

    @Test
    @DisplayName("getSlaPolicies queries repository and returns mapped DTO list")
    void testGetSlaPolicies() {
        SlaPolicy p1 = new SlaPolicy("ROADS", "CRITICAL", 12);
        SlaPolicy p2 = new SlaPolicy("ROADS", "HIGH", 24);
        when(slaPolicyRepository.findAll(any(org.springframework.data.domain.Sort.class)))
                .thenReturn(List.of(p1, p2));

        List<SlaPolicyResponse> policies = adminService.getSlaPolicies();

        assertNotNull(policies);
        assertEquals(2, policies.size());
        assertEquals("ROADS", policies.get(0).getCategory());
        assertEquals("CRITICAL", policies.get(0).getPriority());
        assertEquals(12, policies.get(0).getHours());
        assertEquals("HIGH", policies.get(1).getPriority());
        assertEquals(24, policies.get(1).getHours());
    }
}
