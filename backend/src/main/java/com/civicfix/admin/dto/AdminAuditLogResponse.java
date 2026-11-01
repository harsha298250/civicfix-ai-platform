package com.civicfix.admin.dto;

import com.civicfix.audit.AuditLog;

import java.time.OffsetDateTime;
import java.util.UUID;

public class AdminAuditLogResponse {

    private UUID id;
    private UUID actorId;
    private String actorName;
    private String actorRole;
    private String action;
    private String targetType;
    private String targetId;
    private String details;
    private String ipAddress;
    private String status;
    private OffsetDateTime createdAt;

    public AdminAuditLogResponse() {}

    public static AdminAuditLogResponse fromEntity(AuditLog log) {
        if (log == null) return null;
        AdminAuditLogResponse resp = new AdminAuditLogResponse();
        resp.setId(log.getId());
        resp.setActorId(log.getActorId());
        resp.setActorName(log.getActorName());
        resp.setActorRole(log.getActorRole());
        resp.setAction(log.getAction());
        resp.setTargetType(log.getTargetType());
        resp.setTargetId(log.getTargetId());
        resp.setDetails(log.getDetails());
        resp.setIpAddress(log.getIpAddress());
        resp.setStatus(log.getStatus());
        resp.setCreatedAt(log.getCreatedAt());
        return resp;
    }

    public UUID getId() {
        return id;
    }

    public void setId(UUID id) {
        this.id = id;
    }

    public UUID getActorId() {
        return actorId;
    }

    public void setActorId(UUID actorId) {
        this.actorId = actorId;
    }

    public String getActorName() {
        return actorName;
    }

    public void setActorName(String actorName) {
        this.actorName = actorName;
    }

    public String getActorRole() {
        return actorRole;
    }

    public void setActorRole(String actorRole) {
        this.actorRole = actorRole;
    }

    public String getAction() {
        return action;
    }

    public void setAction(String action) {
        this.action = action;
    }

    public String getTargetType() {
        return targetType;
    }

    public void setTargetType(String targetType) {
        this.targetType = targetType;
    }

    public String getTargetId() {
        return targetId;
    }

    public void setTargetId(String targetId) {
        this.targetId = targetId;
    }

    public String getDetails() {
        return details;
    }

    public void setDetails(String details) {
        this.details = details;
    }

    public String getIpAddress() {
        return ipAddress;
    }

    public void setIpAddress(String ipAddress) {
        this.ipAddress = ipAddress;
    }

    public String getStatus() {
        return status;
    }

    public void setStatus(String status) {
        this.status = status;
    }

    public OffsetDateTime getCreatedAt() {
        return createdAt;
    }

    public void setCreatedAt(OffsetDateTime createdAt) {
        this.createdAt = createdAt;
    }
}

