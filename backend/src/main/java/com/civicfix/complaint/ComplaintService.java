package com.civicfix.complaint;

import com.civicfix.ai.AiTriageService;
import com.civicfix.audit.AuditService;
import com.civicfix.common.PagedResponse;
import com.civicfix.common.exception.BadRequestException;
import com.civicfix.common.exception.ConflictException;
import com.civicfix.common.exception.ForbiddenException;
import com.civicfix.common.exception.ResourceNotFoundException;
import com.civicfix.complaint.dto.*;
import com.civicfix.complaint.sla.SlaEscalationService;
import com.civicfix.complaint.sla.SlaService;
import com.civicfix.security.UserPrincipal;
import com.civicfix.storage.StorageService;
import com.civicfix.user.RoleName;
import com.civicfix.user.User;
import com.civicfix.user.UserRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.core.io.Resource;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;

import com.civicfix.complaint.event.ComplaintEvent;
import com.civicfix.complaint.event.ComplaintEventType;

import com.civicfix.ai.dto.DuplicateCandidate;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

import java.io.IOException;
import java.math.BigDecimal;
import java.security.SecureRandom;
import java.time.OffsetDateTime;
import java.util.ArrayList;
import java.util.Collections;
import java.util.Comparator;
import java.util.HashSet;
import java.util.List;
import java.util.Optional;
import java.util.Set;
import java.util.UUID;
import java.util.stream.Collectors;

@Service
public class ComplaintService {

    private static final Logger log = LoggerFactory.getLogger(ComplaintService.class);

    private final ComplaintRepository complaintRepository;
    private final ComplaintStatusHistoryRepository historyRepository;
    private final ResolutionEvidenceRepository evidenceRepository;
    private final ComplaintPhotoRepository complaintPhotoRepository;
    private final UserRepository userRepository;
    private final AuditService auditService;
    private final StorageService storageService;
    private final AiTriageService aiTriageService;
    private final ApplicationEventPublisher eventPublisher;
    private final SlaService slaService;
    private final SlaEscalationService slaEscalationService;

    @org.springframework.beans.factory.annotation.Value("${civicfix.evidence.max-distance-meters:100.0}")
    private double maxDistanceMeters = 100.0;

    @org.springframework.beans.factory.annotation.Value("${civicfix.evidence.max-accuracy-meters:100.0}")
    private double maxAccuracyMeters = 100.0;

    public void setMaxDistanceMeters(double maxDistanceMeters) {
        this.maxDistanceMeters = maxDistanceMeters;
    }

    public void setMaxAccuracyMeters(double maxAccuracyMeters) {
        this.maxAccuracyMeters = maxAccuracyMeters;
    }

    public void setEvidenceLocationLimits(double maxDistance, double maxAccuracy) {
        this.maxDistanceMeters = maxDistance;
        this.maxAccuracyMeters = maxAccuracy;
    }
    private final SecureRandom random = new SecureRandom();

    @org.springframework.beans.factory.annotation.Value("${civicfix.reopen.window-days:30}")
    private int reopenWindowDays = 30;

    public ComplaintService(ComplaintRepository complaintRepository,
                            ComplaintStatusHistoryRepository historyRepository,
                            ResolutionEvidenceRepository evidenceRepository,
                            ComplaintPhotoRepository complaintPhotoRepository,
                            UserRepository userRepository,
                            AuditService auditService,
                            StorageService storageService) {
        this(complaintRepository, historyRepository, evidenceRepository, complaintPhotoRepository, userRepository, auditService, storageService, null, null, null, null);
    }

    public ComplaintService(ComplaintRepository complaintRepository,
                            ComplaintStatusHistoryRepository historyRepository,
                            ResolutionEvidenceRepository evidenceRepository,
                            ComplaintPhotoRepository complaintPhotoRepository,
                            UserRepository userRepository,
                            AuditService auditService,
                            StorageService storageService,
                            AiTriageService aiTriageService) {
        this(complaintRepository, historyRepository, evidenceRepository, complaintPhotoRepository, userRepository, auditService, storageService, aiTriageService, null, null, null);
    }

    public ComplaintService(ComplaintRepository complaintRepository,
                            ComplaintStatusHistoryRepository historyRepository,
                            ResolutionEvidenceRepository evidenceRepository,
                            ComplaintPhotoRepository complaintPhotoRepository,
                            UserRepository userRepository,
                            AuditService auditService,
                            StorageService storageService,
                            AiTriageService aiTriageService,
                            ApplicationEventPublisher eventPublisher) {
        this(complaintRepository, historyRepository, evidenceRepository, complaintPhotoRepository, userRepository, auditService, storageService, aiTriageService, eventPublisher, null, null);
    }

    @Autowired
    public ComplaintService(ComplaintRepository complaintRepository,
                            ComplaintStatusHistoryRepository historyRepository,
                            ResolutionEvidenceRepository evidenceRepository,
                            ComplaintPhotoRepository complaintPhotoRepository,
                            UserRepository userRepository,
                            AuditService auditService,
                            StorageService storageService,
                            @Autowired(required = false) AiTriageService aiTriageService,
                            @Autowired(required = false) ApplicationEventPublisher eventPublisher,
                            @Autowired(required = false) SlaService slaService,
                            @Autowired(required = false) SlaEscalationService slaEscalationService) {
        this.complaintRepository = complaintRepository;
        this.historyRepository = historyRepository;
        this.evidenceRepository = evidenceRepository;
        this.complaintPhotoRepository = complaintPhotoRepository;
        this.userRepository = userRepository;
        this.auditService = auditService;
        this.storageService = storageService;
        this.aiTriageService = aiTriageService;
        this.eventPublisher = eventPublisher;
        this.slaService = slaService;
        this.slaEscalationService = slaEscalationService;
    }

    private void publishEvent(ComplaintEvent event) {
        if (eventPublisher != null && event != null) {
            try {
                eventPublisher.publishEvent(event);
            } catch (Exception ex) {
                log.warn("Failed to publish complaint domain event: {}", ex.getMessage());
            }
        }
    }

    @Transactional
    public ComplaintResponse createComplaint(CreateComplaintRequest req, UserPrincipal principal, String ipAddress) {
        return createComplaint(req, null, principal, ipAddress);
    }

    @Transactional
    public ComplaintResponse createComplaint(CreateComplaintRequest req, List<MultipartFile> files, UserPrincipal principal, String ipAddress) {
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

        // Advisory automated triage evaluation (non-destructive)
        if (aiTriageService != null) {
            aiTriageService.triageComplaint(complaint);
        }

        // Compute SLA due date based on final priority and category
        if (slaService != null && complaint.getPriority() != null) {
            complaint.setSlaDueAt(slaService.computeSlaDueAt(complaint.getCategory(), complaint.getPriority(), complaint.getCreatedAt()));
        }

        // Immutable status history initial entry
        complaint.addStatusHistory(null, ComplaintStatus.SUBMITTED, citizen, "Citizen filed initial civic report via portal.");

        Complaint saved = complaintRepository.save(complaint);

        // Process optional citizen intake photographs
        if (files != null && !files.isEmpty()) {
            List<MultipartFile> activeFiles = files.stream().filter(f -> f != null && !f.isEmpty()).toList();
            if (activeFiles.size() > 5) {
                throw new BadRequestException("A maximum of 5 incident photographs can be submitted.");
            }

            List<String> storedUrls = new ArrayList<>();
            try {
                for (MultipartFile file : activeFiles) {
                    String storedUrl = storageService.storeFile(file, "complaints/" + saved.getId());
                    storedUrls.add(storedUrl);

                    ComplaintPhoto photo = new ComplaintPhoto();
                    photo.setComplaint(saved);
                    photo.setPhotoUrl(storedUrl);
                    photo.setFileName(file.getOriginalFilename());
                    photo.setFileSize(file.getSize());
                    photo.setContentType(file.getContentType());
                    complaintPhotoRepository.save(photo);
                    saved.getPhotos().add(photo);
                }
            } catch (IOException e) {
                // Roll back any physical files created during this partial batch
                for (String url : storedUrls) {
                    String fname = url.substring(url.lastIndexOf('/') + 1);
                    storageService.deleteFile(fname, "complaints/" + saved.getId());
                }
                throw new RuntimeException("Failed to store complaint photographs. Intake aborted.", e);
            }
        }

        auditService.logAction(
                citizen.getId(),
                citizen.getFullName(),
                "CITIZEN",
                "CREATE_COMPLAINT",
                "COMPLAINT",
                saved.getId().toString(),
                "Created complaint reference #" + saved.getReferenceId() + ": " + saved.getTitle() +
                        (saved.getPhotos().isEmpty() ? "" : " with " + saved.getPhotos().size() + " photo(s)"),
                ipAddress,
                "SUCCESS"
        );

        publishEvent(new ComplaintEvent(
                ComplaintEventType.COMPLAINT_CREATED,
                saved,
                citizen,
                null,
                saved.getStatus(),
                "Citizen filed initial civic report via portal."
        ));

        return ComplaintResponse.fromEntity(saved);
    }

