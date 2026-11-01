package com.civicfix.complaint;

import com.civicfix.auth.dto.LoginRequest;
import com.civicfix.auth.dto.RegisterCitizenRequest;
import com.civicfix.complaint.dto.AssignComplaintRequest;
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
import org.springframework.mock.web.MockMultipartFile;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.MvcResult;

import java.util.UUID;

import static org.hamcrest.Matchers.*;
import static org.junit.jupiter.api.Assertions.*;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.csrf;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.multipart;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.header;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
class CitizenComplaintPhotoIntegrationTest {

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

    @Test
    @DisplayName("Step 2.2: Citizen creates complaint with a single valid photo")
    void citizenCreatesComplaintWithSinglePhoto() throws Exception {
        MockHttpSession citizenSession = loginAs(CITIZEN_EMAIL, DEFAULT_PASSWORD);

        byte[] photoBytes = TestImageHelper.createValidJpeg(2, 2);
        MockMultipartFile file = new MockMultipartFile(
                "files",
                "broken_manhole.jpg",
                "image/jpeg",
                photoBytes
        );

        MvcResult result = mockMvc.perform(multipart("/api/complaints")
                        .file(file)
                        .param("title", "Broken manhole cover on 3rd Avenue")
                        .param("description", "Exposed deep sewer manhole posing immediate traffic hazard.")
                        .param("category", "ROADS")
                        .param("priority", "HIGH")
                        .param("address", "3rd Avenue, Anna Nagar, Chennai")
                        .param("ward", "Ward 08")
                        .param("latitude", "13.0845000")
                        .param("longitude", "80.2155000")
                        .with(csrf())
                        .session(citizenSession))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.success", is(true)))
                .andExpect(jsonPath("$.data.photos", hasSize(1)))
                .andReturn();

        JsonNode json = objectMapper.readTree(result.getResponse().getContentAsString());
        String photoUrl = json.get("data").get("photos").get(0).asText();
        assertNotNull(photoUrl);
        String filename = photoUrl.substring(photoUrl.lastIndexOf('/') + 1);

        // Citizen author can retrieve the photo
        MvcResult citizenGet = mockMvc.perform(get("/api/complaints/evidence/files/" + filename)
                        .session(citizenSession))
                .andExpect(status().isOk())
                .andReturn();
        assertArrayEquals(photoBytes, citizenGet.getResponse().getContentAsByteArray());
    }

    @Test
    @DisplayName("Step 2.2: Citizen creates complaint with multiple valid photos (batch upload)")
    void citizenCreatesComplaintWithMultiplePhotos() throws Exception {
        MockHttpSession citizenSession = loginAs(CITIZEN_EMAIL, DEFAULT_PASSWORD);
        MockHttpSession officerSession = loginAs(OFFICER_EMAIL, DEFAULT_PASSWORD);

        MockMultipartFile photo1 = new MockMultipartFile(
                "files",
                "pothole_angle1.jpg",
                "image/jpeg",
                TestImageHelper.createValidJpeg(2, 2)
        );
        MockMultipartFile photo2 = new MockMultipartFile(
                "files",
                "pothole_angle2.png",
                "image/png",
                TestImageHelper.createValidPng(2, 2)
        );

        MvcResult result = mockMvc.perform(multipart("/api/complaints")
                        .file(photo1)
                        .file(photo2)
                        .param("title", "Craters across crossroad intersection")
                        .param("description", "Multiple interconnected road depressions near school zone.")
                        .param("category", "ROADS")
                        .param("priority", "CRITICAL")
                        .param("address", "School Road, Anna Nagar")
                        .param("ward", "Ward 08")
                        .param("latitude", "13.0850000")
                        .param("longitude", "80.2160000")
                        .with(csrf())
                        .session(citizenSession))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.success", is(true)))
                .andExpect(jsonPath("$.data.photos", hasSize(2)))
                .andReturn();

        JsonNode json = objectMapper.readTree(result.getResponse().getContentAsString());
        String photoUrl1 = json.get("data").get("photos").get(0).asText();
        String photoUrl2 = json.get("data").get("photos").get(1).asText();

        String file1 = photoUrl1.substring(photoUrl1.lastIndexOf('/') + 1);
        String file2 = photoUrl2.substring(photoUrl2.lastIndexOf('/') + 1);

        // Officer can retrieve both intake photos
        mockMvc.perform(get("/api/complaints/evidence/files/" + file1).session(officerSession))
                .andExpect(status().isOk());
        mockMvc.perform(get("/api/complaints/evidence/files/" + file2).session(officerSession))
                .andExpect(status().isOk());
    }

