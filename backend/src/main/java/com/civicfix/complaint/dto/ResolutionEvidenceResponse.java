package com.civicfix.complaint.dto;

import com.civicfix.complaint.ResolutionEvidence;

import java.math.BigDecimal;
import java.time.OffsetDateTime;
import java.util.UUID;

public class ResolutionEvidenceResponse {

    private UUID id;
    private String workerId;
    private String workerName;
    private String evidenceNotes;
    private String photoUrl;
    private BigDecimal latitude;
    private BigDecimal longitude;
    private BigDecimal distanceMeters;
    private BigDecimal accuracyMeters;
    private String locationCheck;
    private String locationNote;
    private OffsetDateTime createdAt;

    public ResolutionEvidenceResponse() {}

    public static ResolutionEvidenceResponse fromEntity(ResolutionEvidence e) {
        ResolutionEvidenceResponse resp = new ResolutionEvidenceResponse();
        resp.setId(e.getId());
        if (e.getWorker() != null) {
            resp.setWorkerId(e.getWorker().getId().toString());
            resp.setWorkerName(e.getWorker().getFullName());
        }
        resp.setEvidenceNotes(e.getEvidenceNotes());
        resp.setPhotoUrl(e.getPhotoUrl());
        resp.setLatitude(e.getLatitude());
        resp.setLongitude(e.getLongitude());
        resp.setDistanceMeters(e.getDistanceMeters());
        resp.setAccuracyMeters(e.getAccuracyMeters());
        resp.setLocationCheck(e.getLocationCheck() != null ? e.getLocationCheck().name() : "NOT_CHECKABLE");
        resp.setLocationNote(e.getLocationNote());
        resp.setCreatedAt(e.getCreatedAt());
        return resp;
    }

    public UUID getId() {
        return id;
    }

    public void setId(UUID id) {
        this.id = id;
    }

    public String getWorkerId() {
        return workerId;
    }

    public void setWorkerId(String workerId) {
        this.workerId = workerId;
    }

    public String getWorkerName() {
        return workerName;
    }

    public void setWorkerName(String workerName) {
        this.workerName = workerName;
    }

    public String getEvidenceNotes() {
        return evidenceNotes;
    }

    public void setEvidenceNotes(String evidenceNotes) {
        this.evidenceNotes = evidenceNotes;
    }

    public String getPhotoUrl() {
        return photoUrl;
    }

    public void setPhotoUrl(String photoUrl) {
        this.photoUrl = photoUrl;
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

    public OffsetDateTime getCreatedAt() {
        return createdAt;
    }

    public void setCreatedAt(OffsetDateTime createdAt) {
        this.createdAt = createdAt;
    }

    public BigDecimal getDistanceMeters() {
        return distanceMeters;
    }

    public void setDistanceMeters(BigDecimal distanceMeters) {
        this.distanceMeters = distanceMeters;
    }

    public BigDecimal getAccuracyMeters() {
        return accuracyMeters;
    }

    public void setAccuracyMeters(BigDecimal accuracyMeters) {
        this.accuracyMeters = accuracyMeters;
    }

    public String getLocationCheck() {
        return locationCheck;
    }

    public void setLocationCheck(String locationCheck) {
        this.locationCheck = locationCheck;
    }

    public String getLocationNote() {
        return locationNote;
    }

    public void setLocationNote(String locationNote) {
        this.locationNote = locationNote;
    }
}
