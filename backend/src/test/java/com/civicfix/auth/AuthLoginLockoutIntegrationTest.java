package com.civicfix.auth;

import com.civicfix.audit.AuditService;
import com.civicfix.auth.dto.LoginRequest;
import com.civicfix.common.exception.GlobalExceptionHandler;
import com.civicfix.security.ratelimit.ClientIpResolver;
import com.civicfix.security.ratelimit.LoginLockoutService;
import com.civicfix.security.ratelimit.RateLimitProperties;
import com.civicfix.security.ratelimit.RateLimiterService;
import com.civicfix.user.RoleRepository;
import com.civicfix.user.UserRepository;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.http.MediaType;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.BadCredentialsException;
import org.springframework.security.core.userdetails.UsernameNotFoundException;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;

import java.time.Duration;

import static org.hamcrest.Matchers.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@ExtendWith(MockitoExtension.class)
class AuthLoginLockoutIntegrationTest {

    private MockMvc mockMvc;
    private final ObjectMapper objectMapper = new ObjectMapper();

    @Mock
    private UserRepository userRepository;

    @Mock
    private RoleRepository roleRepository;

    @Mock
    private PasswordEncoder passwordEncoder;

    @Mock
    private AuthenticationManager authenticationManager;

    @Mock
    private AuditService auditService;

    private RateLimiterService rateLimiterService;
    private LoginLockoutService loginLockoutService;

    @BeforeEach
    void setUp() {
        rateLimiterService = new RateLimiterService();
        RateLimitProperties properties = new RateLimitProperties();
        properties.getLogin().setCapacity(5);
        properties.getLogin().setDuration(Duration.ofMinutes(15));

        loginLockoutService = new LoginLockoutService(rateLimiterService, properties);

        ClientIpResolver clientIpResolver = new ClientIpResolver(false);

        AuthService authService = new AuthService(
                userRepository,
                roleRepository,
                passwordEncoder,
                authenticationManager,
                auditService,
                loginLockoutService,
                clientIpResolver
        );

        AuthController authController = new AuthController(authService, clientIpResolver);

        mockMvc = MockMvcBuilders.standaloneSetup(authController)
                .setControllerAdvice(new GlobalExceptionHandler())
                .build();
    }

    @Test
    @DisplayName("5 consecutive wrong password attempts return 401; the 6th returns 429 with Retry-After header")
    void testSixthFailedLoginReturns429Lockout() throws Exception {
        when(authenticationManager.authenticate(any()))
                .thenThrow(new BadCredentialsException("Bad credentials"));

        String testEmail = "lockout.test@citizen.org";
        String testIp = "198.51.100.42";

        LoginRequest badReq = new LoginRequest(testEmail, "WrongPassword#123");

        // Attempts 1 to 5: must return 401 Unauthorized with uniform error message
        for (int i = 1; i <= 5; i++) {
            mockMvc.perform(post("/api/auth/login")
                            .with(request -> {
                                request.setRemoteAddr(testIp);
                                return request;
                            })
                            .contentType(MediaType.APPLICATION_JSON)
                            .content(objectMapper.writeValueAsString(badReq)))
                    .andExpect(status().isUnauthorized())
                    .andExpect(jsonPath("$.status", is(401)))
                    .andExpect(jsonPath("$.message", containsString("Invalid credentials")));
        }

        // Attempt 6: MUST return 429 Too Many Requests with Retry-After header
        mockMvc.perform(post("/api/auth/login")
                        .with(request -> {
                            request.setRemoteAddr(testIp);
                            return request;
                        })
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(badReq)))
                .andExpect(status().isTooManyRequests())
                .andExpect(header().exists("Retry-After"))
                .andExpect(jsonPath("$.status", is(429)))
                .andExpect(jsonPath("$.error", is("Too Many Requests")))
                .andExpect(jsonPath("$.message", containsString("Account temporarily locked")))
                .andExpect(jsonPath("$.retryAfterSeconds", greaterThan(0)));
    }

    @Test
    @DisplayName("Acceptance: Sending 6 wrong passwords with a different fake X-Forwarded-For each time still returns 429")
    void testFakeXForwardedForCannotBypassLockout() throws Exception {
        when(authenticationManager.authenticate(any()))
                .thenThrow(new BadCredentialsException("Bad credentials"));

        String targetEmail = "spoof.target@citizen.org";
        String attackerRemoteIp = "198.51.100.42";

        LoginRequest badReq = new LoginRequest(targetEmail, "WrongPassword#123");

        // Attacker attempts 5 wrong passwords with a different fake X-Forwarded-For and X-Real-IP each time
        for (int i = 1; i <= 5; i++) {
            mockMvc.perform(post("/api/auth/login")
                            .with(request -> {
                                request.setRemoteAddr(attackerRemoteIp);
                                return request;
                            })
                            .header("X-Forwarded-For", "203.0.113." + i + ", 10.0.0." + i)
                            .header("X-Real-IP", "10.0.0." + i)
                            .contentType(MediaType.APPLICATION_JSON)
                            .content(objectMapper.writeValueAsString(badReq)))
                    .andExpect(status().isUnauthorized())
                    .andExpect(jsonPath("$.status", is(401)))
                    .andExpect(jsonPath("$.message", containsString("Invalid credentials")));
        }

        // Attempt 6 with yet another spoofed IP: MUST return 429 because untrusted proxy headers are ignored
        mockMvc.perform(post("/api/auth/login")
                        .with(request -> {
                            request.setRemoteAddr(attackerRemoteIp);
                            return request;
                        })
                        .header("X-Forwarded-For", "203.0.113.99")
                        .header("X-Real-IP", "10.0.0.99")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(badReq)))
                .andExpect(status().isTooManyRequests())
                .andExpect(header().exists("Retry-After"))
                .andExpect(jsonPath("$.status", is(429)))
                .andExpect(jsonPath("$.error", is("Too Many Requests")))
                .andExpect(jsonPath("$.message", containsString("Account temporarily locked")))
                .andExpect(jsonPath("$.retryAfterSeconds", greaterThan(0)));
    }

    @Test
    @DisplayName("Non-existent accounts return identical 401 message and count towards lockout without revealing account existence")
    void testNonExistentUserDoesNotRevealAccountExistence() throws Exception {
        when(authenticationManager.authenticate(any()))
                .thenThrow(new UsernameNotFoundException("User not found"));

        String unknownEmail = "doesnotexist@nobody.org";
        String testIp = "198.51.100.99";

        LoginRequest badReq = new LoginRequest(unknownEmail, "SomePassword#456");

        // Uniform 401 without disclosing existence
        mockMvc.perform(post("/api/auth/login")
                        .with(request -> {
                            request.setRemoteAddr(testIp);
                            return request;
                        })
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(badReq)))
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.message", is("Invalid credentials. Please verify your email or phone and password.")));
    }
}
