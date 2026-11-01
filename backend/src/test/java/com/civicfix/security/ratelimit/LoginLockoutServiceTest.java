package com.civicfix.security.ratelimit;

import com.civicfix.common.exception.RateLimitExceededException;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import java.time.Duration;

import static org.junit.jupiter.api.Assertions.*;

class LoginLockoutServiceTest {

    private RateLimiterService rateLimiterService;
    private RateLimitProperties properties;
    private LoginLockoutService loginLockoutService;

    @BeforeEach
    void setUp() {
        rateLimiterService = new RateLimiterService();
        properties = new RateLimitProperties();
        properties.getLogin().setCapacity(5);
        properties.getLogin().setDuration(Duration.ofMinutes(15));
        properties.getAccountLogin().setCapacity(20);
        properties.getAccountLogin().setDuration(Duration.ofHours(1));
        loginLockoutService = new LoginLockoutService(rateLimiterService, properties);
    }

    @Test
    @DisplayName("Should allow 5 failed attempts, then lockout on the 6th attempt with HTTP 429 semantics")
    void shouldLockoutOnSixthAttempt() {
        String identifier = "citizen@example.com";
        String ip = "192.168.1.100";

        // Attempts 1 to 5: checkLockout passes, recordFailedAttempt is called
        for (int i = 1; i <= 5; i++) {
            assertDoesNotThrow(() -> loginLockoutService.checkLockout(identifier, ip),
                    "Attempt " + i + " should not be locked out");
            loginLockoutService.recordFailedAttempt(identifier, ip);
        }

        // Attempt 6: checkLockout MUST throw RateLimitExceededException
        RateLimitExceededException ex = assertThrows(RateLimitExceededException.class, () ->
                loginLockoutService.checkLockout(identifier, ip)
        );

        assertTrue(ex.getRetryAfterSeconds() > 0, "Retry-After seconds must be positive");
        assertTrue(ex.getMessage().contains("Account temporarily locked"),
                "Message must indicate account temporary lockout");
    }

    @Test
    @DisplayName("Per-account limit triggers across different rotating IPs (brute force protection)")
    void shouldTriggerAccountLockoutAcrossDifferentIps() {
        String targetAccount = "victim@metro.gov";

        // Attacker rotates 20 different IP addresses, attempting 1 wrong password from each
        for (int i = 1; i <= 20; i++) {
            String ip = "198.51.100." + i;
            assertDoesNotThrow(() -> loginLockoutService.checkLockout(targetAccount, ip),
                    "Attempt " + i + " from IP " + ip + " should not yet trigger per-account lockout");
            loginLockoutService.recordFailedAttempt(targetAccount, ip);
        }

        // Attempt 21 from a completely fresh IP:
        String freshIp = "203.0.113.99";
        RateLimitExceededException ex = assertThrows(RateLimitExceededException.class, () ->
                loginLockoutService.checkLockout(targetAccount, freshIp)
        );

        assertTrue(ex.getRetryAfterSeconds() > 0);
        assertTrue(ex.getMessage().contains("Account temporarily locked"));
    }

    @Test
    @DisplayName("Reset behavior on success stays correct and does not let an attacker reset someone else's counter")
    void shouldNotLetAttackerResetOtherAccountCounter() {
        String victimAccount = "victim@metro.gov";
        String attackerAccount = "attacker@evil.org";
        String attackerIp = "192.168.10.50";

        // 4 failed attempts against victim
        for (int i = 0; i < 4; i++) {
            assertDoesNotThrow(() -> loginLockoutService.checkLockout(victimAccount, attackerIp));
            loginLockoutService.recordFailedAttempt(victimAccount, attackerIp);
        }

        // Attacker logs in successfully to their OWN account
        loginLockoutService.recordSuccessfulLogin(attackerAccount, attackerIp);

        // Victim account counter must NOT have been reset: 5th attempt is allowed, 6th is locked out
        assertDoesNotThrow(() -> loginLockoutService.checkLockout(victimAccount, attackerIp));
        loginLockoutService.recordFailedAttempt(victimAccount, attackerIp);

        // 6th attempt against victim MUST be locked out
        assertThrows(RateLimitExceededException.class, () ->
                loginLockoutService.checkLockout(victimAccount, attackerIp)
        );
    }

    @Test
    @DisplayName("Legitimate user successful login resets both IP and per-account lockout counters")
    void shouldResetBothCountersOnLegitimateUserSuccess() {
        String userAccount = "legitimate@metro.gov";

        // 10 failed attempts from various IPs
        for (int i = 1; i <= 10; i++) {
            loginLockoutService.recordFailedAttempt(userAccount, "10.0.0." + i);
        }

        // Legitimate user logs in successfully from their home IP
        String homeIp = "192.168.1.15";
        loginLockoutService.recordSuccessfulLogin(userAccount, homeIp);

        // Per-account counter is now reset: 20 fresh attempts are permitted
        for (int i = 1; i <= 20; i++) {
            final String ip = "172.16.0." + i;
            assertDoesNotThrow(() -> loginLockoutService.checkLockout(userAccount, ip));
            loginLockoutService.recordFailedAttempt(userAccount, ip);
        }

        // 21st attempt is locked out
        assertThrows(RateLimitExceededException.class, () ->
                loginLockoutService.checkLockout(userAccount, "172.16.0.21")
        );
    }
}
