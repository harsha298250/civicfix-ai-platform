package com.civicfix.complaint.sla;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;

@Repository
public interface SlaPolicyRepository extends JpaRepository<SlaPolicy, Integer> {

    Optional<SlaPolicy> findByCategoryIgnoreCaseAndPriorityIgnoreCase(String category, String priority);
}

