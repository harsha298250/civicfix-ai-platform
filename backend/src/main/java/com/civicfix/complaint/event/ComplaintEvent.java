package com.civicfix.complaint.event;

import com.civicfix.complaint.Complaint;
import com.civicfix.complaint.ComplaintStatus;
import com.civicfix.user.User;
import java.time.OffsetDateTime;

public class ComplaintEvent {

    private final ComplaintEventType eventType;
    private final Complaint complaint;
    private final User actor;
    private final ComplaintStatus previousStatus;
    private final ComplaintStatus newStatus;
    private final String notes;
    private final OffsetDateTime timestamp;

    public ComplaintEvent(ComplaintEventType eventType,
                          Complaint complaint,
                          User actor,
                          ComplaintStatus previousStatus,
                          ComplaintStatus newStatus,
                          String notes) {
        this.eventType = eventType;
        this.complaint = complaint;
        this.actor = actor;
        this.previousStatus = previousStatus;
        this.newStatus = newStatus;
        this.notes = notes;
        this.timestamp = OffsetDateTime.now();
    }

    public ComplaintEventType getEventType() {
        return eventType;
    }

    public Complaint getComplaint() {
        return complaint;
    }

    public User getActor() {
        return actor;
    }

    public ComplaintStatus getPreviousStatus() {
        return previousStatus;
    }

    public ComplaintStatus getNewStatus() {
        return newStatus;
    }

    public String getNotes() {
        return notes;
    }

    public OffsetDateTime getTimestamp() {
        return timestamp;
    }
}
