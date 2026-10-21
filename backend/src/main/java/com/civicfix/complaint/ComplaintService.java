package com.civicfix.complaint;

import com.civicfix.audit.AuditService;
import com.civicfix.common.PagedResponse;
import com.civicfix.common.exception.BadRequestException;
import com.civicfix.common.exception.ForbiddenException;
import com.civicfix.common.exception.ResourceNotFoundException;
import com.civicfix.complaint.dto.*;
import com.civicfix.security.UserPrincipal;
import com.civicfix.user.RoleName;
import com.civicfix.user.User;
import com.civicfix.user.UserRepository;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.security.SecureRandom;
import java.util.List;
import java.util.UUID;
import java.util.stream.Collectors;

@Service
public class ComplaintService {

    private final ComplaintRepository complaintRepository;
    private final ComplaintStatusHistoryRepository historyRepository;
    private final ResolutionEvidenceRepository evidenceRepository;
    private final UserRepository userRepository;
    private final AuditService auditService;
    private final SecureRandom random = new SecureRandom();

    public ComplaintService(ComplaintRepository complaintRepository,
                            ComplaintStatusHistoryRepository historyRepository,
                            ResolutionEvidenceRepository evidenceRepository,
                            UserRepository userRepository,
                            AuditService auditService) {
        this.complaintRepository = complaintRepository;
        this.historyRepository = historyRepository;
        this.evidenceRepository = evidenceRepository;
        this.userRepository = userRepository;
        this.auditService = auditService;
    }

    @Transactional
    public ComplaintResponse createComplaint(CreateComplaintRequest req, UserPrincipal principal, String ipAddress) {
        User citizen = userRepository.findById(principal.getId())
                .orElseThrow(() -> new ResourceNotFoundException("Authenticated user not found."));

        // Generate human-readable reference ID e.g. CF-2026-00124
        String referenceId;
        do {
            int num = 10000 + random.nextInt(90000);
            referenceId = "CF-2026-" + num;
        } while (complaintRepository.findByReferenceIdIgnoreCase(referenceId).isPresent());

        Complaint complaint = new Complaint();
        complaint.setReferenceId(referenceId);
        complaint.setCitizen(citizen);
        complaint.setTitle(req.getTitle().trim());
        complaint.setDescription(req.getDescription().trim());
        complaint.setCategory(req.getCategory().trim());
        complaint.setPriority(req.getPriority() != null ? req.getPriority() : ComplaintPriority.MEDIUM);
        complaint.setStatus(ComplaintStatus.SUBMITTED);
        complaint.setAddress(req.getAddress().trim());
        complaint.setLatitude(req.getLatitude());
        complaint.setLongitude(req.getLongitude());
        complaint.setWard(req.getWard() != null ? req.getWard().trim() : "Ward 08, Anna Nagar");

        // Immutable status history initial entry
        complaint.addStatusHistory(null, ComplaintStatus.SUBMITTED, citizen, "Citizen filed initial civic report via portal.");

        Complaint saved = complaintRepository.save(complaint);

        auditService.logAction(
                citizen.getId(),
                citizen.getFullName(),
                "CITIZEN",
                "CREATE_COMPLAINT",
                "COMPLAINT",
                saved.getId().toString(),
                "Created complaint reference #" + saved.getReferenceId() + ": " + saved.getTitle(),
                ipAddress,
                "SUCCESS"
        );

        return ComplaintResponse.fromEntity(saved);
    }

    @Transactional(readOnly = true)
    public PagedResponse<ComplaintResponse> getComplaints(UserPrincipal principal,
                                                          ComplaintStatus status,
                                                          String category,
                                                          Pageable pageable) {
        boolean isAdmin = principal.getAuthorities().stream().anyMatch(a -> a.getAuthority().equals("ROLE_ADMIN"));
        boolean isOfficer = principal.getAuthorities().stream().anyMatch(a -> a.getAuthority().equals("ROLE_OFFICER"));
        boolean isWorker = principal.getAuthorities().stream().anyMatch(a -> a.getAuthority().equals("ROLE_WORKER"));

        Page<Complaint> page;

        if (isAdmin || isOfficer) {
            if (status != null) {
                page = complaintRepository.findByStatusOrderByCreatedAtDesc(status, pageable);
            } else if (category != null && !category.trim().isEmpty()) {
                page = complaintRepository.findByCategoryIgnoreCaseOrderByCreatedAtDesc(category.trim(), pageable);
            } else {
                page = complaintRepository.findAllByOrderByCreatedAtDesc(pageable);
            }
        } else if (isWorker) {
            page = complaintRepository.findByAssignedWorkerIdOrderByCreatedAtDesc(principal.getId(), pageable);
        } else {
            // Citizen: Strictly isolated to own complaints
            page = complaintRepository.findByCitizenIdOrderByCreatedAtDesc(principal.getId(), pageable);
        }

        List<ComplaintResponse> dtoList = page.getContent().stream()
                .map(ComplaintResponse::fromEntity)
                .collect(Collectors.toList());

        return new PagedResponse<>(dtoList, page.getNumber(), page.getSize(),
                page.getTotalElements(), page.getTotalPages(), page.isLast());
    }