    @Test
    @DisplayName("Step 2.2: Complaint creation without photos still succeeds (backward compatibility)")
    void complaintCreationWithoutPhotosSucceeds() throws Exception {
        MockHttpSession citizenSession = loginAs(CITIZEN_EMAIL, DEFAULT_PASSWORD);

        String jsonPayload = """
                {
                    "title": "Street light flickering repeatedly",
                    "description": "Sodium vapor bulb blinking and creating strobe effect at night.",
                    "category": "LIGHTING",
                    "priority": "LOW",
                    "address": "4th Main Road, Anna Nagar",
                    "ward": "Ward 08",
                    "latitude": 13.0841,
                    "longitude": 80.2150
                }
                """;

        mockMvc.perform(post("/api/complaints")
                        .with(csrf())
                        .session(citizenSession)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(jsonPayload))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.success", is(true)))
                .andExpect(jsonPath("$.data.photos", hasSize(0)));
    }

    @Test
    @DisplayName("Step 2.2: Invalid file type (e.g. text/plain or exe) is rejected with 400 Bad Request")
    void invalidFileTypeRejected() throws Exception {
        MockHttpSession citizenSession = loginAs(CITIZEN_EMAIL, DEFAULT_PASSWORD);

        MockMultipartFile badFile = new MockMultipartFile(
                "files",
                "script.sh",
                "text/x-shellscript",
                "#!/bin/bash\necho Malicious".getBytes()
        );

        mockMvc.perform(multipart("/api/complaints")
                        .file(badFile)
                        .param("title", "Testing bad file attachment")
                        .param("description", "Valid description for bad file test.")
                        .param("category", "ROADS")
                        .param("priority", "LOW")
                        .param("address", "Anna Nagar")
                        .param("ward", "Ward 08")
                        .param("latitude", "13.0841")
                        .param("longitude", "80.2150")
                        .with(csrf())
                        .session(citizenSession))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.message", containsString("Invalid file type")));
    }

    @Test
    @DisplayName("Step 2.2: Exceeding 5 photos is rejected with 400 Bad Request")
    void exceedingMaxPhotosRejected() throws Exception {
        MockHttpSession citizenSession = loginAs(CITIZEN_EMAIL, DEFAULT_PASSWORD);

        MockMultipartFile f1 = new MockMultipartFile("files", "p1.jpg", "image/jpeg", TestImageHelper.createValidJpeg(2, 2));
        MockMultipartFile f2 = new MockMultipartFile("files", "p2.jpg", "image/jpeg", TestImageHelper.createValidJpeg(2, 2));
        MockMultipartFile f3 = new MockMultipartFile("files", "p3.jpg", "image/jpeg", TestImageHelper.createValidJpeg(2, 2));
        MockMultipartFile f4 = new MockMultipartFile("files", "p4.jpg", "image/jpeg", TestImageHelper.createValidJpeg(2, 2));
        MockMultipartFile f5 = new MockMultipartFile("files", "p5.jpg", "image/jpeg", TestImageHelper.createValidJpeg(2, 2));
        MockMultipartFile f6 = new MockMultipartFile("files", "p6.jpg", "image/jpeg", TestImageHelper.createValidJpeg(2, 2));

        mockMvc.perform(multipart("/api/complaints")
                        .file(f1).file(f2).file(f3).file(f4).file(f5).file(f6)
                        .param("title", "Too many photos complaint")
                        .param("description", "Testing maximum photo validation rule.")
                        .param("category", "ROADS")
                        .param("priority", "MEDIUM")
                        .param("address", "Anna Nagar")
                        .param("ward", "Ward 08")
                        .param("latitude", "13.0841")
                        .param("longitude", "80.2150")
                        .with(csrf())
                        .session(citizenSession))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.message", containsString("maximum of 5 incident photographs")));
    }

