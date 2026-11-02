package com.civicfix.ai.vision;

import com.civicfix.common.ApiResponse;
import com.civicfix.common.exception.ForbiddenException;
import com.civicfix.complaint.Complaint;
import com.civicfix.complaint.ComplaintPriority;
import com.civicfix.complaint.ComplaintRepository;
import com.civicfix.complaint.ComplaintService;
import com.civicfix.complaint.ComplaintStatus;
import com.civicfix.complaint.dto.ComplaintResponse;
import com.civicfix.complaint.dto.CreateComplaintRequest;
import com.civicfix.complaint.dto.PublicMapComplaintResponse;
import com.civicfix.features.FeaturesController;
import com.civicfix.features.dto.PublicFeaturesResponse;
import com.civicfix.security.UserPrincipal;
import com.civicfix.user.Role;
import com.civicfix.user.RoleName;
import com.civicfix.user.User;
import com.civicfix.user.UserRepository;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.datatype.jsr310.JavaTimeModule;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.http.ResponseEntity;

import java.math.BigDecimal;
import java.time.OffsetDateTime;
import java.util.Optional;
import java.util.Set;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.*;

class VisionRoleExposureIntegrationTest {

    private final ObjectMapper objectMapper = new ObjectMapper().registerModule(new JavaTimeModule());

    private User citizen1;
    private User citizen2;
    private User officer;
    private User supervisor;
    private User admin;
    private User worker;

    private UserPrincipal principalCitizen1;
    private UserPrincipal principalCitizen2;
    private UserPrincipal principalOfficer;
    private UserPrincipal principalSupervisor;
    private UserPrincipal principalAdmin;
    private UserPrincipal principalWorker;

    private Complaint testComplaint;

    @BeforeEach
    void setUp() {
        Role citizenRole = new Role(RoleName.CITIZEN);
        Role officerRole = new Role(RoleName.OFFICER);
        Role supervisorRole = new Role(RoleName.SUPERVISOR);
        Role adminRole = new Role(RoleName.ADMIN);
        Role workerRole = new Role(RoleName.WORKER);

        citizen1 = new User();
        citizen1.setId(UUID.randomUUID());
        citizen1.setEmail("citizen1@civicfix.local");
        citizen1.setFullName("Citizen One");
        citizen1.setRoles(Set.of(citizenRole));
        principalCitizen1 = new UserPrincipal(citizen1);

        citizen2 = new User();
        citizen2.setId(UUID.randomUUID());
        citizen2.setEmail("citizen2@civicfix.local");
        citizen2.setFullName("Citizen Two");
        citizen2.setRoles(Set.of(citizenRole));
        principalCitizen2 = new UserPrincipal(citizen2);

        officer = new User();
        officer.setId(UUID.randomUUID());
        officer.setEmail("officer@civicfix.local");
        officer.setFullName("Municipal Officer");
        officer.setRoles(Set.of(officerRole));
        principalOfficer = new UserPrincipal(officer);

        supervisor = new User();
        supervisor.setId(UUID.randomUUID());
        supervisor.setEmail("supervisor@civicfix.local");
        supervisor.setFullName("Department Supervisor");
        supervisor.setRoles(Set.of(supervisorRole));
        principalSupervisor = new UserPrincipal(supervisor);

        admin = new User();
        admin.setId(UUID.randomUUID());
        admin.setEmail("admin@civicfix.local");
        admin.setFullName("System Admin");
        admin.setRoles(Set.of(adminRole));
        principalAdmin = new UserPrincipal(admin);

        worker = new User();
        worker.setId(UUID.randomUUID());
        worker.setEmail("worker@civicfix.local");
        worker.setFullName("Field Technician");
        worker.setRoles(Set.of(workerRole));
        principalWorker = new UserPrincipal(worker);

        testComplaint = new Complaint();
        testComplaint.setId(UUID.randomUUID());
        testComplaint.setReferenceId("CF-2026-11223");
        testComplaint.setCitizen(citizen1);
        testComplaint.setTitle("Large broken road pothole");
        testComplaint.setDescription("Deep pothole damaging vehicles on Anna Salai");
        testComplaint.setCategory("ROADS");
        testComplaint.setPriority(ComplaintPriority.HIGH);
        testComplaint.setStatus(ComplaintStatus.SUBMITTED);
        testComplaint.setAddress("Anna Salai, Chennai");
        testComplaint.setWard("Ward 08");
        testComplaint.setLatitude(new BigDecimal("13.06040"));
        testComplaint.setLongitude(new BigDecimal("80.26420"));
        testComplaint.setVisionConsent(true);
        testComplaint.setVisionStatus("OK");
        testComplaint.setVisionCategory("ROADS");
        testComplaint.setVisionSeverity(4);
        testComplaint.setVisionConfidence(new BigDecimal("0.92"));
        testComplaint.setVisionReason("Severe asphalt depression observed in roadway.");
        testComplaint.setVisionModel("gemini-1.5-flash");
        testComplaint.setVisionAt(OffsetDateTime.now());
        testComplaint.setDisagreement(false);
        testComplaint.setFinalPrioritySource("VISION_ELEVATED");
    }

