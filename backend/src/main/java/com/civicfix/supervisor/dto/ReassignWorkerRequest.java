package com.civicfix.supervisor.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

import java.util.UUID;

public class ReassignWorkerRequest {

    @NotNull(message = "New worker ID is required.")
    private UUID newWorkerId;

    @NotBlank(message = "Reassignment reason is required.")
    @Size(min = 5, max = 500, message = "Reassignment reason must be between 5 and 500 characters.")
    private String reason;

    private Long version;

    public ReassignWorkerRequest() {}

    public ReassignWorkerRequest(UUID newWorkerId, String reason, Long version) {
        this.newWorkerId = newWorkerId;
        this.reason = reason;
        this.version = version;
    }

    public UUID getNewWorkerId() {
        return newWorkerId;
    }

    public void setNewWorkerId(UUID newWorkerId) {
        this.newWorkerId = newWorkerId;
    }

    public String getReason() {
        return reason;
    }

    public void setReason(String reason) {
        this.reason = reason;
    }

    public Long getVersion() {
        return version;
    }

    public void setVersion(Long version) {
        this.version = version;
    }
}

