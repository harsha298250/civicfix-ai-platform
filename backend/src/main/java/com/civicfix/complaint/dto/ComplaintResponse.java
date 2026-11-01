package com.civicfix.complaint.dto;

import com.civicfix.complaint.Complaint;
import com.civicfix.complaint.ComplaintPhoto;
import com.civicfix.complaint.sla.SlaStateCalculator;

import java.math.BigDecimal;
import java.time.OffsetDateTime;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;

public class ComplaintResponse {

    private UUID id;
    private String referenceId;
    private String title;
    private String description;
    private String category;
    private String priority;
    private String status;
    private String address;
    private String ward;
    private Map<String, Object> location;
    private Map<String, Object> citizen;
    private Map<String, Object> assignedOfficer;
    private Map<String, Object> assignedWorker;
    private List<ResolutionEvidenceResponse> evidence = new java.util.ArrayList<>();
    private List<String> photos = new java.util.ArrayList<>();
    private Map<String, Object> aiTriage;
    private Map<String, Object> duplicateOf;
    private Boolean isDemo;
    private Long version;
    private OffsetDateTime slaDueAt;
    private OffsetDateTime escalatedAt;
    private String slaState;
    private OffsetDateTime confirmedAt;
    private OffsetDateTime pendingConfirmationAt;
    private String confirmationSource;
    private Integer reopenCount;
    private OffsetDateTime createdAt;
    private OffsetDateTime updatedAt;

    public ComplaintResponse() {}

    public static ComplaintResponse fromEntity(Complaint c) {
        ComplaintResponse resp = new ComplaintResponse();
        resp.setId(c.getId());
        resp.setReferenceId(c.getReferenceId());
        resp.setTitle(c.getTitle());
        resp.setDescription(c.getDescription());
        resp.setCategory(c.getCategory());
        resp.setPriority(c.getPriority() != null ? c.getPriority().name() : null);
        resp.setStatus(c.getStatus().name());
        resp.setAddress(c.getAddress());
        resp.setWard(c.getWard());
        resp.setVersion(c.getVersion());
        resp.setSlaDueAt(c.getSlaDueAt());
        resp.setEscalatedAt(c.getEscalatedAt());
        resp.setSlaState(SlaStateCalculator.calculate(c).name());
        resp.setConfirmedAt(c.getConfirmedAt());
        resp.setPendingConfirmationAt(c.getPendingConfirmationAt());
        resp.setConfirmationSource(c.getConfirmationSource());
        resp.setReopenCount(c.getReopenCount());
        resp.setCreatedAt(c.getCreatedAt());
        resp.setUpdatedAt(c.getUpdatedAt());
        resp.setDemo(c.isDemo());

        Map<String, Object> loc = new HashMap<>();
        loc.put("address", c.getAddress());
        loc.put("ward", c.getWard());
        if (c.getLatitude() != null && c.getLongitude() != null) {
            Map<String, BigDecimal> coords = new HashMap<>();
            coords.put("lat", c.getLatitude());
            coords.put("lng", c.getLongitude());
            loc.put("coordinates", coords);
        }
        resp.setLocation(loc);

        if (c.getCitizen() != null) {
            Map<String, Object> cit = new HashMap<>();
            cit.put("id", c.getCitizen().getId().toString());
            cit.put("name", c.getCitizen().getFullName());
            cit.put("email", c.getCitizen().getEmail());
            cit.put("phone", c.getCitizen().getPhone());
            resp.setCitizen(cit);
        }

        if (c.getAssignedOfficer() != null) {
            Map<String, Object> off = new HashMap<>();
            off.put("id", c.getAssignedOfficer().getId().toString());
            off.put("name", c.getAssignedOfficer().getFullName());
            off.put("email", c.getAssignedOfficer().getEmail());
            resp.setAssignedOfficer(off);
        }

        if (c.getAssignedWorker() != null) {
            Map<String, Object> wrk = new HashMap<>();
            wrk.put("id", c.getAssignedWorker().getId().toString());
            wrk.put("name", c.getAssignedWorker().getFullName());
            wrk.put("department", c.getAssignedWorker().getDepartment());
            resp.setAssignedWorker(wrk);
        }

        if (c.getEvidenceList() != null && !c.getEvidenceList().isEmpty()) {
            resp.setEvidence(c.getEvidenceList().stream()
                    .map(ResolutionEvidenceResponse::fromEntity)
                    .toList());
        }

        if (c.getPhotos() != null && !c.getPhotos().isEmpty()) {
            resp.setPhotos(c.getPhotos().stream()
                    .map(ComplaintPhoto::getPhotoUrl)
                    .toList());
        }

        if (c.getAiDetectedCategory() != null || c.getAiRecommendedPriority() != null || c.getAiExplanation() != null) {
            Map<String, Object> aiMap = new HashMap<>();
            aiMap.put("detectedCategory", c.getAiDetectedCategory());
            aiMap.put("recommendedPriority", c.getAiRecommendedPriority() != null ? c.getAiRecommendedPriority().name() : null);
            aiMap.put("confidence", c.getAiConfidence());
            aiMap.put("hazardScore", c.getAiHazardScore());
            aiMap.put("explanation", c.getAiExplanation());
            aiMap.put("adjudicationStatus", c.getAiAdjudicationStatus());
            aiMap.put("triagedAt", c.getAiTriagedAt());
            resp.setAiTriage(aiMap);
        }

        if (c.getDuplicateOf() != null) {
            Map<String, Object> dupMap = new HashMap<>();
            dupMap.put("id", c.getDuplicateOf().getId().toString());
            dupMap.put("referenceId", c.getDuplicateOf().getReferenceId());
            dupMap.put("title", c.getDuplicateOf().getTitle());
            resp.setDuplicateOf(dupMap);
        }

        return resp;
    }

