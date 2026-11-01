package com.civicfix.admin;

import com.civicfix.admin.dto.*;
import com.civicfix.audit.AuditLog;
import com.civicfix.audit.AuditLogRepository;
import com.civicfix.audit.AuditService;
import com.civicfix.common.exception.BadRequestException;
import com.civicfix.common.exception.ResourceNotFoundException;
import com.civicfix.complaint.ComplaintRepository;
import com.civicfix.complaint.ComplaintStatus;
import com.civicfix.complaint.sla.SlaPolicyRepository;
import com.civicfix.user.*;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.OffsetDateTime;
import java.util.*;

@Service
public class AdminService {

    private static final Logger log = LoggerFactory.getLogger(AdminService.class);

    private final UserRepository userRepository;
    private final RoleRepository roleRepository;
    private final ComplaintRepository complaintRepository;
    private final AuditLogRepository auditLogRepository;
    private final AuditService auditService;
    private final PasswordEncoder passwordEncoder;
    private final SlaPolicyRepository slaPolicyRepository;

    public AdminService(
            UserRepository userRepository,
            RoleRepository roleRepository,
            ComplaintRepository complaintRepository,
            AuditLogRepository auditLogRepository,
            AuditService auditService,
            PasswordEncoder passwordEncoder,
            SlaPolicyRepository slaPolicyRepository
    ) {
        this.userRepository = userRepository;
        this.roleRepository = roleRepository;
        this.complaintRepository = complaintRepository;
        this.auditLogRepository = auditLogRepository;
        this.auditService = auditService;
        this.passwordEncoder = passwordEncoder;
        this.slaPolicyRepository = slaPolicyRepository;
    }

    /**
     * Paged user directory query with optional role, status, and search filters.
     * Guaranteed never to return password_hash.
     */
    @Transactional(readOnly = true)
    public Page<AdminUserResponse> getUsers(String roleStr, String status, String search, Pageable pageable) {
        RoleName roleName = null;
        if (roleStr != null && !roleStr.isBlank() && !roleStr.equalsIgnoreCase("ALL")) {
            try {
                roleName = RoleName.valueOf(roleStr.trim().toUpperCase());
            } catch (IllegalArgumentException e) {
                throw new BadRequestException("Invalid role filter: " + roleStr);
            }
        }

        String searchTrimmed = (search != null && !search.isBlank()) ? search.trim() : null;
        String statusTrimmed = (status != null && !status.isBlank() && !status.equalsIgnoreCase("ALL")) ? status.trim() : null;

        Page<User> users = userRepository.findUsersWithFilters(roleName, statusTrimmed, searchTrimmed, pageable);
        return users.map(AdminUserResponse::fromEntity);
    }

