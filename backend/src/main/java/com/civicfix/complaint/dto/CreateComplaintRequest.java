package com.civicfix.complaint.dto;

import com.civicfix.complaint.ComplaintPriority;
import jakarta.validation.constraints.DecimalMax;
import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

import java.math.BigDecimal;

public class CreateComplaintRequest {

    @NotBlank(message = "Title is required")
    @Size(min = 5, max = 200, message = "Title must be between 5 and 200 characters")
    private String title;

    @NotBlank(message = "Description is required")
    @Size(min = 10, max = 2000, message = "Description must be between 10 and 2000 characters")
    private String description;

    @NotBlank(message = "Category is required")
    @Size(min = 2, max = 100, message = "Category must be valid")
    private String category;

    private ComplaintPriority priority = ComplaintPriority.MEDIUM;

    @NotBlank(message = "Location address is required")
    @Size(min = 3, max = 255, message = "Address must be between 3 and 255 characters")
    private String address;

    @DecimalMin(value = "-90.0", message = "Latitude must be valid")
    @DecimalMax(value = "90.0", message = "Latitude must be valid")
    private BigDecimal latitude;

    @DecimalMin(value = "-180.0", message = "Longitude must be valid")
    @DecimalMax(value = "180.0", message = "Longitude must be valid")
    private BigDecimal longitude;

    private String ward;

    private Boolean visionConsent = false;

    public CreateComplaintRequest() {}

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

    public Boolean getVisionConsent() {
        return visionConsent != null ? visionConsent : false;
    }

    public void setVisionConsent(Boolean visionConsent) {
        this.visionConsent = visionConsent != null ? visionConsent : false;
    }
}
