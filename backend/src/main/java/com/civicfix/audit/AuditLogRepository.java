package com.civicfix.audit;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.OffsetDateTime;
import java.util.List;
import java.util.UUID;

@Repository
public interface AuditLogRepository extends JpaRepository<AuditLog, UUID> {
    Page<AuditLog> findAllByOrderByCreatedAtDesc(Pageable pageable);

    @Modifying
    @Query("DELETE FROM AuditLog a WHERE a.targetType = 'COMPLAINT' AND a.targetId IN :targetIds")
    void deleteByTargetTypeAndTargetIdIn(@Param("targetIds") List<String> targetIds);

    long countByCreatedAtAfter(OffsetDateTime cutoff);

    @Query("SELECT a FROM AuditLog a WHERE " +
           "(:action IS NULL OR LOWER(a.action) = LOWER(:action)) AND " +
           "(:actor IS NULL OR LOWER(a.actorName) LIKE LOWER(CONCAT('%', :actor, '%')) OR LOWER(a.actorRole) LIKE LOWER(CONCAT('%', :actor, '%'))) AND " +
           "(:startDate IS NULL OR a.createdAt >= :startDate) AND " +
           "(:endDate IS NULL OR a.createdAt <= :endDate) " +
           "ORDER BY a.createdAt DESC")
    Page<AuditLog> findLogsWithFilters(
            @Param("action") String action,
            @Param("actor") String actor,
            @Param("startDate") OffsetDateTime startDate,
            @Param("endDate") OffsetDateTime endDate,
            Pageable pageable);
}
