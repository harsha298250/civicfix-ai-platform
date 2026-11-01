package com.civicfix.complaint.dto;

import com.civicfix.complaint.Complaint;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.OffsetDateTime;

/**
 * PublicMapComplaintResponse — Sanitized Public GIS DTO
 * Exposes strictly non-sensitive metadata needed for rendering public map markers.
 * Strictly excludes citizen names, phone numbers, email addresses, personal descriptions,
 * internal officer rework notes, worker comments, titles, reference IDs, and real database IDs.
 * Coordinates are rounded to 3 decimal places (~110m resolution) for resident privacy protection.
 */
public class PublicMapComplaintResponse {

    private Integer id;
    private String category;
    private String status;
    private String priority;
    private BigDecimal latitude;
    private BigDecimal longitude;
    private String ward;
    private OffsetDateTime createdAt;

    public PublicMapComplaintResponse() {}

    public static PublicMapComplaintResponse fromEntity(Complaint c) {
        return fromEntity(c, 1);
    }

    public static PublicMapComplaintResponse fromEntity(Complaint c, int index) {
        PublicMapComplaintResponse resp = new PublicMapComplaintResponse();
        resp.setId(index);
        resp.setCategory(c.getCategory());
        resp.setStatus(c.getStatus() != null ? c.getStatus().name() : null);
        resp.setPriority(c.getPriority() != null ? c.getPriority().name() : null);
        resp.setWard(c.getWard());
        resp.setCreatedAt(c.getCreatedAt());
        if (c.getLatitude() != null) {
            resp.setLatitude(c.getLatitude().setScale(3, RoundingMode.HALF_UP));
        }
        if (c.getLongitude() != null) {
            resp.setLongitude(c.getLongitude().setScale(3, RoundingMode.HALF_UP));
        }
        return resp;
    }

    public Integer getId() {
        return id;
    }

    public void setId(Integer id) {
        this.id = id;
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

    public String getPriority() {
        return priority;
    }

    public void setPriority(String priority) {
        this.priority = priority;
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

    public OffsetDateTime getCreatedAt() {
        return createdAt;
    }

    public void setCreatedAt(OffsetDateTime createdAt) {
        this.createdAt = createdAt;
    }
}
