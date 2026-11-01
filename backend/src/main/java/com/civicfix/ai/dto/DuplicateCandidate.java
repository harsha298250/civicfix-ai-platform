package com.civicfix.ai.dto;

import java.time.OffsetDateTime;
import java.util.UUID;

/**
 * Advisory DTO representing an active complaint that shares high spatial proximity
 * and categorical/textual similarity with a newly evaluated complaint.
 */
public class DuplicateCandidate {

    private UUID id;
    private String referenceId;
    private String title;
    private String category;
    private String status;
    private Double distanceMeters;
    private Double similarityScore;
    private String explanation;
    private OffsetDateTime createdAt;

    public DuplicateCandidate() {}

    public DuplicateCandidate(UUID id, String referenceId, String title, String category, String status, Double distanceMeters, Double similarityScore, OffsetDateTime createdAt) {
        this(id, referenceId, title, category, status, distanceMeters, similarityScore, createdAt, null);
    }

    public DuplicateCandidate(UUID id, String referenceId, String title, String category, String status, Double distanceMeters, Double similarityScore, OffsetDateTime createdAt, String explanation) {
        this.id = id;
        this.referenceId = referenceId;
        this.title = title;
        this.category = category;
        this.status = status;
        this.distanceMeters = distanceMeters;
        this.similarityScore = similarityScore;
        this.createdAt = createdAt;
        this.explanation = explanation;
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

    public String getCategory() {
        return category;
    }

    public void setCategory(String category) {
        this.category = category;
    }

    public String getStatus() {
        return status;
    }

    public void setStatus(String status) {
        this.status = status;
    }

    public Double getDistanceMeters() {
        return distanceMeters;
    }

    public void setDistanceMeters(Double distanceMeters) {
        this.distanceMeters = distanceMeters;
    }

    public Double getSimilarityScore() {
        return similarityScore;
    }

    public void setSimilarityScore(Double similarityScore) {
        this.similarityScore = similarityScore;
    }

    public String getExplanation() {
        return explanation;
    }

    public void setExplanation(String explanation) {
        this.explanation = explanation;
    }

    public OffsetDateTime getCreatedAt() {
        return createdAt;
    }

    public void setCreatedAt(OffsetDateTime createdAt) {
        this.createdAt = createdAt;
    }
}
