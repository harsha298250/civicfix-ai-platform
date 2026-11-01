package com.civicfix.complaint.sla;

import jakarta.persistence.*;
import java.time.OffsetDateTime;

@Entity
@Table(name = "sla_policies", uniqueConstraints = {
        @UniqueConstraint(name = "uq_sla_policy_category_priority", columnNames = {"category", "priority"})
})
public class SlaPolicy {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Integer id;

    @Column(length = 100, nullable = false)
    private String category;

    @Column(length = 20, nullable = false)
    private String priority;

    @Column(nullable = false)
    private Integer hours;

    @Column(name = "created_at", nullable = false, updatable = false)
    private OffsetDateTime createdAt = OffsetDateTime.now();

    public SlaPolicy() {}

    public SlaPolicy(String category, String priority, Integer hours) {
        this.category = category;
        this.priority = priority;
        this.hours = hours;
        this.createdAt = OffsetDateTime.now();
    }

    public Integer getId() {
        return id;
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

    public OffsetDateTime getCreatedAt() {
        return createdAt;
    }
}

