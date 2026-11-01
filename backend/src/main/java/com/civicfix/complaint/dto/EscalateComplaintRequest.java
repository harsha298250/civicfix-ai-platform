package com.civicfix.complaint.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public class EscalateComplaintRequest {

    @NotBlank(message = "Escalation reason is required.")
    @Size(min = 10, max = 500, message = "Escalation reason must be between 10 and 500 characters.")
    private String reason;

    public EscalateComplaintRequest() {}

    public EscalateComplaintRequest(String reason) {
        this.reason = reason;
    }

    public String getReason() {
        return reason;
    }

    public void setReason(String reason) {
        this.reason = reason;
    }
}

