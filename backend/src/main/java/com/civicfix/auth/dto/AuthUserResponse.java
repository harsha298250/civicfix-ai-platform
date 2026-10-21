package com.civicfix.auth.dto;

import com.civicfix.user.User;

import java.util.Set;
import java.util.UUID;
import java.util.stream.Collectors;

public class AuthUserResponse {

    private UUID id;
    private String name;
    private String email;
    private String phone;
    private String role;
    private Set<String> roles;
    private String department;
    private String ward;
    private Integer trustScore;
    private String accountStatus;

    public AuthUserResponse() {}

    public static AuthUserResponse fromEntity(User user) {
        AuthUserResponse resp = new AuthUserResponse();
        resp.setId(user.getId());
        resp.setName(user.getFullName());
        resp.setEmail(user.getEmail());
        resp.setPhone(user.getPhone());
        resp.setDepartment(user.getDepartment());
        resp.setWard(user.getWard());
        resp.setTrustScore(user.getTrustScore());
        resp.setAccountStatus(user.getAccountStatus());

        Set<String> roleNames = user.getRoles().stream()
                .map(r -> r.getName().name())
                .collect(Collectors.toSet());
        resp.setRoles(roleNames);

        // Primary role (default to CITIZEN, or highest privilege)
        if (roleNames.contains("ADMIN")) resp.setRole("ADMIN");
        else if (roleNames.contains("OFFICER")) resp.setRole("OFFICER");
        else if (roleNames.contains("WORKER")) resp.setRole("WORKER");
        else resp.setRole("CITIZEN");

        return resp;
    }

    public UUID getId() {
        return id;
    }

    public void setId(UUID id) {
        this.id = id;
    }

    public String getName() {
        return name;
    }

    public void setName(String name) {
        this.name = name;
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

    public String getRole() {
        return role;
    }

    public void setRole(String role) {
        this.role = role;
    }

    public Set<String> getRoles() {
        return roles;
    }

    public void setRoles(Set<String> roles) {
        this.roles = roles;
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

    public String getAccountStatus() {
        return accountStatus;
    }

    public void setAccountStatus(String accountStatus) {
        this.accountStatus = accountStatus;
    }
}
