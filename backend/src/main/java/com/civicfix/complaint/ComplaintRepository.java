package com.civicfix.complaint;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.Optional;
import java.util.UUID;

@Repository
public interface ComplaintRepository extends JpaRepository<Complaint, UUID> {

    Optional<Complaint> findByReferenceIdIgnoreCase(String referenceId);

    @Query("SELECT c FROM Complaint c WHERE c.id = :id OR LOWER(c.referenceId) = LOWER(:ref)")
    Optional<Complaint> findByIdOrReferenceId(@Param("id") UUID id, @Param("ref") String ref);

    // Citizen: own complaints only
    Page<Complaint> findByCitizenIdOrderByCreatedAtDesc(UUID citizenId, Pageable pageable);

    // Worker: assigned tasks only
    Page<Complaint> findByAssignedWorkerIdOrderByCreatedAtDesc(UUID workerId, Pageable pageable);

    // Officer / Admin: all complaints with optional filtering
    Page<Complaint> findAllByOrderByCreatedAtDesc(Pageable pageable);

    Page<Complaint> findByStatusOrderByCreatedAtDesc(ComplaintStatus status, Pageable pageable);

    Page<Complaint> findByCategoryIgnoreCaseOrderByCreatedAtDesc(String category, Pageable pageable);

    long countByStatus(ComplaintStatus status);
}
