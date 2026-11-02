package com.civicfix.complaint;

import com.civicfix.user.User;
import jakarta.persistence.*;
import java.math.BigDecimal;
import java.time.OffsetDateTime;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;

@Entity
@Table(name = "complaints")
public class Complaint {

    @Id
    @GeneratedValue(strategy = GenerationType.AUTO)
    private UUID id;

    @Column(name = "reference_id", length = 50, unique = true, nullable = false)
    private String referenceId;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "citizen_id", nullable = false)
    private User citizen;

    @Column(length = 200, nullable = false)
    private String title;

    @Column(columnDefinition = "TEXT", nullable = false)
    private String description;

    @Column(length = 100, nullable = false)
    private String category;

    @Enumerated(EnumType.STRING)
    @Column(length = 20, nullable = false)
    private ComplaintPriority priority = ComplaintPriority.MEDIUM;

    @Enumerated(EnumType.STRING)
    @Column(length = 50, nullable = false)
    private ComplaintStatus status = ComplaintStatus.SUBMITTED;

    @Column(length = 255, nullable = false)
    private String address;

    @Column(precision = 10, scale = 7)
    private BigDecimal latitude;

    @Column(precision = 10, scale = 7)
    private BigDecimal longitude;

    @Column(length = 100)
    private String ward;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "assigned_officer_id")
    private User assignedOfficer;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "assigned_worker_id")
    private User assignedWorker;

    @OneToMany(mappedBy = "complaint", cascade = CascadeType.ALL, orphanRemoval = true, fetch = FetchType.LAZY)
    @OrderBy("createdAt ASC")
    private List<ComplaintStatusHistory> statusHistory = new ArrayList<>();

    @OneToMany(mappedBy = "complaint", cascade = CascadeType.ALL, orphanRemoval = true, fetch = FetchType.LAZY)
    @OrderBy("createdAt DESC")
    private List<ResolutionEvidence> evidenceList = new ArrayList<>();

    @OneToMany(mappedBy = "complaint", cascade = CascadeType.ALL, orphanRemoval = true, fetch = FetchType.LAZY)
    @OrderBy("createdAt ASC")
    private List<ComplaintPhoto> photos = new ArrayList<>();

    @Column(name = "created_at", nullable = false, updatable = false)
    private OffsetDateTime createdAt = OffsetDateTime.now();

    @Column(name = "updated_at", nullable = false)
    private OffsetDateTime updatedAt = OffsetDateTime.now();

    @Version
    @Column(name = "version", nullable = false)
    private Long version = 0L;

    @Column(name = "ai_detected_category", length = 100)
    private String aiDetectedCategory;

    @Enumerated(EnumType.STRING)
    @Column(name = "ai_recommended_priority", length = 20)
    private ComplaintPriority aiRecommendedPriority;

    @Column(name = "ai_confidence", precision = 5, scale = 2)
    private BigDecimal aiConfidence;

    @Column(name = "ai_hazard_score", length = 100)
    private String aiHazardScore;

    @Column(name = "ai_explanation", columnDefinition = "TEXT")
    private String aiExplanation;

    @Column(name = "ai_adjudication_status", length = 50, nullable = false)
    private String aiAdjudicationStatus = "PENDING";

    @Column(name = "ai_triaged_at")
    private OffsetDateTime aiTriagedAt;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "duplicate_of_id")
    private Complaint duplicateOf;

    @Column(name = "is_demo", nullable = false)
    private boolean isDemo = false;

    @Column(name = "sla_due_at")
    private OffsetDateTime slaDueAt;

    @Column(name = "escalated_at")
    private OffsetDateTime escalatedAt;

    @Column(name = "confirmed_at")
    private OffsetDateTime confirmedAt;

    @Column(name = "pending_confirmation_at")
    private OffsetDateTime pendingConfirmationAt;

    @Column(name = "confirmation_source", length = 20)
    private String confirmationSource;

    @Column(name = "reopen_count", nullable = false)
    private Integer reopenCount = 0;

    @Column(name = "vision_consent", nullable = false)
    private boolean visionConsent = false;

    @Column(name = "vision_category", length = 100)
    private String visionCategory;

    @Column(name = "vision_severity")
    private Integer visionSeverity;

    @Column(name = "vision_confidence", precision = 5, scale = 2)
    private BigDecimal visionConfidence;

    @Column(name = "vision_reason", length = 300)
    private String visionReason;

    @Column(name = "vision_model", length = 100)
    private String visionModel;

    @Column(name = "vision_status", length = 30, nullable = false)
    private String visionStatus = "NOT_RUN";

    @Column(name = "vision_at")
    private OffsetDateTime visionAt;

    @Column(name = "disagreement", nullable = false)
    private boolean disagreement = false;

    @Column(name = "final_priority_source", length = 50)
    private String finalPrioritySource;

    @PrePersist
    protected void onCreate() {
        if (createdAt == null) createdAt = OffsetDateTime.now();
        if (updatedAt == null) updatedAt = OffsetDateTime.now();
    }

    @PreUpdate
    protected void onUpdate() {
        updatedAt = OffsetDateTime.now();
    }

    public Complaint() {}

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

    public User getCitizen() {
        return citizen;
    }

    public void setCitizen(User citizen) {
        this.citizen = citizen;
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

    public ComplaintPriority getPriority() {
        return priority;
    }

    public void setPriority(ComplaintPriority priority) {
        this.priority = priority;
    }

    public ComplaintStatus getStatus() {
        return status;
    }

    public void setStatus(ComplaintStatus status) {
        this.status = status;
    }

    public String getAddress() {
        return address;
    }

    public void setAddress(String address) {
        this.address = address;
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

    public String getWard() {
        return ward;
    }

    public void setWard(String ward) {
        this.ward = ward;
    }

    public User getAssignedOfficer() {
        return assignedOfficer;
    }

    public void setAssignedOfficer(User assignedOfficer) {
        this.assignedOfficer = assignedOfficer;
    }

    public User getAssignedWorker() {
        return assignedWorker;
    }

    public void setAssignedWorker(User assignedWorker) {
        this.assignedWorker = assignedWorker;
    }

    public List<ComplaintStatusHistory> getStatusHistory() {
        return statusHistory;
    }

    public void setStatusHistory(List<ComplaintStatusHistory> statusHistory) {
        this.statusHistory = statusHistory;
    }

    public List<ResolutionEvidence> getEvidenceList() {
        return evidenceList;
    }

    public void setEvidenceList(List<ResolutionEvidence> evidenceList) {
        this.evidenceList = evidenceList;
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

    public void addStatusHistory(ComplaintStatus previousStatus, ComplaintStatus newStatus, User actor, String notes) {
        ComplaintStatusHistory history = new ComplaintStatusHistory();
        history.setComplaint(this);
        history.setPreviousStatus(previousStatus != null ? previousStatus.name() : null);
        history.setNewStatus(newStatus.name());
        history.setChangedByUser(actor);
        history.setChangedByName(actor != null ? actor.getFullName() : "System Automated Dispatch");
        history.setNotes(notes);
        this.statusHistory.add(history);
    }

    public List<ComplaintPhoto> getPhotos() {
        return photos;
    }

    public void setPhotos(List<ComplaintPhoto> photos) {
        this.photos = photos;
    }

    public Long getVersion() {
        return version;
    }

    public void setVersion(Long version) {
        this.version = version;
    }

    public String getAiDetectedCategory() {
        return aiDetectedCategory;
    }

    public void setAiDetectedCategory(String aiDetectedCategory) {
        this.aiDetectedCategory = aiDetectedCategory;
    }

    public ComplaintPriority getAiRecommendedPriority() {
        return aiRecommendedPriority;
    }

    public void setAiRecommendedPriority(ComplaintPriority aiRecommendedPriority) {
        this.aiRecommendedPriority = aiRecommendedPriority;
    }

    public BigDecimal getAiConfidence() {
        return aiConfidence;
    }

    public void setAiConfidence(BigDecimal aiConfidence) {
        this.aiConfidence = aiConfidence;
    }

    public String getAiHazardScore() {
        return aiHazardScore;
    }

    public void setAiHazardScore(String aiHazardScore) {
        this.aiHazardScore = aiHazardScore;
    }

    public String getAiExplanation() {
        return aiExplanation;
    }

    public void setAiExplanation(String aiExplanation) {
        this.aiExplanation = aiExplanation;
    }

    public String getAiAdjudicationStatus() {
        return aiAdjudicationStatus;
    }

    public void setAiAdjudicationStatus(String aiAdjudicationStatus) {
        this.aiAdjudicationStatus = aiAdjudicationStatus;
    }

    public OffsetDateTime getAiTriagedAt() {
        return aiTriagedAt;
    }

    public void setAiTriagedAt(OffsetDateTime aiTriagedAt) {
        this.aiTriagedAt = aiTriagedAt;
    }

    public Complaint getDuplicateOf() {
        return duplicateOf;
    }

    public void setDuplicateOf(Complaint duplicateOf) {
        this.duplicateOf = duplicateOf;
    }

    public boolean isDemo() {
        return isDemo;
    }

    public void setDemo(boolean demo) {
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
        return reopenCount != null ? reopenCount : 0;
    }

    public void setReopenCount(Integer reopenCount) {
        this.reopenCount = reopenCount != null ? reopenCount : 0;
    }

    public boolean isVisionConsent() {
        return visionConsent;
    }

    public void setVisionConsent(boolean visionConsent) {
        this.visionConsent = visionConsent;
    }

    public String getVisionCategory() {
        return visionCategory;
    }

    public void setVisionCategory(String visionCategory) {
        this.visionCategory = visionCategory;
    }

    public Integer getVisionSeverity() {
        return visionSeverity;
    }

    public void setVisionSeverity(Integer visionSeverity) {
        this.visionSeverity = visionSeverity;
    }

    public BigDecimal getVisionConfidence() {
        return visionConfidence;
    }

    public void setVisionConfidence(BigDecimal visionConfidence) {
        this.visionConfidence = visionConfidence;
    }

    public String getVisionReason() {
        return visionReason;
    }

    public void setVisionReason(String visionReason) {
        this.visionReason = visionReason;
    }

    public String getVisionModel() {
        return visionModel;
    }

    public void setVisionModel(String visionModel) {
        this.visionModel = visionModel;
    }

    public String getVisionStatus() {
        return visionStatus;
    }

    public void setVisionStatus(String visionStatus) {
        this.visionStatus = visionStatus;
    }

    public OffsetDateTime getVisionAt() {
        return visionAt;
    }

    public void setVisionAt(OffsetDateTime visionAt) {
        this.visionAt = visionAt;
    }

    public boolean isDisagreement() {
        return disagreement;
    }

    public void setDisagreement(boolean disagreement) {
        this.disagreement = disagreement;
    }

    public String getFinalPrioritySource() {
        return finalPrioritySource;
    }

    public void setFinalPrioritySource(String finalPrioritySource) {
        this.finalPrioritySource = finalPrioritySource;
    }
}