    @Test
    @DisplayName("Officer, Supervisor, and Admin see full vision details with clean model display name")
    void staffRolesSeeFullVisionData() throws Exception {
        UserPrincipal[] staffList = { principalOfficer, principalSupervisor, principalAdmin };

        for (UserPrincipal staff : staffList) {
            ComplaintResponse response = ComplaintResponse.fromEntity(testComplaint, staff);
            String json = objectMapper.writeValueAsString(response);
            JsonNode root = objectMapper.readTree(json);

            assertEquals("OK", root.path("visionStatus").asText());
            assertEquals(true, root.path("visionConsent").asBoolean());
            assertEquals("ROADS", root.path("visionCategory").asText());
            assertEquals(4, root.path("visionSeverity").asInt());
            assertEquals(0.92, root.path("visionConfidence").asDouble(), 0.001);
            assertEquals("Severe asphalt depression observed in roadway.", root.path("visionReason").asText());
            assertEquals("Google Gemini", root.path("visionModel").asText(), "Vision model must display formatted provider name");
            assertFalse(root.path("visionAt").asText().isBlank());
            assertFalse(root.path("disagreement").asBoolean());
            assertEquals("VISION_ELEVATED", root.path("finalPrioritySource").asText());
        }
    }

    @Test
    @DisplayName("Staff sees visionSkipReason when vision status is SKIPPED")
    void staffSeesVisionSkipReasonWhenSkipped() throws Exception {
        testComplaint.setVisionStatus("SKIPPED");
        testComplaint.setVisionReason("WebP image format skipped to prevent unstripped EXIF metadata leakage");

        ComplaintResponse response = ComplaintResponse.fromEntity(testComplaint, principalOfficer);
        String json = objectMapper.writeValueAsString(response);
        JsonNode root = objectMapper.readTree(json);

        assertEquals("SKIPPED", root.path("visionStatus").asText());
        assertEquals("WebP image format skipped to prevent unstripped EXIF metadata leakage", root.path("visionSkipReason").asText());
    }

    @Test
    @DisplayName("xAI Grok vision model formats correctly to 'xAI Grok'")
    void xaiGrokModelFormatsDisplayName() {
        testComplaint.setVisionModel("grok-2-vision-1212");
        ComplaintResponse response = ComplaintResponse.fromEntity(testComplaint, principalOfficer);
        assertEquals("xAI Grok", response.getVisionModel());
    }

    @Test
    @DisplayName("Owning citizen sees strictly ONLY visionStatus and visionConsent; no scores, category, reason or model")
    void owningCitizenSeesOnlyStatusAndConsent() throws Exception {
        ComplaintResponse response = ComplaintResponse.fromEntity(testComplaint, principalCitizen1);
        String json = objectMapper.writeValueAsString(response);
        JsonNode root = objectMapper.readTree(json);

        assertTrue(root.has("visionStatus"), "Owning citizen should see visionStatus");
        assertEquals("OK", root.path("visionStatus").asText());

        assertTrue(root.has("visionConsent"), "Owning citizen should see visionConsent");
        assertTrue(root.path("visionConsent").asBoolean());

        // Strictly verify protected vision fields are absent from JSON payload
        assertFalse(root.has("visionCategory"), "Owning citizen must NEVER receive visionCategory");
        assertFalse(root.has("visionSeverity"), "Owning citizen must NEVER receive visionSeverity");
        assertFalse(root.has("visionConfidence"), "Owning citizen must NEVER receive visionConfidence");
        assertFalse(root.has("visionReason"), "Owning citizen must NEVER receive visionReason");
        assertFalse(root.has("visionModel"), "Owning citizen must NEVER receive visionModel");
        assertFalse(root.has("disagreement"), "Owning citizen must NEVER receive disagreement flag");
        assertFalse(root.has("finalPrioritySource"), "Owning citizen must NEVER receive finalPrioritySource");
        assertFalse(root.has("visionSkipReason"), "Owning citizen must NEVER receive visionSkipReason");
    }

