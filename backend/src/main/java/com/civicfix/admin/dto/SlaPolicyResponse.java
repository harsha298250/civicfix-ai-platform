package com.civicfix.admin.dto;

import com.civicfix.complaint.sla.SlaPolicy;

public class SlaPolicyResponse {

    private Integer id;
    private String category;
    private String priority;
    private Integer hours;

    public SlaPolicyResponse() {}

    public SlaPolicyResponse(Integer id, String category, String priority, Integer hours) {
        this.id = id;
        this.category = category;
        this.priority = priority;
        this.hours = hours;
    }

    public static SlaPolicyResponse fromEntity(SlaPolicy policy) {
        if (policy == null) return null;
        return new SlaPolicyResponse(
                policy.getId(),
                policy.getCategory(),
                policy.getPriority(),
                policy.getHours()
        );
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

    public String getPriority() {
        return priority;
    }

    public void setPriority(String priority) {
        this.priority = priority;
    }

    public Integer getHours() {
        return hours;
    }

    public void setHours(Integer hours) {
        this.hours = hours;
    }
}

