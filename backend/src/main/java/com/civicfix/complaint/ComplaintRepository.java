package com.civicfix.complaint;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.math.BigDecimal;
import java.time.OffsetDateTime;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface ComplaintRepository extends JpaRepository<Complaint, UUID> {

    Optional<Complaint> findByReferenceIdIgnoreCase(String referenceId);

    @Query("SELECT c FROM Complaint c WHERE c.id = :id OR LOWER(c.referenceId) = LOWER(:ref)")
    Optional<Complaint> findByIdOrReferenceId(@Param("id") UUID id, @Param("ref") String ref);

    // Citizen: own complaints only
    Page<Complaint> findByCitizenIdOrderByCreatedAtDesc(UUID citizenId, Pageable pageable);

    @Query("SELECT c FROM Complaint c WHERE c.citizen.id = :citizenId AND " +
           "c.latitude IS NOT NULL AND c.longitude IS NOT NULL AND " +
           "c.latitude BETWEEN :minLat AND :maxLat AND " +
           "c.longitude BETWEEN :minLng AND :maxLng " +
           "ORDER BY c.createdAt DESC")
    Page<Complaint> findByCitizenIdAndSpatialBounds(
            @Param("citizenId") UUID citizenId,
            @Param("minLat") BigDecimal minLat,
            @Param("maxLat") BigDecimal maxLat,
            @Param("minLng") BigDecimal minLng,
            @Param("maxLng") BigDecimal maxLng,
            Pageable pageable);

    // Worker: assigned tasks only
    Page<Complaint> findByAssignedWorkerIdOrderByCreatedAtDesc(UUID workerId, Pageable pageable);

    Page<Complaint> findByAssignedWorkerIdAndStatusOrderByCreatedAtDesc(UUID workerId, ComplaintStatus status, Pageable pageable);

    @Query("SELECT c FROM Complaint c WHERE c.assignedWorker.id = :workerId AND " +
           "c.latitude IS NOT NULL AND c.longitude IS NOT NULL AND " +
           "c.latitude BETWEEN :minLat AND :maxLat AND " +
           "c.longitude BETWEEN :minLng AND :maxLng " +
           "ORDER BY c.createdAt DESC")
    Page<Complaint> findByAssignedWorkerIdAndSpatialBounds(
            @Param("workerId") UUID workerId,
            @Param("minLat") BigDecimal minLat,
            @Param("maxLat") BigDecimal maxLat,
            @Param("minLng") BigDecimal minLng,
            @Param("maxLng") BigDecimal maxLng,
            Pageable pageable);

    // Officer / Admin: all complaints with optional filtering
    Page<Complaint> findAllByOrderByCreatedAtDesc(Pageable pageable);

    Page<Complaint> findByStatusOrderByCreatedAtDesc(ComplaintStatus status, Pageable pageable);

    Page<Complaint> findByCategoryIgnoreCaseOrderByCreatedAtDesc(String category, Pageable pageable);

    Page<Complaint> findByWardIgnoreCaseOrderByCreatedAtDesc(String ward, Pageable pageable);

    @Query("SELECT c FROM Complaint c WHERE " +
           "c.latitude IS NOT NULL AND c.longitude IS NOT NULL AND " +
           "c.latitude >= :minLat AND c.latitude <= :maxLat AND " +
           "c.longitude >= :minLng AND c.longitude <= :maxLng " +
           "ORDER BY c.createdAt DESC")
    Page<Complaint> findBySpatialBounds(
            @Param("minLat") BigDecimal minLat,
            @Param("maxLat") BigDecimal maxLat,
            @Param("minLng") BigDecimal minLng,
            @Param("maxLng") BigDecimal maxLng,
            Pageable pageable);

    @Query("SELECT c FROM Complaint c WHERE " +
           "c.latitude IS NOT NULL AND c.longitude IS NOT NULL AND " +
           "c.latitude >= :minLat AND c.latitude <= :maxLat AND " +
           "c.longitude >= :minLng AND c.longitude <= :maxLng AND " +
           "LOWER(c.ward) = LOWER(:ward) " +
           "ORDER BY c.createdAt DESC")
    Page<Complaint> findBySpatialBoundsAndWard(
            @Param("minLat") BigDecimal minLat,
            @Param("maxLat") BigDecimal maxLat,
            @Param("minLng") BigDecimal minLng,
            @Param("maxLng") BigDecimal maxLng,
            @Param("ward") String ward,
            Pageable pageable);

    // Public sanitized map feed (only complaints with valid coordinates)
    @Query("SELECT c FROM Complaint c WHERE " +
           "c.latitude IS NOT NULL AND c.longitude IS NOT NULL " +
           "ORDER BY c.createdAt DESC")
    List<Complaint> findAllWithCoordinates(Pageable pageable);

    @Query("SELECT c FROM Complaint c WHERE " +
           "c.latitude IS NOT NULL AND c.longitude IS NOT NULL AND " +
           "c.latitude >= :minLat AND c.latitude <= :maxLat AND " +
           "c.longitude >= :minLng AND c.longitude <= :maxLng " +
           "ORDER BY c.createdAt DESC")
    List<Complaint> findPublicMapBySpatialBounds(
            @Param("minLat") BigDecimal minLat,
            @Param("maxLat") BigDecimal maxLat,
            @Param("minLng") BigDecimal minLng,
            @Param("maxLng") BigDecimal maxLng,
            Pageable pageable);

    @Query("SELECT c FROM Complaint c WHERE " +
           "c.latitude IS NOT NULL AND c.longitude IS NOT NULL AND " +
           "c.latitude >= :minLat AND c.latitude <= :maxLat AND " +
           "c.longitude >= :minLng AND c.longitude <= :maxLng AND " +
           "c.status = :status " +
           "ORDER BY c.createdAt DESC")
    List<Complaint> findPublicMapBySpatialBoundsAndStatus(
            @Param("minLat") BigDecimal minLat,
            @Param("maxLat") BigDecimal maxLat,
            @Param("minLng") BigDecimal minLng,
            @Param("maxLng") BigDecimal maxLng,
            @Param("status") ComplaintStatus status,
            Pageable pageable);

    @Query("SELECT c FROM Complaint c WHERE " +
           "c.latitude IS NOT NULL AND c.longitude IS NOT NULL AND " +
           "c.status = :status " +
           "ORDER BY c.createdAt DESC")
    List<Complaint> findPublicMapByStatus(
            @Param("status") ComplaintStatus status,
            Pageable pageable);

    @Query("SELECT c FROM Complaint c WHERE " +
           "c.status IN (:activeStatuses) AND " +
           "c.latitude IS NOT NULL AND c.longitude IS NOT NULL AND " +
           "c.latitude >= :minLat AND c.latitude <= :maxLat AND " +
           "c.longitude >= :minLng AND c.longitude <= :maxLng AND " +
           "c.createdAt >= :cutoffDate")
    List<Complaint> findActiveComplaintsInSpatialBounds(
            @Param("activeStatuses") List<ComplaintStatus> activeStatuses,
            @Param("minLat") BigDecimal minLat,
            @Param("maxLat") BigDecimal maxLat,
            @Param("minLng") BigDecimal minLng,
            @Param("maxLng") BigDecimal maxLng,
            @Param("cutoffDate") OffsetDateTime cutoffDate);

    long countByStatus(ComplaintStatus status);

    @Query("SELECT COUNT(c) FROM Complaint c WHERE c.duplicateOf.id = :parentId")
    long countByDuplicateOfId(@Param("parentId") UUID parentId);

    @Query("SELECT c FROM Complaint c WHERE c.duplicateOf.id = :parentId ORDER BY c.createdAt DESC")
    List<Complaint> findByDuplicateOfId(@Param("parentId") UUID parentId);

    long countByIsDemoTrue();

    List<Complaint> findByIsDemoTrue();

    @Modifying
    @Query("UPDATE Complaint c SET c.duplicateOf = null WHERE c.isDemo = true")
    void clearDuplicateOfForDemoComplaints();

    @Modifying
    @Query("DELETE FROM Complaint c WHERE c.isDemo = true")
    void deleteByIsDemoTrue();

    @Modifying
    @Query("UPDATE Complaint c SET c.escalatedAt = :now, c.updatedAt = :now WHERE c.id = :id AND c.escalatedAt IS NULL")
    int markEscalated(@Param("id") UUID id, @Param("now") OffsetDateTime now);

    @Query("SELECT c.id FROM Complaint c WHERE c.slaDueAt IS NOT NULL AND c.slaDueAt < :now AND c.escalatedAt IS NULL AND c.status NOT IN (com.civicfix.complaint.ComplaintStatus.RESOLVED, com.civicfix.complaint.ComplaintStatus.REJECTED, com.civicfix.complaint.ComplaintStatus.PENDING_CITIZEN_CONFIRMATION) ORDER BY c.slaDueAt ASC")
    List<UUID> findOverdueComplaintIdsForEscalation(@Param("now") OffsetDateTime now, Pageable pageable);

    @Query("SELECT c.id FROM Complaint c WHERE c.status = com.civicfix.complaint.ComplaintStatus.PENDING_CITIZEN_CONFIRMATION AND c.pendingConfirmationAt IS NOT NULL AND c.pendingConfirmationAt <= :cutoff ORDER BY c.pendingConfirmationAt ASC")
    List<UUID> findPendingConfirmationIdsForAutoConfirm(@Param("cutoff") OffsetDateTime cutoff, Pageable pageable);

    @Modifying
    @Query("UPDATE Complaint c SET c.status = com.civicfix.complaint.ComplaintStatus.RESOLVED, c.confirmedAt = :now, c.confirmationSource = 'AUTO', c.updatedAt = :now WHERE c.id = :id AND c.status = com.civicfix.complaint.ComplaintStatus.PENDING_CITIZEN_CONFIRMATION")
    int autoConfirmResolution(@Param("id") UUID id, @Param("now") OffsetDateTime now);

    @Query("SELECT c FROM Complaint c WHERE c.escalatedAt IS NOT NULL " +
           "AND (:ward IS NULL OR LOWER(c.ward) = LOWER(:ward)) " +
           "AND (:category IS NULL OR LOWER(c.category) = LOWER(:category)) " +
           "ORDER BY c.escalatedAt DESC")
    Page<Complaint> findEscalatedComplaints(
            @Param("ward") String ward,
            @Param("category") String category,
            Pageable pageable);

    @Modifying(clearAutomatically = true)
    @Query("UPDATE Complaint c SET c.visionStatus = 'RUNNING', c.visionAt = :now WHERE c.id = :id AND c.visionStatus = 'NOT_RUN'")
    int claimForVisionTriage(@Param("id") UUID id, @Param("now") OffsetDateTime now);

    @Modifying(clearAutomatically = true)
    @Query("UPDATE Complaint c SET " +
           "c.visionCategory = :visionCategory, " +
           "c.visionSeverity = :visionSeverity, " +
           "c.visionConfidence = :visionConfidence, " +
           "c.visionReason = :visionReason, " +
           "c.visionModel = :visionModel, " +
           "c.visionStatus = :visionStatus, " +
           "c.visionAt = :now, " +
           "c.disagreement = :disagreement, " +
           "c.finalPrioritySource = :finalPrioritySource, " +
           "c.aiRecommendedPriority = :elevatedPriority " +
           "WHERE c.id = :id")
    int updateVisionSuccess(
            @Param("id") UUID id,
            @Param("visionCategory") String visionCategory,
            @Param("visionSeverity") Integer visionSeverity,
            @Param("visionConfidence") BigDecimal visionConfidence,
            @Param("visionReason") String visionReason,
            @Param("visionModel") String visionModel,
            @Param("visionStatus") String visionStatus,
            @Param("now") OffsetDateTime now,
            @Param("disagreement") boolean disagreement,
            @Param("finalPrioritySource") String finalPrioritySource,
            @Param("elevatedPriority") ComplaintPriority elevatedPriority);

    @Modifying(clearAutomatically = true)
    @Query("UPDATE Complaint c SET " +
           "c.visionStatus = :visionStatus, " +
           "c.visionReason = :visionReason, " +
           "c.visionAt = :now " +
           "WHERE c.id = :id")
    int updateVisionStatus(
            @Param("id") UUID id,
            @Param("visionStatus") String visionStatus,
            @Param("visionReason") String visionReason,
            @Param("now") OffsetDateTime now);

    @Query("SELECT COUNT(c) FROM Complaint c WHERE c.visionAt >= :startOfDay AND c.visionStatus IN ('OK', 'FAILED')")
    long countDailyVisionInvocations(@Param("startOfDay") OffsetDateTime startOfDay);

    @Modifying(clearAutomatically = true)
    @Query("UPDATE Complaint c SET c.visionStatus = 'FAILED', c.visionReason = 'Vision triage timed out or process crashed while RUNNING' WHERE c.visionStatus = 'RUNNING' AND c.visionAt < :stuckCutoff")
    int cleanupStuckRunningRows(@Param("stuckCutoff") OffsetDateTime stuckCutoff);
}
