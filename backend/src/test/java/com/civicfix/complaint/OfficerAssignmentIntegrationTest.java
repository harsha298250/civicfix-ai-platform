package com.civicfix.complaint;

import com.civicfix.auth.dto.LoginRequest;
import com.civicfix.complaint.dto.AssignComplaintRequest;
import com.civicfix.complaint.dto.ConfirmResolutionRequest;
import com.civicfix.complaint.dto.CreateComplaintRequest;
import com.civicfix.storage.TestImageHelper;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.mock.web.MockHttpSession;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.MvcResult;

import com.civicfix.complaint.dto.UpdateStatusRequest;
import org.springframework.mock.web.MockMultipartFile;

import java.math.BigDecimal;
import java.util.UUID;

import static org.hamcrest.Matchers.*;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.csrf;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.multipart;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
class OfficerAssignmentIntegrationTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private ObjectMapper objectMapper;

    private static final String CITIZEN_EMAIL = "alex.m@citizen.org";
    private static final String OFFICER_EMAIL = "elena.vance@metro.gov";
    private static final String WORKER_EMAIL = "marcus.chen@fieldops.gov";
    private static final String DEFAULT_PASSWORD = "CivicSecure#2026!";

    private static final UUID MARCUS_CHEN_ID = UUID.fromString("00000000-0000-0000-0000-000000000003");
    private static final UUID ALEX_MORGAN_CITIZEN_ID = UUID.fromString("00000000-0000-0000-0000-000000000001");
    private static final UUID NON_EXISTENT_WORKER_ID = UUID.fromString("11111111-2222-3333-4444-555555555555");

    private MockHttpSession loginAs(String email, String password) throws Exception {
        LoginRequest req = new LoginRequest(email, password);
        MvcResult result = mockMvc.perform(post("/api/auth/login")
                        .with(csrf())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(req)))
                .andExpect(status().isOk())
                .andReturn();
        return (MockHttpSession) result.getRequest().getSession();
    }

    private String createTestComplaint(MockHttpSession citizenSession, String title) throws Exception {
        CreateComplaintRequest createReq = new CreateComplaintRequest();
        createReq.setTitle(title);
        createReq.setDescription("Hazardous roadway defect requiring prompt municipal attention.");
        createReq.setCategory("Pothole & Road Damage");
        createReq.setPriority(ComplaintPriority.HIGH);
        createReq.setAddress("4th Main Road, Anna Nagar West, Chennai");
        createReq.setWard("Ward 08");
        createReq.setLatitude(new BigDecimal("13.0861000"));
        createReq.setLongitude(new BigDecimal("80.2162000"));

        MvcResult result = mockMvc.perform(post("/api/complaints")
                        .with(csrf())
                        .session(citizenSession)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(createReq)))
                .andExpect(status().isCreated())
                .andReturn();

        JsonNode json = objectMapper.readTree(result.getResponse().getContentAsString());
        return json.get("data").get("id").asText();
    }

    @Test
    @DisplayName("Officer accesses complaint queue with full municipal grid visibility")
    void officerCanAccessComplaintQueue() throws Exception {
        MockHttpSession officerSession = loginAs(OFFICER_EMAIL, DEFAULT_PASSWORD);

        mockMvc.perform(get("/api/complaints")
                        .session(officerSession))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success", is(true)))
                .andExpect(jsonPath("$.data", notNullValue()));
    }

    @Test
    @DisplayName("Unauthenticated user cannot access complaints queue")
    void unauthenticatedUserCannotAccessComplaintQueue() throws Exception {
        mockMvc.perform(get("/api/complaints"))
                .andExpect(status().isUnauthorized());
    }

    @Test
    @DisplayName("Municipal Officer successfully assigns verified field worker; persists status ASSIGNED and audit history")
    void officerValidAssignmentPersists() throws Exception {
        MockHttpSession citizenSession = loginAs(CITIZEN_EMAIL, DEFAULT_PASSWORD);
        String complaintId = createTestComplaint(citizenSession, "Deep crater on 4th Main Road");

        MockHttpSession officerSession = loginAs(OFFICER_EMAIL, DEFAULT_PASSWORD);

        AssignComplaintRequest assignReq = new AssignComplaintRequest();
        assignReq.setWorkerId(MARCUS_CHEN_ID);
        assignReq.setNotes("Dispatched Marcus Chen with Rapid Asphalt Compactor Rig.");

        // Officer executes assignment
        mockMvc.perform(post("/api/complaints/" + complaintId + "/assign")
                        .with(csrf())
                        .session(officerSession)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(assignReq)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success", is(true)))
                .andExpect(jsonPath("$.data.status", is("ASSIGNED")))
                .andExpect(jsonPath("$.data.assignedWorker.id", is(MARCUS_CHEN_ID.toString())))
                .andExpect(jsonPath("$.data.assignedWorker.name", is("Marcus Chen")))
                .andExpect(jsonPath("$.data.assignedOfficer.name", is("Elena Vance")));

        // Verify status history audit entry was persisted in PostgreSQL
        mockMvc.perform(get("/api/complaints/" + complaintId + "/history")
                        .session(officerSession))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data", hasSize(greaterThanOrEqualTo(2))))
                .andExpect(jsonPath("$.data[?(@.newStatus == 'ASSIGNED')].changedByName", hasItem("Elena Vance")))
                .andExpect(jsonPath("$.data[?(@.newStatus == 'ASSIGNED')].notes",
                        hasItem("Dispatched Marcus Chen with Rapid Asphalt Compactor Rig.")));
    }

    @Test
    @DisplayName("Citizen cannot assign workers (must return 403 Forbidden)")
    void citizenCannotAssignWorker() throws Exception {
        MockHttpSession citizenSession = loginAs(CITIZEN_EMAIL, DEFAULT_PASSWORD);
        String complaintId = createTestComplaint(citizenSession, "Citizen assignment attempt test");

        AssignComplaintRequest assignReq = new AssignComplaintRequest();
        assignReq.setWorkerId(MARCUS_CHEN_ID);
        assignReq.setNotes("Citizen attempting unauthorized dispatch.");

        mockMvc.perform(post("/api/complaints/" + complaintId + "/assign")
                        .with(csrf())
                        .session(citizenSession)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(assignReq)))
                .andExpect(status().isForbidden());
    }

    @Test
    @DisplayName("Unauthenticated user cannot assign workers (must return 401 Unauthorized)")
    void unauthenticatedUserCannotAssignWorker() throws Exception {
        AssignComplaintRequest assignReq = new AssignComplaintRequest();
        assignReq.setWorkerId(MARCUS_CHEN_ID);
        assignReq.setNotes("Anonymous assignment attempt.");

        mockMvc.perform(post("/api/complaints/CF-2026-00001/assign")
                        .with(csrf())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(assignReq)))
                .andExpect(status().isUnauthorized());
    }

    @Test
    @DisplayName("Assigning non-existent worker UUID returns 404 Not Found")
    void officerAssigningInvalidWorkerReturnsNotFound() throws Exception {
        MockHttpSession citizenSession = loginAs(CITIZEN_EMAIL, DEFAULT_PASSWORD);
        String complaintId = createTestComplaint(citizenSession, "Missing worker assignment test");

        MockHttpSession officerSession = loginAs(OFFICER_EMAIL, DEFAULT_PASSWORD);

        AssignComplaintRequest assignReq = new AssignComplaintRequest();
        assignReq.setWorkerId(NON_EXISTENT_WORKER_ID);
        assignReq.setNotes("Assigning non-existent technician.");

        mockMvc.perform(post("/api/complaints/" + complaintId + "/assign")
                        .with(csrf())
                        .session(officerSession)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(assignReq)))
                .andExpect(status().isNotFound())
                .andExpect(jsonPath("$.error", is("Not Found")))
                .andExpect(jsonPath("$.message", containsString("Target field worker not found.")));
    }

    @Test
    @DisplayName("Assigning user without WORKER role returns 400 Bad Request")
    void officerAssigningNonWorkerUserReturnsBadRequest() throws Exception {
        MockHttpSession citizenSession = loginAs(CITIZEN_EMAIL, DEFAULT_PASSWORD);
        String complaintId = createTestComplaint(citizenSession, "Invalid role worker test");

        MockHttpSession officerSession = loginAs(OFFICER_EMAIL, DEFAULT_PASSWORD);

        AssignComplaintRequest assignReq = new AssignComplaintRequest();
        // Target is Alex Morgan (CITIZEN, not WORKER)
        assignReq.setWorkerId(ALEX_MORGAN_CITIZEN_ID);
        assignReq.setNotes("Assigning citizen instead of worker.");

        mockMvc.perform(post("/api/complaints/" + complaintId + "/assign")
                        .with(csrf())
                        .session(officerSession)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(assignReq)))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.error", is("Bad Request")))
                .andExpect(jsonPath("$.message", containsString("Assigned user must hold the WORKER persona.")));
    }

    @Test
    @DisplayName("Step 4D: Officer verifies submitted resolution and transitions complaint to RESOLVED")
    void officerCanVerifyAndApproveSubmittedResolution() throws Exception {
        MockHttpSession citizenSession = loginAs(CITIZEN_EMAIL, DEFAULT_PASSWORD);
        MockHttpSession officerSession = loginAs(OFFICER_EMAIL, DEFAULT_PASSWORD);
        MockHttpSession workerSession = loginAs(WORKER_EMAIL, DEFAULT_PASSWORD);

        // 1. Citizen reports issue
        String complaintId = createTestComplaint(citizenSession, "Asphalt Sinkhole at 1st Main");

        // 2. Officer dispatches to Marcus Chen
        AssignComplaintRequest assignReq = new AssignComplaintRequest();
        assignReq.setWorkerId(MARCUS_CHEN_ID);
        assignReq.setNotes("High priority dispatch");
        mockMvc.perform(post("/api/complaints/" + complaintId + "/assign")
                        .with(csrf())
                        .session(officerSession)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(assignReq)))
                .andExpect(status().isOk());

        // 3. Worker starts work
        UpdateStatusRequest startWorkReq = new UpdateStatusRequest();
        startWorkReq.setStatus(ComplaintStatus.IN_PROGRESS);
        startWorkReq.setNotes("Crew arrived on scene with equipment.");
        mockMvc.perform(post("/api/complaints/" + complaintId + "/status")
                        .with(csrf())
                        .session(workerSession)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(startWorkReq)))
                .andExpect(status().isOk());

        // 4. Worker submits repair evidence
        mockMvc.perform(EvidenceTestSupport.validEvidenceRequest(
                        complaintId,
                        new BigDecimal("13.0861000"),
                        new BigDecimal("80.2162000"),
                        "Excavated sinkhole, filled with aggregate and hot-mix asphalt.")
                        .session(workerSession))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.status", is("RESOLUTION_SUBMITTED")));

        // 5. Officer inspects queue and evidence, then approves resolution (transitions to PENDING_CITIZEN_CONFIRMATION)
        UpdateStatusRequest approvalReq = new UpdateStatusRequest();
        approvalReq.setStatus(ComplaintStatus.PENDING_CITIZEN_CONFIRMATION);
        approvalReq.setNotes("On-site compaction verified via dual photo proof.");

        mockMvc.perform(post("/api/complaints/" + complaintId + "/status")
                        .with(csrf())
                        .session(officerSession)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(approvalReq)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.status", is("PENDING_CITIZEN_CONFIRMATION")));

        // 6. Citizen confirms resolution
        ConfirmResolutionRequest confirmReq = new ConfirmResolutionRequest();
        confirmReq.setNotes("Site inspected; repair verified and complete.");

        mockMvc.perform(post("/api/complaints/" + complaintId + "/confirm-resolution")
                        .with(csrf())
                        .session(citizenSession)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(confirmReq)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.status", is("RESOLVED")));

        // 7. Citizen verifies resulting status and audit history
        mockMvc.perform(get("/api/complaints/" + complaintId)
                        .session(citizenSession))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.status", is("RESOLVED")));

        mockMvc.perform(get("/api/complaints/" + complaintId + "/history")
                        .session(citizenSession))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data", hasSize(greaterThanOrEqualTo(5))));
    }

    @Test
    @DisplayName("Step 4D: Officer returns submitted resolution for rework with mandatory reason")
    void officerCanReturnSubmittedResolutionForReworkWithReason() throws Exception {
        MockHttpSession citizenSession = loginAs(CITIZEN_EMAIL, DEFAULT_PASSWORD);
        MockHttpSession officerSession = loginAs(OFFICER_EMAIL, DEFAULT_PASSWORD);
        MockHttpSession workerSession = loginAs(WORKER_EMAIL, DEFAULT_PASSWORD);

        String complaintId = createTestComplaint(citizenSession, "Uneven Curb Grading Task");

        AssignComplaintRequest assignReq = new AssignComplaintRequest();
        assignReq.setWorkerId(MARCUS_CHEN_ID);
        assignReq.setNotes("Assign for grading");
        mockMvc.perform(post("/api/complaints/" + complaintId + "/assign")
                        .with(csrf())
                        .session(officerSession)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(assignReq)))
                .andExpect(status().isOk());

        UpdateStatusRequest startReq = new UpdateStatusRequest();
        startReq.setStatus(ComplaintStatus.IN_PROGRESS);
        startReq.setNotes("Work initiated");
        mockMvc.perform(post("/api/complaints/" + complaintId + "/status")
                        .with(csrf())
                        .session(workerSession)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(startReq)))
                .andExpect(status().isOk());

        mockMvc.perform(EvidenceTestSupport.validEvidenceRequest(
                        complaintId,
                        new BigDecimal("13.0861000"),
                        new BigDecimal("80.2162000"),
                        "Grading finished")
                        .session(workerSession))
                .andExpect(status().isOk());

        // Officer returns for rework
        UpdateStatusRequest reworkReq = new UpdateStatusRequest();
        reworkReq.setStatus(ComplaintStatus.REWORK_REQUESTED);
        reworkReq.setNotes("Edge not flush with sidewalk; re-seal and compact curb joint.");

        mockMvc.perform(post("/api/complaints/" + complaintId + "/status")
                        .with(csrf())
                        .session(officerSession)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(reworkReq)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.status", is("REWORK_REQUESTED")));

        // Worker can resume work from REWORK_REQUESTED
        UpdateStatusRequest resumeReq = new UpdateStatusRequest();
        resumeReq.setStatus(ComplaintStatus.IN_PROGRESS);
        resumeReq.setNotes("Resuming work to address edge grading rework.");

        mockMvc.perform(post("/api/complaints/" + complaintId + "/status")
                        .with(csrf())
                        .session(workerSession)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(resumeReq)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.status", is("IN_PROGRESS")));
    }

    @Test
    @DisplayName("Step 4D: Officer rework request without reason is rejected with 400 Bad Request")
    void officerReworkRequestWithoutReasonIsRejected() throws Exception {
        MockHttpSession citizenSession = loginAs(CITIZEN_EMAIL, DEFAULT_PASSWORD);
        MockHttpSession officerSession = loginAs(OFFICER_EMAIL, DEFAULT_PASSWORD);
        MockHttpSession workerSession = loginAs(WORKER_EMAIL, DEFAULT_PASSWORD);

        String complaintId = createTestComplaint(citizenSession, "Rework Reason Validation Task");

        AssignComplaintRequest assignReq = new AssignComplaintRequest();
        assignReq.setWorkerId(MARCUS_CHEN_ID);
        assignReq.setNotes("Assign");
        mockMvc.perform(post("/api/complaints/" + complaintId + "/assign")
                        .with(csrf())
                        .session(officerSession)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(assignReq)))
                .andExpect(status().isOk());

        UpdateStatusRequest startReq = new UpdateStatusRequest();
        startReq.setStatus(ComplaintStatus.IN_PROGRESS);
        startReq.setNotes("Started");
        mockMvc.perform(post("/api/complaints/" + complaintId + "/status")
                        .with(csrf())
                        .session(workerSession)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(startReq)))
                .andExpect(status().isOk());

        mockMvc.perform(EvidenceTestSupport.validEvidenceRequest(
                        complaintId,
                        new BigDecimal("13.0861000"),
                        new BigDecimal("80.2162000"),
                        "Submitted")
                        .session(workerSession))
                .andExpect(status().isOk());

        // Officer tries rework with blank notes
        UpdateStatusRequest emptyNotesReq = new UpdateStatusRequest();
        emptyNotesReq.setStatus(ComplaintStatus.REWORK_REQUESTED);
        emptyNotesReq.setNotes("   ");

        mockMvc.perform(post("/api/complaints/" + complaintId + "/status")
                        .with(csrf())
                        .session(officerSession)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(emptyNotesReq)))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.message", containsString("meaningful reason is required")));
    }

    @Test
    @DisplayName("Step 4D: Workers and citizens cannot transition complaints to RESOLVED")
    void workerAndCitizenCannotPerformOfficerSignOff() throws Exception {
        MockHttpSession citizenSession = loginAs(CITIZEN_EMAIL, DEFAULT_PASSWORD);
        MockHttpSession officerSession = loginAs(OFFICER_EMAIL, DEFAULT_PASSWORD);
        MockHttpSession workerSession = loginAs(WORKER_EMAIL, DEFAULT_PASSWORD);

        String complaintId = createTestComplaint(citizenSession, "Role Boundary Verification Task");

        AssignComplaintRequest assignReq = new AssignComplaintRequest();
        assignReq.setWorkerId(MARCUS_CHEN_ID);
        assignReq.setNotes("Assign");
        mockMvc.perform(post("/api/complaints/" + complaintId + "/assign")
                        .with(csrf())
                        .session(officerSession)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(assignReq)))
                .andExpect(status().isOk());

        UpdateStatusRequest startReq = new UpdateStatusRequest();
        startReq.setStatus(ComplaintStatus.IN_PROGRESS);
        startReq.setNotes("Started");
        mockMvc.perform(post("/api/complaints/" + complaintId + "/status")
                        .with(csrf())
                        .session(workerSession)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(startReq)))
                .andExpect(status().isOk());

        mockMvc.perform(EvidenceTestSupport.validEvidenceRequest(
                        complaintId,
                        new BigDecimal("13.0861000"),
                        new BigDecimal("80.2162000"),
                        "Ready for sign-off")
                        .session(workerSession))
                .andExpect(status().isOk());

        // Worker attempts approval to PENDING_CITIZEN_CONFIRMATION -> Forbidden
        UpdateStatusRequest signOffReq = new UpdateStatusRequest();
        signOffReq.setStatus(ComplaintStatus.PENDING_CITIZEN_CONFIRMATION);
        signOffReq.setNotes("Worker self-signing approval");

        mockMvc.perform(post("/api/complaints/" + complaintId + "/status")
                        .with(csrf())
                        .session(workerSession)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(signOffReq)))
                .andExpect(status().isForbidden());

        // Citizen attempts approval to PENDING_CITIZEN_CONFIRMATION -> Forbidden
        mockMvc.perform(post("/api/complaints/" + complaintId + "/status")
                        .with(csrf())
                        .session(citizenSession)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(signOffReq)))
                .andExpect(status().isForbidden());

        // Direct resolve attempt -> Forbidden (A2 rule)
        UpdateStatusRequest directResolveReq = new UpdateStatusRequest();
        directResolveReq.setStatus(ComplaintStatus.RESOLVED);
        directResolveReq.setNotes("Direct resolve attempt");

        mockMvc.perform(post("/api/complaints/" + complaintId + "/status")
                        .with(csrf())
                        .session(workerSession)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(directResolveReq)))
                .andExpect(status().isForbidden());
    }
}