    @Transactional(readOnly = true)
    public ComplaintResponse getComplaintById(String idOrRef, UserPrincipal principal) {
        Complaint complaint = resolveComplaint(idOrRef);
        enforceReadPermission(complaint, principal);
        return ComplaintResponse.fromEntity(complaint);
    }

    @Transactional(readOnly = true)
    public List<ComplaintHistoryResponse> getComplaintHistory(String idOrRef, UserPrincipal principal) {
        Complaint complaint = resolveComplaint(idOrRef);
        enforceReadPermission(complaint, principal);

        List<ComplaintStatusHistory> history = historyRepository.findByComplaintIdOrderByCreatedAtAsc(complaint.getId());
        return history.stream()
                .map(ComplaintHistoryResponse::fromEntity)
                .collect(Collectors.toList());
    }

    @Transactional
    public ComplaintResponse assignWorker(String idOrRef, AssignComplaintRequest req, UserPrincipal principal, String ipAddress) {
        boolean canAssign = principal.getAuthorities().stream()
                .anyMatch(a -> a.getAuthority().equals("ROLE_OFFICER") || a.getAuthority().equals("ROLE_ADMIN"));
        if (!canAssign) {
            throw new ForbiddenException("Only municipal officers and administrators can dispatch and assign repair orders.");
        }

        Complaint complaint = resolveComplaint(idOrRef);
        User officer = userRepository.findById(principal.getId())
                .orElseThrow(() -> new ResourceNotFoundException("Officer account not found."));

        User worker = userRepository.findById(req.getWorkerId())
                .orElseThrow(() -> new ResourceNotFoundException("Target field worker not found."));

        if (!worker.hasRole(RoleName.WORKER)) {
            throw new BadRequestException("Assigned user must hold the WORKER persona.");
        }

        complaint.setAssignedOfficer(officer);
        complaint.setAssignedWorker(worker);

        ComplaintStatus oldStatus = complaint.getStatus();
        if (oldStatus == ComplaintStatus.SUBMITTED || oldStatus == ComplaintStatus.UNDER_REVIEW) {
            complaint.setStatus(ComplaintStatus.ASSIGNED);
            complaint.addStatusHistory(oldStatus, ComplaintStatus.ASSIGNED, officer,
                    req.getNotes() != null ? req.getNotes() : "Dispatched to technician " + worker.getFullName());
        }

        Complaint saved = complaintRepository.save(complaint);

        auditService.logAction(
                officer.getId(),
                officer.getFullName(),
                "OFFICER",
                "ASSIGN_WORKER",
                "COMPLAINT",
                saved.getId().toString(),
                "Assigned worker " + worker.getFullName() + " to complaint #" + saved.getReferenceId(),
                ipAddress,
                "SUCCESS"
        );

        return ComplaintResponse.fromEntity(saved);
    }

