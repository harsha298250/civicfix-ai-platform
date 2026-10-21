package com.civicfix.complaint.dto;

import com.civicfix.complaint.ComplaintStatus;
import jakarta.validation.constraints.NotNull;

import java.math.BigDecimal;

public class UpdateStatusRequest {

    @NotNull(message = "New target status is required")
    private ComplaintStatus status;

    private String notes;

    private String evidencePhotoUrl;

    private BigDecimal latitude;

    private BigDecimal longitude;

    public UpdateStatusRequest() {}

    public ComplaintStatus getStatus() {
        return status;
    }

    public void setStatus(ComplaintStatus status) {
        this.status = status;
    }

    public String getNotes() {
        return notes;
    }

    public void setNotes(String notes) {
        this.notes = notes;
    }

    public String getEvidencePhotoUrl() {
        return evidencePhotoUrl;
    }

    public void setEvidencePhotoUrl(String evidencePhotoUrl) {
        this.evidencePhotoUrl = evidencePhotoUrl;
    }

    public BigDecimal getLatitude() {
        return latitude;
    }

    public void setLatitude(BigDecimal latitude) {
        this.latitude = latitude;
    }

    public BigDecimal getLongitude() {
        return longitude;
    }

    public void setLongitude(BigDecimal longitude) {
        this.longitude = longitude;
    }
}
