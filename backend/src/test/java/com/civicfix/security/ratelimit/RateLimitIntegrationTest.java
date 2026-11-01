package com.civicfix.security.ratelimit;

import com.civicfix.auth.AuthController;
import com.civicfix.auth.AuthService;
import com.civicfix.auth.dto.RegisterCitizenRequest;
import com.civicfix.common.exception.GlobalExceptionHandler;
import com.civicfix.gis.GisController;
import com.civicfix.gis.GisService;
import com.civicfix.gis.dto.ReverseGeocodeResponse;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;

import java.time.Duration;

import static org.hamcrest.Matchers.*;
import static org.mockito.ArgumentMatchers.anyDouble;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@ExtendWith(MockitoExtension.class)
class RateLimitIntegrationTest {

    private MockMvc mockMvc;
    private final ObjectMapper objectMapper = new ObjectMapper();

    @Mock
    private GisService gisService;

    @Mock
    private AuthService authService;

    private RateLimiterService rateLimiterService;

    @BeforeEach
    void setUp() {
        rateLimiterService = new RateLimiterService();
        RateLimitProperties properties = new RateLimitProperties();
        properties.getRegister().setCapacity(5);
        properties.getRegister().setDuration(Duration.ofHours(1));
        properties.getReverseGeocode().setCapacity(3);
        properties.getReverseGeocode().setDuration(Duration.ofMinutes(1));

        ClientIpResolver clientIpResolver = new ClientIpResolver(false);
        RateLimitInterceptor interceptor = new RateLimitInterceptor(rateLimiterService, properties, clientIpResolver);

        GisController gisController = new GisController(gisService);
        AuthController authController = new AuthController(authService, clientIpResolver);

        mockMvc = MockMvcBuilders.standaloneSetup(gisController, authController)
                .setControllerAdvice(new GlobalExceptionHandler())
                .addInterceptors(interceptor)
                .build();
    }

    @Test
    @DisplayName("Reverse geocode endpoint returns 429 with Retry-After header when rate limit is exceeded")
    void testReverseGeocodeRateLimitExceeded() throws Exception {
        ReverseGeocodeResponse sampleGis = new ReverseGeocodeResponse();
        sampleGis.setSuccess(true);
        sampleGis.setDisplayName("Anna Nagar, Chennai");
        when(gisService.reverseGeocode(anyDouble(), anyDouble()))
                .thenReturn(sampleGis);

        String testIp = "192.0.2.77";

        for (int i = 0; i < 3; i++) {
            mockMvc.perform(get("/api/gis/reverse-geocode")
                            .param("lat", "13.0827")
                            .param("lng", "80.2707")
                            .with(req -> {
                                req.setRemoteAddr(testIp);
                                return req;
                            }))
                    .andExpect(status().isOk());
        }

        // 4th request must be rate limited
        mockMvc.perform(get("/api/gis/reverse-geocode")
                        .param("lat", "13.0827")
                        .param("lng", "80.2707")
                        .with(req -> {
                            req.setRemoteAddr(testIp);
                            return req;
                        }))
                .andExpect(status().isTooManyRequests())
                .andExpect(header().exists("Retry-After"))
                .andExpect(jsonPath("$.status", is(429)))
                .andExpect(jsonPath("$.error", is("Too Many Requests")))
                .andExpect(jsonPath("$.message", containsString("Reverse geocoding rate limit exceeded")))
                .andExpect(jsonPath("$.retryAfterSeconds", greaterThan(0)));
    }

    @Test
    @DisplayName("Register endpoint returns 429 when registration rate limit is exceeded")
    void testRegisterRateLimitExceeded() throws Exception {
        String testIp = "192.0.2.88";

        for (int i = 0; i < 5; i++) {
            RegisterCitizenRequest req = new RegisterCitizenRequest();
            req.setName("Citizen " + i);
            req.setEmail("citizen.limit." + i + "@test.org");
            req.setPassword("ValidPass#2026!");

            mockMvc.perform(post("/api/auth/register")
                            .with(request -> {
                                request.setRemoteAddr(testIp);
                                return request;
                            })
                            .contentType(MediaType.APPLICATION_JSON)
                            .content(objectMapper.writeValueAsString(req)))
                    .andExpect(status().isCreated());
        }

        // 6th registration from the same IP must be rejected with 429
        RegisterCitizenRequest req6 = new RegisterCitizenRequest();
        req6.setName("Citizen 6");
        req6.setEmail("citizen.limit.6@test.org");
        req6.setPassword("ValidPass#2026!");

        mockMvc.perform(post("/api/auth/register")
                        .with(request -> {
                            request.setRemoteAddr(testIp);
                            return request;
                        })
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(req6)))
                .andExpect(status().isTooManyRequests())
                .andExpect(header().exists("Retry-After"))
                .andExpect(jsonPath("$.status", is(429)))
                .andExpect(jsonPath("$.error", is("Too Many Requests")))
                .andExpect(jsonPath("$.message", containsString("Registration rate limit exceeded")))
                .andExpect(jsonPath("$.retryAfterSeconds", greaterThan(0)));
    }
}
