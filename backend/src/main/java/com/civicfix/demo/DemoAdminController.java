package com.civicfix.demo;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.context.annotation.Profile;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.Map;

/**
 * Administrative controller for demo dataset management.
 * 
 * Strictly restricted to users with the ADMIN authority and active ONLY under the Spring 'dev' profile.
 * Provides safe, repeatable database reset capabilities without impacting production data.
 */
@RestController
@RequestMapping("/api/admin/demo")
@Profile("dev")
@PreAuthorize("hasRole('ADMIN')")
public class DemoAdminController {

    private static final Logger log = LoggerFactory.getLogger(DemoAdminController.class);

    private final DemoDataSeeder demoDataSeeder;

    public DemoAdminController(DemoDataSeeder demoDataSeeder) {
        this.demoDataSeeder = demoDataSeeder;
    }

    /**
     * Resets the demo dataset in PostgreSQL by purging exclusively records where is_demo = true,
     * then deterministically reseeding 40 realistic Chennai complaints.
     */
    @PostMapping("/reset")
    public ResponseEntity<Map<String, Object>> resetDemoData() {
        log.info("Admin demo reset endpoint invoked.");
        int seededCount = demoDataSeeder.reset();
        return ResponseEntity.ok(Map.of(
                "status", "SUCCESS",
                "message", "Demo complaints dataset reset successfully in PostgreSQL (" + seededCount + " tickets seeded)",
                "complaintCount", seededCount
        ));
    }
}

