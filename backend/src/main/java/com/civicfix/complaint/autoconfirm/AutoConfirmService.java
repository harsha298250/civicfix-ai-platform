package com.civicfix.complaint.autoconfirm;

import com.civicfix.audit.AuditService;
import com.civicfix.complaint.Complaint;
import com.civicfix.complaint.ComplaintRepository;
import com.civicfix.complaint.ComplaintStatus;
import com.civicfix.complaint.ComplaintStatusHistory;
import com.civicfix.complaint.ComplaintStatusHistoryRepository;
import com.civicfix.complaint.event.ComplaintEvent;
import com.civicfix.complaint.event.ComplaintEventType;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;

import java.time.OffsetDateTime;
import java.util.UUID;

@Service
public class AutoConfirmService {

    private static final Logger log = LoggerFactory.getLogger(AutoConfirmService.class);

    private final ComplaintRepository complaintRepository;
    private final ComplaintStatusHistoryRepository statusHistoryRepository;
    private final AuditService auditService;
    private final ApplicationEventPublisher eventPublisher;

    public AutoConfirmService(ComplaintRepository complaintRepository,
                              ComplaintStatusHistoryRepository statusHistoryRepository,
                              AuditService auditService,
                              ApplicationEventPublisher eventPublisher) {
        this.complaintRepository = complaintRepository;
        this.statusHistoryRepository = statusHistoryRepository;
        this.auditService = auditService;
        this.eventPublisher = eventPublisher;
    }

    /**
     * Atomically auto-confirms a complaint if it is still in PENDING_CITIZEN_CONFIRMATION.
     * Runs in its own transaction (REQUIRES_NEW) so each complaint in a batch is independent.
     */
    @Transactional(propagation = Propagation.REQUIRES_NEW)
    public boolean autoConfirmComplaint(UUID complaintId, int autoConfirmDays) {
        OffsetDateTime now = OffsetDateTime.now();
        int updated = complaintRepository.autoConfirmResolution(complaintId, now);
        if (updated == 0) {
            log.info("Complaint {} is no longer in PENDING_CITIZEN_CONFIRMATION; skipping auto-confirm", complaintId);
            return false;
        }

        Complaint complaint = complaintRepository.findById(complaintId).orElse(null);
        if (complaint == null) {
            log.warn("Complaint {} updated via auto-confirm query but entity could not be retrieved", complaintId);
            return false;
        }

        ComplaintStatusHistory history = new ComplaintStatusHistory();
        history.setComplaint(complaint);
        history.setPreviousStatus(ComplaintStatus.PENDING_CITIZEN_CONFIRMATION.name());
        history.setNewStatus(ComplaintStatus.RESOLVED.name());
        history.setChangedByUser(null);
        history.setChangedByName("System Automated Closure");
        history.setNotes("auto-confirmed after " + autoConfirmDays + " days without citizen response");
        history.setCreatedAt(now);
        statusHistoryRepository.save(history);

        auditService.logAction(
                null,
                "System Automated Closure",
                "SYSTEM",
                "AUTO_CONFIRM_RESOLUTION",
                "COMPLAINT",
                complaint.getId().toString(),
                "Status auto-confirmed to RESOLVED after " + autoConfirmDays + " days without citizen response",
                "127.0.0.1",
                "SUCCESS"
        );

        eventPublisher.publishEvent(new ComplaintEvent(
                ComplaintEventType.AUTO_CONFIRMED,
                complaint,
                null,
                ComplaintStatus.PENDING_CITIZEN_CONFIRMATION,
                ComplaintStatus.RESOLVED,
                "Auto-confirmed resolution after " + autoConfirmDays + " days"
        ));

        log.info("Auto-confirmed complaint #{} (id: {}) after {} days",
                complaint.getReferenceId(), complaintId, autoConfirmDays);
        return true;
    }
}
