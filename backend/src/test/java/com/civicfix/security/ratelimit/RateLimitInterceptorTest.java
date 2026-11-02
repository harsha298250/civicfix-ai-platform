package com.civicfix.security.ratelimit;

import com.civicfix.common.exception.RateLimitExceededException;
import com.civicfix.security.UserPrincipal;
import com.civicfix.user.User;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.mock.web.MockHttpServletRequest;
import org.springframework.mock.web.MockHttpServletResponse;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.context.SecurityContextHolder;

import java.time.Duration;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.*;

class RateLimitInterceptorTest {

    private RateLimiterService rateLimiterService;
    private RateLimitProperties properties;
    private RateLimitInterceptor interceptor;

    @BeforeEach
    void setUp() {
        rateLimiterService = new RateLimiterService();
        properties = new RateLimitProperties();
        properties.getRegister().setCapacity(5);
        properties.getRegister().setDuration(Duration.ofHours(1));
        properties.getReverseGeocode().setCapacity(30);
        properties.getReverseGeocode().setDuration(Duration.ofMinutes(1));
        properties.getComplaintCreate().setCapacity(10);
        properties.getComplaintCreate().setDuration(Duration.ofMinutes(1));
        properties.getUpload().setCapacity(10);
        properties.getUpload().setDuration(Duration.ofMinutes(1));

        interceptor = new RateLimitInterceptor(rateLimiterService, properties, new ClientIpResolver(false));
        SecurityContextHolder.clearContext();
    }

    @Test
    @DisplayName("Should enforce 5 registrations per IP per hour")
    void shouldEnforceRegisterRateLimit() {
        String ip = "203.0.113.1";
        MockHttpServletResponse response = new MockHttpServletResponse();

        for (int i = 0; i < 5; i++) {
            MockHttpServletRequest req = new MockHttpServletRequest("POST", "/api/auth/register");
            req.setRemoteAddr(ip);
            assertTrue(interceptor.preHandle(req, response, new Object()));
        }

        MockHttpServletRequest req6 = new MockHttpServletRequest("POST", "/api/auth/register");
        req6.setRemoteAddr(ip);

        RateLimitExceededException ex = assertThrows(RateLimitExceededException.class, () ->
                interceptor.preHandle(req6, response, new Object())
        );
        assertTrue(ex.getMessage().contains("Registration rate limit exceeded"));
        assertTrue(ex.getRetryAfterSeconds() > 0);
    }

    @Test
    @DisplayName("Should enforce 30 reverse geocode queries per IP per minute")
    void shouldEnforceReverseGeocodeRateLimit() {
        String ip = "203.0.113.2";
        MockHttpServletResponse response = new MockHttpServletResponse();

        for (int i = 0; i < 30; i++) {
            MockHttpServletRequest req = new MockHttpServletRequest("GET", "/api/gis/reverse-geocode");
            req.setRemoteAddr(ip);
            assertTrue(interceptor.preHandle(req, response, new Object()));
        }

        MockHttpServletRequest req31 = new MockHttpServletRequest("GET", "/api/gis/reverse-geocode");
        req31.setRemoteAddr(ip);

        RateLimitExceededException ex = assertThrows(RateLimitExceededException.class, () ->
                interceptor.preHandle(req31, response, new Object())
        );
        assertTrue(ex.getMessage().contains("Reverse geocoding rate limit exceeded"));
    }

    @Test
    @DisplayName("Should enforce 10 complaint submissions per user per minute")
    void shouldEnforceComplaintCreateRateLimit() {
        User user = new User();
        user.setId(UUID.randomUUID());
        user.setFullName("Citizen Test");
        user.setEmail("citizen@test.org");
        user.setPasswordHash("hashed");
        UserPrincipal principal = new UserPrincipal(user);

        SecurityContextHolder.getContext().setAuthentication(
                new UsernamePasswordAuthenticationToken(principal, null, principal.getAuthorities())
        );

        MockHttpServletResponse response = new MockHttpServletResponse();

        for (int i = 0; i < 10; i++) {
            MockHttpServletRequest req = new MockHttpServletRequest("POST", "/api/complaints");
            assertTrue(interceptor.preHandle(req, response, new Object()));
        }

        MockHttpServletRequest req11 = new MockHttpServletRequest("POST", "/api/complaints");
        RateLimitExceededException ex = assertThrows(RateLimitExceededException.class, () ->
                interceptor.preHandle(req11, response, new Object())
        );
        assertTrue(ex.getMessage().contains("Complaint submission rate limit exceeded"));
    }

    @Test
    @DisplayName("Should enforce 10 photo and evidence uploads per user per minute")
    void shouldEnforceUploadRateLimit() {
        User user = new User();
        user.setId(UUID.randomUUID());
        user.setFullName("Worker Test");
        user.setEmail("worker@test.org");
        user.setPasswordHash("hashed");
        UserPrincipal principal = new UserPrincipal(user);

        SecurityContextHolder.getContext().setAuthentication(
                new UsernamePasswordAuthenticationToken(principal, null, principal.getAuthorities())
        );

        MockHttpServletResponse response = new MockHttpServletResponse();
        String complaintId = UUID.randomUUID().toString();

        for (int i = 0; i < 10; i++) {
            String path = (i % 2 == 0)
                    ? "/api/complaints/" + complaintId + "/photos"
                    : "/api/complaints/" + complaintId + "/evidence";
            MockHttpServletRequest req = new MockHttpServletRequest("POST", path);
            assertTrue(interceptor.preHandle(req, response, new Object()));
        }

        MockHttpServletRequest req11 = new MockHttpServletRequest("POST", "/api/complaints/" + complaintId + "/photos");
        RateLimitExceededException ex = assertThrows(RateLimitExceededException.class, () ->
                interceptor.preHandle(req11, response, new Object())
        );
        assertTrue(ex.getMessage().contains("Upload rate limit exceeded"));
    }

    @Test
    @DisplayName("Should enforce 60 public features requests per IP per minute")
    void shouldEnforcePublicFeaturesRateLimit() {
        String ip = "198.51.100.22";
        MockHttpServletResponse response = new MockHttpServletResponse();

        for (int i = 0; i < 60; i++) {
            MockHttpServletRequest req = new MockHttpServletRequest("GET", "/api/public/features");
            req.setRemoteAddr(ip);
            assertTrue(interceptor.preHandle(req, response, new Object()));
        }

        MockHttpServletRequest req61 = new MockHttpServletRequest("GET", "/api/public/features");
        req61.setRemoteAddr(ip);

        RateLimitExceededException ex = assertThrows(RateLimitExceededException.class, () ->
                interceptor.preHandle(req61, response, new Object())
        );
        assertTrue(ex.getMessage().contains("Public features rate limit exceeded"));
    }
}