    @Test
    @DisplayName("Step 2.2: Unauthenticated upload is rejected")
    void unauthenticatedUploadRejected() throws Exception {
        MockMultipartFile file = new MockMultipartFile(
                "files",
                "pothole.jpg",
                "image/jpeg",
                TestImageHelper.createValidJpeg(2, 2)
        );

        mockMvc.perform(multipart("/api/complaints")
                        .file(file)
                        .param("title", "Unauthorized complaint test")
                        .param("description", "Unauthenticated request should fail.")
                        .param("category", "ROADS")
                        .param("address", "Anna Nagar")
                        .with(csrf()))
                .andExpect(status().isUnauthorized());
    }

    @Test
    @DisplayName("Step 2.2: Privacy enforcement - Another citizen cannot retrieve complaint author's private intake photo")
    void unauthorizedCitizenCannotAccessOtherCitizenPhoto() throws Exception {
        MockHttpSession citizenSession = loginAs(CITIZEN_EMAIL, DEFAULT_PASSWORD);

        MockMultipartFile file = new MockMultipartFile(
                "files",
                "private_defect.jpg",
                "image/jpeg",
                TestImageHelper.createValidJpeg(2, 2)
        );

        MvcResult createResult = mockMvc.perform(multipart("/api/complaints")
                        .file(file)
                        .param("title", "Private property border water leakage")
                        .param("description", "Leakage near private residential compound.")
                        .param("category", "WATER_SUPPLY")
                        .param("priority", "MEDIUM")
                        .param("address", "Private Residential Lane")
                        .param("ward", "Ward 08")
                        .param("latitude", "13.0841")
                        .param("longitude", "80.2150")
                        .with(csrf())
                        .session(citizenSession))
                .andExpect(status().isCreated())
                .andReturn();

        JsonNode json = objectMapper.readTree(createResult.getResponse().getContentAsString());
        String photoUrl = json.get("data").get("photos").get(0).asText();
        String filename = photoUrl.substring(photoUrl.lastIndexOf('/') + 1);

        // Register a second citizen
        RegisterCitizenRequest otherCitizenReq = new RegisterCitizenRequest();
        otherCitizenReq.setName("Inquisitive Neighbor");
        String otherEmail = "neighbor." + System.currentTimeMillis() + "@civic.org";
        otherCitizenReq.setEmail(otherEmail);
        otherCitizenReq.setPhone("+91 96" + (10000000 + (int)(Math.random() * 89999999)));
        otherCitizenReq.setWard("Ward 08");
        otherCitizenReq.setPassword(DEFAULT_PASSWORD);

        mockMvc.perform(post("/api/auth/register")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(otherCitizenReq)))
                .andExpect(status().isCreated());

        MockHttpSession neighborSession = loginAs(otherEmail, DEFAULT_PASSWORD);

