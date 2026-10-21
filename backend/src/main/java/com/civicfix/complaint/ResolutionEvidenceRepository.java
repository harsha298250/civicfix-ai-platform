package com.civicfix.complaint;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.UUID;

@Repository
public interface ResolutionEvidenceRepository extends JpaRepository<ResolutionEvidence, UUID> {
    List<ResolutionEvidence> findByComplaintIdOrderByCreatedAtDesc(UUID complaintId);
}