    public UUID getId() {
        return id;
    }

    public void setId(UUID id) {
        this.id = id;
    }

    public String getReferenceId() {
        return referenceId;
    }

    public void setReferenceId(String referenceId) {
        this.referenceId = referenceId;
    }

    public String getTitle() {
        return title;
    }

    public void setTitle(String title) {
        this.title = title;
    }

    public String getDescription() {
        return description;
    }

    public void setDescription(String description) {
        this.description = description;
    }

    public String getCategory() {
        return category;
    }

    public void setCategory(String category) {
        this.category = category;
    }

    public String getPriority() {
        return priority;
    }

    public void setPriority(String priority) {
        this.priority = priority;
    }

    public String getStatus() {
        return status;
    }

    public void setStatus(String status) {
        this.status = status;
    }

    public String getAddress() {
        return address;
    }

    public void setAddress(String address) {
        this.address = address;
    }

    public String getWard() {
        return ward;
    }

    public void setWard(String ward) {
        this.ward = ward;
    }

    public Map<String, Object> getLocation() {
        return location;
    }

    public void setLocation(Map<String, Object> location) {
        this.location = location;
    }

    public Map<String, Object> getCitizen() {
        return citizen;
    }

    public void setCitizen(Map<String, Object> citizen) {
        this.citizen = citizen;
    }

    public Map<String, Object> getAssignedOfficer() {
        return assignedOfficer;
    }

    public void setAssignedOfficer(Map<String, Object> assignedOfficer) {
        this.assignedOfficer = assignedOfficer;
    }

    public Map<String, Object> getAssignedWorker() {
        return assignedWorker;
    }

    public void setAssignedWorker(Map<String, Object> assignedWorker) {
        this.assignedWorker = assignedWorker;
    }

    public OffsetDateTime getCreatedAt() {
        return createdAt;
    }

    public void setCreatedAt(OffsetDateTime createdAt) {
        this.createdAt = createdAt;
    }

    public OffsetDateTime getUpdatedAt() {
        return updatedAt;
    }

    public void setUpdatedAt(OffsetDateTime updatedAt) {
        this.updatedAt = updatedAt;
    }

    public List<ResolutionEvidenceResponse> getEvidence() {
        return evidence;
    }

    public void setEvidence(List<ResolutionEvidenceResponse> evidence) {
        this.evidence = evidence;
    }

    public List<String> getPhotos() {
        return photos;
    }

    public void setPhotos(List<String> photos) {
        this.photos = photos;
    }

    public Long getVersion() {
        return version;
    }

    public void setVersion(Long version) {
        this.version = version;
    }

    public Map<String, Object> getAiTriage() {
        return aiTriage;
    }

    public void setAiTriage(Map<String, Object> aiTriage) {
        this.aiTriage = aiTriage;
    }

    public Map<String, Object> getDuplicateOf() {
        return duplicateOf;
    }

    public void setDuplicateOf(Map<String, Object> duplicateOf) {
        this.duplicateOf = duplicateOf;
    }

    public Boolean getIsDemo() {
        return isDemo;
    }

    public void setDemo(Boolean demo) {
        isDemo = demo;
    }

    public OffsetDateTime getSlaDueAt() {
        return slaDueAt;
    }

    public void setSlaDueAt(OffsetDateTime slaDueAt) {
        this.slaDueAt = slaDueAt;
    }

    public OffsetDateTime getEscalatedAt() {
        return escalatedAt;
    }

    public void setEscalatedAt(OffsetDateTime escalatedAt) {
        this.escalatedAt = escalatedAt;
    }

    public String getSlaState() {
        return slaState;
    }

    public void setSlaState(String slaState) {
        this.slaState = slaState;
    }

    public OffsetDateTime getConfirmedAt() {
        return confirmedAt;
    }

    public void setConfirmedAt(OffsetDateTime confirmedAt) {
        this.confirmedAt = confirmedAt;
    }

    public OffsetDateTime getPendingConfirmationAt() {
        return pendingConfirmationAt;
    }

    public void setPendingConfirmationAt(OffsetDateTime pendingConfirmationAt) {
        this.pendingConfirmationAt = pendingConfirmationAt;
    }

    public String getConfirmationSource() {
        return confirmationSource;
    }

    public void setConfirmationSource(String confirmationSource) {
        this.confirmationSource = confirmationSource;
    }

    public Integer getReopenCount() {
        return reopenCount;
    }

    public void setReopenCount(Integer reopenCount) {
        this.reopenCount = reopenCount;
    }
}