        // Attempt retrieval of private photo -> 403 Forbidden
        mockMvc.perform(get("/api/complaints/evidence/files/" + filename)
                        .session(neighborSession))
                .andExpect(status().isForbidden());
    }

    @Test
    @DisplayName("Step 2.2: Assigned worker can view citizen's intake photo, but unassigned worker is rejected")
    void workerAccessPolicyOnCitizenPhoto() throws Exception {
        MockHttpSession citizenSession = loginAs(CITIZEN_EMAIL, DEFAULT_PASSWORD);
        MockHttpSession officerSession = loginAs(OFFICER_EMAIL, DEFAULT_PASSWORD);
        MockHttpSession workerSession = loginAs(WORKER_EMAIL, DEFAULT_PASSWORD);

        MockMultipartFile file = new MockMultipartFile(
                "files",
                "road_hazard.jpg",
                "image/jpeg",
                TestImageHelper.createValidJpeg(2, 2)
        );

        MvcResult createResult = mockMvc.perform(multipart("/api/complaints")
                        .file(file)
                        .param("title", "Road hazard for worker access test")
                        .param("description", "Cracked asphalt requiring worker inspection.")
                        .param("category", "ROADS")
                        .param("priority", "HIGH")
                        .param("address", "Hazard Street, Anna Nagar")
                        .param("ward", "Ward 08")
                        .param("latitude", "13.0841")
                        .param("longitude", "80.2150")
                        .with(csrf())
                        .session(citizenSession))
                .andExpect(status().isCreated())
                .andReturn();

        JsonNode json = objectMapper.readTree(createResult.getResponse().getContentAsString());
        String complaintId = json.get("data").get("id").asText();
        String photoUrl = json.get("data").get("photos").get(0).asText();
        String filename = photoUrl.substring(photoUrl.lastIndexOf('/') + 1);

        // Before assignment, Marcus Chen is not assigned to this complaint -> 403 Forbidden
        mockMvc.perform(get("/api/complaints/evidence/files/" + filename)
                        .session(workerSession))
                .andExpect(status().isForbidden());

        // Officer assigns Marcus Chen
        AssignComplaintRequest assignReq = new AssignComplaintRequest();
        assignReq.setWorkerId(MARCUS_CHEN_ID);
        assignReq.setNotes("Assigned to Marcus Chen for inspection.");
        mockMvc.perform(post("/api/complaints/" + complaintId + "/assign")
                        .with(csrf())
                        .session(officerSession)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(assignReq)))
                .andExpect(status().isOk());

        // Now that Marcus Chen is assigned, he can view the citizen's intake photo -> 200 OK with hardened caching & nosniff headers
        mockMvc.perform(get("/api/complaints/evidence/files/" + filename)
                        .session(workerSession))
                .andExpect(status().isOk())
                .andExpect(header().string("Cache-Control", "private, no-store"))
                .andExpect(header().string("X-Content-Type-Options", "nosniff"));
    }

    @Test
    @DisplayName("Step 2.2: Citizen can add additional photos to existing complaint via POST /api/complaints/{id}/photos")
    void citizenCanAddPhotosToExistingComplaint() throws Exception {
        MockHttpSession citizenSession = loginAs(CITIZEN_EMAIL, DEFAULT_PASSWORD);

        // Create complaint without photos initially
        String jsonPayload = """
                {
                    "title": "Park bench broken at children playground",
                    "description": "Wood slats collapsed on bench near swings.",
                    "category": "PARKS",
                    "priority": "LOW",
                    "address": "Tower Park, Anna Nagar",
                    "ward": "Ward 08",
                    "latitude": 13.0841,
                    "longitude": 80.2150
                }
                """;

        MvcResult createResult = mockMvc.perform(post("/api/complaints")
                        .with(csrf())
                        .session(citizenSession)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(jsonPayload))
                .andExpect(status().isCreated())
                .andReturn();

        JsonNode json = objectMapper.readTree(createResult.getResponse().getContentAsString());
        String complaintId = json.get("data").get("id").asText();

        // Citizen uploads follow-up photo
        MockMultipartFile followUpPhoto = new MockMultipartFile(
                "files",
                "bench_followup.jpg",
                "image/jpeg",
                TestImageHelper.createValidJpeg(2, 2)
        );

        mockMvc.perform(multipart("/api/complaints/" + complaintId + "/photos")
                        .file(followUpPhoto)
                        .with(csrf())
                        .session(citizenSession))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success", is(true)))
                .andExpect(jsonPath("$.data.photos", hasSize(1)));
    }
}
