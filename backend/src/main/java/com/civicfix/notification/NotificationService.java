package com.civicfix.notification;

import com.civicfix.common.PagedResponse;
import com.civicfix.common.exception.BadRequestException;
import com.civicfix.common.exception.ResourceNotFoundException;
import com.civicfix.common.exception.UnauthorizedException;
import com.civicfix.complaint.Complaint;
import com.civicfix.complaint.ComplaintPriority;
import com.civicfix.complaint.event.ComplaintEvent;
import com.civicfix.notification.dto.NotificationResponse;
import com.civicfix.security.UserPrincipal;
import com.civicfix.user.RoleName;
import com.civicfix.user.User;
import com.civicfix.user.UserRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;

import java.time.OffsetDateTime;
import java.util.List;
import java.util.UUID;

@Service
public class NotificationService {

    private static final Logger log = LoggerFactory.getLogger(NotificationService.class);
    private static final int DEDUPLICATION_WINDOW_SECONDS = 30;

    private final NotificationRepository notificationRepository;
    private final UserRepository userRepository;

    public NotificationService(NotificationRepository notificationRepository, UserRepository userRepository) {
        this.notificationRepository = notificationRepository;
        this.userRepository = userRepository;
    }

    /**
     * Handles complaint lifecycle events after transaction commit in an isolated transaction.
     */
    @Transactional(propagation = Propagation.REQUIRES_NEW)
    public void handleComplaintEvent(ComplaintEvent event) {
        if (event == null || event.getComplaint() == null) {
            return;
        }

        Complaint complaint = event.getComplaint();
        User actor = event.getActor();
        String refId = complaint.getReferenceId();

        try {
            switch (event.getEventType()) {
                case COMPLAINT_CREATED:
                    // 1. Notify author citizen
                    sendNotification(
                            complaint.getCitizen(),
                            actor,
                            complaint,
                            refId,
                            "Complaint Submitted #" + refId,
                            "Your civic complaint has been registered and is pending municipal review.",
                            NotificationType.COMPLAINT_CREATED,
                            NotificationSeverity.INFO,
                            "/citizen/complaints/" + refId
                    );

                    // 2. Notify municipal officers
                    NotificationSeverity officerSeverity = (complaint.getPriority() == ComplaintPriority.CRITICAL || complaint.getPriority() == ComplaintPriority.HIGH)
                            ? NotificationSeverity.ACTION_REQUIRED
                            : NotificationSeverity.INFO;
                    String wardDesc = complaint.getWard() != null ? complaint.getWard() : "City";
                    List<User> officers = userRepository.findActiveUsersByRoleName(RoleName.OFFICER);
                    for (User officer : officers) {
                        sendNotification(
                                officer,
                                actor,
                                complaint,
                                refId,
                                "New Complaint Intake #" + refId,
                                "New intake defect in " + wardDesc + ": " + complaint.getTitle(),
                                NotificationType.COMPLAINT_CREATED,
                                officerSeverity,
                                "/officer/complaints/" + refId + "/review"
                        );
                    }
                    break;

                case WORKER_ASSIGNED:
                    // 1. Notify assigned field technician
                    if (complaint.getAssignedWorker() != null) {
                        sendNotification(
                                complaint.getAssignedWorker(),
                                actor,
                                complaint,
                                refId,
                                "New Task Dispatched #" + refId,
                                "You have been assigned to repair: " + complaint.getTitle(),
                                NotificationType.WORKER_ASSIGNED,
                                NotificationSeverity.INFO,
                                "/worker/tasks/" + refId
                        );
                    }

                    // 2. Notify citizen
                    String workerName = complaint.getAssignedWorker() != null ? complaint.getAssignedWorker().getFullName() : "field personnel";
                    sendNotification(
                            complaint.getCitizen(),
                            actor,
                            complaint,
                            refId,
                            "Field Technician Dispatched #" + refId,
                            "Technician " + workerName + " has been assigned to your ticket.",
                            NotificationType.WORKER_ASSIGNED,
                            NotificationSeverity.INFO,
                            "/citizen/complaints/" + refId
                    );
                    break;

                case WORK_STARTED:
                    // Notify citizen that repairs began
                    sendNotification(
                            complaint.getCitizen(),
                            actor,
                            complaint,
                            refId,
                            "Work Order In Progress #" + refId,
                            "Field technician has arrived on scene and begun repair operations.",
                            NotificationType.STATUS_CHANGED,
                            NotificationSeverity.INFO,
                            "/citizen/complaints/" + refId
                    );
                    break;

                case RESOLUTION_SUBMITTED:
                    // 1. Notify reviewing officer
                    if (complaint.getAssignedOfficer() != null) {
                        sendNotification(
                                complaint.getAssignedOfficer(),
                                actor,
                                complaint,
                                refId,
                                "Resolution Proof Awaiting Verification #" + refId,
                                "Field technician submitted repair evidence for inspection.",
                                NotificationType.RESOLUTION_SUBMITTED,
                                NotificationSeverity.ACTION_REQUIRED,
                                "/officer/verifications/" + refId
                        );
                    } else {
                        List<User> activeOfficers = userRepository.findActiveUsersByRoleName(RoleName.OFFICER);
                        for (User off : activeOfficers) {
                            sendNotification(
                                    off,
                                    actor,
                                    complaint,
                                    refId,
                                    "Resolution Proof Awaiting Verification #" + refId,
                                    "Field technician submitted repair evidence for inspection.",
                                    NotificationType.RESOLUTION_SUBMITTED,
                                    NotificationSeverity.ACTION_REQUIRED,
                                    "/officer/verifications/" + refId
                            );
                        }
                    }

                    // 2. Notify citizen
                    sendNotification(
                            complaint.getCitizen(),
                            actor,
                            complaint,
                            refId,
                            "Repair Completed — Verification Pending #" + refId,
                            "Field repairs have completed. Municipal officer verification is underway.",
                            NotificationType.STATUS_CHANGED,
                            NotificationSeverity.INFO,
                            "/citizen/complaints/" + refId
                    );
                    break;

                case COMPLAINT_RESOLVED:
                    // 1. Notify citizen of official closure
                    sendNotification(
                            complaint.getCitizen(),
                            actor,
                            complaint,
                            refId,
                            "Complaint Resolved & Closed #" + refId,
                            "Resolution evidence verified and approved by municipal operations.",
                            NotificationType.COMPLAINT_RESOLVED,
                            NotificationSeverity.SUCCESS,
                            "/citizen/complaints/" + refId
                    );

                    // 2. Notify field technician of approval
                    if (complaint.getAssignedWorker() != null) {
                        sendNotification(
                                complaint.getAssignedWorker(),
                                actor,
                                complaint,
                                refId,
                                "Resolution Verified & Approved #" + refId,
                                "Your submitted repair proof has been formally accepted and closed.",
                                NotificationType.COMPLAINT_RESOLVED,
                                NotificationSeverity.SUCCESS,
                                "/worker/tasks/" + refId
                        );
                    }
                    break;

                case REWORK_REQUESTED:
                    // Notify field technician of rework requirement
                    if (complaint.getAssignedWorker() != null) {
                        String reworkReason = event.getNotes() != null && !event.getNotes().isBlank()
                                ? event.getNotes().trim()
                                : "Submitted evidence does not satisfy quality standards.";
                        sendNotification(
                                complaint.getAssignedWorker(),
                                actor,
                                complaint,
                                refId,
                                "Rework Requested #" + refId,
                                "Officer requested rework on submitted evidence. Reason: " + reworkReason,
                                NotificationType.REWORK_REQUESTED,
                                NotificationSeverity.WARNING,
                                "/worker/tasks/" + refId + "/progress"
                        );
                    }
                    break;

                case COMPLAINT_REJECTED:
                    // Notify citizen of rejection
                    String rejectReason = event.getNotes() != null && !event.getNotes().isBlank()
                            ? event.getNotes().trim()
                            : "Complaint does not meet municipal guidelines.";
                    sendNotification(
                            complaint.getCitizen(),
                            actor,
                            complaint,
                            refId,
                            "Complaint Rejected #" + refId,
                            "Your complaint was reviewed and closed without action. Reason: " + rejectReason,
                            NotificationType.COMPLAINT_REJECTED,
                            NotificationSeverity.WARNING,
                            "/citizen/complaints/" + refId
                    );
                    break;

                case DUPLICATE_LINKED:
                    // Notify citizen that ticket was linked to primary incident
                    String masterRef = complaint.getDuplicateOf() != null ? complaint.getDuplicateOf().getReferenceId() : "master ticket";
                    sendNotification(
                            complaint.getCitizen(),
                            actor,
                            complaint,
                            refId,
                            "Report Linked as Duplicate #" + refId,
                            "Your complaint was verified as a duplicate and linked to primary incident #" + masterRef + ".",
                            NotificationType.DUPLICATE_LINKED,
                            NotificationSeverity.INFO,
                            "/citizen/complaints/" + refId
                    );
                    break;

                case FIX_PENDING_CONFIRMATION:
                    // Notify citizen that repair evidence was verified and awaiting their confirmation
                    sendNotification(
                            complaint.getCitizen(),
                            actor,
                            complaint,
                            refId,
                            "Repair Completed — Please Confirm #" + refId,
                            "Municipal officers verified repair evidence. Please check the site and confirm if the issue is fixed.",
                            NotificationType.FIX_PENDING_CONFIRMATION,
                            NotificationSeverity.ACTION_REQUIRED,
                            "/citizen/complaints/" + refId
                    );
                    break;

                case RESOLUTION_CONFIRMED:
                    // 1. Notify assigned officer
                    if (complaint.getAssignedOfficer() != null) {
                        sendNotification(
                                complaint.getAssignedOfficer(),
                                actor,
                                complaint,
                                refId,
                                "Resolution Confirmed by Citizen #" + refId,
                                "Reporting citizen verified and confirmed defect resolution for ticket #" + refId + ".",
                                NotificationType.RESOLUTION_CONFIRMED,
                                NotificationSeverity.SUCCESS,
                                "/officer/complaints/" + refId + "/review"
                        );
                    }
                    // 2. Notify assigned worker
                    if (complaint.getAssignedWorker() != null) {
                        sendNotification(
                                complaint.getAssignedWorker(),
                                actor,
                                complaint,
                                refId,
                                "Work Verified by Citizen #" + refId,
                                "Citizen confirmed completion for ticket #" + refId + ".",
                                NotificationType.RESOLUTION_CONFIRMED,
                                NotificationSeverity.SUCCESS,
                                "/worker/tasks/" + refId
                        );
                    }
                    break;

                case RESOLUTION_REJECTED:
                    String rejReason = event.getNotes() != null && !event.getNotes().isBlank()
                            ? event.getNotes().trim()
                            : "Citizen reported defect is not resolved.";
                    // 1. Notify assigned officer
                    if (complaint.getAssignedOfficer() != null) {
                        sendNotification(
                                complaint.getAssignedOfficer(),
                                actor,
                                complaint,
                                refId,
                                "Fix Rejected — Reopened #" + refId,
                                "Citizen reported issue is not fixed: \"" + rejReason + "\". Ticket reopened and escalated.",
                                NotificationType.RESOLUTION_REJECTED,
                                NotificationSeverity.WARNING,
                                "/officer/complaints/" + refId + "/review"
                        );
                    }
                    // 2. Notify all active supervisors
                    List<User> supervisors = userRepository.findActiveUsersByRoleName(RoleName.SUPERVISOR);
                    for (User sup : supervisors) {
                        sendNotification(
                                sup,
                                actor,
                                complaint,
                                refId,
                                "Citizen Rejected Fix #" + refId,
                                "Citizen reported issue is not fixed on ticket #" + refId + ": " + rejReason,
                                NotificationType.RESOLUTION_REJECTED,
                                NotificationSeverity.ACTION_REQUIRED,
                                "/supervisor/escalations"
                        );
                    }
                    break;

                case AUTO_CONFIRMED:
                    // 1. Notify citizen of auto-confirmation and 30-day dispute window
                    sendNotification(
                            complaint.getCitizen(),
                            actor,
                            complaint,
                            refId,
                            "Resolution Auto-Confirmed #" + refId,
                            "Ticket #" + refId + " resolution was automatically confirmed after 7 days without response. You may dispute and reopen within 30 days if still unresolved.",
                            NotificationType.AUTO_CONFIRMED,
                            NotificationSeverity.INFO,
                            "/citizen/complaints/" + refId
                    );
                    // 2. Notify assigned officer
                    if (complaint.getAssignedOfficer() != null) {
                        sendNotification(
                                complaint.getAssignedOfficer(),
                                actor,
                                complaint,
                                refId,
                                "Resolution Auto-Confirmed #" + refId,
                                "Ticket #" + refId + " resolution was auto-confirmed after 7 days without citizen response.",
                                NotificationType.AUTO_CONFIRMED,
                                NotificationSeverity.INFO,
                                "/officer/complaints/" + refId + "/review"
                        );
                    }
                    break;

                default:
                    log.debug("No notification mapping for event type: {}", event.getEventType());
                    break;
            }
        } catch (Exception ex) {
            log.error("Failed to process notification event {} for complaint #{}: {}",
                    event.getEventType(), refId, ex.getMessage(), ex);
        }
    }

