package com.civicfix.complaint.sla;

import com.civicfix.complaint.ComplaintRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.data.domain.PageRequest;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

import java.time.OffsetDateTime;
import java.util.List;
import java.util.UUID;

/**
 * SlaEscalationScheduler — Scans for overdue complaints past sla_due_at that are not in a terminal state
 * (RESOLVED, REJECTED) and not yet escalated. Delegates escalation to SlaEscalationService in separate transactions.
 */
@Component
public class SlaEscalationScheduler {

    private static final Logger log = LoggerFactory.getLogger(SlaEscalationScheduler.class);

    private final ComplaintRepository complaintRepository;
    private final SlaEscalationService slaEscalationService;
    private final boolean enabled;
    private final int batchSize;

    public SlaEscalationScheduler(
            ComplaintRepository complaintRepository,
            SlaEscalationService slaEscalationService,
            @Value("${civicfix.sla.escalation-job.enabled:true}") boolean enabled,
            @Value("${civicfix.sla.escalation-job.batch-size:50}") int batchSize) {
        this.complaintRepository = complaintRepository;
        this.slaEscalationService = slaEscalationService;
        this.enabled = enabled;
        this.batchSize = batchSize;
    }

    @Scheduled(fixedDelayString = "${civicfix.sla.escalation-job.interval-ms:300000}")
    public int checkAndEscalateOverdueComplaints() {
        if (!enabled) {
            log.trace("SLA escalation scheduler is disabled by configuration.");
            return 0;
        }

        OffsetDateTime now = OffsetDateTime.now();
        List<UUID> overdueIds = complaintRepository.findOverdueComplaintIdsForEscalation(
                now, PageRequest.of(0, Math.max(1, batchSize)));

        if (overdueIds.isEmpty()) {
            return 0;
        }

        log.info("SLA Escalation Scanner: Found {} overdue complaint(s) eligible for escalation.", overdueIds.size());
        int escalatedCount = 0;
        for (UUID complaintId : overdueIds) {
            try {
                boolean success = slaEscalationService.escalateComplaint(
                        complaintId, "SLA breached", null, "127.0.0.1");
                if (success) {
                    escalatedCount++;
                }
            } catch (Exception ex) {
                log.error("Failed to escalate complaint {}: {}", complaintId, ex.getMessage(), ex);
            }
        }
        return escalatedCount;
    }

    public boolean isEnabled() {
        return enabled;
    }

    public int getBatchSize() {
        return batchSize;
    }
}