    @Transactional
    public ComplaintResponse addComplaintPhotos(String idOrRef, List<MultipartFile> files, UserPrincipal principal, String ipAddress) {
        if (principal == null) {
            throw new ForbiddenException("Authentication required to upload photographs.");
        }
        Complaint complaint = resolveComplaint(idOrRef);

        boolean isOfficer = principal.getAuthorities().stream().anyMatch(a -> a.getAuthority().equals("ROLE_OFFICER"));
        boolean isAdmin = principal.getAuthorities().stream().anyMatch(a -> a.getAuthority().equals("ROLE_ADMIN"));
        boolean isOwner = complaint.getCitizen() != null && complaint.getCitizen().getId().equals(principal.getId());

        if (!isOwner && !isOfficer && !isAdmin) {
            throw new ForbiddenException("Only the complaint author, an officer, or an administrator can add photographs.");
        }

        if (files == null || files.isEmpty()) {
            throw new BadRequestException("At least one photograph must be provided.");
        }

        List<MultipartFile> activeFiles = files.stream().filter(f -> f != null && !f.isEmpty()).toList();
        if (activeFiles.isEmpty()) {
            throw new BadRequestException("At least one non-empty photograph must be provided.");
        }

        if (complaint.getPhotos().size() + activeFiles.size() > 5) {
            throw new BadRequestException("A maximum of 5 incident photographs is permitted per complaint.");
        }

        User actor = userRepository.findById(principal.getId())
                .orElseThrow(() -> new ResourceNotFoundException("Authenticated user not found."));

        List<String> storedUrls = new ArrayList<>();
        try {
            for (MultipartFile file : activeFiles) {
                String storedUrl = storageService.storeFile(file, "complaints/" + complaint.getId());
                storedUrls.add(storedUrl);

                ComplaintPhoto photo = new ComplaintPhoto();
                photo.setComplaint(complaint);
                photo.setPhotoUrl(storedUrl);
                photo.setFileName(file.getOriginalFilename());
                photo.setFileSize(file.getSize());
                photo.setContentType(file.getContentType());
                complaintPhotoRepository.save(photo);
                complaint.getPhotos().add(photo);
            }
        } catch (IOException e) {
            for (String url : storedUrls) {
                String fname = url.substring(url.lastIndexOf('/') + 1);
                storageService.deleteFile(fname, "complaints/" + complaint.getId());
            }
            throw new RuntimeException("Failed to store complaint photographs. Upload aborted.", e);
        }

        auditService.logAction(
                actor.getId(),
                actor.getFullName(),
                principal.getAuthorities().iterator().next().getAuthority(),
                "UPLOAD_PHOTOS",
                "COMPLAINT",
                complaint.getReferenceId(),
                String.format("User %s uploaded %d photograph(s) for complaint #%s.",
                        actor.getFullName(), activeFiles.size(), complaint.getReferenceId()),
                ipAddress,
                "SUCCESS"
        );

        return ComplaintResponse.fromEntity(complaint);
    }

    private void validateBoundingBox(BigDecimal minLat, BigDecimal maxLat, BigDecimal minLng, BigDecimal maxLng) {
        if (minLat == null && maxLat == null && minLng == null && maxLng == null) {
            return;
        }
        if (minLat == null || maxLat == null || minLng == null || maxLng == null) {
            throw new BadRequestException("All bounding box coordinates (minLat, maxLat, minLng, maxLng) must be provided together.");
        }
        if (minLat.compareTo(new BigDecimal("-90.0")) < 0 || maxLat.compareTo(new BigDecimal("90.0")) > 0) {
            throw new BadRequestException("Latitude values must be between -90.0 and 90.0.");
        }
        if (minLng.compareTo(new BigDecimal("-180.0")) < 0 || maxLng.compareTo(new BigDecimal("180.0")) > 0) {
            throw new BadRequestException("Longitude values must be between -180.0 and 180.0.");
        }
        if (minLat.compareTo(maxLat) > 0) {
            throw new BadRequestException("minLat cannot be greater than maxLat.");
        }
        if (minLng.compareTo(maxLng) > 0) {
            throw new BadRequestException("minLng cannot be greater than maxLng.");
        }
    }

    @Transactional(readOnly = true)
    public PagedResponse<ComplaintResponse> getComplaints(UserPrincipal principal,
                                                          ComplaintStatus status,
                                                          String category,
                                                          Pageable pageable) {
        return getComplaints(principal, status, category, null, null, null, null, null, pageable);
    }

    @Transactional(readOnly = true)
    public PagedResponse<ComplaintResponse> getComplaints(UserPrincipal principal,
                                                          ComplaintStatus status,
                                                          String category,
                                                          String ward,
                                                          BigDecimal minLat,
                                                          BigDecimal maxLat,
                                                          BigDecimal minLng,
                                                          BigDecimal maxLng,
                                                          Pageable pageable) {
        validateBoundingBox(minLat, maxLat, minLng, maxLng);

        boolean isAdmin = principal.getAuthorities().stream().anyMatch(a -> a.getAuthority().equals("ROLE_ADMIN"));
        boolean isOfficer = principal.getAuthorities().stream().anyMatch(a -> a.getAuthority().equals("ROLE_OFFICER"));
        boolean isWorker = principal.getAuthorities().stream().anyMatch(a -> a.getAuthority().equals("ROLE_WORKER"));

        Page<Complaint> page;

        if (isAdmin || isOfficer) {
            if (minLat != null) {
                if (ward != null && !ward.trim().isEmpty()) {
                    page = complaintRepository.findBySpatialBoundsAndWard(minLat, maxLat, minLng, maxLng, ward.trim(), pageable);
                } else {
                    page = complaintRepository.findBySpatialBounds(minLat, maxLat, minLng, maxLng, pageable);
                }
            } else if (ward != null && !ward.trim().isEmpty()) {
                page = complaintRepository.findByWardIgnoreCaseOrderByCreatedAtDesc(ward.trim(), pageable);
            } else if (status != null) {
                page = complaintRepository.findByStatusOrderByCreatedAtDesc(status, pageable);
            } else if (category != null && !category.trim().isEmpty()) {
                page = complaintRepository.findByCategoryIgnoreCaseOrderByCreatedAtDesc(category.trim(), pageable);
            } else {
                page = complaintRepository.findAllByOrderByCreatedAtDesc(pageable);
            }
        } else if (isWorker) {
            if (minLat != null) {
                page = complaintRepository.findByAssignedWorkerIdAndSpatialBounds(
                        principal.getId(), minLat, maxLat, minLng, maxLng, pageable);
            } else if (status != null) {
                page = complaintRepository.findByAssignedWorkerIdAndStatusOrderByCreatedAtDesc(principal.getId(), status, pageable);
            } else {
                page = complaintRepository.findByAssignedWorkerIdOrderByCreatedAtDesc(principal.getId(), pageable);
            }
        } else {
            // Citizen: Strictly isolated to own complaints
            if (minLat != null) {
                page = complaintRepository.findByCitizenIdAndSpatialBounds(
                        principal.getId(), minLat, maxLat, minLng, maxLng, pageable);
            } else {
                page = complaintRepository.findByCitizenIdOrderByCreatedAtDesc(principal.getId(), pageable);
            }
        }

        List<ComplaintResponse> dtoList = page.getContent().stream()
                .map(ComplaintResponse::fromEntity)
                .collect(Collectors.toList());

        return new PagedResponse<>(dtoList, page.getNumber(), page.getSize(),
                page.getTotalElements(), page.getTotalPages(), page.isLast());
    }