    @Test
    @DisplayName("Workers receive zero vision fields in their response payload")
    void workerReceivesNoVisionFields() throws Exception {
        testComplaint.setAssignedWorker(worker);
        ComplaintResponse response = ComplaintResponse.fromEntity(testComplaint, principalWorker);
        String json = objectMapper.writeValueAsString(response);
        JsonNode root = objectMapper.readTree(json);

        assertFalse(root.has("visionStatus"), "Worker must not receive visionStatus");
        assertFalse(root.has("visionConsent"), "Worker must not receive visionConsent");
        assertFalse(root.has("visionCategory"), "Worker must not receive visionCategory");
        assertFalse(root.has("visionSeverity"), "Worker must not receive visionSeverity");
        assertFalse(root.has("visionConfidence"), "Worker must not receive visionConfidence");
        assertFalse(root.has("visionReason"), "Worker must not receive visionReason");
        assertFalse(root.has("visionModel"), "Worker must not receive visionModel");
        assertFalse(root.has("visionAt"), "Worker must not receive visionAt");
        assertFalse(root.has("disagreement"), "Worker must not receive disagreement");
        assertFalse(root.has("finalPrioritySource"), "Worker must not receive finalPrioritySource");
        assertFalse(root.has("visionSkipReason"), "Worker must not receive visionSkipReason");
    }

    @Test
    @DisplayName("Public map DTO has zero vision fields in JSON output")
    void publicMapDtoHasZeroVisionFields() throws Exception {
        PublicMapComplaintResponse mapDto = PublicMapComplaintResponse.fromEntity(testComplaint, 1);
        String json = objectMapper.writeValueAsString(mapDto);
        JsonNode root = objectMapper.readTree(json);

        assertFalse(root.has("visionStatus"));
        assertFalse(root.has("visionConsent"));
        assertFalse(root.has("visionCategory"));
        assertFalse(root.has("visionSeverity"));
        assertFalse(root.has("visionConfidence"));
        assertFalse(root.has("visionReason"));
        assertFalse(root.has("visionModel"));
        assertFalse(root.has("visionAt"));
        assertFalse(root.has("disagreement"));
        assertFalse(root.has("finalPrioritySource"));
        assertFalse(root.has("visionSkipReason"));
    }

    @Test
    @DisplayName("Non-owning citizen is forbidden from viewing another citizen's complaint")
    void nonOwningCitizenCannotViewOthersComplaint() {
        // Mock repositories
        ComplaintRepository complaintRepo = (ComplaintRepository) java.lang.reflect.Proxy.newProxyInstance(
                getClass().getClassLoader(),
                new Class<?>[]{ComplaintRepository.class},
                (proxy, method, args) -> {
                    if ("findById".equals(method.getName()) || "findByReferenceIdIgnoreCase".equals(method.getName())) {
                        return Optional.of(testComplaint);
                    }
                    return null;
                }
        );

        UserRepository userRepo = (UserRepository) java.lang.reflect.Proxy.newProxyInstance(
                getClass().getClassLoader(),
                new Class<?>[]{UserRepository.class},
                (proxy, method, args) -> Optional.of(citizen2)
        );

        ComplaintService service = new ComplaintService(complaintRepo, null, null, null, userRepo, null, null);

        ForbiddenException ex = assertThrows(ForbiddenException.class, () ->
                service.getComplaintById(testComplaint.getId().toString(), principalCitizen2)
        );
        assertTrue(ex.getMessage().contains("Private record"));
    }

