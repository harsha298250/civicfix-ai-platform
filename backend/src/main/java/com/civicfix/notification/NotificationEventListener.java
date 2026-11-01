package com.civicfix.notification;

import com.civicfix.complaint.event.ComplaintEvent;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Component;
import org.springframework.transaction.event.TransactionPhase;
import org.springframework.transaction.event.TransactionalEventListener;

@Component
public class NotificationEventListener {

    private static final Logger log = LoggerFactory.getLogger(NotificationEventListener.class);

    private final NotificationService notificationService;

    public NotificationEventListener(NotificationService notificationService) {
        this.notificationService = notificationService;
    }

    /**
     * Listens to domain complaint events strictly AFTER the originating database transaction commits.
     * If the originating transaction rolls back, this listener is never invoked.
     */
    @TransactionalEventListener(phase = TransactionPhase.AFTER_COMMIT)
    public void onComplaintEvent(ComplaintEvent event) {
        if (event == null) {
            return;
        }
        log.debug("Received complaint event after transaction commit: {} for complaint #{}",
                event.getEventType(),
                event.getComplaint() != null ? event.getComplaint().getReferenceId() : "N/A");
        notificationService.handleComplaintEvent(event);
    }
}
