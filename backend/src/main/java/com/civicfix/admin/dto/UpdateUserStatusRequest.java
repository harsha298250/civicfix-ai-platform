package com.civicfix.admin.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;

public class UpdateUserStatusRequest {

    @NotBlank(message = "Account status is required.")
    @Pattern(regexp = "^(ACTIVE|SUSPENDED)$", message = "Status must be either ACTIVE or SUSPENDED.")
    private String status;

    private String reason;

    public UpdateUserStatusRequest() {}

    public UpdateUserStatusRequest(String status, String reason) {
        this.status = status;
        this.reason = reason;
    }

    public String getStatus() {
        return status;
    }

    public void setStatus(String status) {
        this.status = status;
    }

    public String getReason() {
        return reason;
    }

    public void setReason(String reason) {
        this.reason = reason;
    }
}