    @Test
    @DisplayName("GET /api/public/features returns visionEnabled=false without provider name when disabled")
    void publicFeaturesWhenDisabled() throws Exception {
        VisionTriageProperties props = new VisionTriageProperties();
        props.setEnabled(false);
        props.setProvider("gemini");
        props.setGoogleApiKey("secret-key");

        FeaturesController controller = new FeaturesController(props);
        ResponseEntity<ApiResponse<PublicFeaturesResponse>> response = controller.getPublicFeatures();

        assertNotNull(response.getBody());
        PublicFeaturesResponse data = response.getBody().getData();
        assertFalse(data.isVisionEnabled());
        assertNull(data.getVisionProviderName());

        String json = objectMapper.writeValueAsString(data);
        JsonNode root = objectMapper.readTree(json);
        assertFalse(root.path("visionEnabled").asBoolean());
        assertFalse(root.has("visionProviderName"), "Provider name must be omitted when vision is disabled");
        assertFalse(json.contains("secret-key"), "Secrets must never leak");
    }

    @Test
    @DisplayName("GET /api/public/features returns visionEnabled=true with display name when enabled")
    void publicFeaturesWhenEnabled() throws Exception {
        VisionTriageProperties props = new VisionTriageProperties();
        props.setEnabled(true);
        props.setProvider("gemini");

        FeaturesController controller = new FeaturesController(props);
        ResponseEntity<ApiResponse<PublicFeaturesResponse>> response = controller.getPublicFeatures();

        assertNotNull(response.getBody());
        PublicFeaturesResponse data = response.getBody().getData();
        assertTrue(data.isVisionEnabled());
        assertEquals("Google Gemini", data.getVisionProviderName());

        props.setProvider("xai");
        response = controller.getPublicFeatures();
        assertEquals("xAI Grok", response.getBody().getData().getVisionProviderName());
    }

    @Test
    @DisplayName("Creating complaint ignores visionConsent if vision is disabled on server")
    void createComplaintIgnoresConsentWhenVisionDisabled() {
        VisionTriageProperties props = new VisionTriageProperties();
        props.setEnabled(false); // DISABLED on server

        ComplaintRepository complaintRepo = (ComplaintRepository) java.lang.reflect.Proxy.newProxyInstance(
                getClass().getClassLoader(),
                new Class<?>[]{ComplaintRepository.class},
                (proxy, method, args) -> {
                    if ("findByReferenceIdIgnoreCase".equals(method.getName())) {
                        return Optional.empty();
                    }
                    if ("save".equals(method.getName())) {
                        Complaint c = (Complaint) args[0];
                        if (c.getId() == null) {
                            c.setId(UUID.randomUUID());
                        }
                        return c;
                    }
                    return null;
                }
        );

        UserRepository userRepo = (UserRepository) java.lang.reflect.Proxy.newProxyInstance(
                getClass().getClassLoader(),
                new Class<?>[]{UserRepository.class},
                (proxy, method, args) -> Optional.of(citizen1)
        );

        com.civicfix.audit.AuditLogRepository auditRepo = (com.civicfix.audit.AuditLogRepository) java.lang.reflect.Proxy.newProxyInstance(
                getClass().getClassLoader(),
                new Class<?>[]{com.civicfix.audit.AuditLogRepository.class},
                (proxy, method, args) -> null
        );
        com.civicfix.audit.AuditService auditService = new com.civicfix.audit.AuditService(auditRepo);

        ComplaintService service = new ComplaintService(
                complaintRepo, null, null, null, userRepo, auditService, null,
                null, null, null, null, props
        );

        CreateComplaintRequest req = new CreateComplaintRequest();
        req.setTitle("Pothole on Main Road");
        req.setDescription("Dangerous road hole near signal");
        req.setCategory("ROADS");
        req.setAddress("Main Road, Chennai");
        req.setLatitude(new BigDecimal("13.0600"));
        req.setLongitude(new BigDecimal("80.2600"));
        req.setVisionConsent(true); // Citizen passed true

        ComplaintResponse created = service.createComplaint(req, principalCitizen1, "127.0.0.1");

        // Stored consent must be forced to false
        assertFalse(created.getVisionConsent(), "Server must ignore visionConsent=true when vision is disabled");
    }
}
