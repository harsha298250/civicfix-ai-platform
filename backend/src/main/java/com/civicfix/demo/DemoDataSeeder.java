package com.civicfix.demo;

import com.civicfix.ai.dto.AiTriageResult;
import com.civicfix.ai.triage.CivicLexicon;
import com.civicfix.ai.triage.DeterministicTriageEngine;
import com.civicfix.audit.AuditLog;
import com.civicfix.audit.AuditLogRepository;
import com.civicfix.complaint.*;
import com.civicfix.storage.StorageService;
import com.civicfix.user.User;
import com.civicfix.user.UserRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.context.annotation.Profile;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;

import java.math.BigDecimal;
import java.time.OffsetDateTime;
import java.time.ZoneOffset;
import java.util.*;

/**
 * CivicFix AI — Repeatable, Safe Demo Dataset Seeder.
 * 
 * Activated exclusively in the 'dev' profile and guarded by the CIVICFIX_SEED_DEMO flag.
 * Produces exactly 40 deterministic, real-world civic complaints across Chennai localities,
 * complete with status histories, audit trails, valid photographic proof, and rule-based AI triage.
 */
@Component
@Profile("dev")
public class DemoDataSeeder implements ApplicationRunner {

    private static final Logger log = LoggerFactory.getLogger(DemoDataSeeder.class);

    // Valid 68-byte 1x1 transparent PNG image binary
    public static final byte[] TINY_PNG_BYTES = new byte[] {
        (byte) 0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A,
        0x00, 0x00, 0x00, 0x0D, 0x49, 0x48, 0x44, 0x52,
        0x00, 0x00, 0x00, 0x01, 0x00, 0x00, 0x00, 0x01,
        0x08, 0x06, 0x00, 0x00, 0x00, 0x1F, 0x15, (byte) 0xC4,
        (byte) 0x89, 0x00, 0x00, 0x00, 0x0A, 0x49, 0x44, 0x41,
        0x54, 0x78, (byte) 0x9C, 0x63, 0x00, 0x01, 0x00, 0x00,
        0x05, 0x00, 0x01, 0x0D, 0x0A, 0x2D, (byte) 0xB4, 0x00,
        0x00, 0x00, 0x00, 0x49, 0x45, 0x4E, 0x44, (byte) 0xAE,
        (byte) 0x42, (byte) 0x60, (byte) 0x82
    };

    private static final UUID CITIZEN_UUID = UUID.fromString("00000000-0000-0000-0000-000000000001");
    private static final UUID OFFICER_UUID = UUID.fromString("00000000-0000-0000-0000-000000000002");
    private static final UUID WORKER_UUID  = UUID.fromString("00000000-0000-0000-0000-000000000003");

    // Fixed reference anchor for deterministic complaint timelines
    private static final OffsetDateTime ANCHOR_TIME = OffsetDateTime.of(
            2026, 10, 31, 10, 0, 0, 0, ZoneOffset.ofHoursMinutes(5, 30)
    );

    private final ComplaintRepository complaintRepository;
    private final ComplaintStatusHistoryRepository historyRepository;
    private final AuditLogRepository auditLogRepository;
    private final UserRepository userRepository;
    private final StorageService storageService;
    private final DeterministicTriageEngine triageEngine;
    private final boolean seedDemoEnabled;

    public DemoDataSeeder(
            ComplaintRepository complaintRepository,
            ComplaintStatusHistoryRepository historyRepository,
            AuditLogRepository auditLogRepository,
            UserRepository userRepository,
            @Autowired(required = false) StorageService storageService,
            @Autowired(required = false) DeterministicTriageEngine triageEngine,
            @Value("${civicfix.seed-demo:false}") boolean seedDemoEnabled
    ) {
        this.complaintRepository = complaintRepository;
        this.historyRepository = historyRepository;
        this.auditLogRepository = auditLogRepository;
        this.userRepository = userRepository;
        this.storageService = storageService;
        this.triageEngine = triageEngine != null ? triageEngine : new DeterministicTriageEngine();
        this.seedDemoEnabled = seedDemoEnabled;
    }

    @Override
    public void run(ApplicationArguments args) {
        if (!seedDemoEnabled) {
            log.info("CIVICFIX_SEED_DEMO is disabled (civicfix.seed-demo=false). Skipping automated demo seeding.");
            return;
        }

        seedIfEmpty();
    }

    /**
     * Idempotent seed operation. Does nothing if any demo complaints already exist.
     */
    @Transactional
    public synchronized int seedIfEmpty() {
        long existingDemoCount = complaintRepository.countByIsDemoTrue();
        if (existingDemoCount > 0) {
            log.info("Demo dataset already present (count={}). Skipping seeding to preserve state.", existingDemoCount);
            return (int) existingDemoCount;
        }

        log.info("Zero demo complaints detected. Seeding fresh deterministic demo dataset in PostgreSQL...");
        return seed();
    }

