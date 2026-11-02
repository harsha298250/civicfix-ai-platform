package com.civicfix.security.ratelimit;

import com.civicfix.common.exception.RateLimitExceededException;
import com.civicfix.security.UserPrincipal;
import io.github.bucket4j.ConsumptionProbe;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Component;
import org.springframework.web.servlet.HandlerInterceptor;

import java.util.concurrent.TimeUnit;

@Component
public class RateLimitInterceptor implements HandlerInterceptor {

    private static final Logger log = LoggerFactory.getLogger(RateLimitInterceptor.class);

    private final RateLimiterService rateLimiterService;
    private final RateLimitProperties properties;
    private final ClientIpResolver clientIpResolver;

    @Autowired
    public RateLimitInterceptor(RateLimiterService rateLimiterService,
                                RateLimitProperties properties,
                                ClientIpResolver clientIpResolver) {
        this.rateLimiterService = rateLimiterService;
        this.properties = properties;
        this.clientIpResolver = clientIpResolver;
    }

    @Override
    public boolean preHandle(HttpServletRequest request, HttpServletResponse response, Object handler) {
        String method = request.getMethod();
        String path = request.getRequestURI();
        String contextPath = request.getContextPath();
        if (contextPath != null && !contextPath.isEmpty() && path.startsWith(contextPath)) {
            path = path.substring(contextPath.length());
        }

        // 1. Citizen Registration: 5 per IP per hour
        if ("POST".equalsIgnoreCase(method) && "/api/auth/register".equals(path)) {
            String ip = clientIpResolver.resolveClientIp(request);
            String key = "register:" + ip;
            checkRateLimit(key, properties.getRegister(), "Registration rate limit exceeded.", path, ip);
            return true;
        }

        // 2. Reverse Geocode: 30 per IP per minute
        if ("GET".equalsIgnoreCase(method) && "/api/gis/reverse-geocode".equals(path)) {
            String ip = clientIpResolver.resolveClientIp(request);
            String key = "reverse_geocode:" + ip;
            checkRateLimit(key, properties.getReverseGeocode(), "Reverse geocoding rate limit exceeded.", path, ip);
            return true;
        }

        // 3. Photo & Evidence Upload: 10 per user per minute
        if ("POST".equalsIgnoreCase(method) && isUploadPath(path)) {
            String userKey = resolveUserOrIpKey(request);
            String key = "upload:" + userKey;
            checkRateLimit(key, properties.getUpload(), "Upload rate limit exceeded.", path, userKey);
            return true;
        }

        // 4. Create Complaint: 10 per user per minute
        if ("POST".equalsIgnoreCase(method) && ("/api/complaints".equals(path) || "/api/complaints/".equals(path))) {
            String userKey = resolveUserOrIpKey(request);
            String key = "complaint_create:" + userKey;
            checkRateLimit(key, properties.getComplaintCreate(), "Complaint submission rate limit exceeded.", path, userKey);
            return true;
        }

        // 5. Public Features: 60 per IP per minute
        if ("GET".equalsIgnoreCase(method) && ("/api/public/features".equals(path) || "/api/public/features/".equals(path))) {
            String ip = clientIpResolver.resolveClientIp(request);
            String key = "public_features:" + ip;
            checkRateLimit(key, properties.getPublicFeatures(), "Public features rate limit exceeded.", path, ip);
            return true;
        }

        return true;
    }

    private boolean isUploadPath(String path) {
        return path.matches("^/api/complaints/[^/]+/(photos|evidence)$");
    }

    private String resolveUserOrIpKey(HttpServletRequest request) {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        if (auth != null && auth.isAuthenticated() && auth.getPrincipal() instanceof UserPrincipal principal) {
            return "user:" + principal.getId();
        }
        return "ip:" + clientIpResolver.resolveClientIp(request);
    }

    private void checkRateLimit(String key, RateLimitProperties.LimitConfig config, String message, String uri, String clientIdentifier) {
        ConsumptionProbe probe = rateLimiterService.tryConsume(key, config.getCapacity(), config.getDuration());
        if (!probe.isConsumed()) {
            long retryAfterSeconds = Math.max(1, TimeUnit.NANOSECONDS.toSeconds(probe.getNanosToWaitForRefill()));
            log.warn("Rate limit block: Endpoint [{}] blocked for identifier [{}] (key: [{}]). Retry after {} seconds.",
                    uri, clientIdentifier, key, retryAfterSeconds);
            throw new RateLimitExceededException(
                    message + " Please retry after " + retryAfterSeconds + " seconds.",
                    retryAfterSeconds
            );
        }
    }
}

