package com.civicfix.complaint.sla;

import com.civicfix.complaint.ComplaintPriority;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.OffsetDateTime;
import java.util.Map;

@Service
public class SlaService {

    private final SlaPolicyRepository slaPolicyRepository;

    private static final Map<ComplaintPriority, Integer> DEFAULT_HOURS = Map.of(
            ComplaintPriority.CRITICAL, 12,
            ComplaintPriority.HIGH, 24,
            ComplaintPriority.MEDIUM, 48,
            ComplaintPriority.LOW, 96
    );

    public SlaService(SlaPolicyRepository slaPolicyRepository) {
        this.slaPolicyRepository = slaPolicyRepository;
    }

    @Transactional(readOnly = true)
    public OffsetDateTime computeSlaDueAt(String category, ComplaintPriority priority, OffsetDateTime createdAt) {
        if (priority == null) {
            return null;
        }

        OffsetDateTime baseTime = createdAt != null ? createdAt : OffsetDateTime.now();
        int hours = resolvePolicyHours(category, priority);
        return baseTime.plusHours(hours);
    }

    public int resolvePolicyHours(String category, ComplaintPriority priority) {
        if (priority == null) {
            return 48;
        }

        if (category != null && !category.trim().isEmpty()) {
            var policyOpt = slaPolicyRepository.findByCategoryIgnoreCaseAndPriorityIgnoreCase(category.trim(), priority.name());
            if (policyOpt.isPresent()) {
                return policyOpt.get().getHours();
            }
        }

        // Try DEFAULT category policy in repository
        var defaultPolicyOpt = slaPolicyRepository.findByCategoryIgnoreCaseAndPriorityIgnoreCase("DEFAULT", priority.name());
        if (defaultPolicyOpt.isPresent()) {
            return defaultPolicyOpt.get().getHours();
        }

        // Hardcoded standard fallback
        return DEFAULT_HOURS.getOrDefault(priority, 48);
    }
}

