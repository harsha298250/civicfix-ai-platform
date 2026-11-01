package com.civicfix.security.ratelimit;

import jakarta.servlet.http.HttpServletRequest;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

/**
 * Resolves the client's real IP address for audit logging and rate limiting.
 *
 * Security Guarantee:
 * When trusted-proxy-enabled is false (the default):
 * Proxy headers (X-Forwarded-For, X-Real-IP) are completely ignored to prevent IP spoofing attacks.
 * The connection's remoteAddr is strictly used.
 *
 * When trusted-proxy-enabled is true (e.g. in production or docker-compose behind Nginx):
 * The LAST IP address in X-Forwarded-For (the one appended by our trusted reverse proxy)
 * or X-Real-IP is used.
 */
@Component
public class ClientIpResolver {

    private final boolean trustedProxyEnabled;

    public ClientIpResolver(@Value("${civicfix.security.trusted-proxy-enabled:false}") boolean trustedProxyEnabled) {
        this.trustedProxyEnabled = trustedProxyEnabled;
    }

    public boolean isTrustedProxyEnabled() {
        return trustedProxyEnabled;
    }

    public String resolveClientIp(HttpServletRequest request) {
        return getClientIp(request, this.trustedProxyEnabled);
    }

    /**
     * Resolves the client IP using the default setting (trustedProxyEnabled = false).
     */
    public static String getClientIp(HttpServletRequest request) {
        return getClientIp(request, false);
    }

    /**
     * Resolves the client IP address.
     * When trustedProxyEnabled is true:
     * - Uses the LAST IP in X-Forwarded-For (the one appended by our trusted proxy)
     * - Or falls back to X-Real-IP
     * - Or falls back to request.getRemoteAddr()
     * When trustedProxyEnabled is false:
     * - Strictly uses request.getRemoteAddr() to prevent header spoofing.
     */
    public static String getClientIp(HttpServletRequest request, boolean trustedProxyEnabled) {
        if (request == null) {
            return "127.0.0.1";
        }

        if (trustedProxyEnabled) {
            String xForwardedFor = request.getHeader("X-Forwarded-For");
            if (xForwardedFor != null && !xForwardedFor.isBlank()) {
                String[] parts = xForwardedFor.split(",");
                for (int i = parts.length - 1; i >= 0; i--) {
                    String candidate = parts[i].trim();
                    if (!candidate.isEmpty()) {
                        return candidate;
                    }
                }
            }

            String xRealIp = request.getHeader("X-Real-IP");
            if (xRealIp != null && !xRealIp.isBlank()) {
                return xRealIp.trim();
            }
        }

        String remoteAddr = request.getRemoteAddr();
        return (remoteAddr != null && !remoteAddr.isBlank()) ? remoteAddr.trim() : "127.0.0.1";
    }
}
