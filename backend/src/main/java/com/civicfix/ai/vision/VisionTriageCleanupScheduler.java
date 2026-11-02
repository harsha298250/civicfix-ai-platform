package com.civicfix.ai.vision;

import com.civicfix.complaint.ComplaintRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.context.event.ApplicationReadyEvent;
import org.springframework.context.event.EventListener;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;
import org.springframework.transaction.PlatformTransactionManager;
import org.springframework.transaction.support.TransactionTemplate;

import java.time.OffsetDateTime;

/**
 * Periodically checks for and repairs complaints stuck in RUNNING state
 * (e.g., due to an abrupt JVM crash or ungraceful shutdown).
 */
@Component
public class VisionTriageCleanupScheduler {

    private static final Logger log = LoggerFactory.getLogger(VisionTriageCleanupScheduler.class);
    private static final int STUCK_THRESHOLD_MINUTES = 5;

    private final ComplaintRepository complaintRepository;
    private final TransactionTemplate transactionTemplate;

    public VisionTriageCleanupScheduler(ComplaintRepository complaintRepository) {
        this.complaintRepository = complaintRepository;
        this.transactionTemplate = null;
    }

    @Autowired
    public VisionTriageCleanupScheduler(
            ComplaintRepository complaintRepository,
            @Autowired(required = false) PlatformTransactionManager transactionManager) {
        this.complaintRepository = complaintRepository;
        this.transactionTemplate = transactionManager != null ? new TransactionTemplate(transactionManager) : null;
    }

    @EventListener(ApplicationReadyEvent.class)
    public void onStartup() {
        cleanupStuckRows();
    }

    @Scheduled(fixedDelayString = "${civicfix.ai.vision.cleanup-interval-ms:300000}")
    public int cleanupStuckRows() {
        if (transactionTemplate != null) {
            Integer result = transactionTemplate.execute(status -> doCleanup());
            return result != null ? result : 0;
        } else {
            return doCleanup();
        }
    }

    private int doCleanup() {
        OffsetDateTime cutoff = OffsetDateTime.now().minusMinutes(STUCK_THRESHOLD_MINUTES);
        int cleaned = complaintRepository.cleanupStuckRunningRows(cutoff);
        if (cleaned > 0) {
            log.warn("Repaired {} complaint(s) stuck in RUNNING vision triage state.", cleaned);
        }
        return cleaned;
    }
}
