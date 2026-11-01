package com.civicfix.complaint.dto;

import com.civicfix.complaint.ComplaintPriority;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;

/**
 * Request payload for municipal officer adjudication of AI triage recommendations.
 */
public class AdjudicateTriageRequest {

    @NotBlank(message = "Adjudication action is required.")
    @Pattern(regexp = "(?i)^(ACCEPT|OVERRIDE|DISMISS)$", message = "Action must be ACCEPT, OVERRIDE, or DISMISS.")
    private String action;

    private String category;

    private ComplaintPriority priority;

    private String notes;

    private Long version;

    public AdjudicateTriageRequest() {}

    public AdjudicateTriageRequest(String action, String category, ComplaintPriority priority, String notes, Long version) {
        this.action = action;
        this.category = category;
        this.priority = priority;
        this.notes = notes;
        this.version = version;
    }

    public String getAction() {
        return action;
    }

    public void setAction(String action) {
        this.action = action;
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

    public String getNotes() {
        return notes;
    }

    public void setNotes(String notes) {
        this.notes = notes;
    }

    public Long getVersion() {
        return version;
    }

    public void setVersion(Long version) {
        this.version = version;
    }
}
