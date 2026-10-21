package com.civicfix.audit;

import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Service;

import java.util.UUID;

@Service
public class AuditService {

    private final AuditLogRepository auditLogRepository;

    public AuditService(AuditLogRepository auditLogRepository) {
        this.auditLogRepository = auditLogRepository;
    }

    public void logAction(UUID actorId, String actorName, String actorRole,
                          String action, String targetType, String targetId,
                          String details, String ipAddress, String status) {
        AuditLog log = new AuditLog();
        log.setActorId(actorId);
        log.setActorName(actorName);
        log.setActorRole(actorRole);
        log.setAction(action);
        log.setTargetType(targetType);
        log.setTargetId(targetId);
        log.setDetails(details);
        log.setIpAddress(ipAddress);
        log.setStatus(status != null ? status : "SUCCESS");

        auditLogRepository.save(log);
    }
}
