package com.civicfix.complaint;

import com.civicfix.auth.dto.LoginRequest;
import com.civicfix.auth.dto.RegisterCitizenRequest;
import com.civicfix.complaint.dto.AssignComplaintRequest;
import com.civicfix.complaint.dto.ConfirmResolutionRequest;
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

        // 4. Citizen attempts unauthorized status change to RESOLVED -> MUST BE FORBIDDEN (A2 Rule)
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
                .andExpect(jsonPath("$.message", containsString("Complaints cannot be directly marked RESOLVED. Citizen confirmation or auto-confirmation is required.")));

        // Citizen attempts unauthorized status change to IN_PROGRESS -> MUST BE FORBIDDEN (Role boundary rule)
        UpdateStatusRequest unauthorizedInProgress = new UpdateStatusRequest();
        unauthorizedInProgress.setStatus(ComplaintStatus.IN_PROGRESS);
        unauthorizedInProgress.setNotes("Citizen attempting to transition to in-progress");

        mockMvc.perform(post("/api/complaints/" + complaintId + "/status")
                        .with(csrf())
                        .session(citizenSession)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(unauthorizedInProgress)))
                .andExpect(status().isForbidden())
                .andExpect(jsonPath("$.error", is("Forbidden")))
                .andExpect(jsonPath("$.message", containsString("Only the assigned field worker or an officer")));

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

        // 10. Worker submits resolution evidence using shared evidence helper with real image and in-range GPS coordinates
        mockMvc.perform(EvidenceTestSupport.validEvidenceRequest(
                        complaintId,
                        new BigDecimal("13.0850000"),
                        new BigDecimal("80.2150000"),
                        "Cold asphalt mix compacted. Surface leveled with road grade.")
                        .session(workerSession))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.status", is("RESOLUTION_SUBMITTED")));

        // 11. Worker cannot approve task (neither PENDING_CITIZEN_CONFIRMATION nor RESOLVED)
        UpdateStatusRequest workerApproveReq = new UpdateStatusRequest();
        workerApproveReq.setStatus(ComplaintStatus.PENDING_CITIZEN_CONFIRMATION);
        workerApproveReq.setNotes("Worker attempting to self-approve");

        mockMvc.perform(post("/api/complaints/" + complaintId + "/status")
                        .with(csrf())
                        .session(workerSession)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(workerApproveReq)))
                .andExpect(status().isForbidden())
                .andExpect(jsonPath("$.message", containsString("Only municipal officers and administrators")));

        UpdateStatusRequest workerResolveReq = new UpdateStatusRequest();
        workerResolveReq.setStatus(ComplaintStatus.RESOLVED);

        mockMvc.perform(post("/api/complaints/" + complaintId + "/status")
                        .with(csrf())
                        .session(workerSession)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(workerResolveReq)))
                .andExpect(status().isForbidden())
                .andExpect(jsonPath("$.message", containsString("Complaints cannot be directly marked RESOLVED. Citizen confirmation or auto-confirmation is required.")));

        // 12. Officer cannot directly set RESOLVED (A2 rule: must transition to PENDING_CITIZEN_CONFIRMATION)
        UpdateStatusRequest officerDirectResolveReq = new UpdateStatusRequest();
        officerDirectResolveReq.setStatus(ComplaintStatus.RESOLVED);
        officerDirectResolveReq.setNotes("Officer attempting direct resolution");

        mockMvc.perform(post("/api/complaints/" + complaintId + "/status")
                        .with(csrf())
                        .session(officerSession)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(officerDirectResolveReq)))
                .andExpect(status().isForbidden())
                .andExpect(jsonPath("$.message", containsString("Complaints cannot be directly marked RESOLVED. Citizen confirmation or auto-confirmation is required.")));

        // Officer Elena inspects evidence and verifies resolution (transitions to PENDING_CITIZEN_CONFIRMATION)
        UpdateStatusRequest officerApproveReq = new UpdateStatusRequest();
        officerApproveReq.setStatus(ComplaintStatus.PENDING_CITIZEN_CONFIRMATION);
        officerApproveReq.setNotes("Inspection verified: compaction quality meets municipal standards.");

        mockMvc.perform(post("/api/complaints/" + complaintId + "/status")
                        .with(csrf())
                        .session(officerSession)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(officerApproveReq)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.status", is("PENDING_CITIZEN_CONFIRMATION")));

        // 13. Admin cannot confirm on citizen's behalf -> Forbidden
        ConfirmResolutionRequest confirmReq = new ConfirmResolutionRequest();
        confirmReq.setNotes("Inspection verified; defect repaired.");

        MockHttpSession adminSession = loginAs("priya.sharma@admin.metro.gov", "CivicSecure#2026!");
        mockMvc.perform(post("/api/complaints/" + complaintId + "/confirm-resolution")
                        .with(csrf())
                        .session(adminSession)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(confirmReq)))
                .andExpect(status().isForbidden())
                .andExpect(jsonPath("$.message", containsString("Only the reporting citizen who filed this complaint can confirm or reject resolution.")));

        // Different citizen cannot confirm -> Forbidden
        String uniqueSuffix = UUID.randomUUID().toString().substring(0, 8);
        RegisterCitizenRequest otherCitizen = new RegisterCitizenRequest();
        otherCitizen.setName("Other Citizen");
        otherCitizen.setEmail("other-" + uniqueSuffix + "@citizen.org");
        otherCitizen.setPassword("CivicSecure#2026!");
        otherCitizen.setPhone("+91 95" + (10000000 + (int)(Math.random() * 89999999)));

        mockMvc.perform(post("/api/auth/register")
                        .with(csrf())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(otherCitizen)))
                .andExpect(status().isCreated());

        MockHttpSession otherCitizenSession = loginAs("other-" + uniqueSuffix + "@citizen.org", "CivicSecure#2026!");
        mockMvc.perform(post("/api/complaints/" + complaintId + "/confirm-resolution")
                        .with(csrf())
                        .session(otherCitizenSession)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(confirmReq)))
                .andExpect(status().isForbidden())
                .andExpect(jsonPath("$.message", containsString("Only the reporting citizen who filed this complaint can confirm or reject resolution.")));

        // Owning citizen Alex confirms resolution -> transitions to RESOLVED
        mockMvc.perform(post("/api/complaints/" + complaintId + "/confirm-resolution")
                        .with(csrf())
                        .session(citizenSession)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(confirmReq)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.status", is("RESOLVED")));

        // 14. Audit history contains immutable chronological record in order
        mockMvc.perform(get("/api/complaints/" + complaintId + "/history")
                        .session(officerSession))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data", hasSize(greaterThanOrEqualTo(6))))
                .andExpect(jsonPath("$.data[0].newStatus", is("SUBMITTED")))
                .andExpect(jsonPath("$.data[1].newStatus", is("ASSIGNED")))
                .andExpect(jsonPath("$.data[2].newStatus", is("IN_PROGRESS")))
                .andExpect(jsonPath("$.data[3].newStatus", is("RESOLUTION_SUBMITTED")))
                .andExpect(jsonPath("$.data[4].newStatus", is("PENDING_CITIZEN_CONFIRMATION")))
                .andExpect(jsonPath("$.data[5].newStatus", is("RESOLVED")))
                .andExpect(jsonPath("$.data[4].changedByName", is("Elena Vance")))
                .andExpect(jsonPath("$.data[5].changedByName", is("Alex Morgan")));
    }
}