    /**
     * Dispatches escalation notifications to all active supervisors and the assigned officer.
     */
    public void notifyEscalation(Complaint complaint, String reason, User actor) {
        if (complaint == null) return;
        String refId = complaint.getReferenceId();
        String title = "Escalation Alert #" + refId;
        String message = "Complaint #" + refId + " was escalated. Reason: " + reason;

        // 1. Notify all active supervisors
        List<User> supervisors = userRepository.findActiveUsersByRoleName(RoleName.SUPERVISOR);
        for (User sup : supervisors) {
            sendNotification(
                    sup,
                    actor,
                    complaint,
                    refId,
                    title,
                    message,
                    NotificationType.ESCALATION,
                    NotificationSeverity.ACTION_REQUIRED,
                    "/supervisor/escalations"
            );
        }

        // 2. Notify assigned officer
        if (complaint.getAssignedOfficer() != null) {
            sendNotification(
                    complaint.getAssignedOfficer(),
                    actor,
                    complaint,
                    refId,
                    title,
                    message,
                    NotificationType.ESCALATION,
                    NotificationSeverity.ACTION_REQUIRED,
                    "/officer/complaints/" + refId + "/review"
            );
        }
    }

    /**
     * Dispatches notifications when a worker is reassigned by a supervisor.
     */
    public void notifyWorkerReassigned(Complaint complaint, User oldWorker, User newWorker, User supervisor, String reason) {
        if (complaint == null) return;
        String refId = complaint.getReferenceId();

        // 1. Notify old worker if present and different from new worker
        if (oldWorker != null && !oldWorker.getId().equals(newWorker.getId())) {
            sendNotification(
                    oldWorker,
                    supervisor,
                    complaint,
                    refId,
                    "Work Order Reassigned #" + refId,
                    "Work order #" + refId + " was reassigned. Reason: " + reason,
                    NotificationType.WORKER_REASSIGNED,
                    NotificationSeverity.INFO,
                    "/worker/tasks"
            );
        }

        // 2. Notify new worker
        sendNotification(
                newWorker,
                supervisor,
                complaint,
                refId,
                "New Work Order Assigned #" + refId,
                "You have been assigned to work order #" + refId + ". Reason: " + reason,
                NotificationType.WORKER_ASSIGNED,
                NotificationSeverity.ACTION_REQUIRED,
                "/worker/tasks"
        );

        // 3. Notify assigned officer
        if (complaint.getAssignedOfficer() != null) {
            sendNotification(
                    complaint.getAssignedOfficer(),
                    supervisor,
                    complaint,
                    refId,
                    "Technician Reassigned #" + refId,
                    "Technician for complaint #" + refId + " was updated to " + newWorker.getFullName() + ". Reason: " + reason,
                    NotificationType.WORKER_REASSIGNED,
                    NotificationSeverity.INFO,
                    "/officer/complaints/" + refId + "/review"
            );
        }
    }

