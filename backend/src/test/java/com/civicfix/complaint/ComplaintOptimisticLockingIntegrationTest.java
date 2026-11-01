package com.civicfix.complaint;

import com.civicfix.audit.AuditLogRepository;
import com.civicfix.auth.dto.LoginRequest;
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
import org.springframework.orm.ObjectOptimisticLockingFailureException;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.MvcResult;

import java.util.List;
import java.util.UUID;

import static org.hamcrest.Matchers.*;
import static org.junit.jupiter.api.Assertions.*;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.csrf;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
public class ComplaintOptimisticLockingIntegrationTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private ObjectMapper objectMapper;

    @Autowired
    private ComplaintRepository complaintRepository;

    @Autowired
    private ComplaintStatusHistoryRepository historyRepository;

    @Autowired
    private AuditLogRepository auditLogRepository;

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

    private String createTestComplaint(MockHttpSession citizenSession) throws Exception {
        CreateComplaintRequest createReq = new CreateComplaintRequest();
        createReq.setTitle("Concurrency Test Pothole " + System.currentTimeMillis());
        createReq.setDescription("Investigating optimistic concurrency locking safeguards.");
        createReq.setCategory("Roads & Potholes");
        createReq.setPriority(ComplaintPriority.HIGH);
        createReq.setAddress("4th Main Road, Anna Nagar");
        createReq.setWard("Ward 08");

        MvcResult result = mockMvc.perform(post("/api/complaints")
                        .session(citizenSession)
                        .with(csrf())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(createReq)))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.data.version", is(0)))
                .andReturn();

        JsonNode root = objectMapper.readTree(result.getResponse().getContentAsString());
        return root.path("data").path("id").asText();
    }

    @Test
    @DisplayName("Initial complaint creation initializes version to 0")
    void testInitialComplaintHasVersionZero() throws Exception {
        MockHttpSession citizenSession = loginAs(CITIZEN_EMAIL, DEFAULT_PASSWORD);
        String complaintId = createTestComplaint(citizenSession);

        Complaint complaint = complaintRepository.findById(UUID.fromString(complaintId)).orElseThrow();
        assertNotNull(complaint.getVersion());
        assertEquals(0L, complaint.getVersion(), "New complaints must start at version 0");

        // Verify GET response exposes version
        mockMvc.perform(get("/api/complaints/" + complaintId)
                        .session(citizenSession))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.version", is(0)));
    }

    @Test
    @DisplayName("Sequential updates increment version monotonically without conflict")
    void testSequentialUpdatesIncrementVersionMonotonically() throws Exception {
        MockHttpSession citizenSession = loginAs(CITIZEN_EMAIL, DEFAULT_PASSWORD);
        MockHttpSession officerSession = loginAs(OFFICER_EMAIL, DEFAULT_PASSWORD);
        MockHttpSession workerSession = loginAs(WORKER_EMAIL, DEFAULT_PASSWORD);

        String complaintId = createTestComplaint(citizenSession);

        // Step 1: Officer assigns worker (version 0 -> 1)
        AssignComplaintRequest assignReq = new AssignComplaintRequest();
        assignReq.setWorkerId(MARCUS_CHEN_ID);
        assignReq.setNotes("Assigned to Unit 4 Marcus Chen");
        assignReq.setVersion(0L); // Client supplies current known version

        mockMvc.perform(post("/api/complaints/" + complaintId + "/assign")
                        .session(officerSession)
                        .with(csrf())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(assignReq)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.status", is("ASSIGNED")))
                .andExpect(jsonPath("$.data.version", is(1)));

        // Step 2: Worker starts work (version 1 -> 2)
        UpdateStatusRequest inProgressReq = new UpdateStatusRequest();
        inProgressReq.setStatus(ComplaintStatus.IN_PROGRESS);
        inProgressReq.setNotes("Technician on site; repair underway");
        inProgressReq.setVersion(1L);

        mockMvc.perform(post("/api/complaints/" + complaintId + "/status")
                        .session(workerSession)
                        .with(csrf())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(inProgressReq)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.status", is("IN_PROGRESS")))
                .andExpect(jsonPath("$.data.version", is(2)));

        // Verify database entity version
        Complaint complaint = complaintRepository.findById(UUID.fromString(complaintId)).orElseThrow();
        assertEquals(2L, complaint.getVersion());
    }

    @Test
    @DisplayName("Two concurrent updates based on same version: stale update is rejected with 409 Conflict")
    void testConcurrentUpdatesRejectStaleUpdateWith409() throws Exception {
        MockHttpSession citizenSession = loginAs(CITIZEN_EMAIL, DEFAULT_PASSWORD);
        MockHttpSession officerSession = loginAs(OFFICER_EMAIL, DEFAULT_PASSWORD);

        String complaintId = createTestComplaint(citizenSession);

        // Both Officer A and Officer B fetched the ticket at version 0
        Long initialVersion = 0L;

        // Officer A assigns the complaint (version 0 -> 1)
        AssignComplaintRequest assignReq = new AssignComplaintRequest();
        assignReq.setWorkerId(MARCUS_CHEN_ID);
        assignReq.setNotes("Assigned by Officer Elena");
        assignReq.setVersion(initialVersion);

        mockMvc.perform(post("/api/complaints/" + complaintId + "/assign")
                        .session(officerSession)
                        .with(csrf())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(assignReq)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.version", is(1)));

        // Officer B attempts an update based on stale version 0
        UpdateStatusRequest staleReq = new UpdateStatusRequest();
        staleReq.setStatus(ComplaintStatus.REJECTED);
        staleReq.setNotes("Officer B attempted stale rejection");
        staleReq.setVersion(initialVersion); // Stale version 0

        mockMvc.perform(post("/api/complaints/" + complaintId + "/status")
                        .session(officerSession)
                        .with(csrf())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(staleReq)))
                .andExpect(status().isConflict())
                .andExpect(jsonPath("$.status", is(409)))
                .andExpect(jsonPath("$.error", is("Conflict")))
                .andExpect(jsonPath("$.message", containsString("Complaint has been modified by another transaction or user")));

        // Verify database state: status remains ASSIGNED, NOT overwritten to REJECTED
        Complaint complaint = complaintRepository.findById(UUID.fromString(complaintId)).orElseThrow();
        assertEquals(ComplaintStatus.ASSIGNED, complaint.getStatus());
        assertEquals(1L, complaint.getVersion());
    }

    @Test
    @DisplayName("JPA repository-level optimistic locking collision throws ObjectOptimisticLockingFailureException")
    void testJpaLevelOptimisticLockingCollision() throws Exception {
        MockHttpSession citizenSession = loginAs(CITIZEN_EMAIL, DEFAULT_PASSWORD);
        String complaintId = createTestComplaint(citizenSession);

        UUID id = UUID.fromString(complaintId);

        // Load two independent representations of the complaint
        Complaint instance1 = complaintRepository.findById(id).orElseThrow();
        Complaint instance2 = complaintRepository.findById(id).orElseThrow();

        assertEquals(instance1.getVersion(), instance2.getVersion());

        // Transaction 1 updates and flushes successfully
        instance1.setDescription("Updated by Transaction 1");
        complaintRepository.saveAndFlush(instance1);

        // In database, version is now incremented
        Complaint updatedInDb = complaintRepository.findById(id).orElseThrow();
        assertEquals(1L, updatedInDb.getVersion());

        // Transaction 2 tries to update instance 2 (which still holds stale version 0)
        instance2.setDescription("Conflicting update by Transaction 2");

        assertThrows(ObjectOptimisticLockingFailureException.class, () -> {
            complaintRepository.saveAndFlush(instance2);
        }, "Saving a stale entity must trigger ObjectOptimisticLockingFailureException");

        // Verify that the database only retained Transaction 1's changes
        Complaint finalState = complaintRepository.findById(id).orElseThrow();
        assertEquals("Updated by Transaction 1", finalState.getDescription());
        assertEquals(1L, finalState.getVersion());
    }

    @Test
    @DisplayName("Audit log and status history remain clean and consistent when conflict occurs")
    void testAuditLogAndHistoryRemainConsistentOnConflict() throws Exception {
        MockHttpSession citizenSession = loginAs(CITIZEN_EMAIL, DEFAULT_PASSWORD);
        MockHttpSession officerSession = loginAs(OFFICER_EMAIL, DEFAULT_PASSWORD);

        String complaintId = createTestComplaint(citizenSession);
        UUID id = UUID.fromString(complaintId);

        // Record initial counts
        int initialHistoryCount = historyRepository.findByComplaintIdOrderByCreatedAtAsc(id).size();

        // Successful update (version 0 -> 1)
        AssignComplaintRequest assignReq = new AssignComplaintRequest();
        assignReq.setWorkerId(MARCUS_CHEN_ID);
        assignReq.setNotes("First valid assignment");
        assignReq.setVersion(0L);

        mockMvc.perform(post("/api/complaints/" + complaintId + "/assign")
                        .session(officerSession)
                        .with(csrf())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(assignReq)))
                .andExpect(status().isOk());

        int historyAfterFirstUpdate = historyRepository.findByComplaintIdOrderByCreatedAtAsc(id).size();
        assertEquals(initialHistoryCount + 1, historyAfterFirstUpdate);

        // Stale conflicting update (version 0 again)
        AssignComplaintRequest staleAssignReq = new AssignComplaintRequest();
        staleAssignReq.setWorkerId(MARCUS_CHEN_ID);
        staleAssignReq.setNotes("Second stale assignment attempt");
        staleAssignReq.setVersion(0L);

        mockMvc.perform(post("/api/complaints/" + complaintId + "/assign")
                        .session(officerSession)
                        .with(csrf())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(staleAssignReq)))
                .andExpect(status().isConflict());

        // Verify history count is unchanged after conflict (no partial entries written)
        int historyAfterConflict = historyRepository.findByComplaintIdOrderByCreatedAtAsc(id).size();
        assertEquals(historyAfterFirstUpdate, historyAfterConflict, "Status history must not record rejected stale transactions");
    }
}