    /**
     * Deletes only demo records (is_demo = true) and reseeds the full dataset deterministically.
     * Guaranteed never to touch non-demo production records or real citizen data.
     */
    @Transactional
    public synchronized int reset() {
        log.info("Beginning administrative demo dataset reset: deleting only rows where is_demo = true...");

        List<Complaint> demoComplaints = complaintRepository.findByIsDemoTrue();
        if (!demoComplaints.isEmpty()) {
            List<String> demoIdStrings = demoComplaints.stream()
                    .map(c -> c.getId().toString())
                    .toList();

            // 1. Break self-referencing duplicate_of_id foreign key links before deleting complaints
            complaintRepository.clearDuplicateOfForDemoComplaints();

            // 2. Remove audit logs associated with demo complaints
            try {
                auditLogRepository.deleteByTargetTypeAndTargetIdIn(demoIdStrings);
            } catch (Exception e) {
                log.warn("Notice: could not bulk delete audit logs by targetId: {}", e.getMessage());
            }

            // 3. Delete demo complaints. Cascades to complaint_photos, resolution_evidence, complaint_status_history.
            complaintRepository.deleteByIsDemoTrue();
            log.info("Purged {} demo complaints from PostgreSQL.", demoComplaints.size());
        }

        return seed();
    }

    /**
     * Core deterministic seeder producing exactly 40 complaints with realistic Chennai GIS coordinates,
     * realistic timelines, 3 duplicate clusters, and rule-based AI triage scores.
     */
    @Transactional
    public synchronized int seed() {
        // Resolve seeded actors
        User citizen = userRepository.findById(CITIZEN_UUID)
                .orElseGet(() -> userRepository.findByEmailIgnoreCase("alex.m@citizen.org")
                        .orElse(null));
        User officer = userRepository.findById(OFFICER_UUID)
                .orElseGet(() -> userRepository.findByEmailIgnoreCase("elena.vance@metro.gov")
                        .orElse(null));
        User worker = userRepository.findById(WORKER_UUID)
                .orElseGet(() -> userRepository.findByEmailIgnoreCase("marcus.chen@fieldops.gov")
                        .orElse(null));

        if (citizen == null) {
            log.warn("Seed citizen user not found in database. Using system fallback reference for demo seeding.");
        }

        List<DemoSpec> specs = getDemoComplaintSpecs();
        List<Complaint> createdComplaints = new ArrayList<>();
        List<AuditLog> auditLogsToSave = new ArrayList<>();

        // Generate tiny valid placeholder PNG
        String demoPhotoUrl = storePlaceholderPng("demo_intake_photo.png");
        String demoEvidenceUrl = storePlaceholderPng("demo_resolution_evidence.png");

        // 1. Build all 40 complaints
        for (int i = 0; i < specs.size(); i++) {
            DemoSpec spec = specs.get(i);
            String refId = String.format("CF-2026-%05d", i + 1);

            Complaint complaint = new Complaint();
            complaint.setReferenceId(refId);
            complaint.setTitle(spec.title);
            complaint.setDescription(spec.description);
            complaint.setCategory(spec.category);
            complaint.setPriority(spec.priority);
            complaint.setStatus(spec.status);
            complaint.setAddress(spec.address);
            complaint.setWard(spec.ward);
            complaint.setLatitude(BigDecimal.valueOf(spec.lat));
            complaint.setLongitude(BigDecimal.valueOf(spec.lng));
            complaint.setDemo(true);

            OffsetDateTime createdAt = ANCHOR_TIME.minusDays(spec.daysAgo).minusHours(spec.hoursOffset);
            complaint.setCreatedAt(createdAt);
            complaint.setUpdatedAt(createdAt.plusHours(spec.status == ComplaintStatus.SUBMITTED ? 0 : 2));

            if (citizen != null) {
                complaint.setCitizen(citizen);
            }

            if (spec.status != ComplaintStatus.SUBMITTED && officer != null) {
                complaint.setAssignedOfficer(officer);
            }

            if ((spec.status == ComplaintStatus.ASSIGNED || spec.status == ComplaintStatus.IN_PROGRESS ||
                 spec.status == ComplaintStatus.RESOLUTION_SUBMITTED || spec.status == ComplaintStatus.RESOLVED ||
                 spec.status == ComplaintStatus.REWORK_REQUESTED) && worker != null) {
                complaint.setAssignedWorker(worker);
            }

            // Run deterministic AI triage engine so evaluations are authentic
            AiTriageResult triage = triageEngine.evaluate(
                    spec.title,
                    spec.description,
                    spec.category,
                    spec.priority
            );
            complaint.setAiDetectedCategory(triage.getDetectedCategory());
            complaint.setAiRecommendedPriority(triage.getRecommendedPriority());
            complaint.setAiConfidence(triage.getConfidence());
            complaint.setAiHazardScore(triage.getHazardScore());
            complaint.setAiExplanation(triage.getExplanation());
            complaint.setAiTriagedAt(createdAt.plusMinutes(4));
            complaint.setAiAdjudicationStatus(
                    spec.status == ComplaintStatus.RESOLVED || spec.status == ComplaintStatus.RESOLUTION_SUBMITTED ||
                    spec.status == ComplaintStatus.IN_PROGRESS || spec.status == ComplaintStatus.ASSIGNED
                            ? "ACCEPTED"
                            : "PENDING"
            );

            // Add intake photo if specified
            if (spec.hasPhotos && demoPhotoUrl != null) {
                ComplaintPhoto photo = new ComplaintPhoto();
                photo.setComplaint(complaint);
                photo.setPhotoUrl(demoPhotoUrl);
                photo.setFileName(String.format("intake_%s.png", refId));
                photo.setFileSize((long) TINY_PNG_BYTES.length);
                photo.setContentType("image/png");
                photo.setCreatedAt(createdAt);
                complaint.getPhotos().add(photo);
            }

            // Add resolution evidence if status reached resolution
            if (spec.hasResolutionEvidence && demoEvidenceUrl != null && worker != null) {
                ResolutionEvidence evidence = new ResolutionEvidence();
                evidence.setComplaint(complaint);
                evidence.setWorker(worker);
                evidence.setPhotoUrl(demoEvidenceUrl);
                evidence.setEvidenceNotes("Field restoration completed and verified according to municipal service standards.");
                evidence.setLatitude(BigDecimal.valueOf(spec.lat));
                evidence.setLongitude(BigDecimal.valueOf(spec.lng));
                evidence.setCreatedAt(createdAt.plusHours(18));
                complaint.getEvidenceList().add(evidence);
            }

            // Build realistic status history progression
            buildStatusHistory(complaint, spec.status, citizen, officer, worker, createdAt);

            // Create matching audit logs
            buildAuditLogs(complaint, spec.status, citizen, officer, worker, createdAt, auditLogsToSave);

            createdComplaints.add(complaint);
        }

        // 2. Save all complaints first to establish database IDs
        List<Complaint> savedComplaints = complaintRepository.saveAll(createdComplaints);

        // 3. Link duplicate clusters via duplicate_of_id
        for (int i = 0; i < specs.size(); i++) {
            DemoSpec spec = specs.get(i);
            if (spec.duplicateOfIndex >= 0 && spec.duplicateOfIndex < savedComplaints.size()) {
                Complaint child = savedComplaints.get(i);
                Complaint parent = savedComplaints.get(spec.duplicateOfIndex);
                child.setDuplicateOf(parent);
                complaintRepository.save(child);
            }
        }

        // 4. Persist audit logs
        if (!auditLogsToSave.isEmpty()) {
            try {
                auditLogRepository.saveAll(auditLogsToSave);
            } catch (Exception e) {
                log.warn("Notice: could not save initial demo audit logs: {}", e.getMessage());
            }
        }

        log.info("Successfully seeded {} repeatable demo complaints across Chennai in PostgreSQL.", savedComplaints.size());
        return savedComplaints.size();
    }

