package com.civicfix.complaint;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface ComplaintPhotoRepository extends JpaRepository<ComplaintPhoto, UUID> {

    List<ComplaintPhoto> findByComplaintIdOrderByCreatedAtAsc(UUID complaintId);

    Optional<ComplaintPhoto> findFirstByPhotoUrlEndingWith(String filenamePattern);

    Optional<ComplaintPhoto> findFirstByPhotoUrlContaining(String filenamePattern);
}