    @Transactional(readOnly = true)
    public List<PublicMapComplaintResponse> getPublicMapComplaints(BigDecimal minLat,
                                                                   BigDecimal maxLat,
                                                                   BigDecimal minLng,
                                                                   BigDecimal maxLng,
                                                                   ComplaintStatus status,
                                                                   String category,
                                                                   int limit) {
        validateBoundingBox(minLat, maxLat, minLng, maxLng);
        int safeLimit = Math.min(Math.max(limit, 1), 500);
        org.springframework.data.domain.PageRequest pageable = org.springframework.data.domain.PageRequest.of(0, safeLimit);

        List<Complaint> complaints;
        if (minLat != null) {
            if (status != null) {
                complaints = complaintRepository.findPublicMapBySpatialBoundsAndStatus(minLat, maxLat, minLng, maxLng, status, pageable);
            } else {
                complaints = complaintRepository.findPublicMapBySpatialBounds(minLat, maxLat, minLng, maxLng, pageable);
            }
        } else {
            if (status != null) {
                complaints = complaintRepository.findPublicMapByStatus(status, pageable);
            } else {
                complaints = complaintRepository.findAllWithCoordinates(pageable);
            }
        }

        if (category != null && !category.trim().isEmpty()) {
            String catTrimmed = category.trim();
            complaints = complaints.stream()
                    .filter(c -> c.getCategory() != null && c.getCategory().equalsIgnoreCase(catTrimmed))
                    .collect(Collectors.toList());
        }

        List<PublicMapComplaintResponse> result = new ArrayList<>();
        int mapIndex = 1;
        for (Complaint c : complaints) {
            result.add(PublicMapComplaintResponse.fromEntity(c, mapIndex++));
        }
        return result;
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

        if (req.getVersion() != null && !req.getVersion().equals(complaint.getVersion())) {
            throw new ConflictException("Complaint has been modified by another transaction or user. Please refresh the record and try again.");
        }

        ComplaintStatus oldStatus = complaint.getStatus();
        if (oldStatus == ComplaintStatus.SUBMITTED || oldStatus == ComplaintStatus.UNDER_REVIEW || oldStatus == ComplaintStatus.REOPENED) {
            complaint.setStatus(ComplaintStatus.ASSIGNED);
            complaint.addStatusHistory(oldStatus, ComplaintStatus.ASSIGNED, officer,
                    req.getNotes() != null ? req.getNotes() : "Dispatched to technician " + worker.getFullName());
        }

        Complaint saved = complaintRepository.save(complaint);
        complaintRepository.flush();

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

        publishEvent(new ComplaintEvent(
                ComplaintEventType.WORKER_ASSIGNED,
                saved,
                officer,
                oldStatus,
                saved.getStatus(),
                req.getNotes() != null ? req.getNotes() : "Dispatched to technician " + worker.getFullName()
        ));

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

        if (req.getVersion() != null && !req.getVersion().equals(complaint.getVersion())) {
            throw new ConflictException("Complaint has been modified by another transaction or user. Please refresh the record and try again.");
        }

        ComplaintStatus currentStatus = complaint.getStatus();
        ComplaintStatus newStatus = req.getStatus();

        if (currentStatus == newStatus) {
            throw new BadRequestException("Complaint is already in status: " + newStatus);
        }

        // State Machine Governance Rules (Blueprint Rule #9)
        switch (newStatus) {
            case PENDING_CITIZEN_CONFIRMATION:
                if (!isOfficer && !isAdmin) {
                    throw new ForbiddenException("Only municipal officers and administrators can verify resolution evidence.");
                }
                if (currentStatus != ComplaintStatus.RESOLUTION_SUBMITTED) {
                    throw new BadRequestException("Task cannot be transitioned to PENDING_CITIZEN_CONFIRMATION from status: " + currentStatus + ". Allowed previous status: RESOLUTION_SUBMITTED.");
                }

                // Verify evidence location check: if not WITHIN_RANGE, require non-empty acknowledgement (10-500 chars)
                List<ResolutionEvidence> evList = complaint.getEvidenceList();
                if (evList == null || evList.isEmpty()) {
                    evList = evidenceRepository.findByComplaintIdOrderByCreatedAtDesc(complaint.getId());
                }
                if (evList != null && !evList.isEmpty()) {
                    ResolutionEvidence latestEv = evList.stream()
                            .max(Comparator.comparing(ResolutionEvidence::getCreatedAt, Comparator.nullsFirst(Comparator.naturalOrder())))
                            .orElse(evList.get(0));
                    if (latestEv.getLocationCheck() != null && latestEv.getLocationCheck() != LocationCheck.WITHIN_RANGE) {
                        String ack = req.getLocationAcknowledgement() != null && !req.getLocationAcknowledgement().trim().isEmpty()
                                ? req.getLocationAcknowledgement().trim()
                                : (req.getNotes() != null && !req.getNotes().trim().isEmpty() ? req.getNotes().trim() : null);

                        if (ack == null || ack.length() < 10 || ack.length() > 500) {
                            throw new BadRequestException("Resolution evidence location check is " + latestEv.getLocationCheck() +
                                    ". An approval acknowledgement between 10 and 500 characters is required.");
                        }
                    }
                }

                complaint.setPendingConfirmationAt(OffsetDateTime.now());
                break;

            case RESOLVED:
                throw new ForbiddenException("Complaints cannot be directly marked RESOLVED. Citizen confirmation or auto-confirmation is required.");

            case REWORK_REQUESTED:
                if (!isOfficer && !isAdmin) {
                    throw new ForbiddenException("Only municipal officers and administrators can request rework on resolution evidence.");
                }
                if (currentStatus != ComplaintStatus.RESOLUTION_SUBMITTED) {
                    throw new BadRequestException("Task cannot be returned for rework from status: " + currentStatus + ". Allowed previous status: RESOLUTION_SUBMITTED.");
                }
                if (req.getNotes() == null || req.getNotes().trim().isEmpty()) {
                    throw new BadRequestException("A meaningful reason is required when requesting rework.");
                }
                break;

            case REJECTED:
                if (!isOfficer && !isAdmin) {
                    throw new ForbiddenException("Only municipal officers and administrators can reject intake complaints.");
                }
                if (currentStatus == ComplaintStatus.PENDING_CITIZEN_CONFIRMATION) {
                    throw new BadRequestException("Complaints awaiting citizen confirmation cannot be rejected by officers.");
                }
                break;

            case IN_PROGRESS:
                boolean isAssignedWorker = complaint.getAssignedWorker() != null &&
                        complaint.getAssignedWorker().getId().equals(principal.getId());
                if (!isAssignedWorker && !isOfficer && !isAdmin) {
                    throw new ForbiddenException("Only the assigned field worker or an officer can mark tasks IN_PROGRESS.");
                }
                if (currentStatus != ComplaintStatus.ASSIGNED && currentStatus != ComplaintStatus.REWORK_REQUESTED) {
                    throw new BadRequestException("Task cannot be transitioned to IN_PROGRESS from status: " + currentStatus + ". Allowed previous statuses: ASSIGNED, REWORK_REQUESTED.");
                }
                break;

            case RESOLUTION_SUBMITTED:
                boolean workerAuthorized = complaint.getAssignedWorker() != null &&
                        complaint.getAssignedWorker().getId().equals(principal.getId());
                if (!workerAuthorized && !isOfficer && !isAdmin) {
                    throw new ForbiddenException("Only the assigned technician can submit resolution evidence.");
                }
                if (currentStatus != ComplaintStatus.IN_PROGRESS) {
                    throw new BadRequestException("Task cannot be transitioned to RESOLUTION_SUBMITTED from status: " + currentStatus + ". Allowed previous status: IN_PROGRESS.");
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
                boolean isOwner = complaint.getCitizen() != null && complaint.getCitizen().getId().equals(principal.getId());
                if (!isOwner) {
                    throw new ForbiddenException("Only the reporting citizen who filed this complaint can reopen it.");
                }
                if (currentStatus != ComplaintStatus.RESOLVED) {
                    throw new BadRequestException("Only RESOLVED complaints can be reopened for dispute.");
                }
                if (req.getNotes() == null || req.getNotes().trim().length() < 10 || req.getNotes().trim().length() > 500) {
                    throw new BadRequestException("A valid dispute reason between 10 and 500 characters is required to reopen a resolved complaint.");
                }
                OffsetDateTime resolvedAt = complaint.getConfirmedAt() != null ? complaint.getConfirmedAt() : complaint.getUpdatedAt();
                int disputeWindow = reopenWindowDays > 0 ? reopenWindowDays : 30;
                if (resolvedAt != null && OffsetDateTime.now().isAfter(resolvedAt.plusDays(disputeWindow))) {
                    throw new BadRequestException("The dispute window of " + disputeWindow + " days for reopening this complaint has expired.");
                }
                complaint.setReopenCount(complaint.getReopenCount() + 1);
                if (slaService != null && complaint.getPriority() != null) {
                    complaint.setSlaDueAt(slaService.computeSlaDueAt(complaint.getCategory(), complaint.getPriority(), OffsetDateTime.now()));
                }
                complaint.setEscalatedAt(OffsetDateTime.now());
                break;

            default:
                if (isCitizen && !isAdmin && !isOfficer) {
                    throw new ForbiddenException("Citizens cannot arbitrarily advance ticket workflow states.");
                }
                break;
        }

        String effectiveNotes = req.getNotes();
        if (req.getLocationAcknowledgement() != null && !req.getLocationAcknowledgement().trim().isEmpty()) {
            effectiveNotes = (effectiveNotes != null && !effectiveNotes.trim().isEmpty() ? effectiveNotes + " | " : "") +
                    "[Location Acknowledged: " + req.getLocationAcknowledgement().trim() + "]";
        }

        complaint.setStatus(newStatus);
        complaint.addStatusHistory(currentStatus, newStatus, actor, effectiveNotes);

        Complaint saved = complaintRepository.save(complaint);
        complaintRepository.flush();

        String action = "TRANSITION_STATUS";
        if (newStatus == ComplaintStatus.PENDING_CITIZEN_CONFIRMATION) {
            action = "APPROVE_RESOLUTION";
        } else if (newStatus == ComplaintStatus.RESOLVED) {
            action = "CONFIRM_RESOLUTION";
        } else if (newStatus == ComplaintStatus.REWORK_REQUESTED) {
            action = "REQUEST_REWORK";
        } else if (newStatus == ComplaintStatus.REOPENED) {
            action = "REOPEN_COMPLAINT";
        }

        String auditDetails = "Transitioned status from " + currentStatus + " to " + newStatus + " on #" + saved.getReferenceId();
        if (req.getLocationAcknowledgement() != null && !req.getLocationAcknowledgement().trim().isEmpty()) {
            auditDetails += " [Location Acknowledged: " + req.getLocationAcknowledgement().trim() + "]";
        }

        auditService.logAction(
                actor.getId(),
                actor.getFullName(),
                principal.getAuthorities().iterator().next().getAuthority(),
                action,
                "COMPLAINT",
                saved.getId().toString(),
                auditDetails,
                ipAddress,
                "SUCCESS"
        );

        ComplaintEventType eventType = null;
        if (newStatus == ComplaintStatus.IN_PROGRESS) {
            eventType = ComplaintEventType.WORK_STARTED;
        } else if (newStatus == ComplaintStatus.RESOLUTION_SUBMITTED) {
            eventType = ComplaintEventType.RESOLUTION_SUBMITTED;
        } else if (newStatus == ComplaintStatus.PENDING_CITIZEN_CONFIRMATION) {
            eventType = ComplaintEventType.FIX_PENDING_CONFIRMATION;
        } else if (newStatus == ComplaintStatus.RESOLVED) {
            eventType = ComplaintEventType.COMPLAINT_RESOLVED;
        } else if (newStatus == ComplaintStatus.REWORK_REQUESTED) {
            eventType = ComplaintEventType.REWORK_REQUESTED;
        } else if (newStatus == ComplaintStatus.REJECTED) {
            eventType = ComplaintEventType.COMPLAINT_REJECTED;
        } else if (newStatus == ComplaintStatus.REOPENED) {
            eventType = ComplaintEventType.COMPLAINT_REOPENED;
        }

        if (eventType != null) {
            publishEvent(new ComplaintEvent(
                    eventType,
                    saved,
                    actor,
                    currentStatus,
                    newStatus,
                    req.getNotes()
            ));
        }

        return ComplaintResponse.fromEntity(saved);
    }

    @Transactional
    public ComplaintResponse addProgressNote(String idOrRef, String note, UserPrincipal principal, String ipAddress) {
        if (note == null || note.trim().isEmpty()) {
            throw new BadRequestException("Progress note cannot be empty.");
        }

        Complaint complaint = resolveComplaint(idOrRef);
        User actor = userRepository.findById(principal.getId())
                .orElseThrow(() -> new ResourceNotFoundException("User not found."));

        boolean isAssignedWorker = complaint.getAssignedWorker() != null &&
                complaint.getAssignedWorker().getId().equals(principal.getId());
        boolean isOfficer = principal.getAuthorities().stream().anyMatch(a -> a.getAuthority().equals("ROLE_OFFICER"));
        boolean isAdmin = principal.getAuthorities().stream().anyMatch(a -> a.getAuthority().equals("ROLE_ADMIN"));

        if (!isAssignedWorker && !isOfficer && !isAdmin) {
            throw new ForbiddenException("Only the assigned technician or an officer can add operational progress notes.");
        }

        ComplaintStatus status = complaint.getStatus();
        complaint.addStatusHistory(status, status, actor, note.trim());
        complaint.setUpdatedAt(java.time.OffsetDateTime.now());

        Complaint saved = complaintRepository.save(complaint);
        complaintRepository.flush();

        auditService.logAction(
                actor.getId(),
                actor.getFullName(),
                principal.getAuthorities().iterator().next().getAuthority(),
                "PROGRESS_NOTE",
                "COMPLAINT",
                saved.getId().toString(),
                "Added operational note on #" + saved.getReferenceId() + ": " + note.trim(),
                ipAddress,
                "SUCCESS"
        );

        return ComplaintResponse.fromEntity(saved);
    }

    @Transactional
    public ComplaintResponse submitEvidence(String idOrRef,
                                            String notes,
                                            List<MultipartFile> files,
                                            BigDecimal latitude,
                                            BigDecimal longitude,
                                            BigDecimal accuracy,
                                            Boolean deviceReported,
                                            UserPrincipal principal,
                                            String ipAddress) {
        return submitEvidence(idOrRef, notes, files, latitude, longitude, accuracy, null, deviceReported, principal, ipAddress);
    }

    @Transactional
    public ComplaintResponse submitEvidence(String idOrRef,
                                            String notes,
                                            List<MultipartFile> files,
                                            BigDecimal latitude,
                                            BigDecimal longitude,
                                            BigDecimal accuracy,
                                            String locationNote,
                                            Boolean deviceReported,
                                            UserPrincipal principal,
                                            String ipAddress) {
        Complaint complaint = resolveComplaint(idOrRef);

        // Ownership enforcement: only assigned field technician or officer/admin
        boolean isOfficer = principal.getAuthorities().stream().anyMatch(a -> a.getAuthority().equals("ROLE_OFFICER"));
        boolean isAdmin = principal.getAuthorities().stream().anyMatch(a -> a.getAuthority().equals("ROLE_ADMIN"));
        boolean isAssigned = complaint.getAssignedWorker() != null &&
                complaint.getAssignedWorker().getId().equals(principal.getId());

        if (!isAssigned && !isOfficer && !isAdmin) {
            throw new ForbiddenException("Only the assigned technician can submit repair evidence for this work order.");
        }

        // Strict task lifecycle state enforcement
        if (complaint.getStatus() != ComplaintStatus.IN_PROGRESS) {
            throw new BadRequestException("Task cannot be transitioned to RESOLUTION_SUBMITTED from status: " + complaint.getStatus() + ". Allowed previous status: IN_PROGRESS.");
        }

        // Validate completion narrative notes
        if (notes == null || notes.trim().isEmpty()) {
            throw new BadRequestException("Completion narrative notes are required.");
        }

        // Validate photographs list
        if (files == null || files.isEmpty()) {
            throw new BadRequestException("At least one authentic repair evidence photograph is required.");
        }
        if (files.size() > 5) {
            throw new BadRequestException("A maximum of 5 evidence photographs can be submitted.");
        }

        // Server-authoritative location verification calculation
        LocationCheck locationCheck;
        BigDecimal distanceMeters = null;
        BigDecimal accuracyMeters = null;
        String cleanLocationNote = locationNote != null ? locationNote.trim() : null;

        if (latitude == null && longitude == null) {
            locationCheck = LocationCheck.NOT_PROVIDED;
            if (cleanLocationNote == null || cleanLocationNote.length() < 10) {
                throw new BadRequestException("When GPS coordinates are not provided, an explanation location note of at least 10 characters is required.");
            }
        } else if (latitude == null || longitude == null) {
            throw new BadRequestException("Both latitude and longitude must be provided together.");
        } else {
            double dLat = latitude.doubleValue();
            double dLon = longitude.doubleValue();

            if (Double.isNaN(dLat) || Double.isInfinite(dLat) || dLat < -90.0 || dLat > 90.0) {
                throw new BadRequestException("Invalid latitude: must be between -90 and 90 degrees.");
            }
            if (Double.isNaN(dLon) || Double.isInfinite(dLon) || dLon < -180.0 || dLon > 180.0) {
                throw new BadRequestException("Invalid longitude: must be between -180 and 180 degrees.");
            }
            if (Double.compare(dLat, 0.0) == 0 && Double.compare(dLon, 0.0) == 0) {
                throw new BadRequestException("Coordinates (0, 0) are invalid.");
            }

            if (accuracy != null) {
                double dAcc = accuracy.doubleValue();
                if (Double.isNaN(dAcc) || Double.isInfinite(dAcc) || dAcc <= 0.0 || dAcc >= 100000.0) {
                    throw new BadRequestException("GPS accuracy must be a positive number below 100,000 meters.");
                }
                accuracyMeters = BigDecimal.valueOf(Math.round(dAcc * 10.0) / 10.0);
            }

            if (complaint.getLatitude() == null || complaint.getLongitude() == null) {
                locationCheck = LocationCheck.NOT_CHECKABLE;
            } else {
                double dist = com.civicfix.common.util.GeoUtils.haversineDistance(
                        complaint.getLatitude(), complaint.getLongitude(), latitude, longitude);
                distanceMeters = BigDecimal.valueOf(Math.round(dist * 10.0) / 10.0);

                if (accuracy != null && accuracy.doubleValue() > maxAccuracyMeters) {
                    locationCheck = LocationCheck.LOW_ACCURACY;
                } else if (dist <= maxDistanceMeters) {
                    locationCheck = LocationCheck.WITHIN_RANGE;
                } else {
                    locationCheck = LocationCheck.OUT_OF_RANGE;
                }

                if ((locationCheck == LocationCheck.LOW_ACCURACY || locationCheck == LocationCheck.OUT_OF_RANGE)
                        && (cleanLocationNote == null || cleanLocationNote.length() < 10)) {
                    throw new BadRequestException("Evidence location check is " + locationCheck + " (distance: " + distanceMeters + "m). An explanation location note of at least 10 characters is required.");
                }
            }
        }

        User actor = userRepository.findById(principal.getId())
                .orElseThrow(() -> new ResourceNotFoundException("Authenticated user not found."));

        // Store evidence files safely with rollback defense
        List<String> storedUrls = new ArrayList<>();
        try {
            for (MultipartFile file : files) {
                if (file == null || file.isEmpty()) {
                    throw new BadRequestException("Uploaded evidence photo cannot be empty.");
                }
                String storedUrl = storageService.storeFile(file, "complaints/" + complaint.getId());
                storedUrls.add(storedUrl);
            }
        } catch (IOException e) {
            // Roll back any physical files created during this partial batch
            for (String url : storedUrls) {
                String fname = url.substring(url.lastIndexOf('/') + 1);
                storageService.deleteFile(fname, "complaints/" + complaint.getId());
            }
            throw new RuntimeException("Failed to store evidence photos. Upload aborted without modifying complaint status.", e);
        }

        try {
            // Persist ResolutionEvidence metadata for each uploaded photograph
            for (String photoUrl : storedUrls) {
                ResolutionEvidence evidence = new ResolutionEvidence();
                evidence.setComplaint(complaint);
                evidence.setWorker(actor);
                evidence.setPhotoUrl(photoUrl);
                evidence.setLatitude(latitude);
                evidence.setLongitude(longitude);
                evidence.setDistanceMeters(distanceMeters);
                evidence.setAccuracyMeters(accuracyMeters);
                evidence.setLocationCheck(locationCheck);
                evidence.setLocationNote(cleanLocationNote);
                evidence.setEvidenceNotes(notes.trim());
                if (evidence.getCreatedAt() == null) {
                    evidence.setCreatedAt(OffsetDateTime.now());
                }
                evidenceRepository.save(evidence);
                complaint.getEvidenceList().add(evidence);
            }

            // Transition status strictly to RESOLUTION_SUBMITTED (never straight to RESOLVED)
            ComplaintStatus previousStatus = complaint.getStatus();
            complaint.setStatus(ComplaintStatus.RESOLUTION_SUBMITTED);
            Complaint saved = complaintRepository.save(complaint);
            complaintRepository.flush();

            // Record in status history
            String historyNotes = notes.trim();
            if (cleanLocationNote != null && !cleanLocationNote.isEmpty()) {
                historyNotes += " [Location: " + locationCheck + " - " + cleanLocationNote + "]";
            }

            ComplaintStatusHistory history = new ComplaintStatusHistory();
            history.setComplaint(saved);
            history.setPreviousStatus(previousStatus.name());
            history.setNewStatus(ComplaintStatus.RESOLUTION_SUBMITTED.name());
            history.setChangedByUser(actor);
            history.setChangedByName(actor.getFullName());
            history.setNotes(historyNotes);
            historyRepository.save(history);

            // Record in platform audit ledger
            String auditDetail = String.format("Technician %s submitted %d repair evidence photo(s). Location check: %s, Distance: %s, Accuracy: %s.",
                    actor.getFullName(), storedUrls.size(), locationCheck,
                    distanceMeters != null ? distanceMeters + "m" : "N/A",
                    accuracyMeters != null ? accuracyMeters + "m" : "N/A");

            auditService.logAction(
                    actor.getId(),
                    actor.getFullName(),
                    principal.getAuthorities().iterator().next().getAuthority(),
                    "SUBMIT_EVIDENCE",
                    "COMPLAINT",
                    saved.getReferenceId(),
                    auditDetail,
                    ipAddress,
                    "SUCCESS"
            );

            return ComplaintResponse.fromEntity(saved);
        } catch (Exception e) {
            for (String url : storedUrls) {
                String fname = url.substring(url.lastIndexOf('/') + 1);
                storageService.deleteFile(fname, "complaints/" + complaint.getId());
            }
            throw e;
        }
    }

    @Transactional(readOnly = true)
    public List<ResolutionEvidenceResponse> getComplaintEvidence(String idOrRef, UserPrincipal principal) {
        Complaint complaint = resolveComplaint(idOrRef);
        enforceReadPermission(complaint, principal);
        return evidenceRepository.findByComplaintIdOrderByCreatedAtDesc(complaint.getId())
                .stream()
                .map(ResolutionEvidenceResponse::fromEntity)
                .toList();
    }

    @Transactional(readOnly = true)
    public Resource loadEvidenceFile(String filename, UserPrincipal principal) {
        if (principal == null) {
            throw new ForbiddenException("Authentication required to access repair evidence files.");
        }
        if (filename == null || filename.trim().isEmpty()) {
            throw new BadRequestException("Filename cannot be empty.");
        }
        String cleanName = org.springframework.util.StringUtils.cleanPath(filename.trim());
        if (cleanName.contains("..") || cleanName.contains("/") || cleanName.contains("\\")) {
            throw new BadRequestException("Invalid filename path sequence.");
        }

        // 1. Every served file MUST be linked to an existing ResolutionEvidence or ComplaintPhoto record in the database
        // Matches exact trailing filename segment without loose substring ambiguity or database schema migration
        Complaint complaint = null;
        Optional<ResolutionEvidence> evidenceOpt = evidenceRepository.findFirstByPhotoUrlEndingWith(cleanName);
        if (evidenceOpt.isEmpty()) {
            evidenceOpt = evidenceRepository.findFirstByPhotoUrlContaining(cleanName);
        }
        if (evidenceOpt.isPresent()) {
            complaint = evidenceOpt.get().getComplaint();
        } else {
            Optional<ComplaintPhoto> photoOpt = complaintPhotoRepository.findFirstByPhotoUrlEndingWith(cleanName);
            if (photoOpt.isEmpty()) {
                photoOpt = complaintPhotoRepository.findFirstByPhotoUrlContaining(cleanName);
            }
            if (photoOpt.isPresent()) {
                complaint = photoOpt.get().getComplaint();
            }
        }

        if (complaint == null) {
            throw new ResourceNotFoundException("Evidence photo not found: " + cleanName);
        }

        // 2. Enforce authorization rules (Admin/Officer can access all; Worker can access if assigned; Citizen can access if complaint owner)
        enforceReadPermission(complaint, principal);

        // 3. Resolve file from the complaint-specific directory: "complaints/" + complaintId
        String subDirectory = "complaints/" + complaint.getId();
        try {
            return storageService.loadFileAsResource(cleanName, subDirectory);
        } catch (IOException e) {
            throw new ResourceNotFoundException("Evidence photo not found or not readable: " + cleanName);
        }
    }

    @Transactional
    public ComplaintResponse adjudicateTriage(String idOrRef, AdjudicateTriageRequest req, UserPrincipal principal, String ipAddress) {
        boolean isOfficer = principal.getAuthorities().stream().anyMatch(a -> a.getAuthority().equals("ROLE_OFFICER"));
        boolean isAdmin = principal.getAuthorities().stream().anyMatch(a -> a.getAuthority().equals("ROLE_ADMIN"));
        if (!isOfficer && !isAdmin) {
            throw new ForbiddenException("Only municipal officers and administrators can adjudicate AI triage recommendations.");
        }

        Complaint complaint = resolveComplaint(idOrRef);
        User officer = userRepository.findById(principal.getId())
                .orElseThrow(() -> new ResourceNotFoundException("Officer account not found."));

        if (req.getVersion() != null && !req.getVersion().equals(complaint.getVersion())) {
            throw new ConflictException("Complaint has been modified by another transaction or user. Please refresh the record and try again.");
        }

        String action = req.getAction().trim().toUpperCase();
        String auditDetails;
        String historyNote;

        switch (action) {
            case "ACCEPT":
                if ((complaint.getAiDetectedCategory() == null || complaint.getAiDetectedCategory().isBlank()) &&
                        complaint.getAiRecommendedPriority() == null) {
                    throw new BadRequestException("No pending AI recommendation available to accept on complaint #" + complaint.getReferenceId());
                }
                if (complaint.getAiDetectedCategory() != null && !complaint.getAiDetectedCategory().isBlank()) {
                    complaint.setCategory(complaint.getAiDetectedCategory());
                }
                if (complaint.getAiRecommendedPriority() != null) {
                    complaint.setPriority(complaint.getAiRecommendedPriority());
                }
                complaint.setAiAdjudicationStatus("ACCEPTED");
                historyNote = "AI Triage Accepted: Adopted category [" + complaint.getCategory() +
                        "] and priority [" + complaint.getPriority() + "]. " +
                        (req.getNotes() != null && !req.getNotes().isBlank() ? "Officer notes: " + req.getNotes().trim() : "");
                auditDetails = String.format("Officer %s accepted AI triage on complaint #%s (Category: %s, Priority: %s). %s",
                        officer.getFullName(), complaint.getReferenceId(), complaint.getCategory(), complaint.getPriority(),
                        req.getNotes() != null ? "Notes: " + req.getNotes().trim() : "");
                break;

            case "OVERRIDE":
                if ((req.getCategory() == null || req.getCategory().isBlank()) && req.getPriority() == null) {
                    throw new BadRequestException("Override action requires either an updated category or priority.");
                }
                if (req.getCategory() != null && !req.getCategory().isBlank()) {
                    complaint.setCategory(req.getCategory().trim());
                }
                if (req.getPriority() != null) {
                    complaint.setPriority(req.getPriority());
                }
                complaint.setAiAdjudicationStatus("OVERRIDDEN");
                historyNote = "AI Triage Overridden: Updated category to [" + complaint.getCategory() +
                        "] and priority to [" + complaint.getPriority() + "]. " +
                        (req.getNotes() != null && !req.getNotes().isBlank() ? "Reason: " + req.getNotes().trim() : "");
                auditDetails = String.format("Officer %s overrode AI triage on complaint #%s (New Category: %s, New Priority: %s). %s",
                        officer.getFullName(), complaint.getReferenceId(), complaint.getCategory(), complaint.getPriority(),
                        req.getNotes() != null ? "Reason: " + req.getNotes().trim() : "");
                break;

            case "DISMISS":
                complaint.setAiAdjudicationStatus("DISMISSED");
                historyNote = "AI Triage Dismissed: Preserved existing category [" + complaint.getCategory() +
                        "] and priority [" + complaint.getPriority() + "]. " +
                        (req.getNotes() != null && !req.getNotes().isBlank() ? "Reason: " + req.getNotes().trim() : "");
                auditDetails = String.format("Officer %s dismissed AI triage advice on complaint #%s. %s",
                        officer.getFullName(), complaint.getReferenceId(),
                        req.getNotes() != null ? "Reason: " + req.getNotes().trim() : "");
                break;

            default:
                throw new BadRequestException("Invalid adjudication action: " + action + ". Allowed values: ACCEPT, OVERRIDE, DISMISS.");
        }

        if (slaService != null && complaint.getPriority() != null && ("ACCEPT".equals(action) || "OVERRIDE".equals(action))) {
            complaint.setSlaDueAt(slaService.computeSlaDueAt(complaint.getCategory(), complaint.getPriority(), complaint.getCreatedAt()));
        }

        complaint.setUpdatedAt(OffsetDateTime.now());
        complaint.addStatusHistory(complaint.getStatus(), complaint.getStatus(), officer, historyNote.trim());
        Complaint saved = complaintRepository.save(complaint);
        complaintRepository.flush();

        auditService.logAction(
                officer.getId(),
                officer.getFullName(),
                principal.getAuthorities().iterator().next().getAuthority(),
                "ADJUDICATE_AI_TRIAGE",
                "COMPLAINT",
                saved.getId().toString(),
                auditDetails,
                ipAddress,
                "SUCCESS"
        );

        return ComplaintResponse.fromEntity(saved);
    }

    @Transactional(readOnly = true)
    public List<DuplicateCandidate> getDuplicateCandidates(String idOrRef, UserPrincipal principal) {
        boolean isOfficer = principal.getAuthorities().stream().anyMatch(a -> a.getAuthority().equals("ROLE_OFFICER"));
        boolean isAdmin = principal.getAuthorities().stream().anyMatch(a -> a.getAuthority().equals("ROLE_ADMIN"));
        if (!isOfficer && !isAdmin) {
            throw new ForbiddenException("Only municipal officers and administrators can inspect duplicate candidate recommendations.");
        }

        Complaint complaint = resolveComplaint(idOrRef);
        if (aiTriageService == null) {
            return Collections.emptyList();
        }

        return aiTriageService.findDuplicateCandidates(complaint);
    }

    @Transactional
    public ComplaintResponse linkDuplicate(String idOrRef, LinkDuplicateRequest req, UserPrincipal principal, String ipAddress) {
        boolean isOfficer = principal.getAuthorities().stream().anyMatch(a -> a.getAuthority().equals("ROLE_OFFICER"));
        boolean isAdmin = principal.getAuthorities().stream().anyMatch(a -> a.getAuthority().equals("ROLE_ADMIN"));
        if (!isOfficer && !isAdmin) {
            throw new ForbiddenException("Only municipal officers and administrators can link duplicate complaints.");
        }

        if (req.getParentComplaintId() == null || req.getParentComplaintId().isBlank()) {
            throw new BadRequestException("Parent complaint identifier cannot be empty.");
        }

        Complaint child = resolveComplaint(idOrRef);
        Complaint parent = resolveComplaint(req.getParentComplaintId());
        User officer = userRepository.findById(principal.getId())
                .orElseThrow(() -> new ResourceNotFoundException("Officer account not found."));

        // 1. Validate both IDs and prevent self-linking
        if (child.getId().equals(parent.getId())) {
            throw new BadRequestException("A complaint cannot be linked as a duplicate of itself.");
        }

        // 2. Prevent invalid duplicate chains:
        // Reject linking if parent is already a duplicate of another complaint
        if (parent.getDuplicateOf() != null) {
            throw new BadRequestException(String.format(
                    "Invalid duplicate chain: Complaint #%s is already marked as a duplicate of #%s. Chained duplicates are prohibited; please link directly to root complaint #%s.",
                    parent.getReferenceId(), parent.getDuplicateOf().getReferenceId(), parent.getDuplicateOf().getReferenceId()));
        }

        // Reject linking if child complaint already has duplicate complaints pointing to it
        long existingChildren = complaintRepository.countByDuplicateOfId(child.getId());
        if (existingChildren > 0) {
            throw new BadRequestException(String.format(
                    "Invalid duplicate chain: Complaint #%s already has %d duplicate complaints linked to it. Resolve child links before re-linking this record.",
                    child.getReferenceId(), existingChildren));
        }

        // 3. Prevent circular relationships: trace parent hierarchy
        Complaint cursor = parent;
        Set<UUID> ancestors = new HashSet<>();
        ancestors.add(child.getId());
        while (cursor != null) {
            if (ancestors.contains(cursor.getId())) {
                throw new BadRequestException(String.format(
                        "Circular duplicate relationship detected between complaint #%s and #%s.",
                        child.getReferenceId(), parent.getReferenceId()));
            }
            cursor = cursor.getDuplicateOf();
        }

        // 4. Optimistic locking
        if (req.getVersion() != null && !req.getVersion().equals(child.getVersion())) {
            throw new ConflictException("Complaint has been modified by another transaction or user. Please refresh the record and try again.");
        }

        // 5. Non-destructive linking:
        // Keep citizen, status, description, address, coordinates, and photos completely intact.
        child.setDuplicateOf(parent);
        child.setUpdatedAt(OffsetDateTime.now());

        String reasonText = req.getReason() != null && !req.getReason().isBlank() ? req.getReason().trim() : "Linked by municipal officer review";
        String historyNote = String.format("Linked as duplicate of master complaint #%s. Reason: %s", parent.getReferenceId(), reasonText);
        child.addStatusHistory(child.getStatus(), child.getStatus(), officer, historyNote);

        Complaint saved = complaintRepository.save(child);
        complaintRepository.flush();

        // 6. Audit log
        auditService.logAction(
                officer.getId(),
                officer.getFullName(),
                principal.getAuthorities().iterator().next().getAuthority(),
                "LINK_DUPLICATE",
                "COMPLAINT",
                saved.getId().toString(),
                String.format("Officer %s linked complaint #%s as duplicate of #%s. Reason: %s",
                        officer.getFullName(), saved.getReferenceId(), parent.getReferenceId(), reasonText),
                ipAddress,
                "SUCCESS"
        );

        publishEvent(new ComplaintEvent(
                ComplaintEventType.DUPLICATE_LINKED,
                saved,
                officer,
                saved.getStatus(),
                saved.getStatus(),
                reasonText
        ));

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

    @Transactional
    public ComplaintResponse escalateComplaint(String idOrRef, EscalateComplaintRequest req, UserPrincipal principal, String ipAddress) {
        boolean isOfficer = principal.getAuthorities().stream().anyMatch(a -> a.getAuthority().equals("ROLE_OFFICER"));
        boolean isSupervisor = principal.getAuthorities().stream().anyMatch(a -> a.getAuthority().equals("ROLE_SUPERVISOR"));
        boolean isAdmin = principal.getAuthorities().stream().anyMatch(a -> a.getAuthority().equals("ROLE_ADMIN"));

        if (!isOfficer && !isSupervisor && !isAdmin) {
            throw new ForbiddenException("Only municipal officers, supervisors, and administrators can escalate complaints.");
        }

        if (req == null || req.getReason() == null || req.getReason().trim().length() < 10 || req.getReason().trim().length() > 500) {
            throw new BadRequestException("A valid escalation reason between 10 and 500 characters is required.");
        }

        Complaint complaint = resolveComplaint(idOrRef);
        if (complaint.getEscalatedAt() != null) {
            throw new ConflictException("Complaint #" + complaint.getReferenceId() + " has already been escalated.");
        }

        User actor = userRepository.findById(principal.getId())
                .orElseThrow(() -> new ResourceNotFoundException("Authenticated user not found."));

        boolean success = slaEscalationService.escalateComplaint(complaint.getId(), req.getReason().trim(), actor, ipAddress);
        if (!success) {
            throw new ConflictException("Complaint #" + complaint.getReferenceId() + " has already been escalated.");
        }

        Complaint reloaded = complaintRepository.findById(complaint.getId()).orElse(complaint);
        return ComplaintResponse.fromEntity(reloaded);
    }

    @Transactional
    public ComplaintResponse confirmResolution(String idOrRef, ConfirmResolutionRequest req, UserPrincipal principal, String ipAddress) {
        Complaint complaint = resolveComplaint(idOrRef);
        enforceOwningCitizen(complaint, principal);

        if (complaint.getStatus() != ComplaintStatus.PENDING_CITIZEN_CONFIRMATION) {
            throw new ConflictException("Complaint #" + complaint.getReferenceId() + " is currently in status " +
                    complaint.getStatus() + ". Only complaints in PENDING_CITIZEN_CONFIRMATION can be confirmed.");
        }

        if (req != null && req.getVersion() != null && !req.getVersion().equals(complaint.getVersion())) {
            throw new ConflictException("Complaint has been modified by another process. Please refresh and try again.");
        }

        User citizen = userRepository.findById(principal.getId())
                .orElseThrow(() -> new ResourceNotFoundException("Citizen account not found."));

        OffsetDateTime now = OffsetDateTime.now();
        complaint.setStatus(ComplaintStatus.RESOLVED);
        complaint.setConfirmedAt(now);
        complaint.setConfirmationSource("CITIZEN");
        complaint.setUpdatedAt(now);

        String notes = (req != null && req.getNotes() != null && !req.getNotes().isBlank())
                ? req.getNotes().trim()
                : "Citizen confirmed defect has been resolved.";
        complaint.addStatusHistory(ComplaintStatus.PENDING_CITIZEN_CONFIRMATION, ComplaintStatus.RESOLVED, citizen, notes);

        Complaint saved = complaintRepository.save(complaint);
        complaintRepository.flush();

        auditService.logAction(
                citizen.getId(),
                citizen.getFullName(),
                "CITIZEN",
                "CONFIRM_RESOLUTION",
                "COMPLAINT",
                saved.getId().toString(),
                "Citizen confirmed resolution on complaint #" + saved.getReferenceId(),
                ipAddress,
                "SUCCESS"
        );

        publishEvent(new ComplaintEvent(
                ComplaintEventType.RESOLUTION_CONFIRMED,
                saved,
                citizen,
                ComplaintStatus.PENDING_CITIZEN_CONFIRMATION,
                ComplaintStatus.RESOLVED,
                notes
        ));

        return ComplaintResponse.fromEntity(saved);
    }

    @Transactional
    public ComplaintResponse rejectResolution(String idOrRef, RejectResolutionRequest req, MultipartFile photo, UserPrincipal principal, String ipAddress) {
        Complaint complaint = resolveComplaint(idOrRef);
        enforceOwningCitizen(complaint, principal);

        if (complaint.getStatus() != ComplaintStatus.PENDING_CITIZEN_CONFIRMATION) {
            throw new ConflictException("Complaint #" + complaint.getReferenceId() + " is currently in status " +
                    complaint.getStatus() + ". Only complaints in PENDING_CITIZEN_CONFIRMATION can be rejected.");
        }

        if (req == null || req.getReason() == null || req.getReason().trim().length() < 10 || req.getReason().trim().length() > 500) {
            throw new BadRequestException("A valid rejection reason between 10 and 500 characters is required.");
        }

        if (req.getVersion() != null && !req.getVersion().equals(complaint.getVersion())) {
            throw new ConflictException("Complaint has been modified by another process. Please refresh and try again.");
        }

        User citizen = userRepository.findById(principal.getId())
                .orElseThrow(() -> new ResourceNotFoundException("Citizen account not found."));

        OffsetDateTime now = OffsetDateTime.now();
        complaint.setStatus(ComplaintStatus.REOPENED);
        complaint.setReopenCount(complaint.getReopenCount() + 1);

        // Reset SLA due date from policy starting now
        if (slaService != null && complaint.getPriority() != null) {
            complaint.setSlaDueAt(slaService.computeSlaDueAt(complaint.getCategory(), complaint.getPriority(), now));
        }

        // Escalate complaint with now timestamp, overriding any earlier escalation
        complaint.setEscalatedAt(now);
        complaint.setUpdatedAt(now);

        // Process optional citizen rejection photograph using existing validated StorageService
        if (photo != null && !photo.isEmpty()) {
            try {
                String storedUrl = storageService.storeFile(photo, "complaints/" + complaint.getId());
                ComplaintPhoto cp = new ComplaintPhoto(complaint, storedUrl);
                complaintPhotoRepository.save(cp);
                complaint.getPhotos().add(cp);
            } catch (Exception ex) {
                log.warn("Failed to store citizen rejection photograph: {}", ex.getMessage());
            }
        }

        String note = "Citizen reported issue is not fixed: " + req.getReason().trim();
        complaint.addStatusHistory(ComplaintStatus.PENDING_CITIZEN_CONFIRMATION, ComplaintStatus.REOPENED, citizen, note);

        Complaint saved = complaintRepository.save(complaint);
        complaintRepository.flush();

        auditService.logAction(
                citizen.getId(),
                citizen.getFullName(),
                "CITIZEN",
                "REJECT_RESOLUTION",
                "COMPLAINT",
                saved.getId().toString(),
                "Citizen rejected the fix on #" + saved.getReferenceId() + ". Reason: " + req.getReason().trim(),
                ipAddress,
                "SUCCESS"
        );

        publishEvent(new ComplaintEvent(
                ComplaintEventType.RESOLUTION_REJECTED,
                saved,
                citizen,
                ComplaintStatus.PENDING_CITIZEN_CONFIRMATION,
                ComplaintStatus.REOPENED,
                req.getReason().trim()
        ));

        return ComplaintResponse.fromEntity(saved);
    }

    private void enforceOwningCitizen(Complaint complaint, UserPrincipal principal) {
        if (principal == null || principal.getId() == null) {
            throw new ForbiddenException("Authentication required.");
        }
        boolean isOwner = complaint.getCitizen() != null && complaint.getCitizen().getId().equals(principal.getId());
        if (!isOwner) {
            throw new ForbiddenException("Only the reporting citizen who filed this complaint can confirm or reject resolution.");
        }
    }

    private void enforceReadPermission(Complaint complaint, UserPrincipal principal) {
        boolean isAdmin = principal.getAuthorities().stream().anyMatch(a -> a.getAuthority().equals("ROLE_ADMIN"));
        boolean isOfficer = principal.getAuthorities().stream().anyMatch(a -> a.getAuthority().equals("ROLE_OFFICER"));
        boolean isSupervisor = principal.getAuthorities().stream().anyMatch(a -> a.getAuthority().equals("ROLE_SUPERVISOR"));
        if (isAdmin || isOfficer || isSupervisor) {
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
