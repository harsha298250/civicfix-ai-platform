package com.civicfix.security.ratelimit;

import com.civicfix.common.exception.RateLimitExceededException;
import io.github.bucket4j.Bucket;
import io.github.bucket4j.ConsumptionProbe;
import io.github.bucket4j.EstimationProbe;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;

import java.util.concurrent.TimeUnit;

@Service
public class LoginLockoutService {

    private static final Logger log = LoggerFactory.getLogger(LoginLockoutService.class);

    private final RateLimiterService rateLimiterService;
    private final RateLimitProperties properties;

    public LoginLockoutService(RateLimiterService rateLimiterService, RateLimitProperties properties) {
        this.rateLimiterService = rateLimiterService;
        this.properties = properties;
    }

    public void checkLockout(String identifier, String ipAddress) {
        // 1. Check IP + identifier limit (default 5 failed attempts per 15 mins)
        String ipKey = buildIpKey(identifier, ipAddress);
        Bucket ipBucket = rateLimiterService.resolveBucket(
                ipKey,
                properties.getLogin().getCapacity(),
                properties.getLogin().getDuration()
        );

        EstimationProbe ipProbe = ipBucket.estimateAbilityToConsume(1);
        if (!ipProbe.canBeConsumed()) {
            long retryAfterSeconds = Math.max(1, TimeUnit.NANOSECONDS.toSeconds(ipProbe.getNanosToWaitForRefill()));
            log.warn("Rate limit block: IP-based login lockout triggered for identifier [{}] from IP [{}]. Retry after {} seconds.",
                    sanitizeForLog(identifier), ipAddress, retryAfterSeconds);
            throw new RateLimitExceededException(
                    "Account temporarily locked due to multiple failed login attempts. Please try again in " + retryAfterSeconds + " seconds.",
                    retryAfterSeconds
            );
        }

        // 2. Check per-account limit across all IPs (default 20 failed attempts per hour)
        String accountKey = buildAccountKey(identifier);
        Bucket accountBucket = rateLimiterService.resolveBucket(
                accountKey,
                properties.getAccountLogin().getCapacity(),
                properties.getAccountLogin().getDuration()
        );

        EstimationProbe accountProbe = accountBucket.estimateAbilityToConsume(1);
        if (!accountProbe.canBeConsumed()) {
            long retryAfterSeconds = Math.max(1, TimeUnit.NANOSECONDS.toSeconds(accountProbe.getNanosToWaitForRefill()));
            log.warn("Rate limit block: Per-account login lockout triggered for identifier [{}]. Retry after {} seconds.",
                    sanitizeForLog(identifier), retryAfterSeconds);
            throw new RateLimitExceededException(
                    "Account temporarily locked due to multiple failed login attempts. Please try again in " + retryAfterSeconds + " seconds.",
                    retryAfterSeconds
            );
        }
    }

    public void recordFailedAttempt(String identifier, String ipAddress) {
        // Decrement IP + identifier bucket
        String ipKey = buildIpKey(identifier, ipAddress);
        Bucket ipBucket = rateLimiterService.resolveBucket(
                ipKey,
                properties.getLogin().getCapacity(),
                properties.getLogin().getDuration()
        );
        ConsumptionProbe ipProbe = ipBucket.tryConsumeAndReturnRemaining(1);
        long ipRemaining = ipProbe.getRemainingTokens();

        // Decrement per-account bucket
        String accountKey = buildAccountKey(identifier);
        Bucket accountBucket = rateLimiterService.resolveBucket(
                accountKey,
                properties.getAccountLogin().getCapacity(),
                properties.getAccountLogin().getDuration()
        );
        ConsumptionProbe accountProbe = accountBucket.tryConsumeAndReturnRemaining(1);
        long accountRemaining = accountProbe.getRemainingTokens();

        log.warn("Failed login attempt for identifier [{}] from IP [{}]. IP attempts remaining: {}, Account attempts remaining: {}.",
                sanitizeForLog(identifier), ipAddress, ipRemaining, accountRemaining);
    }

    public void recordSuccessfulLogin(String identifier, String ipAddress) {
        // Reset both IP-specific and account-wide lockout buckets upon successful authentication
        rateLimiterService.reset(buildIpKey(identifier, ipAddress));
        rateLimiterService.reset(buildAccountKey(identifier));
    }

    private String buildIpKey(String identifier, String ipAddress) {
        String normId = identifier != null ? identifier.trim().toLowerCase() : "";
        String normIp = ipAddress != null ? ipAddress.trim() : "unknown";
        return "login_lockout:" + normId + ":" + normIp;
    }

    private String buildAccountKey(String identifier) {
        String normId = identifier != null ? identifier.trim().toLowerCase() : "";
        return "login_lockout:account:" + normId;
    }

    private String sanitizeForLog(String input) {
        if (input == null) return "null";
        return input.replaceAll("[\\r\\n]", "_");
    }
}