    private String storePlaceholderPng(String filename) {
        if (storageService != null) {
            try {
                MultipartFile multipartFile = new DemoMultipartFile("file", filename, "image/png", TINY_PNG_BYTES);
                return storageService.storeFile(multipartFile, "complaints");
            } catch (Exception e) {
                log.warn("Notice: StorageService storeFile failed, using static resource URL: {}", e.getMessage());
            }
        }
        return "/api/complaints/evidence/files/" + filename;
    }

    private void buildStatusHistory(
            Complaint complaint,
            ComplaintStatus targetStatus,
            User citizen,
            User officer,
            User worker,
            OffsetDateTime createdAt
    ) {
        // Initial submission
        addHistory(complaint, null, ComplaintStatus.SUBMITTED, citizen, "Citizen incident report registered via portal.", createdAt);

        if (targetStatus == ComplaintStatus.SUBMITTED) return;

        // UNDER_REVIEW
        OffsetDateTime tReview = createdAt.plusHours(2);
        addHistory(complaint, ComplaintStatus.SUBMITTED, ComplaintStatus.UNDER_REVIEW, officer, "Municipal officer conducted intake review and triage verification.", tReview);

        if (targetStatus == ComplaintStatus.UNDER_REVIEW) return;

        if (targetStatus == ComplaintStatus.REJECTED) {
            addHistory(complaint, ComplaintStatus.UNDER_REVIEW, ComplaintStatus.REJECTED, officer, "Rejected: Private boundary or duplicate jurisdiction outside municipal purview.", tReview.plusHours(1));
            return;
        }

        // ASSIGNED
        OffsetDateTime tAssign = tReview.plusHours(2);
        addHistory(complaint, ComplaintStatus.UNDER_REVIEW, ComplaintStatus.ASSIGNED, officer, "Work order dispatched to field personnel Marcus Chen.", tAssign);

        if (targetStatus == ComplaintStatus.ASSIGNED) return;

        // IN_PROGRESS
        OffsetDateTime tProgress = tAssign.plusHours(2);
        addHistory(complaint, ComplaintStatus.ASSIGNED, ComplaintStatus.IN_PROGRESS, worker, "Field crew deployed on-site with required equipment.", tProgress);

        if (targetStatus == ComplaintStatus.IN_PROGRESS) return;

        // RESOLUTION_SUBMITTED
        OffsetDateTime tResSubmitted = tProgress.plusHours(12);
        addHistory(complaint, ComplaintStatus.IN_PROGRESS, ComplaintStatus.RESOLUTION_SUBMITTED, worker, "Work execution completed. Submitted photographic evidence for officer sign-off.", tResSubmitted);

        if (targetStatus == ComplaintStatus.RESOLUTION_SUBMITTED) return;

        if (targetStatus == ComplaintStatus.REWORK_REQUESTED) {
            OffsetDateTime tRework = tResSubmitted.plusHours(2);
            addHistory(complaint, ComplaintStatus.RESOLUTION_SUBMITTED, ComplaintStatus.REWORK_REQUESTED, officer, "Compaction incomplete, surface uneven. Re-roll asphalt and patch edges before sign-off.", tRework);
            return;
        }

        if (targetStatus == ComplaintStatus.RESOLVED || targetStatus == ComplaintStatus.REOPENED) {
            OffsetDateTime tResolved = tResSubmitted.plusHours(4);
            addHistory(complaint, ComplaintStatus.RESOLUTION_SUBMITTED, ComplaintStatus.RESOLVED, officer, "Field inspection verified. Work order meets municipal standards. Ticket officially closed.", tResolved);

            if (targetStatus == ComplaintStatus.REOPENED) {
                OffsetDateTime tReopened = tResolved.plusDays(2);
                addHistory(complaint, ComplaintStatus.RESOLVED, ComplaintStatus.REOPENED, citizen, "Issue recurring following seasonal monsoon showers.", tReopened);
            }
        }
    }

