package com.civicfix.complaint.dto;

import com.civicfix.complaint.ComplaintStatusHistory;

import java.time.OffsetDateTime;
import java.util.UUID;

public class ComplaintHistoryResponse {

    private UUID id;
    private String previousStatus;
    private String newStatus;
    private String changedByName;
    private String notes;
    private OffsetDateTime timestamp;

    public ComplaintHistoryResponse() {}

    public static ComplaintHistoryResponse fromEntity(ComplaintStatusHistory h) {
        ComplaintHistoryResponse resp = new ComplaintHistoryResponse();
        resp.setId(h.getId());
        resp.setPreviousStatus(h.getPreviousStatus());
        resp.setNewStatus(h.getNewStatus());
        resp.setChangedByName(h.getChangedByName());
        resp.setNotes(h.getNotes());
        resp.setTimestamp(h.getCreatedAt());
        return resp;
    }

    public UUID getId() {
        return id;
    }

    public void setId(UUID id) {
        this.id = id;
    }

    public String getPreviousStatus() {
        return previousStatus;
    }

    public void setPreviousStatus(String previousStatus) {
        this.previousStatus = previousStatus;
    }

    public String getNewStatus() {
        return newStatus;
    }

    public void setNewStatus(String newStatus) {
        this.newStatus = newStatus;
    }

    public String getChangedByName() {
        return changedByName;
    }

    public void setChangedByName(String changedByName) {
        this.changedByName = changedByName;
    }

    public String getNotes() {
        return notes;
    }

    public void setNotes(String notes) {
        this.notes = notes;
    }

    public OffsetDateTime getTimestamp() {
        return timestamp;
    }

    public void setTimestamp(OffsetDateTime timestamp) {
        this.timestamp = timestamp;
    }
}
