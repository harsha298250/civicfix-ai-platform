package com.civicfix.complaint.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public class RejectResolutionRequest {

    @NotBlank(message = "Rejection reason is required.")
    @Size(min = 10, max = 500, message = "Rejection reason must be between 10 and 500 characters.")
    private String reason;

    private Long version;
    private String photoUrl;

    public RejectResolutionRequest() {}

    public RejectResolutionRequest(String reason) {
        this.reason = reason;
    }

    public RejectResolutionRequest(String reason, Long version) {
        this.reason = reason;
        this.version = version;
    }

    public RejectResolutionRequest(String reason, Long version, String photoUrl) {
        this.reason = reason;
        this.version = version;
        this.photoUrl = photoUrl;
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

    public String getPhotoUrl() {
        return photoUrl;
    }

    public void setPhotoUrl(String photoUrl) {
        this.photoUrl = photoUrl;
    }
}

