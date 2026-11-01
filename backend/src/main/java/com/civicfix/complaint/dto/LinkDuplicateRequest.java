package com.civicfix.complaint.dto;

import jakarta.validation.constraints.NotBlank;

/**
 * Request payload for linking a confirmed duplicate complaint to a primary master complaint.
 */
public class LinkDuplicateRequest {

    @NotBlank(message = "Parent master complaint identifier is required.")
    private String parentComplaintId;

    private String reason;

    private Long version;

    public LinkDuplicateRequest() {}

    public LinkDuplicateRequest(String parentComplaintId, String reason, Long version) {
        this.parentComplaintId = parentComplaintId;
        this.reason = reason;
        this.version = version;
    }

    public String getParentComplaintId() {
        return parentComplaintId;
    }

    public void setParentComplaintId(String parentComplaintId) {
        this.parentComplaintId = parentComplaintId;
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