    /**
     * Persists an individual notification with short-window deduplication protection.
     */
    public boolean sendNotification(User recipient,
                                    User actor,
                                    Complaint complaint,
                                    String referenceId,
                                    String title,
                                    String message,
                                    NotificationType type,
                                    NotificationSeverity severity,
                                    String targetUrl) {
        if (recipient == null) {
            log.warn("Cannot send notification: recipient is null for complaint #{}", referenceId);
            return false;
        }

        try {
            // Deduplication guard: suppress identical notifications within recent time window
            OffsetDateTime window = OffsetDateTime.now().minusSeconds(DEDUPLICATION_WINDOW_SECONDS);
            if (complaint != null && complaint.getId() != null) {
                boolean duplicate = notificationRepository.existsByRecipientIdAndComplaintIdAndNotificationTypeAndCreatedAtAfter(
                        recipient.getId(), complaint.getId(), type, window);
                if (duplicate) {
                    log.info("Deduplication: Suppressed duplicate {} notification for user {} on complaint #{}",
                            type, recipient.getId(), referenceId);
                    return false;
                }
            }

            Notification notification = new Notification(
                    recipient,
                    actor,
                    complaint,
                    referenceId,
                    title,
                    message,
                    type,
                    severity != null ? severity : NotificationSeverity.INFO,
                    targetUrl
            );

            notificationRepository.save(notification);
            log.debug("Persisted notification {} for user {} (complaint #{})", type, recipient.getId(), referenceId);
            return true;
        } catch (Exception e) {
            log.error("Error persisting notification {} for user {}: {}", type, recipient.getId(), e.getMessage(), e);
            return false;
        }
    }

