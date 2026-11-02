package com.civicfix.ai.vision;

import com.civicfix.complaint.event.ComplaintEvent;
import com.civicfix.complaint.event.ComplaintEventType;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Component;
import org.springframework.transaction.event.TransactionPhase;
import org.springframework.transaction.event.TransactionalEventListener;

/**
 * Listens for complaint creation events strictly AFTER database commit,
 * triggering asynchronous vision triage without blocking or throwing to the citizen.
 */
@Component
public class VisionTriageEventListener {

    private static final Logger log = LoggerFactory.getLogger(VisionTriageEventListener.class);

    private final VisionTriageAsyncService visionTriageAsyncService;
    private final VisionTriageProperties properties;

    public VisionTriageEventListener(VisionTriageAsyncService visionTriageAsyncService, VisionTriageProperties properties) {
        this.visionTriageAsyncService = visionTriageAsyncService;
        this.properties = properties;
    }

    @TransactionalEventListener(phase = TransactionPhase.AFTER_COMMIT)
    public void onComplaintCreated(ComplaintEvent event) {
        if (event == null || event.getEventType() != ComplaintEventType.COMPLAINT_CREATED || event.getComplaint() == null) {
            return;
        }

        if (!properties.isEnabled()) {
            return;
        }

        if (!event.getComplaint().isVisionConsent()) {
            return;
        }

        log.debug("AFTER_COMMIT event received: Dispatching vision triage for complaint reference: #{}",
                event.getComplaint().getReferenceId());

        visionTriageAsyncService.submitVisionTriage(
                event.getComplaint().getId(),
                event.getActor() != null ? event.getActor().getId() : null
        );
    }
}

