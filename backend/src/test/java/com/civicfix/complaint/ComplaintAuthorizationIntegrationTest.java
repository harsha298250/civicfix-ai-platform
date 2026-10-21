package com.civicfix.complaint;

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
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.MvcResult;

import java.math.BigDecimal;
import java.util.UUID;

import static org.hamcrest.Matchers.*;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.csrf;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
class ComplaintAuthorizationIntegrationTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private ObjectMapper objectMapper;

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

    @Test
    @DisplayName("Citizen creates complaint; state machine enforces isolation and governance rules")
    void testComplaintLifecycleAndAuthorizationRules() throws Exception {
        // 1. Citizen Alex logs in
        MockHttpSession citizenSession = loginAs("alex.m@citizen.org", "CivicSecure#2026!");

        // 2. Citizen creates a complaint
        CreateComplaintRequest createReq = new CreateComplaintRequest();
        createReq.setTitle("Deep Pothole at 2nd Avenue Corner");
        createReq.setDescription("Hazardous road crater causing vehicular damage near Anna Nagar roundtana.");
        createReq.setCategory("Pothole & Road Damage");
        createReq.setPriority(ComplaintPriority.HIGH);
        createReq.setAddress("2nd Avenue, Anna Nagar East, Chennai");
        createReq.setWard("Ward 08");
        createReq.setLatitude(new BigDecimal("13.0850000"));
        createReq.setLongitude(new BigDecimal("80.2150000"));

        MvcResult createResult = mockMvc.perform(post("/api/complaints")
                        .with(csrf())
                        .session(citizenSession)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(createReq)))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.success", is(true)))
                .andExpect(jsonPath("$.data.referenceId", startsWith("CF-2026-")))
                .andExpect(jsonPath("$.data.status", is("SUBMITTED")))
                .andReturn();

        JsonNode createdJson = objectMapper.readTree(createResult.getResponse().getContentAsString());
        String complaintId = createdJson.get("data").get("id").asText();
        String refId = createdJson.get("data").get("referenceId").asText();

        // 3. Citizen can retrieve their own complaint by ID and by referenceId
        mockMvc.perform(get("/api/complaints/" + complaintId).session(citizenSession))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.id", is(complaintId)));

        mockMvc.perform(get("/api/complaints/" + refId).session(citizenSession))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.referenceId", is(refId)));

        // 4. Citizen attempts unauthorized status change to RESOLVED -> MUST BE FORBIDDEN (Rule #9)
        UpdateStatusRequest unauthorizedResolve = new UpdateStatusRequest();
        unauthorizedResolve.setStatus(ComplaintStatus.RESOLVED);
        unauthorizedResolve.setNotes("Citizen attempting to resolve own ticket");

        mockMvc.perform(post("/api/complaints/" + complaintId + "/status")
                        .with(csrf())
                        .session(citizenSession)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(unauthorizedResolve)))
                .andExpect(status().isForbidden())
                .andExpect(jsonPath("$.error", is("Forbidden")))
                .andExpect(jsonPath("$.message", containsString("Only municipal officers and administrators")));

        // 5. Municipal Officer Elena Vance logs in
        MockHttpSession officerSession = loginAs("elena.vance@metro.gov", "CivicSecure#2026!");

        // 6. Officer can view any complaint
        mockMvc.perform(get("/api/complaints/" + complaintId).session(officerSession))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.id", is(complaintId)));

        // 7. Officer assigns task to field worker Marcus Chen (usr-003)
        AssignComplaintRequest assignReq = new AssignComplaintRequest();
        assignReq.setWorkerId(UUID.fromString("00000000-0000-0000-0000-000000000003"));
        assignReq.setNotes("Dispatched to Asphalt Rapid Response Crew Unit 4.");

        mockMvc.perform(post("/api/complaints/" + complaintId + "/assign")
                        .with(csrf())
                        .session(officerSession)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(assignReq)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.status", is("ASSIGNED")))
                .andExpect(jsonPath("$.data.assignedWorker.name", is("Marcus Chen")));

        // 8. Field Worker Marcus Chen logs in
        MockHttpSession workerSession = loginAs("marcus.chen@fieldops.gov", "CivicSecure#2026!");

        // 9. Worker marks task IN_PROGRESS
        UpdateStatusRequest inProgressReq = new UpdateStatusRequest();
        inProgressReq.setStatus(ComplaintStatus.IN_PROGRESS);
        inProgressReq.setNotes("Crew arrived on site with roller and asphalt mix.");

        mockMvc.perform(post("/api/complaints/" + complaintId + "/status")
                        .with(csrf())
                        .session(workerSession)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(inProgressReq)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.status", is("IN_PROGRESS")));

        // 10. Worker submits resolution evidence
        UpdateStatusRequest submitEvidenceReq = new UpdateStatusRequest();
        submitEvidenceReq.setStatus(ComplaintStatus.RESOLUTION_SUBMITTED);
        submitEvidenceReq.setNotes("Cold asphalt mix compacted. Surface leveled with road grade.");
        submitEvidenceReq.setEvidencePhotoUrl("https://storage.civicfix.gov/evidence/repair-2026-00124.jpg");
        submitEvidenceReq.setLatitude(new BigDecimal("13.0850200"));
        submitEvidenceReq.setLongitude(new BigDecimal("80.2150300"));

        mockMvc.perform(post("/api/complaints/" + complaintId + "/status")
                        .with(csrf())
                        .session(workerSession)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(submitEvidenceReq)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.status", is("RESOLUTION_SUBMITTED")));

        // 11. Worker cannot mark task RESOLVED (must be inspected by Officer)
        UpdateStatusRequest workerResolveReq = new UpdateStatusRequest();
        workerResolveReq.setStatus(ComplaintStatus.RESOLVED);

        mockMvc.perform(post("/api/complaints/" + complaintId + "/status")
                        .with(csrf())
                        .session(workerSession)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(workerResolveReq)))
                .andExpect(status().isForbidden());

        // 12. Officer Elena inspects evidence and verifies resolution
        UpdateStatusRequest officerResolveReq = new UpdateStatusRequest();
        officerResolveReq.setStatus(ComplaintStatus.RESOLVED);
        officerResolveReq.setNotes("Inspection verified: compaction quality meets municipal standards.");

        mockMvc.perform(post("/api/complaints/" + complaintId + "/status")
                        .with(csrf())
                        .session(officerSession)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(officerResolveReq)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.status", is("RESOLVED")));

        // 13. Audit history contains immutable chronological record
        mockMvc.perform(get("/api/complaints/" + complaintId + "/history")
                        .session(officerSession))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data", hasSize(greaterThanOrEqualTo(5))))
                .andExpect(jsonPath("$.data[0].newStatus", is("SUBMITTED")))
                .andExpect(jsonPath("$.data[?(@.newStatus == 'RESOLVED')]", not(empty())));
    }
}