    @Transactional
    public ComplaintResponse transitionStatus(String idOrRef, UpdateStatusRequest req, UserPrincipal principal, String ipAddress) {
        Complaint complaint = resolveComplaint(idOrRef);
        User actor = userRepository.findById(principal.getId())
                .orElseThrow(() -> new ResourceNotFoundException("User not found."));

        boolean isOfficer = principal.getAuthorities().stream().anyMatch(a -> a.getAuthority().equals("ROLE_OFFICER"));
        boolean isAdmin = principal.getAuthorities().stream().anyMatch(a -> a.getAuthority().equals("ROLE_ADMIN"));
        boolean isWorker = principal.getAuthorities().stream().anyMatch(a -> a.getAuthority().equals("ROLE_WORKER"));
        boolean isCitizen = principal.getAuthorities().stream().anyMatch(a -> a.getAuthority().equals("ROLE_CITIZEN"));

        ComplaintStatus currentStatus = complaint.getStatus();
        ComplaintStatus newStatus = req.getStatus();

        if (currentStatus == newStatus) {
            throw new BadRequestException("Complaint is already in status: " + newStatus);
        }

        // State Machine Governance Rules (Blueprint Rule #9)
        switch (newStatus) {
            case RESOLVED:
            case REWORK_REQUESTED:
                if (!isOfficer && !isAdmin) {
                    throw new ForbiddenException("Only municipal officers and administrators can verify or reject resolution evidence.");
                }
                break;

            case REJECTED:
                if (!isOfficer && !isAdmin) {
                    throw new ForbiddenException("Only municipal officers and administrators can reject intake complaints.");
                }
                break;

            case IN_PROGRESS:
                boolean isAssignedWorker = complaint.getAssignedWorker() != null &&
                        complaint.getAssignedWorker().getId().equals(principal.getId());
                if (!isAssignedWorker && !isOfficer && !isAdmin) {
                    throw new ForbiddenException("Only the assigned field worker or an officer can mark tasks IN_PROGRESS.");
                }
                break;

            case RESOLUTION_SUBMITTED:
                boolean workerAuthorized = complaint.getAssignedWorker() != null &&
                        complaint.getAssignedWorker().getId().equals(principal.getId());
                if (!workerAuthorized && !isOfficer && !isAdmin) {
                    throw new ForbiddenException("Only the assigned technician can submit resolution evidence.");
                }
                // Save evidence metadata if provided
                if (req.getEvidencePhotoUrl() != null || req.getNotes() != null) {
                    ResolutionEvidence evidence = new ResolutionEvidence();
                    evidence.setComplaint(complaint);
                    evidence.setWorker(actor);
                    evidence.setEvidenceNotes(req.getNotes());
                    evidence.setPhotoUrl(req.getEvidencePhotoUrl());
                    evidence.setLatitude(req.getLatitude());
                    evidence.setLongitude(req.getLongitude());
                    evidenceRepository.save(evidence);
                }
                break;

            case REOPENED:
                boolean isOwner = complaint.getCitizen().getId().equals(principal.getId());
                if (!isOwner && !isAdmin) {
                    throw new ForbiddenException("Only the reporting citizen or administrator can reopen a verified resolution.");
                }
                if (currentStatus != ComplaintStatus.RESOLVED) {
                    throw new BadRequestException("Only RESOLVED complaints can be reopened for dispute.");
                }
                break;

            default:
                if (isCitizen && !isAdmin && !isOfficer) {
                    throw new ForbiddenException("Citizens cannot arbitrarily advance ticket workflow states.");
                }
                break;
        }

        complaint.setStatus(newStatus);
        complaint.addStatusHistory(currentStatus, newStatus, actor, req.getNotes());

        Complaint saved = complaintRepository.save(complaint);

        auditService.logAction(
                actor.getId(),
                actor.getFullName(),
                principal.getAuthorities().iterator().next().getAuthority(),
                "TRANSITION_STATUS",
                "COMPLAINT",
                saved.getId().toString(),
                "Transitioned status from " + currentStatus + " to " + newStatus + " on #" + saved.getReferenceId(),
                ipAddress,
                "SUCCESS"
        );

        return ComplaintResponse.fromEntity(saved);
    }

    private Complaint resolveComplaint(String idOrRef) {
        if (idOrRef == null || idOrRef.trim().isEmpty()) {
            throw new BadRequestException("Complaint ID or Reference cannot be empty.");
        }
        String trimmed = idOrRef.trim();

        // Check if valid UUID
        try {
            UUID uuid = UUID.fromString(trimmed);
            return complaintRepository.findById(uuid)
                    .or(() -> complaintRepository.findByReferenceIdIgnoreCase(trimmed))
                    .orElseThrow(() -> new ResourceNotFoundException("Complaint #" + idOrRef + " not found."));
        } catch (IllegalArgumentException e) {
            // Not a UUID: lookup by human-readable reference ID
            return complaintRepository.findByReferenceIdIgnoreCase(trimmed)
                    .orElseThrow(() -> new ResourceNotFoundException("Complaint #" + idOrRef + " not found."));
        }
    }

    private void enforceReadPermission(Complaint complaint, UserPrincipal principal) {
        boolean isAdmin = principal.getAuthorities().stream().anyMatch(a -> a.getAuthority().equals("ROLE_ADMIN"));
        boolean isOfficer = principal.getAuthorities().stream().anyMatch(a -> a.getAuthority().equals("ROLE_OFFICER"));
        if (isAdmin || isOfficer) {
            return;
        }

        boolean isWorker = principal.getAuthorities().stream().anyMatch(a -> a.getAuthority().equals("ROLE_WORKER"));
        if (isWorker) {
            boolean isAssigned = complaint.getAssignedWorker() != null &&
                    complaint.getAssignedWorker().getId().equals(principal.getId());
            if (!isAssigned) {
                throw new ForbiddenException("Workers may only access repair orders assigned to their crew.");
            }
            return;
        }

        // Citizen: Must be the ticket creator
        boolean isOwner = complaint.getCitizen().getId().equals(principal.getId());
        if (!isOwner) {
            throw new ForbiddenException("Private record: In accordance with municipal privacy policies, you may only inspect complaints filed under your account.");
        }
    }
}
