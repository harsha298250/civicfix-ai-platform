package com.civicfix.complaint.dto;

import jakarta.validation.constraints.NotNull;
import java.util.UUID;

public class AssignComplaintRequest {

    @NotNull(message = "Worker ID is required")
    private UUID workerId;

    private String notes;

    private Long version;

    public AssignComplaintRequest() {}

    public UUID getWorkerId() {
        return workerId;
    }

    public void setWorkerId(UUID workerId) {
        this.workerId = workerId;
    }

    public String getNotes() {
        return notes;
    }

    public void setNotes(String notes) {
        this.notes = notes;
    }

    public Long getVersion() {
        return version;
    }

    public void setVersion(Long version) {
        this.version = version;
    }
}
