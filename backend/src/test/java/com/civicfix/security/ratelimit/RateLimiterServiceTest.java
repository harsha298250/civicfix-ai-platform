package com.civicfix.security.ratelimit;

import io.github.bucket4j.ConsumptionProbe;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import java.time.Duration;

import static org.junit.jupiter.api.Assertions.*;

class RateLimiterServiceTest {

    private RateLimiterService rateLimiterService;

    @BeforeEach
    void setUp() {
        rateLimiterService = new RateLimiterService();
    }

    @Test
    @DisplayName("Should allow consumption within capacity and block when exhausted")
    void shouldAllowWithinCapacityAndBlockWhenExhausted() {
        String key = "test:user1";
        long capacity = 3;
        Duration duration = Duration.ofMinutes(1);

        for (int i = 0; i < 3; i++) {
            ConsumptionProbe probe = rateLimiterService.tryConsume(key, capacity, duration);
            assertTrue(probe.isConsumed(), "Attempt " + (i + 1) + " should be consumed");
            assertEquals(capacity - 1 - i, probe.getRemainingTokens());
        }

        ConsumptionProbe exhaustedProbe = rateLimiterService.tryConsume(key, capacity, duration);
        assertFalse(exhaustedProbe.isConsumed(), "4th attempt must be rejected");
        assertTrue(exhaustedProbe.getNanosToWaitForRefill() > 0, "Refill wait time must be positive");
    }

    @Test
    @DisplayName("Should reset bucket when requested")
    void shouldResetBucket() {
        String key = "test:resetUser";
        long capacity = 2;
        Duration duration = Duration.ofMinutes(1);

        rateLimiterService.tryConsume(key, capacity, duration);
        rateLimiterService.tryConsume(key, capacity, duration);
        assertFalse(rateLimiterService.tryConsume(key, capacity, duration).isConsumed());

        rateLimiterService.reset(key);

        assertTrue(rateLimiterService.tryConsume(key, capacity, duration).isConsumed(),
                "After reset, consumption should succeed immediately");
    }
}