    private void addHistory(
            Complaint complaint,
            ComplaintStatus prev,
            ComplaintStatus next,
            User actor,
            String notes,
            OffsetDateTime time
    ) {
        ComplaintStatusHistory history = new ComplaintStatusHistory();
        history.setComplaint(complaint);
        history.setPreviousStatus(prev != null ? prev.name() : null);
        history.setNewStatus(next != null ? next.name() : ComplaintStatus.SUBMITTED.name());
        history.setChangedByUser(actor);
        history.setChangedByName(actor != null ? actor.getFullName() : "System Automated Dispatch");
        history.setNotes(notes);
        history.setCreatedAt(time);
        complaint.getStatusHistory().add(history);
    }

    private void buildAuditLogs(
            Complaint complaint,
            ComplaintStatus status,
            User citizen,
            User officer,
            User worker,
            OffsetDateTime createdAt,
            List<AuditLog> logs
    ) {
        String cid = complaint.getReferenceId();

        AuditLog l1 = new AuditLog();
        l1.setActorId(citizen != null ? citizen.getId() : null);
        l1.setActorName(citizen != null ? citizen.getFullName() : "Alex Morgan");
        l1.setActorRole("CITIZEN");
        l1.setAction("COMPLAINT_CREATED");
        l1.setTargetType("COMPLAINT");
        l1.setTargetId(cid);
        l1.setDetails("Submitted ticket #" + cid + ": " + complaint.getTitle());
        l1.setCreatedAt(createdAt);
        logs.add(l1);

        if (status != ComplaintStatus.SUBMITTED) {
            AuditLog l2 = new AuditLog();
            l2.setActorId(officer != null ? officer.getId() : null);
            l2.setActorName(officer != null ? officer.getFullName() : "Elena Vance");
            l2.setActorRole("OFFICER");
            l2.setAction("COMPLAINT_TRIAGED");
            l2.setTargetType("COMPLAINT");
            l2.setTargetId(cid);
            l2.setDetails("Officer intake and triage completed for ticket #" + cid);
            l2.setCreatedAt(createdAt.plusHours(2));
            logs.add(l2);
        }

        if (status == ComplaintStatus.RESOLVED) {
            AuditLog l3 = new AuditLog();
            l3.setActorId(officer != null ? officer.getId() : null);
            l3.setActorName(officer != null ? officer.getFullName() : "Elena Vance");
            l3.setActorRole("OFFICER");
            l3.setAction("COMPLAINT_RESOLVED");
            l3.setTargetType("COMPLAINT");
            l3.setTargetId(cid);
            l3.setDetails("Final resolution approved and closed for ticket #" + cid);
            l3.setCreatedAt(createdAt.plusHours(24));
            logs.add(l3);
        }
    }

    private static class DemoSpec {
        final String title;
        final String description;
        final String category;
        final ComplaintPriority priority;
        final ComplaintStatus status;
        final String address;
        final String ward;
        final double lat;
        final double lng;
        final int daysAgo;
        final int hoursOffset;
        final int duplicateOfIndex; // -1 if master, or parent index
        final boolean hasPhotos;
        final boolean hasResolutionEvidence;