    /**
     * Fetch user profile by UUID without password hash.
     */
    @Transactional(readOnly = true)
    public AdminUserResponse getUserById(UUID id) {
        User user = userRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("User not found with ID: " + id));
        return AdminUserResponse.fromEntity(user);
    }

    /**
     * Create verified OFFICER or WORKER staff account with a validated temporary password.
     * Writes an immutable audit log row upon creation.
     */
    @Transactional
    public AdminUserResponse createStaff(
            CreateStaffRequest req,
            UUID adminId,
            String adminName,
            String ipAddress
    ) {
        if (req == null) {
            throw new BadRequestException("Request body cannot be null.");
        }

        String targetRole = req.getRole() != null ? req.getRole().trim().toUpperCase() : "";
        if (!targetRole.equals("OFFICER") && !targetRole.equals("WORKER") && !targetRole.equals("SUPERVISOR")) {
            throw new BadRequestException("Staff role must be OFFICER, WORKER, or SUPERVISOR. Received: " + req.getRole());
        }

        RoleName roleName = RoleName.valueOf(targetRole);

        if (userRepository.existsByEmailIgnoreCase(req.getEmail().trim())) {
            throw new BadRequestException("Email address is already in use by another account.");
        }

        if (req.getPhone() != null && !req.getPhone().isBlank() && userRepository.existsByPhone(req.getPhone().trim())) {
            throw new BadRequestException("Phone number is already associated with an existing account.");
        }

        Role role = roleRepository.findByName(roleName)
                .orElseThrow(() -> new BadRequestException("System role definition missing: " + roleName));

        User user = new User();
        user.setFullName(req.getFullName().trim());
        user.setEmail(req.getEmail().trim().toLowerCase());
        user.setPhone(req.getPhone() != null && !req.getPhone().isBlank() ? req.getPhone().trim() : null);
        user.setPasswordHash(passwordEncoder.encode(req.getPassword()));
        user.setDepartment(req.getDepartment() != null ? req.getDepartment().trim() : "Municipal Operations");
        user.setWard(req.getWard() != null ? req.getWard().trim() : "Headquarters");
        user.setAccountStatus("ACTIVE");
        user.setTrustScore(100);
        user.setRoles(Set.of(role));

        User saved = userRepository.save(user);

        // Write immutable audit log
        auditService.logAction(
                adminId,
                adminName,
                "ADMIN",
                "STAFF_CREATED",
                "USER",
                saved.getId().toString(),
                String.format("Provisioned new %s account for %s (%s).", targetRole, saved.getFullName(), saved.getEmail()),
                ipAddress,
                "SUCCESS"
        );

        log.info("Administrator {} successfully provisioned new {} staff account ID: {}", adminName, targetRole, saved.getId());
        return AdminUserResponse.fromEntity(saved);
    }

    /**
     * Update user account status (ACTIVE or SUSPENDED).
     * Rule: An administrator cannot suspend their own account.
     */
    @Transactional
    public AdminUserResponse updateUserStatus(
            UUID targetUserId,
            UpdateUserStatusRequest req,
            UUID adminId,
            String adminName,
            String ipAddress
    ) {
        if (targetUserId == null) {
            throw new BadRequestException("Target user ID cannot be null.");
        }

        if (adminId != null && targetUserId.equals(adminId)) {
            throw new BadRequestException("Administrators are prohibited from suspending or deactivating their own account.");
        }

        User target = userRepository.findById(targetUserId)
                .orElseThrow(() -> new ResourceNotFoundException("User not found with ID: " + targetUserId));

        String oldStatus = target.getAccountStatus();
        String newStatus = req.getStatus().trim().toUpperCase();

        target.setAccountStatus(newStatus);
        User updated = userRepository.save(target);

        // Write immutable audit log
        auditService.logAction(
                adminId,
                adminName,
                "ADMIN",
                "USER_STATUS_UPDATED",
                "USER",
                target.getId().toString(),
                String.format("Changed status from %s to %s for %s (%s). Reason: %s",
                        oldStatus, newStatus, target.getFullName(), target.getEmail(),
                        req.getReason() != null ? req.getReason() : "Administrative policy enforcement"),
                ipAddress,
                "SUCCESS"
        );

        log.info("Administrator {} updated user {} status from {} to {}", adminName, targetUserId, oldStatus, newStatus);
        return AdminUserResponse.fromEntity(updated);
    }

    /**
     * Paged query of tamper-evident system audit logs with optional filters.
     */
    @Transactional(readOnly = true)
    public Page<AdminAuditLogResponse> getAuditLogs(
            String action,
            String actor,
            OffsetDateTime startDate,
            OffsetDateTime endDate,
            Pageable pageable
    ) {
        String actionTrimmed = (action != null && !action.isBlank() && !action.equalsIgnoreCase("ALL")) ? action.trim() : null;
        String actorTrimmed = (actor != null && !actor.isBlank()) ? actor.trim() : null;

        Page<AuditLog> logs = auditLogRepository.findLogsWithFilters(actionTrimmed, actorTrimmed, startDate, endDate, pageable);
        return logs.map(AdminAuditLogResponse::fromEntity);
    }

    /**
     * Real-time metrics computed directly from database records without arbitrary hardcoded offsets.
     */
    @Transactional(readOnly = true)
    public DashboardSummaryResponse getDashboardSummary() {
        // Users by Role
        Map<String, Long> usersByRole = new LinkedHashMap<>();
        for (RoleName r : RoleName.values()) {
            usersByRole.put(r.name(), userRepository.countByRoleName(r));
        }

        // Complaints by Status
        Map<String, Long> complaintsByStatus = new LinkedHashMap<>();
        for (ComplaintStatus cs : ComplaintStatus.values()) {
            complaintsByStatus.put(cs.name(), complaintRepository.countByStatus(cs));
        }

        long totalUsers = userRepository.count();
        long totalComplaints = complaintRepository.count();
        long pendingApprovalCount = userRepository.countByAccountStatusIgnoreCase("PENDING_APPROVAL");
        long auditEvents24h = auditLogRepository.countByCreatedAtAfter(OffsetDateTime.now().minusHours(24));

        return new DashboardSummaryResponse(
                usersByRole,
                complaintsByStatus,
                auditEvents24h,
                totalUsers,
                totalComplaints,
                pendingApprovalCount
        );
    }

    /**
     * Retrieve live SLA policy matrix across all categories and priorities from PostgreSQL.
     */
    @Transactional(readOnly = true)
    public List<SlaPolicyResponse> getSlaPolicies() {
        return slaPolicyRepository.findAll(
                Sort.by("category").ascending().and(Sort.by("priority").ascending())
        ).stream().map(SlaPolicyResponse::fromEntity).toList();
    }
}

