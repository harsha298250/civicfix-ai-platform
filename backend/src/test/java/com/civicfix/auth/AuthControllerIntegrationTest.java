package com.civicfix.auth;

import com.civicfix.auth.dto.LoginRequest;
import com.civicfix.auth.dto.RegisterCitizenRequest;
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

import static org.hamcrest.Matchers.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
class AuthControllerIntegrationTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private ObjectMapper objectMapper;

    @Test
    @DisplayName("POST /api/auth/register - Successfully creates CITIZEN account")
    void testCitizenRegistrationSuccess() throws Exception {
        RegisterCitizenRequest req = new RegisterCitizenRequest();
        req.setName("Suresh Raina");
        req.setEmail("suresh.raina." + System.currentTimeMillis() + "@civic.org");
        req.setPhone("+91 97000 " + (10000 + (int)(Math.random() * 90000)));
        req.setWard("Ward 12, T. Nagar, Chennai");
        req.setPassword("SecureCitizenPass#2026");

        mockMvc.perform(post("/api/auth/register")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(req)))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.success", is(true)))
                .andExpect(jsonPath("$.data.name", is("Suresh Raina")))
                .andExpect(jsonPath("$.data.role", is("CITIZEN")))
                .andExpect(jsonPath("$.data.roles", hasItem("CITIZEN")));
    }

    @Test
    @DisplayName("POST /api/auth/register - Rejects duplicate email with 409 Conflict")
    void testDuplicateEmailRegistrationRejected() throws Exception {
        RegisterCitizenRequest req = new RegisterCitizenRequest();
        req.setName("Alex Duplicate Test");
        req.setEmail("alex.m@citizen.org"); // Existing seed user email
        req.setPassword("ValidPassword123!");

        mockMvc.perform(post("/api/auth/register")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(req)))
                .andExpect(status().isConflict())
                .andExpect(jsonPath("$.error", is("Conflict")))
                .andExpect(jsonPath("$.message", containsString("already registered")));
    }

    @Test
    @DisplayName("POST /api/auth/login - Seed user authenticates with demo credentials")
    void testSeedUserLoginSuccess() throws Exception {
        LoginRequest req = new LoginRequest("alex.m@citizen.org", "CivicSecure#2026!");

        mockMvc.perform(post("/api/auth/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(req)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success", is(true)))
                .andExpect(jsonPath("$.data.email", is("alex.m@citizen.org")))
                .andExpect(jsonPath("$.data.role", is("CITIZEN")));
    }

    @Test
    @DisplayName("POST /api/auth/login - Invalid password rejected with 401 Unauthorized")
    void testInvalidPasswordRejected() throws Exception {
        LoginRequest req = new LoginRequest("alex.m@citizen.org", "WrongPassword!999");

        mockMvc.perform(post("/api/auth/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(req)))
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.error", is("Unauthorized")))
                .andExpect(jsonPath("$.message", containsString("Invalid credentials")));
    }

    @Test
    @DisplayName("GET /api/auth/me - Anonymous access returns 401 Unauthorized")
    void testGetMeAnonymousFails() throws Exception {
        mockMvc.perform(get("/api/auth/me"))
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.status", is(401)))
                .andExpect(jsonPath("$.error", is("Unauthorized")));
    }

    @Test
    @DisplayName("GET /api/auth/me - Authenticated session returns user profile")
    void testGetMeWithSessionSuccess() throws Exception {
        LoginRequest req = new LoginRequest("alex.m@citizen.org", "CivicSecure#2026!");

        MvcResult loginResult = mockMvc.perform(post("/api/auth/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(req)))
                .andExpect(status().isOk())
                .andReturn();

        MockHttpSession session = (MockHttpSession) loginResult.getRequest().getSession();

        mockMvc.perform(get("/api/auth/me").session(session))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success", is(true)))
                .andExpect(jsonPath("$.data.email", is("alex.m@citizen.org")))
                .andExpect(jsonPath("$.data.name", is("Alex Morgan")));
    }
}
