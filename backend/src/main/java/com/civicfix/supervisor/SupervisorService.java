package com.civicfix.supervisor;

import com.civicfix.admin.dto.AdminUserResponse;
import com.civicfix.audit.AuditService;
import com.civicfix.common.PagedResponse;
import com.civicfix.common.exception.BadRequestException;
import com.civicfix.common.exception.ConflictException;
import com.civicfix.common.exception.ForbiddenException;
import com.civicfix.common.exception.ResourceNotFoundException;
import com.civicfix.complaint.Complaint;
import com.civicfix.complaint.ComplaintRepository;
import com.civicfix.complaint.dto.ComplaintResponse;
import com.civicfix.notification.NotificationService;
import com.civicfix.security.UserPrincipal;
import com.civicfix.supervisor.dto.ReassignWorkerRequest;
import com.civicfix.user.RoleName;
import com.civicfix.user.User;
import com.civicfix.user.UserRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.OffsetDateTime;
import java.util.List;
import java.util.UUID;

@Service
public class SupervisorService {

    private static final Logger log = LoggerFactory.getLogger(SupervisorService.class);

    private final ComplaintRepository complaintRepository;
    private final UserRepository userRepository;
    private final AuditService auditService;
    private final NotificationService notificationService;

    public SupervisorService(
            ComplaintRepository complaintRepository,
            UserRepository userRepository,
            AuditService auditService,
            NotificationService notificationService) {
        this.complaintRepository = complaintRepository;
        this.userRepository = userRepository;
        this.auditService = auditService;
        this.notificationService = notificationService;
    }

    @Transactional(readOnly = true)
    public PagedResponse<ComplaintResponse> getEscalatedComplaints(String ward, String category, Pageable pageable) {
        return getEscalatedComplaints(ward, category, pageable, null);
    }

    @Transactional(readOnly = true)
    public PagedResponse<ComplaintResponse> getEscalatedComplaints(String ward, String category, Pageable pageable, UserPrincipal principal) {
        String cleanWard = (ward != null && !ward.isBlank() && !ward.equalsIgnoreCase("ALL")) ? ward.trim() : null;
        String cleanCategory = (category != null && !category.isBlank() && !category.equalsIgnoreCase("ALL")) ? category.trim() : null;

        Page<Complaint> page = complaintRepository.findEscalatedComplaints(cleanWard, cleanCategory, pageable);
        List<ComplaintResponse> content = page.getContent().stream()
                .map(c -> principal != null ? ComplaintResponse.fromEntity(c, principal) : ComplaintResponse.fromEntity(c))
                .toList();

        return new PagedResponse<>(
                content,
                page.getNumber(),
                page.getSize(),
                page.getTotalElements(),
                page.getTotalPages(),
                page.isLast()
        );
    }

    @Transactional
    public ComplaintResponse reassignWorker(String idOrRef, ReassignWorkerRequest req, UserPrincipal principal, String ipAddress) {
        boolean isSupervisor = principal.getAuthorities().stream().anyMatch(a -> a.getAuthority().equals("ROLE_SUPERVISOR"));
        boolean isAdmin = principal.getAuthorities().stream().anyMatch(a -> a.getAuthority().equals("ROLE_ADMIN"));

        if (!isSupervisor && !isAdmin) {
            throw new ForbiddenException("Only supervisors and administrators can reassign complaint field technicians.");
        }

        if (req == null || req.getNewWorkerId() == null) {
            throw new BadRequestException("New worker ID is required.");
        }
        if (req.getReason() == null || req.getReason().trim().length() < 5 || req.getReason().trim().length() > 500) {
            throw new BadRequestException("A reassignment reason between 5 and 500 characters is required.");
        }

        Complaint complaint = resolveComplaint(idOrRef);

        if (req.getVersion() != null && !req.getVersion().equals(complaint.getVersion())) {
            throw new ConflictException("Complaint has been modified by another transaction or user. Please refresh and try again.");
        }

        if (complaint.getStatus().isTerminal()) {
            throw new BadRequestException("Cannot reassign worker on a terminal complaint (status: " + complaint.getStatus() + ").");
        }

        if (complaint.getAssignedWorker() == null) {
            throw new BadRequestException("Cannot reassign a complaint that has not been initially assigned to a field worker.");
        }

        User newWorker = userRepository.findById(req.getNewWorkerId())
                .orElseThrow(() -> new BadRequestException("New worker account not found with ID: " + req.getNewWorkerId()));

        if (!"ACTIVE".equalsIgnoreCase(newWorker.getAccountStatus())) {
            throw new BadRequestException("Selected worker account is not active.");
        }

        boolean hasWorkerRole = newWorker.getRoles().stream()
                .anyMatch(r -> r.getName() == RoleName.WORKER);
        if (!hasWorkerRole) {
            throw new BadRequestException("Selected user does not have the WORKER role.");
        }

        if (complaint.getAssignedWorker().getId().equals(newWorker.getId())) {
            throw new BadRequestException("Selected worker is already assigned to this complaint.");
        }

        User actor = userRepository.findById(principal.getId())
                .orElseThrow(() -> new ResourceNotFoundException("Supervisor account not found."));

        User oldWorker = complaint.getAssignedWorker();
        complaint.setAssignedWorker(newWorker);
        complaint.setUpdatedAt(OffsetDateTime.now());

        com.civicfix.complaint.ComplaintStatus previousStatus = complaint.getStatus();
        if (previousStatus == com.civicfix.complaint.ComplaintStatus.REOPENED) {
            complaint.setStatus(com.civicfix.complaint.ComplaintStatus.ASSIGNED);
        }

        String historyNote = "Worker reassigned from " + oldWorker.getFullName() +
                " to " + newWorker.getFullName() + ". Reason: " + req.getReason().trim();
        complaint.addStatusHistory(previousStatus, complaint.getStatus(), actor, historyNote);

        Complaint saved = complaintRepository.save(complaint);
        complaintRepository.flush();

        auditService.logAction(
                actor.getId(),
                actor.getFullName(),
                principal.getAuthorities().iterator().next().getAuthority(),
                "REASSIGN_WORKER",
                "COMPLAINT",
                saved.getId().toString(),
                "Reassigned worker on complaint #" + saved.getReferenceId() +
                        " from " + oldWorker.getFullName() + " to " + newWorker.getFullName() +
                        ". Reason: " + req.getReason().trim(),
                ipAddress,
                "SUCCESS"
        );

        notificationService.notifyWorkerReassigned(saved, oldWorker, newWorker, actor, req.getReason().trim());

        return ComplaintResponse.fromEntity(saved, principal);
    }

    @Transactional(readOnly = true)
    public List<AdminUserResponse> getActiveWorkers() {
        return userRepository.findActiveUsersByRoleName(RoleName.WORKER).stream()
                .map(AdminUserResponse::fromEntity)
                .toList();
    }

    private Complaint resolveComplaint(String idOrRef) {
        UUID uuid = null;
        try {
            uuid = UUID.fromString(idOrRef);
        } catch (IllegalArgumentException ignored) {}

        if (uuid != null) {
            return complaintRepository.findById(uuid)
                    .orElseThrow(() -> new ResourceNotFoundException("Complaint not found with id: " + idOrRef));
        } else {
            return complaintRepository.findByReferenceIdIgnoreCase(idOrRef)
                    .orElseThrow(() -> new ResourceNotFoundException("Complaint not found with reference: " + idOrRef));
        }
    }
}
