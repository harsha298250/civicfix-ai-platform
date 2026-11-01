package com.civicfix.complaint.dto;

public class ConfirmResolutionRequest {

    private Long version;
    private String notes;

    public ConfirmResolutionRequest() {}

    public ConfirmResolutionRequest(Long version, String notes) {
        this.version = version;
        this.notes = notes;
    }

    public Long getVersion() {
        return version;
    }

    public void setVersion(Long version) {
        this.version = version;
    }

    public String getNotes() {
        return notes;
    }

    public void setNotes(String notes) {
        this.notes = notes;
    }
}