        DemoSpec(String title, String description, String category, ComplaintPriority priority,
                 ComplaintStatus status, String address, String ward, double lat, double lng,
                 int daysAgo, int hoursOffset, int duplicateOfIndex, boolean hasPhotos, boolean hasResolutionEvidence) {
            this.title = title;
            this.description = description;
            this.category = category;
            this.priority = priority;
            this.status = status;
            this.address = address;
            this.ward = ward;
            this.lat = lat;
            this.lng = lng;
            this.daysAgo = daysAgo;
            this.hoursOffset = hoursOffset;
            this.duplicateOfIndex = duplicateOfIndex;
            this.hasPhotos = hasPhotos;
            this.hasResolutionEvidence = hasResolutionEvidence;
        }
    }

    private List<DemoSpec> getDemoComplaintSpecs() {
        List<DemoSpec> list = new ArrayList<>();

        // --- CLUSTER 1: ROADS in Anna Nagar (Master: 0, Children: 1, 2) ---
        list.add(new DemoSpec(
                "Deep asphalt crater on 2nd Avenue near Roundtana",
                "Severe pothole crater extending across central lane, causing motor vehicle swerving.",
                CivicLexicon.CAT_ROADS, ComplaintPriority.HIGH, ComplaintStatus.IN_PROGRESS,
                "2nd Avenue, Near Roundtana Signal", "Ward 08, Anna Nagar", 13.0845, 80.2155, 14, 2, -1, true, false
        )); // 0
        list.add(new DemoSpec(
                "Large pothole blocking bus route at Anna Nagar Roundtana",
                "Damaged asphalt and crater blocking MTC bus lane near 2nd Avenue intersection.",
                CivicLexicon.CAT_ROADS, ComplaintPriority.HIGH, ComplaintStatus.SUBMITTED,
                "2nd Avenue East, Anna Nagar", "Ward 08, Anna Nagar", 13.0848, 80.2158, 14, 1, 0, true, false
        )); // 1 (dup of 0)
        list.add(new DemoSpec(
                "Road cave-in on 2nd Avenue bus lane",
                "Subsurface asphalt erosion creating deep fissure next to Roundtana sidewalk.",
                CivicLexicon.CAT_ROADS, ComplaintPriority.MEDIUM, ComplaintStatus.SUBMITTED,
                "2nd Avenue Corner, Anna Nagar", "Ward 08, Anna Nagar", 13.0842, 80.2152, 13, 5, 0, false, false
        )); // 2 (dup of 0)

        // --- CLUSTER 2: WATER_SEWERAGE in T. Nagar (Master: 3, Children: 4, 5) ---
        list.add(new DemoSpec(
                "Major drinking water pipeline burst on Usman Road",
                "Pressurized water main fractured, inundating pedestrian walkway and road shoulder.",
                CivicLexicon.CAT_WATER, ComplaintPriority.CRITICAL, ComplaintStatus.IN_PROGRESS,
                "Usman Road Flyover Junction", "Ward 10, T. Nagar", 13.0415, 80.2335, 8, 3, -1, true, false
        )); // 3
        list.add(new DemoSpec(
                "Heavy water leakage flooding Usman Road commercial stretch",
                "Severe underground pipe leak gushing treated drinking water onto shopping street.",
                CivicLexicon.CAT_WATER, ComplaintPriority.CRITICAL, ComplaintStatus.SUBMITTED,
                "Usman Road South Entrance", "Ward 10, T. Nagar", 13.0418, 80.2339, 8, 2, 3, true, false
        )); // 4 (dup of 3)
        list.add(new DemoSpec(
                "Pipe burst near Panagal Park junction",
                "Water main rupture causing traffic stagnation and low water pressure across area.",
                CivicLexicon.CAT_WATER, ComplaintPriority.HIGH, ComplaintStatus.UNDER_REVIEW,
                "Panagal Park West, T. Nagar", "Ward 10, T. Nagar", 13.0412, 80.2330, 7, 6, 3, false, false
        )); // 5 (dup of 3)

        // --- CLUSTER 3: STREET_LIGHT in Adyar (Master: 6, Children: 7, 8) ---
        list.add(new DemoSpec(
                "Complete blackout of street lights on Sardar Patel Road",
                "Multiple light poles unpowered along 400m arterial corridor between Kasturba Nagar and Adyar Depot.",
                CivicLexicon.CAT_STREET_LIGHT, ComplaintPriority.HIGH, ComplaintStatus.ASSIGNED,
                "Sardar Patel Road", "Ward 13, Adyar", 13.0060, 80.2520, 5, 4, -1, true, false
        )); // 6
        list.add(new DemoSpec(
                "Dark road and non-functional streetlights on Sardar Patel Road",
                "Zero illumination after sunset creating severe safety hazard for commuters.",
                CivicLexicon.CAT_STREET_LIGHT, ComplaintPriority.MEDIUM, ComplaintStatus.SUBMITTED,
                "Sardar Patel Road Near Gandhi Mandapam", "Ward 13, Adyar", 13.0063, 80.2524, 5, 3, 6, false, false
        )); // 7 (dup of 6)
        list.add(new DemoSpec(
                "Damaged transformer and blacked-out lamp posts near Adyar Depot",
                "Dark stretch with power failure on Sardar Patel Road municipal lampposts.",
                CivicLexicon.CAT_STREET_LIGHT, ComplaintPriority.MEDIUM, ComplaintStatus.UNDER_REVIEW,
                "Sardar Patel Road Bus Terminal", "Ward 13, Adyar", 13.0058, 80.2516, 4, 1, 6, true, false
        )); // 8 (dup of 6)

        // --- REMAINING COMPLAINTS (Indices 9 to 39) Across All Chennai Localities & Statuses ---
        list.add(new DemoSpec(
                "Severe bitumen fissure along Jawaharlal Nehru Road",
                "Transverse asphalt crack expanding after heavy freight lorry movement.",
                CivicLexicon.CAT_ROADS, ComplaintPriority.HIGH, ComplaintStatus.ASSIGNED,
                "100 Feet Road, Koyambedu", "Ward 08, Anna Nagar", 13.0720, 80.1980, 10, 2, -1, true, false
        )); // 9
        list.add(new DemoSpec(
                "Cracked concrete footpath slabs near Kodambakkam Railway Station",
                "Pedestrian walkway tiles broken and elevated, tripping transit commuters.",
                CivicLexicon.CAT_ROADS, ComplaintPriority.MEDIUM, ComplaintStatus.SUBMITTED,
                "Station Road, Kodambakkam", "Ward 09, Kodambakkam", 13.0520, 80.2220, 2, 4, -1, true, false
        )); // 10
        list.add(new DemoSpec(
                "Sunken manhole frame causing vehicle tire damage on LB Road",
                "Manhole rim sunken 5 inches beneath asphalt grade creating sharp drop.",
                CivicLexicon.CAT_ROADS, ComplaintPriority.HIGH, ComplaintStatus.UNDER_REVIEW,
                "Lattice Bridge Road, Adyar", "Ward 13, Adyar", 13.0012, 80.2565, 3, 1, -1, true, false
        )); // 11
        list.add(new DemoSpec(
                "Damaged median curb and missing reflector studs on Velachery Main Road",
                "Concrete divider chipped away by vehicle impact with no nighttime warning studs.",
                CivicLexicon.CAT_ROADS, ComplaintPriority.LOW, ComplaintStatus.RESOLVED,
                "Velachery Bypass Road", "Ward 14, Velachery", 12.9815, 80.2180, 21, 6, -1, true, true
        )); // 12
        list.add(new DemoSpec(
                "Sewage overflow contaminating residential lane on 4th Main Road",
                "Sewer manhole bubbling contaminated wastewater onto street fronting primary school.",
                CivicLexicon.CAT_WATER, ComplaintPriority.CRITICAL, ComplaintStatus.IN_PROGRESS,
                "4th Main Road, Gandhi Nagar", "Ward 13, Adyar", 13.0095, 80.2530, 6, 2, -1, true, false
        )); // 13
        list.add(new DemoSpec(
                "Drinking water contamination with foul odor in Tondiarpet tenement quarters",
                "Municipal tap water issuing muddy discolored effluent with chemical smell.",
                CivicLexicon.CAT_WATER, ComplaintPriority.CRITICAL, ComplaintStatus.REWORK_REQUESTED,
                "TH Road, Tondiarpet", "Ward 03, Tondiarpet", 13.1250, 80.2900, 16, 5, -1, true, true
        )); // 14
        list.add(new DemoSpec(
                "Broken sluice valve spewing treated water onto GST Road",
                "High pressure valve flange leaking thousands of liters into roadside stormwater basin.",
                CivicLexicon.CAT_WATER, ComplaintPriority.HIGH, ComplaintStatus.RESOLUTION_SUBMITTED,
                "GST Road, Guindy Flyover", "Ward 11, Guindy", 13.0067, 80.2020, 4, 3, -1, true, true
        )); // 15
        list.add(new DemoSpec(
                "Underground sewer line blockage causing gully pit regurgitation",
                "Blocked sanitary sewer backing up into stormwater inlet near temple tank.",
                CivicLexicon.CAT_WATER, ComplaintPriority.HIGH, ComplaintStatus.UNDER_REVIEW,
                "North Mada Street, Mylapore", "Ward 12, Mylapore", 13.0368, 80.2676, 1, 8, -1, false, false
        )); // 16
        list.add(new DemoSpec(
                "Snapped overhead cable hanging over pedestrian walkway",
                "Live wire dangling 4 feet above sidewalk with visible sparking risk near bus stop.",
                CivicLexicon.CAT_STREET_LIGHT, ComplaintPriority.CRITICAL, ComplaintStatus.IN_PROGRESS,
                "Pondy Bazaar, T. Nagar", "Ward 10, T. Nagar", 13.0405, 80.2370, 1, 1, -1, true, false
        )); // 17
        list.add(new DemoSpec(
                "Flickering sodium vapor lights along Tondiarpet High Road",
                "Five street fixtures intermittently cutting out, causing safety blindspots for evening traffic.",
                CivicLexicon.CAT_STREET_LIGHT, ComplaintPriority.LOW, ComplaintStatus.SUBMITTED,
                "High Road, Tondiarpet", "Ward 03, Tondiarpet", 13.1280, 80.2915, 6, 4, -1, false, false
        )); // 18
        list.add(new DemoSpec(
                "Transformer sparking intermittently during evening hours",
                "Pole mounted electrical transformer issuing loud pops and sparks on Industrial Estate Road.",
                CivicLexicon.CAT_STREET_LIGHT, ComplaintPriority.CRITICAL, ComplaintStatus.ASSIGNED,
                "Guindy Industrial Estate 3rd Cross", "Ward 11, Guindy", 13.0110, 80.2080, 2, 6, -1, true, false
        )); // 19
        list.add(new DemoSpec(
                "Ten consecutive non-functional LED lampposts in Gandhi Nagar",
                "Underground cable fault leaving residential street in total darkness.",
                CivicLexicon.CAT_STREET_LIGHT, ComplaintPriority.MEDIUM, ComplaintStatus.RESOLVED,
                "1st Cross Street, Gandhi Nagar", "Ward 13, Adyar", 13.0120, 80.2545, 18, 3, -1, true, true
        )); // 20
        list.add(new DemoSpec(
                "Overflowing commercial garbage dump blocking storm canal access",
                "Secondary waste collection bin overflowing with rotten vegetable matter into drainage basin.",
                CivicLexicon.CAT_GARBAGE, ComplaintPriority.HIGH, ComplaintStatus.RESOLUTION_SUBMITTED,
                "Ranganathan Street, T. Nagar", "Ward 10, T. Nagar", 13.0425, 80.2310, 3, 2, -1, true, true
        )); // 21
        list.add(new DemoSpec(
                "Illegal plastic waste dumping in vacant municipal plot",
                "Substantial volume of non-biodegradable packing material dumped adjacent to residential flats.",
                CivicLexicon.CAT_GARBAGE, ComplaintPriority.MEDIUM, ComplaintStatus.UNDER_REVIEW,
                "Dhandeeswaram Nagar, Velachery", "Ward 14, Velachery", 12.9790, 80.2195, 5, 5, -1, true, false
        )); // 22
        list.add(new DemoSpec(
                "Rotting organic waste pile emitting severe stench near market",
                "Uncollected municipal trash bins festering across from vegetable marketplace entrance.",
                CivicLexicon.CAT_GARBAGE, ComplaintPriority.HIGH, ComplaintStatus.IN_PROGRESS,
                "Subbarayan Street, Kodambakkam", "Ward 09, Kodambakkam", 13.0535, 80.2240, 2, 7, -1, true, false
        )); // 23
        list.add(new DemoSpec(
                "Uncollected residential trash bins accumulated for five days",
                "Solid waste compactor truck has not serviced street, bins overflowing onto road surface.",
                CivicLexicon.CAT_GARBAGE, ComplaintPriority.MEDIUM, ComplaintStatus.SUBMITTED,
                "Kutchery Road, Mylapore", "Ward 12, Mylapore", 13.0340, 80.2690, 1, 3, -1, false, false
        )); // 24
        list.add(new DemoSpec(
                "Debris and construction waste dumped on public sidewalk",
                "Private contractor left cement sacks, broken tiles, and debris on public right-of-way.",
                CivicLexicon.CAT_GARBAGE, ComplaintPriority.LOW, ComplaintStatus.REJECTED,
                "Shanti Colony, Anna Nagar", "Ward 08, Anna Nagar", 13.0880, 80.2120, 12, 4, -1, true, false
        )); // 25
        list.add(new DemoSpec(
                "Open manhole with missing cast iron cover on 100 Feet Road",
                "Deep open drain shaft posing immediate fatal hazard to motorists and pedestrians.",
                CivicLexicon.CAT_DRAINAGE, ComplaintPriority.CRITICAL, ComplaintStatus.IN_PROGRESS,
                "100 Feet Bypass Road, Velachery", "Ward 14, Velachery", 12.9830, 80.2150, 1, 2, -1, true, false
        )); // 26
        list.add(new DemoSpec(
                "Clogged stormdrain culvert causing severe street waterlogging",
                "Storm drain catch basin blocked with silt and debris, creating knee-deep stagnant water.",
                CivicLexicon.CAT_DRAINAGE, ComplaintPriority.HIGH, ComplaintStatus.REWORK_REQUESTED,
                "Solai Street, Tondiarpet", "Ward 03, Tondiarpet", 13.1230, 80.2880, 15, 6, -1, true, true
        )); // 27
        list.add(new DemoSpec(
                "Silt and plastic waste choked arterial rainwater canal",
                "Culvert conduit beneath bridge fully obstructed, impeding monsoon runoff toward river.",
                CivicLexicon.CAT_DRAINAGE, ComplaintPriority.HIGH, ComplaintStatus.ASSIGNED,
                "Arcot Road Canal Crossing", "Ward 09, Kodambakkam", 13.0505, 80.2185, 4, 4, -1, true, false
        )); // 28
        list.add(new DemoSpec(
                "Damaged catch basin grating allowing floodwater backflow",
                "Stormwater inlet iron grating bent out of frame, allowing street runoff to erode shoulder.",
                CivicLexicon.CAT_DRAINAGE, ComplaintPriority.MEDIUM, ComplaintStatus.RESOLVED,
                "Race Course Road, Guindy", "Ward 11, Guindy", 13.0040, 80.2050, 22, 1, -1, true, true
        )); // 29
        list.add(new DemoSpec(
                "Collapsed bus shelter roof structure following gusty winds",
                "Corrugated metal roofing peeled away and resting precariously on commuter bench.",
                CivicLexicon.CAT_PUBLIC_TRANSPORT, ComplaintPriority.HIGH, ComplaintStatus.REWORK_REQUESTED,
                "3rd Avenue Bus Stop, Anna Nagar", "Ward 08, Anna Nagar", 13.0860, 80.2170, 9, 3, -1, true, true
        )); // 30
        list.add(new DemoSpec(
                "Damaged commuter boarding shelter at MTC bus stop",
                "Structural iron support post rusted through at base, causing bus shelter canopy to lean.",
                CivicLexicon.CAT_PUBLIC_TRANSPORT, ComplaintPriority.MEDIUM, ComplaintStatus.SUBMITTED,
                "Luz Church Road, Mylapore", "Ward 12, Mylapore", 13.0380, 80.2640, 3, 5, -1, true, false
        )); // 31
        list.add(new DemoSpec(
                "Bus bay pavement heavily eroded creating hazardous drop-off",
                "Asphalt surface where city buses dock has worn away down to rubble sub-base.",
                CivicLexicon.CAT_PUBLIC_TRANSPORT, ComplaintPriority.HIGH, ComplaintStatus.RESOLUTION_SUBMITTED,
                "Panagal Park Bus Terminal", "Ward 10, T. Nagar", 13.0400, 80.2320, 6, 1, -1, true, true
        )); // 32
        list.add(new DemoSpec(
                "Missing transit signpost and shattered glass panel at bus stop",
                "Vandalized bus shelter glass scattered on waiting platform with route post uprooted.",
                CivicLexicon.CAT_PUBLIC_TRANSPORT, ComplaintPriority.LOW, ComplaintStatus.RESOLVED,
                "Velachery MRTS Station Bus Stop", "Ward 14, Velachery", 12.9770, 80.2210, 24, 7, -1, true, true
        )); // 33
        list.add(new DemoSpec(
                "Large fallen banyan tree branch blocking two traffic lanes",
                "Massive timber trunk snapped during midnight thunderstorm blocking arterial flow.",
                CivicLexicon.CAT_PARKS, ComplaintPriority.CRITICAL, ComplaintStatus.RESOLVED,
                "Canal Bank Road, Adyar", "Ward 13, Adyar", 13.0035, 80.2580, 19, 5, -1, true, true
        )); // 34
        list.add(new DemoSpec(
                "Overhanging heavy tree limbs dangerously close to high-tension electric wire",
                "Dry dead branches extending into 11kV distribution line with severe fire risk.",
                CivicLexicon.CAT_PARKS, ComplaintPriority.CRITICAL, ComplaintStatus.ASSIGNED,
                "Anna Salai Junction, Guindy", "Ward 11, Guindy", 13.0080, 80.2010, 2, 2, -1, true, false
        )); // 35
        list.add(new DemoSpec(
                "Uprooted avenue tree damaging municipal park fence",
                "Shallow root neem tree toppled across playground walking track and perimeter grill.",
                CivicLexicon.CAT_PARKS, ComplaintPriority.MEDIUM, ComplaintStatus.SUBMITTED,
                "Tower Park West Gate", "Ward 08, Anna Nagar", 13.0875, 80.2135, 1, 6, -1, true, false
        )); // 36
        list.add(new DemoSpec(
                "Overgrown shrubbery completely obstructing blind traffic turn",
                "Dense roadside bushes blocking driver sightlines at residential road intersection.",
                CivicLexicon.CAT_PARKS, ComplaintPriority.MEDIUM, ComplaintStatus.UNDER_REVIEW,
                "United India Colony, Kodambakkam", "Ward 09, Kodambakkam", 13.0550, 80.2260, 4, 8, -1, false, false
        )); // 37
        list.add(new DemoSpec(
                "Road cave-in near subway construction exit re-opened after temporary fill",
                "Subsurface trench settlement causing recurrence of deep road crater on bus corridor.",
                CivicLexicon.CAT_ROADS, ComplaintPriority.CRITICAL, ComplaintStatus.REOPENED,
                "1st Avenue, Anna Nagar East", "Ward 08, Anna Nagar", 13.0830, 80.2190, 25, 2, -1, true, true
        )); // 38
        list.add(new DemoSpec(
                "Request to paint private compound wall abutting street",
                "Resident requesting municipal workers to whitewash and repair private residential perimeter wall.",
                CivicLexicon.CAT_ROADS, ComplaintPriority.LOW, ComplaintStatus.REJECTED,
                "Arundale Street, Mylapore", "Ward 12, Mylapore", 13.0320, 80.2660, 11, 7, -1, false, false
        )); // 39

        return list;
    }
}
