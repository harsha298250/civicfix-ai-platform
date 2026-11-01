package com.civicfix.complaint.autoconfirm;

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
 * AutoConfirmScheduler — Periodic scheduled job to auto-confirm complaints that have been in
 * PENDING_CITIZEN_CONFIRMATION longer than the configured cutoff (default 7 days).
 */
@Component
public class AutoConfirmScheduler {

    private static final Logger log = LoggerFactory.getLogger(AutoConfirmScheduler.class);

    private final ComplaintRepository complaintRepository;
    private final AutoConfirmService autoConfirmService;
    private final boolean enabled;
    private final int days;
    private final int batchSize;

    public AutoConfirmScheduler(
            ComplaintRepository complaintRepository,
            AutoConfirmService autoConfirmService,
            @Value("${civicfix.auto-confirm.enabled:true}") boolean enabled,
            @Value("${civicfix.auto-confirm.days:7}") int days,
            @Value("${civicfix.auto-confirm.batch-size:50}") int batchSize) {
        this.complaintRepository = complaintRepository;
        this.autoConfirmService = autoConfirmService;
        this.enabled = enabled;
        this.days = days;
        this.batchSize = batchSize;
    }

    @Scheduled(fixedDelayString = "${civicfix.auto-confirm.interval-ms:300000}")
    public int checkAndAutoConfirmComplaints() {
        if (!enabled) {
            log.trace("Auto-confirm scheduler is disabled by configuration.");
            return 0;
        }

        OffsetDateTime cutoff = OffsetDateTime.now().minusDays(days);
        List<UUID> eligibleIds = complaintRepository.findPendingConfirmationIdsForAutoConfirm(
                cutoff, PageRequest.of(0, Math.max(1, batchSize)));

        if (eligibleIds.isEmpty()) {
            return 0;
        }

        log.info("Auto-Confirm Scanner: Found {} complaint(s) awaiting citizen confirmation past {} days.",
                eligibleIds.size(), days);

        int confirmedCount = 0;
        for (UUID complaintId : eligibleIds) {
            try {
                boolean success = autoConfirmService.autoConfirmComplaint(complaintId, days);
                if (success) {
                    confirmedCount++;
                }
            } catch (Exception ex) {
                log.error("Failed to auto-confirm complaint {}: {}", complaintId, ex.getMessage(), ex);
            }
        }
        return confirmedCount;
    }
}

