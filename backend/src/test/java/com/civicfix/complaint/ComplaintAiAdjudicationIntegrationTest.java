package com.civicfix.complaint;

import com.civicfix.auth.dto.LoginRequest;
import com.civicfix.complaint.dto.AdjudicateTriageRequest;
import com.civicfix.complaint.dto.CreateComplaintRequest;
import com.civicfix.complaint.dto.LinkDuplicateRequest;
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

import static org.hamcrest.Matchers.*;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.csrf;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
class ComplaintAiAdjudicationIntegrationTest {

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

    private String createComplaint(MockHttpSession session, String title, String desc, String category, BigDecimal lat, BigDecimal lng) throws Exception {
        CreateComplaintRequest req = new CreateComplaintRequest();
        req.setTitle(title);
        req.setDescription(desc);
        req.setCategory(category);
        req.setPriority(ComplaintPriority.MEDIUM);
        req.setAddress("Anna Nagar 2nd Avenue, Chennai");
        req.setWard("Ward 08");
        req.setLatitude(lat);
        req.setLongitude(lng);

        MvcResult result = mockMvc.perform(post("/api/complaints")
                        .with(csrf())
                        .session(session)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(req)))
                .andExpect(status().isCreated())
                .andReturn();

        JsonNode json = objectMapper.readTree(result.getResponse().getContentAsString());
        return json.get("data").get("id").asText();
    }

    @Test
    @DisplayName("End-to-End: AI Adjudication & Duplicate Management Workflow with Security and Optimistic Locking")
    void testAiAdjudicationAndDuplicateWorkflow() throws Exception {
        MockHttpSession citizenSession = loginAs("alex.m@citizen.org", "CivicSecure#2026!");
        MockHttpSession officerSession = loginAs("elena.vance@metro.gov", "CivicSecure#2026!");
        MockHttpSession workerSession = loginAs("marcus.chen@fieldops.gov", "CivicSecure#2026!");

        // 1. Citizen submits Complaint A (electrical sparking hazard)
        String complaintAId = createComplaint(
                citizenSession,
                "Sparking live electrical wire hanging near school",
                "Live wire snapped from transformer pole and sparking on footpath next to children school gate.",
                "OTHER", // Citizen filed as OTHER
                new BigDecimal("13.0850000"),
                new BigDecimal("80.2150000")
        );

        // Verify intake triage ran and populated advisory fields without mutating official category
        MvcResult getResultA = mockMvc.perform(get("/api/complaints/" + complaintAId).session(officerSession))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.category", is("OTHER"))) // Citizen input intact
                .andExpect(jsonPath("$.data.aiTriage.detectedCategory", is("STREET_LIGHT"))) // AI detected
                .andExpect(jsonPath("$.data.aiTriage.recommendedPriority", is("CRITICAL"))) // Life hazard
                .andExpect(jsonPath("$.data.aiTriage.adjudicationStatus", is("PENDING")))
                .andReturn();

        JsonNode nodeA = objectMapper.readTree(getResultA.getResponse().getContentAsString());
        long versionA = nodeA.get("data").get("version").asLong();

        // 2. Security Check: Unauthenticated request to adjudicate fails with 401
        AdjudicateTriageRequest acceptReq = new AdjudicateTriageRequest("ACCEPT", null, null, "Officer accepts AI recommendation", versionA);
        mockMvc.perform(post("/api/complaints/" + complaintAId + "/ai/adjudicate")
                        .with(csrf())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(acceptReq)))
                .andExpect(status().isUnauthorized());

        // 3. Security Check: Citizen or Worker cannot adjudicate (403 Forbidden)
        mockMvc.perform(post("/api/complaints/" + complaintAId + "/ai/adjudicate")
                        .with(csrf())
                        .session(citizenSession)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(acceptReq)))
                .andExpect(status().isForbidden());

        mockMvc.perform(post("/api/complaints/" + complaintAId + "/ai/adjudicate")
                        .with(csrf())
                        .session(workerSession)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(acceptReq)))
                .andExpect(status().isForbidden());

        // 4. Officer accepts AI recommendation (ACCEPT)
        MvcResult acceptResult = mockMvc.perform(post("/api/complaints/" + complaintAId + "/ai/adjudicate")
                        .with(csrf())
                        .session(officerSession)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(acceptReq)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success", is(true)))
                .andExpect(jsonPath("$.data.category", is("STREET_LIGHT"))) // Official category updated by officer
                .andExpect(jsonPath("$.data.priority", is("CRITICAL"))) // Official priority updated by officer
                .andExpect(jsonPath("$.data.aiTriage.adjudicationStatus", is("ACCEPTED")))
                .andReturn();

        JsonNode acceptedNode = objectMapper.readTree(acceptResult.getResponse().getContentAsString());
        long newVersionA = acceptedNode.get("data").get("version").asLong();

        // 5. Stale optimistic lock check on adjudication
        AdjudicateTriageRequest staleReq = new AdjudicateTriageRequest("OVERRIDE", "ROADS", ComplaintPriority.LOW, "Stale test", versionA);
        mockMvc.perform(post("/api/complaints/" + complaintAId + "/ai/adjudicate")
                        .with(csrf())
                        .session(officerSession)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(staleReq)))
                .andExpect(status().isConflict());

        // 6. Citizen files Complaint B close by (~22 meters away)
        String complaintBId = createComplaint(
                citizenSession,
                "Sparking electrical wire hanging near road",
                "Transformer wire snapped and sparking on pavement near the school.",
                "STREET_LIGHT",
                new BigDecimal("13.0852000"), // ~22m away
                new BigDecimal("80.2151000")
        );

        // 7. Security Check: Citizen cannot access duplicate candidate list (403 Forbidden)
        mockMvc.perform(get("/api/complaints/" + complaintBId + "/duplicates").session(citizenSession))
                .andExpect(status().isForbidden());

        // 8. Officer queries duplicate candidates for Complaint B
        mockMvc.perform(get("/api/complaints/" + complaintBId + "/duplicates").session(officerSession))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success", is(true)))
                .andExpect(jsonPath("$.data", hasSize(greaterThanOrEqualTo(1))))
                .andExpect(jsonPath("$.data[*].id", hasItem(complaintAId)))
                .andExpect(jsonPath("$.data[0].distanceMeters", notNullValue()))
                .andExpect(jsonPath("$.data[0].explanation", containsString("Proximity:")));

        // 9. Officer links Complaint B as duplicate of Complaint A
        LinkDuplicateRequest linkReq = new LinkDuplicateRequest(complaintAId, "Confirmed duplicate of master complaint A", 0L);
        mockMvc.perform(post("/api/complaints/" + complaintBId + "/duplicates/link")
                        .with(csrf())
                        .session(officerSession)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(linkReq)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success", is(true)))
                .andExpect(jsonPath("$.data.duplicateOf.id", is(complaintAId)));

        // 10. Safeguard: Prevent self-linking (400 Bad Request)
        LinkDuplicateRequest selfLinkReq = new LinkDuplicateRequest(complaintBId, "Self link", 1L);
        mockMvc.perform(post("/api/complaints/" + complaintBId + "/duplicates/link")
                        .with(csrf())
                        .session(officerSession)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(selfLinkReq)))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.message", containsString("cannot be linked as a duplicate of itself")));

        // 11. Safeguard: Prevent invalid duplicate chain (linking to B which is already a duplicate)
        String complaintCId = createComplaint(
                citizenSession,
                "Another report of the same wire sparking",
                "Transformer wire still sparking on road.",
                "STREET_LIGHT",
                new BigDecimal("13.0851000"),
                new BigDecimal("80.2150500")
        );

        LinkDuplicateRequest chainReq = new LinkDuplicateRequest(complaintBId, "Chaining to child duplicate", 0L);
        mockMvc.perform(post("/api/complaints/" + complaintCId + "/duplicates/link")
                        .with(csrf())
                        .session(officerSession)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(chainReq)))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.message", containsString("Invalid duplicate chain")));
    }
}
