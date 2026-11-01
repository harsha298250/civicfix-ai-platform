package com.civicfix.complaint.sla;

import com.civicfix.complaint.ComplaintPriority;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import java.lang.reflect.Proxy;
import java.time.OffsetDateTime;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;

class SlaServiceTest {

    private SlaPolicyRepository policyRepository;
    private SlaService slaService;

    @BeforeEach
    void setUp() {
        policyRepository = (SlaPolicyRepository) Proxy.newProxyInstance(
                SlaPolicyRepository.class.getClassLoader(),
                new Class<?>[]{SlaPolicyRepository.class},
                (proxy, method, args) -> {
                    if ("findByCategoryIgnoreCaseAndPriorityIgnoreCase".equals(method.getName())) {
                        String cat = (String) args[0];
                        String prio = (String) args[1];
                        if ("Pothole & Road Hazard".equalsIgnoreCase(cat) && "CRITICAL".equalsIgnoreCase(prio)) {
                            return Optional.of(new SlaPolicy("Pothole & Road Hazard", prio, 12));
                        }
                        if ("Pothole & Road Hazard".equalsIgnoreCase(cat) && "MEDIUM".equalsIgnoreCase(prio)) {
                            return Optional.of(new SlaPolicy("Pothole & Road Hazard", prio, 48));
                        }
                        if ("DEFAULT".equalsIgnoreCase(cat) && "HIGH".equalsIgnoreCase(prio)) {
                            return Optional.of(new SlaPolicy("DEFAULT", prio, 24));
                        }
                        if ("DEFAULT".equalsIgnoreCase(cat) && "MEDIUM".equalsIgnoreCase(prio)) {
                            return Optional.of(new SlaPolicy("DEFAULT", prio, 48));
                        }
                        return Optional.empty();
                    }
                    return null;
                }
        );

        slaService = new SlaService(policyRepository);
    }

    @Test
    @DisplayName("computeSlaDueAt returns null when priority is null")
    void testComputeSlaDueAt_NullPriority() {
        OffsetDateTime created = OffsetDateTime.now();
        assertNull(slaService.computeSlaDueAt("Pothole & Road Hazard", null, created));
    }

    @Test
    @DisplayName("computeSlaDueAt computes createdAt + policy hours for category & priority")
    void testComputeSlaDueAt_ExactMatch() {
        OffsetDateTime created = OffsetDateTime.now();
        OffsetDateTime due = slaService.computeSlaDueAt("Pothole & Road Hazard", ComplaintPriority.CRITICAL, created);

        assertNotNull(due);
        assertEquals(created.plusHours(12), due);
    }

    @Test
    @DisplayName("computeSlaDueAt falls back to DEFAULT policy if category not found")
    void testComputeSlaDueAt_FallbackDefault() {
        OffsetDateTime created = OffsetDateTime.now();
        OffsetDateTime due = slaService.computeSlaDueAt("Special Nonexistent Category", ComplaintPriority.HIGH, created);

        assertNotNull(due);
        assertEquals(created.plusHours(24), due);
    }
}
