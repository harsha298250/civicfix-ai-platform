package com.civicfix.complaint;

import com.civicfix.auth.dto.LoginRequest;
import com.civicfix.storage.TestImageHelper;
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

import static org.hamcrest.Matchers.*;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.csrf;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.multipart;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
class ComplaintGisIntegrationTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private ObjectMapper objectMapper;

    private static final String CITIZEN_EMAIL = "alex.m@citizen.org";
    private static final String OFFICER_EMAIL = "elena.vance@metro.gov";
    private static final String DEFAULT_PASSWORD = "CivicSecure#2026!";

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
    @DisplayName("GIS 1: Unauthenticated request to /api/complaints/public/map returns 200 OK with sanitized markers")
    void publicMapEndpointIsAccessibleWithoutAuthentication() throws Exception {
        mockMvc.perform(get("/api/complaints/public/map")
                        .accept(MediaType.APPLICATION_JSON))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.data").isArray());
    }

    @Test
    @DisplayName("GIS 2: Public map DTO strictly excludes citizen PII and sensitive internal fields")
    void publicMapDtoExcludesSensitiveFields() throws Exception {
        // Create a test complaint as citizen with coordinates and ward
        MockHttpSession citizenSession = loginAs(CITIZEN_EMAIL, DEFAULT_PASSWORD);

        MockMultipartFile photo = new MockMultipartFile(
                "files", "pothole.jpg", "image/jpeg", TestImageHelper.createValidJpeg(2, 2));

        mockMvc.perform(multipart("/api/complaints")
                        .file(photo)
                        .param("title", "GIS Sanitized Test Pothole")
                        .param("description", "Private citizen complaint description with personal notes")
                        .param("category", "Roads & Potholes")
                        .param("priority", "HIGH")
                        .param("address", "100 Mount Road, Chennai")
                        .param("latitude", "13.0827000")
                        .param("longitude", "80.2707000")
                        .param("ward", "Ward 08")
                        .session(citizenSession)
                        .with(csrf()))
                .andExpect(status().isCreated());

        // Check public map markers
        mockMvc.perform(get("/api/complaints/public/map")
                        .param("minLat", "13.0800")
                        .param("maxLat", "13.0900")
                        .param("minLng", "80.2600")
                        .param("maxLng", "80.2800")
                        .accept(MediaType.APPLICATION_JSON))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.data", hasSize(greaterThanOrEqualTo(1))))
                // Verify public-safe fields exist
                .andExpect(jsonPath("$.data[0].id").isNumber())
                .andExpect(jsonPath("$.data[0].category").value("Roads & Potholes"))
                .andExpect(jsonPath("$.data[0].status").value("SUBMITTED"))
                .andExpect(jsonPath("$.data[0].priority").value("HIGH"))
                .andExpect(jsonPath("$.data[0].ward").value("Ward 08"))
                .andExpect(jsonPath("$.data[0].createdAt").exists())
                // Verify coordinates are rounded to at most 3 decimal places (~110m privacy resolution)
                .andExpect(jsonPath("$.data[0].latitude").value(13.083))
                .andExpect(jsonPath("$.data[0].longitude").value(80.271))
                // Strictly verify identifying fields DO NOT EXIST in public response
                .andExpect(jsonPath("$.data[0].title").doesNotExist())
                .andExpect(jsonPath("$.data[0].referenceId").doesNotExist())
                .andExpect(jsonPath("$.data[0].address").doesNotExist())
                .andExpect(jsonPath("$.data[0].citizen").doesNotExist())
                .andExpect(jsonPath("$.data[0].citizenId").doesNotExist())
                .andExpect(jsonPath("$.data[0].citizenEmail").doesNotExist())
                .andExpect(jsonPath("$.data[0].citizenPhone").doesNotExist())
                .andExpect(jsonPath("$.data[0].description").doesNotExist())
                .andExpect(jsonPath("$.data[0].internalNotes").doesNotExist())
                .andExpect(jsonPath("$.data[0].assignedOfficer").doesNotExist())
                .andExpect(jsonPath("$.data[0].assignedWorker").doesNotExist())
                .andExpect(jsonPath("$.data[0].evidence").doesNotExist());
    }

    @Test
    @DisplayName("GIS 3: Officer queries complaints with spatial bounding box filter")
    void officerQueriesComplaintsWithBoundingBox() throws Exception {
        MockHttpSession officerSession = loginAs(OFFICER_EMAIL, DEFAULT_PASSWORD);

        mockMvc.perform(get("/api/complaints")
                        .param("minLat", "13.0000")
                        .param("maxLat", "13.2000")
                        .param("minLng", "80.1000")
                        .param("maxLng", "80.3000")
                        .session(officerSession)
                        .accept(MediaType.APPLICATION_JSON))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.data.content").isArray());
    }

    @Test
    @DisplayName("GIS 4: Inverted bounding box (minLat > maxLat) returns 400 Bad Request")
    void invertedBoundingBoxReturnsBadRequest() throws Exception {
        MockHttpSession officerSession = loginAs(OFFICER_EMAIL, DEFAULT_PASSWORD);

        mockMvc.perform(get("/api/complaints")
                        .param("minLat", "13.5000")
                        .param("maxLat", "13.1000") // Inverted!
                        .param("minLng", "80.1000")
                        .param("maxLng", "80.3000")
                        .session(officerSession)
                        .accept(MediaType.APPLICATION_JSON))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.status").value(400))
                .andExpect(jsonPath("$.message", containsString("minLat cannot be greater than maxLat")));
    }

    @Test
    @DisplayName("GIS 5: Incomplete bounding box parameters return 400 Bad Request")
    void incompleteBoundingBoxReturnsBadRequest() throws Exception {
        mockMvc.perform(get("/api/complaints/public/map")
                        .param("minLat", "13.0000")
                        // maxLat missing!
                        .param("minLng", "80.1000")
                        .param("maxLng", "80.3000")
                        .accept(MediaType.APPLICATION_JSON))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.status").value(400))
                .andExpect(jsonPath("$.message", containsString("All bounding box coordinates")));
    }

    @Test
    @DisplayName("GIS 6: Officer queries complaints filtered by ward")
    void officerQueriesComplaintsFilteredByWard() throws Exception {
        MockHttpSession officerSession = loginAs(OFFICER_EMAIL, DEFAULT_PASSWORD);

        mockMvc.perform(get("/api/complaints")
                        .param("ward", "Ward 08")
                        .session(officerSession)
                        .accept(MediaType.APPLICATION_JSON))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.data.content").isArray());
    }

    @Test
    @DisplayName("GIS 7: Unauthenticated request to private /api/complaints returns 401 Unauthorized")
    void privateComplaintsEndpointRequiresAuthentication() throws Exception {
        mockMvc.perform(get("/api/complaints")
                        .accept(MediaType.APPLICATION_JSON))
                .andExpect(status().isUnauthorized());
    }

    @Test
    @DisplayName("GIS 8: Reverse geocode proxy endpoint returns structured address")
    void reverseGeocodeProxyEndpointReturnsResponse() throws Exception {
        mockMvc.perform(get("/api/gis/reverse-geocode")
                        .param("lat", "13.0827")
                        .param("lng", "80.2707")
                        .accept(MediaType.APPLICATION_JSON))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.data.lat").value(13.0827))
                .andExpect(jsonPath("$.data.lng").value(80.2707));
    }
}