    /**
     * Retrieves paginated notifications strictly for the authenticated user, newest first.
     */
    @Transactional(readOnly = true)
    public PagedResponse<NotificationResponse> getUserNotifications(UserPrincipal principal, boolean unreadOnly, Pageable pageable) {
        if (principal == null || principal.getId() == null) {
            throw new UnauthorizedException("Authentication required to access notifications.");
        }

        Page<Notification> page = unreadOnly
                ? notificationRepository.findByRecipientIdAndIsReadOrderByCreatedAtDesc(principal.getId(), false, pageable)
                : notificationRepository.findByRecipientIdOrderByCreatedAtDesc(principal.getId(), pageable);

        List<NotificationResponse> content = page.getContent().stream()
                .map(NotificationResponse::fromEntity)
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

    /**
     * Retrieves the unread notification count strictly for the authenticated user.
     */
    @Transactional(readOnly = true)
    public long getUnreadCount(UserPrincipal principal) {
        if (principal == null || principal.getId() == null) {
            throw new UnauthorizedException("Authentication required to access notifications.");
        }
        return notificationRepository.countByRecipientIdAndIsReadFalse(principal.getId());
    }

    /**
     * Marks a single notification as read if and only if it belongs to the authenticated user.
     * Prevents ID guessing enumeration by throwing ResourceNotFoundException (404) for unauthorized or missing IDs.
     */
    @Transactional
    public NotificationResponse markAsRead(UUID notificationId, UserPrincipal principal) {
        if (principal == null || principal.getId() == null) {
            throw new UnauthorizedException("Authentication required to modify notifications.");
        }
        if (notificationId == null) {
            throw new BadRequestException("Notification ID must not be null.");
        }

        Notification notification = notificationRepository.findByIdAndRecipientId(notificationId, principal.getId())
                .orElseThrow(() -> new ResourceNotFoundException("Notification not found with id: " + notificationId));

        if (!notification.isRead()) {
            notification.markAsRead();
            notification = notificationRepository.save(notification);
        }

        return NotificationResponse.fromEntity(notification);
    }

    /**
     * Marks all unread notifications belonging to the authenticated user as read.
     * Executes an efficient database-level bulk update without loading entities into memory.
     */
    @Transactional
    public int markAllAsRead(UserPrincipal principal) {
        if (principal == null || principal.getId() == null) {
            throw new UnauthorizedException("Authentication required to modify notifications.");
        }

        return notificationRepository.markAllAsReadByRecipientId(principal.getId(), OffsetDateTime.now());
    }
}

