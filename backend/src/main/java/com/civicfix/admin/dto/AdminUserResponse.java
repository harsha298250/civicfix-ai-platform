package com.civicfix.admin.dto;

import com.civicfix.user.Role;
import com.civicfix.user.User;

import java.time.OffsetDateTime;
import java.util.Set;
import java.util.UUID;
import java.util.stream.Collectors;

/**
 * Sanitized user response for admin operations.
 * Guarantee: Never exposes password_hash.
 */
public class AdminUserResponse {

    private UUID id;
    private String fullName;
    private String email;
    private String phone;
    private String accountStatus;
    private String department;
    private String ward;
    private Integer trustScore;
    private Set<String> roles;
    private OffsetDateTime createdAt;
    private OffsetDateTime updatedAt;

    public AdminUserResponse() {}

    public static AdminUserResponse fromEntity(User u) {
        if (u == null) return null;
        AdminUserResponse resp = new AdminUserResponse();
        resp.setId(u.getId());
        resp.setFullName(u.getFullName());
        resp.setEmail(u.getEmail());
        resp.setPhone(u.getPhone());
        resp.setAccountStatus(u.getAccountStatus());
        resp.setDepartment(u.getDepartment());
        resp.setWard(u.getWard());
        resp.setTrustScore(u.getTrustScore());
        resp.setRoles(u.getRoles().stream()
                .map(r -> r.getName().name())
                .collect(Collectors.toSet()));
        resp.setCreatedAt(u.getCreatedAt());
        resp.setUpdatedAt(u.getUpdatedAt());
        return resp;
    }

    public UUID getId() {
        return id;
    }

    public void setId(UUID id) {
        this.id = id;
    }

    public String getFullName() {
        return fullName;
    }

    public void setFullName(String fullName) {
        this.fullName = fullName;
    }

    public String getEmail() {
        return email;
    }

    public void setEmail(String email) {
        this.email = email;
    }

    public String getPhone() {
        return phone;
    }

    public void setPhone(String phone) {
        this.phone = phone;
    }

    public String getAccountStatus() {
        return accountStatus;
    }

    public void setAccountStatus(String accountStatus) {
        this.accountStatus = accountStatus;
    }

    public String getDepartment() {
        return department;
    }

    public void setDepartment(String department) {
        this.department = department;
    }

    public String getWard() {
        return ward;
    }

    public void setWard(String ward) {
        this.ward = ward;
    }

    public Integer getTrustScore() {
        return trustScore;
    }

    public void setTrustScore(Integer trustScore) {
        this.trustScore = trustScore;
    }

    public Set<String> getRoles() {
        return roles;
    }

    public void setRoles(Set<String> roles) {
        this.roles = roles;
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
}

