package com.civicfix.complaint;

import com.civicfix.auth.dto.LoginRequest;
import com.civicfix.auth.dto.RegisterCitizenRequest;
import com.civicfix.complaint.dto.AddNoteRequest;
import com.civicfix.complaint.dto.AssignComplaintRequest;
import com.civicfix.complaint.dto.CreateComplaintRequest;
import com.civicfix.complaint.dto.UpdateStatusRequest;
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

import java.math.BigDecimal;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.*;
import static org.hamcrest.Matchers.*;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.csrf;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.multipart;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import org.springframework.mock.web.MockMultipartFile;
import com.civicfix.storage.TestImageHelper;

@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
class WorkerTaskIntegrationTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private ObjectMapper objectMapper;

    private static final String CITIZEN_EMAIL = "alex.m@citizen.org";
    private static final String OFFICER_EMAIL = "elena.vance@metro.gov";
    private static final String WORKER_EMAIL = "marcus.chen@fieldops.gov";
    private static final String DEFAULT_PASSWORD = "CivicSecure#2026!";
    private static final UUID MARCUS_CHEN_ID = UUID.fromString("00000000-0000-0000-0000-000000000003");

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
        createReq.setDescription("Hazardous asphalt crater requiring rapid patching.");
        createReq.setCategory("ROADS");
        createReq.setPriority(ComplaintPriority.HIGH);
        createReq.setAddress("5th Cross Road, Anna Nagar, Chennai");
        createReq.setWard("Ward 08");
        createReq.setLatitude(new BigDecimal("13.0845000"));
        createReq.setLongitude(new BigDecimal("80.2155000"));

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
    @DisplayName("Authenticated worker can retrieve their own assigned tasks list")
    void workerCanRetrieveAssignedTasks() throws Exception {
        MockHttpSession citizenSession = loginAs(CITIZEN_EMAIL, DEFAULT_PASSWORD);
        MockHttpSession officerSession = loginAs(OFFICER_EMAIL, DEFAULT_PASSWORD);
        MockHttpSession workerSession = loginAs(WORKER_EMAIL, DEFAULT_PASSWORD);

        // 1. Create complaint and assign to Marcus Chen
        String complaintId = createTestComplaint(citizenSession, "Pothole for Worker Assignment Test");
        AssignComplaintRequest assignReq = new AssignComplaintRequest();
        assignReq.setWorkerId(MARCUS_CHEN_ID);
        assignReq.setNotes("Dispatched Marcus Chen with Rapid Asphalt Compactor Rig.");

        mockMvc.perform(post("/api/complaints/" + complaintId + "/assign")
                        .with(csrf())
                        .session(officerSession)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(assignReq)))
                .andExpect(status().isOk());

        // 2. Marcus Chen queries assigned task queue
        mockMvc.perform(get("/api/complaints")
                        .session(workerSession))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success", is(true)))
                .andExpect(jsonPath("$.data.content", not(empty())))
                .andExpect(jsonPath("$.data.content[?(@.id == '" + complaintId + "')].status", hasItem("ASSIGNED")));
    }

    @Test
    @DisplayName("Worker cannot see unassigned complaints in their task list")
    void workerCannotSeeUnassignedComplaintsInTaskList() throws Exception {
        MockHttpSession citizenSession = loginAs(CITIZEN_EMAIL, DEFAULT_PASSWORD);
        MockHttpSession workerSession = loginAs(WORKER_EMAIL, DEFAULT_PASSWORD);

        // Create an unassigned complaint
        String unassignedId = createTestComplaint(citizenSession, "Unassigned Citizen Complaint");

        // Worker queries assigned tasks: unassigned ticket must NOT be present
        mockMvc.perform(get("/api/complaints")
                        .session(workerSession))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.content[?(@.id == '" + unassignedId + "')]", empty()));
    }

    @Test
    @DisplayName("Worker can retrieve assigned task details and audit history")
    void workerCanRetrieveAssignedTaskDetails() throws Exception {
        MockHttpSession citizenSession = loginAs(CITIZEN_EMAIL, DEFAULT_PASSWORD);
        MockHttpSession officerSession = loginAs(OFFICER_EMAIL, DEFAULT_PASSWORD);
        MockHttpSession workerSession = loginAs(WORKER_EMAIL, DEFAULT_PASSWORD);

        String complaintId = createTestComplaint(citizenSession, "Assigned Task Details Test");
        AssignComplaintRequest assignReq = new AssignComplaintRequest();
        assignReq.setWorkerId(MARCUS_CHEN_ID);
        assignReq.setNotes("Dispatched to Marcus Chen.");

        MvcResult assignResult = mockMvc.perform(post("/api/complaints/" + complaintId + "/assign")
                        .with(csrf())
                        .session(officerSession)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(assignReq)))
                .andExpect(status().isOk())
                .andReturn();

        JsonNode assignJson = objectMapper.readTree(assignResult.getResponse().getContentAsString());
        String refId = assignJson.get("data").get("referenceId").asText();

        // Retrieve by UUID
        mockMvc.perform(get("/api/complaints/" + complaintId).session(workerSession))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.id", is(complaintId)))
                .andExpect(jsonPath("$.data.status", is("ASSIGNED")))
                .andExpect(jsonPath("$.data.assignedWorker.name", is("Marcus Chen")));

        // Retrieve by Reference ID
        mockMvc.perform(get("/api/complaints/" + refId).session(workerSession))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.referenceId", is(refId)));

        // Retrieve audit history
        mockMvc.perform(get("/api/complaints/" + complaintId + "/history").session(workerSession))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data", hasSize(greaterThanOrEqualTo(2))));
    }

    @Test
    @DisplayName("Worker cannot retrieve task details of an unassigned complaint (403 Forbidden)")
    void workerCannotRetrieveUnassignedTaskDetails() throws Exception {
        MockHttpSession citizenSession = loginAs(CITIZEN_EMAIL, DEFAULT_PASSWORD);
        MockHttpSession workerSession = loginAs(WORKER_EMAIL, DEFAULT_PASSWORD);

        String unassignedId = createTestComplaint(citizenSession, "Strictly Private Unassigned Complaint");

        mockMvc.perform(get("/api/complaints/" + unassignedId).session(workerSession))
                .andExpect(status().isForbidden())
                .andExpect(jsonPath("$.error", is("Forbidden")))
                .andExpect(jsonPath("$.message", containsString("Workers may only access repair orders assigned to their crew")));

        mockMvc.perform(get("/api/complaints/" + unassignedId + "/history").session(workerSession))
                .andExpect(status().isForbidden());
    }

    @Test
    @DisplayName("Unauthenticated user cannot access worker tasks or task details (401 Unauthorized)")
    void unauthenticatedUserCannotAccessTasks() throws Exception {
        mockMvc.perform(get("/api/complaints"))
                .andExpect(status().isUnauthorized());

        mockMvc.perform(get("/api/complaints/00000000-0000-0000-0000-000000000003"))
                .andExpect(status().isUnauthorized());
    }

    @Test
    @DisplayName("Invalid task ID returns 404 Not Found")
    void invalidTaskIdReturnsNotFound() throws Exception {
        MockHttpSession workerSession = loginAs(WORKER_EMAIL, DEFAULT_PASSWORD);

        mockMvc.perform(get("/api/complaints/00000000-0000-0000-0000-999999999999").session(workerSession))
                .andExpect(status().isNotFound())
                .andExpect(jsonPath("$.error", is("Not Found")));

        mockMvc.perform(get("/api/complaints/CF-2026-99999").session(workerSession))
                .andExpect(status().isNotFound())
                .andExpect(jsonPath("$.error", is("Not Found")));
    }

    @Test
    @DisplayName("Step 4B: Assigned worker can transition task to IN_PROGRESS")
    void workerCanTransitionAssignedTaskToInProgress() throws Exception {
        MockHttpSession citizenSession = loginAs(CITIZEN_EMAIL, DEFAULT_PASSWORD);
        MockHttpSession officerSession = loginAs(OFFICER_EMAIL, DEFAULT_PASSWORD);
        MockHttpSession workerSession = loginAs(WORKER_EMAIL, DEFAULT_PASSWORD);

        String complaintId = createTestComplaint(citizenSession, "Task to Transition to IN_PROGRESS");
        AssignComplaintRequest assignReq = new AssignComplaintRequest();
        assignReq.setWorkerId(MARCUS_CHEN_ID);
        assignReq.setNotes("Assigned to Marcus Chen.");

        mockMvc.perform(post("/api/complaints/" + complaintId + "/assign")
                        .with(csrf())
                        .session(officerSession)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(assignReq)))
                .andExpect(status().isOk());

        // Worker transitions status to IN_PROGRESS
        UpdateStatusRequest statusReq = new UpdateStatusRequest();
        statusReq.setStatus(ComplaintStatus.IN_PROGRESS);
        statusReq.setNotes("Arrived on site. Commencing inspection and asphalt preparation.");

        mockMvc.perform(post("/api/complaints/" + complaintId + "/status")
                        .with(csrf())
                        .session(workerSession)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(statusReq)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success", is(true)))
                .andExpect(jsonPath("$.data.status", is("IN_PROGRESS")));
    }

    @Test
    @DisplayName("Step 4B: Worker cannot transition unassigned task to IN_PROGRESS (403 Forbidden)")
    void workerCannotTransitionUnassignedTaskToInProgress() throws Exception {
        MockHttpSession citizenSession = loginAs(CITIZEN_EMAIL, DEFAULT_PASSWORD);
        MockHttpSession workerSession = loginAs(WORKER_EMAIL, DEFAULT_PASSWORD);

        String unassignedId = createTestComplaint(citizenSession, "Unassigned Task Status Attempt");

        UpdateStatusRequest statusReq = new UpdateStatusRequest();
        statusReq.setStatus(ComplaintStatus.IN_PROGRESS);
        statusReq.setNotes("Attempting unauthorized status change.");

        mockMvc.perform(post("/api/complaints/" + unassignedId + "/status")
                        .with(csrf())
                        .session(workerSession)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(statusReq)))
                .andExpect(status().isForbidden());
    }

    @Test
    @DisplayName("Step 4B: Transitioning to IN_PROGRESS when already IN_PROGRESS is rejected (400 Bad Request)")
    void duplicateInProgressTransitionIsRejected() throws Exception {
        MockHttpSession citizenSession = loginAs(CITIZEN_EMAIL, DEFAULT_PASSWORD);
        MockHttpSession officerSession = loginAs(OFFICER_EMAIL, DEFAULT_PASSWORD);
        MockHttpSession workerSession = loginAs(WORKER_EMAIL, DEFAULT_PASSWORD);

        String complaintId = createTestComplaint(citizenSession, "Duplicate IN_PROGRESS Task");
        AssignComplaintRequest assignReq = new AssignComplaintRequest();
        assignReq.setWorkerId(MARCUS_CHEN_ID);
        assignReq.setNotes("Assigned to Marcus Chen.");

        mockMvc.perform(post("/api/complaints/" + complaintId + "/assign")
                        .with(csrf())
                        .session(officerSession)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(assignReq)))
                .andExpect(status().isOk());

        UpdateStatusRequest statusReq = new UpdateStatusRequest();
        statusReq.setStatus(ComplaintStatus.IN_PROGRESS);
        statusReq.setNotes("First transition.");

        mockMvc.perform(post("/api/complaints/" + complaintId + "/status")
                        .with(csrf())
                        .session(workerSession)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(statusReq)))
                .andExpect(status().isOk());

        // Duplicate attempt
        mockMvc.perform(post("/api/complaints/" + complaintId + "/status")
                        .with(csrf())
                        .session(workerSession)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(statusReq)))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.message", anyOf(containsString("cannot transition to IN_PROGRESS"), containsString("already in status"))));
    }

    @Test
    @DisplayName("Step 4B: Assigned worker can record progress notes on assigned task")
    void workerCanRecordProgressNote() throws Exception {
        MockHttpSession citizenSession = loginAs(CITIZEN_EMAIL, DEFAULT_PASSWORD);
        MockHttpSession officerSession = loginAs(OFFICER_EMAIL, DEFAULT_PASSWORD);
        MockHttpSession workerSession = loginAs(WORKER_EMAIL, DEFAULT_PASSWORD);

        String complaintId = createTestComplaint(citizenSession, "Progress Note Logging Task");
        AssignComplaintRequest assignReq = new AssignComplaintRequest();
        assignReq.setWorkerId(MARCUS_CHEN_ID);
        assignReq.setNotes("Assigned to Marcus Chen.");

        mockMvc.perform(post("/api/complaints/" + complaintId + "/assign")
                        .with(csrf())
                        .session(officerSession)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(assignReq)))
                .andExpect(status().isOk());

        AddNoteRequest noteReq = new AddNoteRequest("Sub-base prepared. Awaiting asphalt compactor unit on-site.");

        mockMvc.perform(post("/api/complaints/" + complaintId + "/notes")
                        .with(csrf())
                        .session(workerSession)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(noteReq)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success", is(true)))
                .andExpect(jsonPath("$.data.id", is(complaintId)));

        // Verify history contains note
        mockMvc.perform(get("/api/complaints/" + complaintId + "/history").session(workerSession))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data[*].notes", hasItem("Sub-base prepared. Awaiting asphalt compactor unit on-site.")));
    }

    @Test
    @DisplayName("Step 4B: Worker cannot add progress notes to an unassigned task (403 Forbidden)")
    void workerCannotAddNoteToUnassignedTask() throws Exception {
        MockHttpSession citizenSession = loginAs(CITIZEN_EMAIL, DEFAULT_PASSWORD);
        MockHttpSession workerSession = loginAs(WORKER_EMAIL, DEFAULT_PASSWORD);

        String unassignedId = createTestComplaint(citizenSession, "Unassigned Task Note Attempt");

        AddNoteRequest noteReq = new AddNoteRequest("Trying to append note to unauthorized task.");

        mockMvc.perform(post("/api/complaints/" + unassignedId + "/notes")
                        .with(csrf())
                        .session(workerSession)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(noteReq)))
                .andExpect(status().isForbidden());
    }

    @Test
    @DisplayName("Step 4C: Assigned worker can submit repair evidence via multipart request")
    void workerCanSubmitEvidenceViaMultipart() throws Exception {
        MockHttpSession citizenSession = loginAs(CITIZEN_EMAIL, DEFAULT_PASSWORD);
        MockHttpSession officerSession = loginAs(OFFICER_EMAIL, DEFAULT_PASSWORD);
        MockHttpSession workerSession = loginAs(WORKER_EMAIL, DEFAULT_PASSWORD);

        String complaintId = createTestComplaint(citizenSession, "Task for Evidence Upload Test");
        AssignComplaintRequest assignReq = new AssignComplaintRequest();
        assignReq.setWorkerId(MARCUS_CHEN_ID);
        assignReq.setNotes("Assigned to Marcus Chen.");

        mockMvc.perform(post("/api/complaints/" + complaintId + "/assign")
                        .with(csrf())
                        .session(officerSession)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(assignReq)))
                .andExpect(status().isOk());

        // Must first transition to IN_PROGRESS
        UpdateStatusRequest statusReq = new UpdateStatusRequest();
        statusReq.setStatus(ComplaintStatus.IN_PROGRESS);
        statusReq.setNotes("Started repairs.");

        mockMvc.perform(post("/api/complaints/" + complaintId + "/status")
                        .with(csrf())
                        .session(workerSession)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(statusReq)))
                .andExpect(status().isOk());

        // Submit multipart evidence
        MockMultipartFile photo = new MockMultipartFile(
                "files",
                "after_repair.jpg",
                "image/jpeg",
                TestImageHelper.createValidJpeg(2, 2)
        );

        mockMvc.perform(multipart("/api/complaints/" + complaintId + "/evidence")
                        .file(photo)
                        .param("notes", "Bitumen aggregate compacted and leveled flush with road surface.")
                        .param("latitude", "13.0845000")
                        .param("longitude", "80.2155000")
                        .param("accuracy", "15.0")
                        .param("deviceReported", "true")
                        .with(csrf())
                        .session(workerSession))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success", is(true)))
                .andExpect(jsonPath("$.data.status", is("RESOLUTION_SUBMITTED")));
    }

    @Test
    @DisplayName("Step 4C: Evidence submission rejected if task is NOT in IN_PROGRESS status (400 Bad Request)")
    void evidenceSubmissionFailsIfStatusIsNotInProgress() throws Exception {
        MockHttpSession citizenSession = loginAs(CITIZEN_EMAIL, DEFAULT_PASSWORD);
        MockHttpSession officerSession = loginAs(OFFICER_EMAIL, DEFAULT_PASSWORD);
        MockHttpSession workerSession = loginAs(WORKER_EMAIL, DEFAULT_PASSWORD);

        String complaintId = createTestComplaint(citizenSession, "Task in ASSIGNED status");
        AssignComplaintRequest assignReq = new AssignComplaintRequest();
        assignReq.setWorkerId(MARCUS_CHEN_ID);
        assignReq.setNotes("Assigned to Marcus Chen.");

        mockMvc.perform(post("/api/complaints/" + complaintId + "/assign")
                        .with(csrf())
                        .session(officerSession)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(assignReq)))
                .andExpect(status().isOk());

        // Attempt evidence submission while still ASSIGNED (not IN_PROGRESS)
        MockMultipartFile photo = new MockMultipartFile(
                "files",
                "premature_repair.jpg",
                "image/jpeg",
                TestImageHelper.createValidJpeg(2, 2)
        );

        mockMvc.perform(multipart("/api/complaints/" + complaintId + "/evidence")
                        .file(photo)
                        .param("notes", "Premature resolution attempt.")
                        .with(csrf())
                        .session(workerSession))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.message", containsString("Allowed previous status: IN_PROGRESS")));
    }

    @Test
    @DisplayName("Step 4C: Unauthorized worker cannot submit evidence for unassigned task (403 Forbidden)")
    void unauthorizedWorkerCannotSubmitEvidence() throws Exception {
        MockHttpSession citizenSession = loginAs(CITIZEN_EMAIL, DEFAULT_PASSWORD);
        MockHttpSession workerSession = loginAs(WORKER_EMAIL, DEFAULT_PASSWORD);

        String unassignedId = createTestComplaint(citizenSession, "Unassigned Task Evidence Attempt");

        MockMultipartFile photo = new MockMultipartFile(
                "files",
                "unauthorized.jpg",
                "image/jpeg",
                TestImageHelper.createValidJpeg(2, 2)
        );

        mockMvc.perform(multipart("/api/complaints/" + unassignedId + "/evidence")
                        .file(photo)
                        .param("notes", "Attempting unauthorized evidence submission.")
                        .with(csrf())
                        .session(workerSession))
                .andExpect(status().isForbidden());
    }

    @Test
    @DisplayName("Step 4C: Empty notes or missing files rejected with 400 Bad Request")
    void emptyEvidenceParametersRejected() throws Exception {
        MockHttpSession citizenSession = loginAs(CITIZEN_EMAIL, DEFAULT_PASSWORD);
        MockHttpSession officerSession = loginAs(OFFICER_EMAIL, DEFAULT_PASSWORD);
        MockHttpSession workerSession = loginAs(WORKER_EMAIL, DEFAULT_PASSWORD);

        String complaintId = createTestComplaint(citizenSession, "Empty Evidence Check Task");
        AssignComplaintRequest assignReq = new AssignComplaintRequest();
        assignReq.setWorkerId(MARCUS_CHEN_ID);
        assignReq.setNotes("Assigned for empty param check");
        mockMvc.perform(post("/api/complaints/" + complaintId + "/assign")
                        .with(csrf())
                        .session(officerSession)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(assignReq)))
                .andExpect(status().isOk());

        mockMvc.perform(multipart("/api/complaints/" + complaintId + "/evidence")
                        .param("notes", "")
                        .with(csrf())
                        .session(workerSession))
                .andExpect(status().isBadRequest());
    }

    @Test
    @DisplayName("Evidence location validation rules: in-range (200), no-coords with note (200), no-coords without note (400), out-of-range without note (400)")
    void testEvidenceLocationValidationScenarios() throws Exception {
        MockHttpSession citizenSession = loginAs(CITIZEN_EMAIL, DEFAULT_PASSWORD);
        MockHttpSession officerSession = loginAs(OFFICER_EMAIL, DEFAULT_PASSWORD);
        MockHttpSession workerSession = loginAs(WORKER_EMAIL, DEFAULT_PASSWORD);

        // 1. In-range coordinates return 200 and WITHIN_RANGE
        String c1 = createTestComplaint(citizenSession, "In-range location check task");
        AssignComplaintRequest a1 = new AssignComplaintRequest();
        a1.setWorkerId(MARCUS_CHEN_ID);
        a1.setNotes("Assign");
        mockMvc.perform(post("/api/complaints/" + c1 + "/assign").with(csrf()).session(officerSession)
                .contentType(MediaType.APPLICATION_JSON).content(objectMapper.writeValueAsString(a1))).andExpect(status().isOk());
        UpdateStatusRequest s1 = new UpdateStatusRequest();
        s1.setStatus(ComplaintStatus.IN_PROGRESS);
        s1.setNotes("Starting");
        mockMvc.perform(post("/api/complaints/" + c1 + "/status").with(csrf()).session(workerSession)
                .contentType(MediaType.APPLICATION_JSON).content(objectMapper.writeValueAsString(s1))).andExpect(status().isOk());

        mockMvc.perform(EvidenceTestSupport.validEvidenceRequest(c1, new BigDecimal("13.0845000"), new BigDecimal("80.2155000"), "Fixed on-site")
                .session(workerSession))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.evidence[0].locationCheck", is("WITHIN_RANGE")));

        // 2. No coordinates with valid note (>= 10 chars) returns 200 and NOT_PROVIDED
        String c2 = createTestComplaint(citizenSession, "No-coords with note task");
        mockMvc.perform(post("/api/complaints/" + c2 + "/assign").with(csrf()).session(officerSession)
                .contentType(MediaType.APPLICATION_JSON).content(objectMapper.writeValueAsString(a1))).andExpect(status().isOk());
        mockMvc.perform(post("/api/complaints/" + c2 + "/status").with(csrf()).session(workerSession)
                .contentType(MediaType.APPLICATION_JSON).content(objectMapper.writeValueAsString(s1))).andExpect(status().isOk());

        mockMvc.perform(EvidenceTestSupport.noCoordinatesEvidenceRequest(c2, "Fixed basement pipe", "GPS signal unavailable in sub-basement utility corridor.")
                .session(workerSession))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.evidence[0].locationCheck", is("NOT_PROVIDED")));

        // 3. No coordinates without location note returns 400 Bad Request
        String c3 = createTestComplaint(citizenSession, "No-coords without note task");
        mockMvc.perform(post("/api/complaints/" + c3 + "/assign").with(csrf()).session(officerSession)
                .contentType(MediaType.APPLICATION_JSON).content(objectMapper.writeValueAsString(a1))).andExpect(status().isOk());
        mockMvc.perform(post("/api/complaints/" + c3 + "/status").with(csrf()).session(workerSession)
                .contentType(MediaType.APPLICATION_JSON).content(objectMapper.writeValueAsString(s1))).andExpect(status().isOk());

        mockMvc.perform(EvidenceTestSupport.noCoordinatesEvidenceRequest(c3, "Fixed without coords", null)
                .session(workerSession))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.message", containsString("When GPS coordinates are not provided, an explanation location note of at least 10 characters is required.")));

        // 4. Out-of-range coordinates without note returns 400 Bad Request
        String c4 = createTestComplaint(citizenSession, "Out-of-range without note task");
        mockMvc.perform(post("/api/complaints/" + c4 + "/assign").with(csrf()).session(officerSession)
                .contentType(MediaType.APPLICATION_JSON).content(objectMapper.writeValueAsString(a1))).andExpect(status().isOk());
        mockMvc.perform(post("/api/complaints/" + c4 + "/status").with(csrf()).session(workerSession)
                .contentType(MediaType.APPLICATION_JSON).content(objectMapper.writeValueAsString(s1))).andExpect(status().isOk());

        mockMvc.perform(EvidenceTestSupport.outOfRangeEvidenceRequest(c4, new BigDecimal("13.0845000"), new BigDecimal("80.2155000"), "Out of range repair", null)
                .session(workerSession))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.message", containsString("Evidence location check is OUT_OF_RANGE")));
    }

    @Test
    @DisplayName("Step 2.1: Evidence download successfully retrieves file for officer, worker, and citizen owner, rejecting unauthorized citizen and unlinked files")
    void testEvidenceDownloadResolutionAndAuthorization() throws Exception {
        MockHttpSession citizenSession = loginAs(CITIZEN_EMAIL, DEFAULT_PASSWORD);
        MockHttpSession officerSession = loginAs(OFFICER_EMAIL, DEFAULT_PASSWORD);
        MockHttpSession workerSession = loginAs(WORKER_EMAIL, DEFAULT_PASSWORD);

        // 1. Create complaint and assign to Marcus Chen
        String complaintId = createTestComplaint(citizenSession, "Pothole for Evidence Download Test");
        AssignComplaintRequest assignReq = new AssignComplaintRequest();
        assignReq.setWorkerId(MARCUS_CHEN_ID);
        assignReq.setNotes("Assigned Marcus for evidence retrieval test");

        mockMvc.perform(post("/api/complaints/" + complaintId + "/assign")
                        .with(csrf())
                        .session(officerSession)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(assignReq)))
                .andExpect(status().isOk());

        // 2. Transition to IN_PROGRESS
        UpdateStatusRequest statusReq = new UpdateStatusRequest();
        statusReq.setStatus(ComplaintStatus.IN_PROGRESS);
        statusReq.setNotes("Starting repair work");

        mockMvc.perform(post("/api/complaints/" + complaintId + "/status")
                        .with(csrf())
                        .session(workerSession)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(statusReq)))
                .andExpect(status().isOk());

        // 3. Submit real repair photo
        byte[] expectedBytes = TestImageHelper.createValidJpeg(2, 2);
        MvcResult submitResult = mockMvc.perform(EvidenceTestSupport.validEvidenceRequest(
                        complaintId,
                        new BigDecimal("13.0845000"),
                        new BigDecimal("80.2155000"),
                        "Road repaired with hot mix asphalt.")
                        .session(workerSession))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success", is(true)))
                .andReturn();

        JsonNode jsonNode = objectMapper.readTree(submitResult.getResponse().getContentAsString());
        JsonNode evidenceArray = jsonNode.get("data").get("evidence");
        assertNotNull(evidenceArray);
        assertTrue(evidenceArray.size() > 0);
        String photoUrl = evidenceArray.get(0).get("photoUrl").asText();
        assertNotNull(photoUrl);
        String filename = photoUrl.substring(photoUrl.lastIndexOf('/') + 1);

        // 4. Officer can retrieve evidence file (resolves from complaints/{complaintId} subdirectory)
        MvcResult officerGetResult = mockMvc.perform(get("/api/complaints/evidence/files/" + filename)
                        .session(officerSession))
                .andExpect(status().isOk())
                .andReturn();
        assertArrayEquals(expectedBytes, officerGetResult.getResponse().getContentAsByteArray());

        // 5. Assigned worker can retrieve evidence file
        MvcResult workerGetResult = mockMvc.perform(get("/api/complaints/evidence/files/" + filename)
                        .session(workerSession))
                .andExpect(status().isOk())
                .andReturn();
        assertArrayEquals(expectedBytes, workerGetResult.getResponse().getContentAsByteArray());

        // 6. Complaint owner citizen can retrieve evidence file
        MvcResult citizenGetResult = mockMvc.perform(get("/api/complaints/evidence/files/" + filename)
                        .session(citizenSession))
                .andExpect(status().isOk())
                .andReturn();
        assertArrayEquals(expectedBytes, citizenGetResult.getResponse().getContentAsByteArray());

        // 7. Register a different citizen and attempt download -> 403 Forbidden
        RegisterCitizenRequest otherCitizenReq = new RegisterCitizenRequest();
        otherCitizenReq.setName("Bystander Resident");
        String otherEmail = "bystander." + System.currentTimeMillis() + "@civic.org";
        otherCitizenReq.setEmail(otherEmail);
        otherCitizenReq.setPhone("+91 97" + (10000000 + (int)(Math.random() * 89999999)));
        otherCitizenReq.setWard("Ward 15");
        otherCitizenReq.setPassword(DEFAULT_PASSWORD);

        mockMvc.perform(post("/api/auth/register")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(otherCitizenReq)))
                .andExpect(status().isCreated());

        MockHttpSession otherCitizenSession = loginAs(otherEmail, DEFAULT_PASSWORD);
        mockMvc.perform(get("/api/complaints/evidence/files/" + filename)
                        .session(otherCitizenSession))
                .andExpect(status().isForbidden());

        // 8. Unlinked file (even if it exists on disk or not) -> 404 Not Found
        mockMvc.perform(get("/api/complaints/evidence/files/unlinked-evidence-photo.jpg")
                        .session(officerSession))
                .andExpect(status().isNotFound());

        // 9. Path traversal attempt -> 400 Bad Request
        mockMvc.perform(get("/api/complaints/evidence/files/..%2F..%2Fsecret.jpg")
                        .session(officerSession))
                .andExpect(status().isBadRequest());
    }
}

