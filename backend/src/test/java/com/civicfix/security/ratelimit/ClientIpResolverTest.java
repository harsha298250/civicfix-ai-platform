package com.civicfix.security.ratelimit;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.mock.web.MockHttpServletRequest;

import static org.junit.jupiter.api.Assertions.*;

class ClientIpResolverTest {

    @Test
    @DisplayName("When trusted-proxy-enabled=false: spoofed X-Forwarded-For and X-Real-IP are strictly ignored")
    void shouldIgnoreProxyHeadersWhenUntrusted() {
        ClientIpResolver untrustedResolver = new ClientIpResolver(false);

        MockHttpServletRequest request = new MockHttpServletRequest();
        request.setRemoteAddr("198.51.100.42");
        request.addHeader("X-Forwarded-For", "203.0.113.1, 10.0.0.1");
        request.addHeader("X-Real-IP", "192.168.1.100");

        String resolvedIp = untrustedResolver.resolveClientIp(request);
        assertEquals("198.51.100.42", resolvedIp, "Must strictly use remoteAddr when trusted-proxy-enabled is false");

        // Static fallback method must also be secure by default
        assertEquals("198.51.100.42", ClientIpResolver.getClientIp(request));
    }

    @Test
    @DisplayName("When trusted-proxy-enabled=true: uses the LAST address in X-Forwarded-For (added by closest proxy)")
    void shouldUseLastIpFromXForwardedForWhenTrusted() {
        ClientIpResolver trustedResolver = new ClientIpResolver(true);

        MockHttpServletRequest request = new MockHttpServletRequest();
        request.setRemoteAddr("172.18.0.2"); // internal docker proxy
        request.addHeader("X-Forwarded-For", "203.0.113.195, 10.0.0.5, 198.51.100.88");

        String resolvedIp = trustedResolver.resolveClientIp(request);
        assertEquals("198.51.100.88", resolvedIp, "Must take the LAST address in X-Forwarded-For");
    }

    @Test
    @DisplayName("When trusted-proxy-enabled=true: falls back to X-Real-IP if X-Forwarded-For is missing")
    void shouldUseXRealIpWhenXForwardedForMissing() {
        ClientIpResolver trustedResolver = new ClientIpResolver(true);

        MockHttpServletRequest request = new MockHttpServletRequest();
        request.setRemoteAddr("172.18.0.2");
        request.addHeader("X-Real-IP", "198.51.100.77");

        String resolvedIp = trustedResolver.resolveClientIp(request);
        assertEquals("198.51.100.77", resolvedIp);
    }

    @Test
    @DisplayName("When trusted-proxy-enabled=true: falls back to remoteAddr if no proxy headers are present")
    void shouldFallbackToRemoteAddrWhenHeadersMissing() {
        ClientIpResolver trustedResolver = new ClientIpResolver(true);

        MockHttpServletRequest request = new MockHttpServletRequest();
        request.setRemoteAddr("198.51.100.66");

        String resolvedIp = trustedResolver.resolveClientIp(request);
        assertEquals("198.51.100.66", resolvedIp);
    }

    @Test
    @DisplayName("Handles null request and empty addresses gracefully with 127.0.0.1")
    void shouldHandleNullAndEmptyAddresses() {
        assertEquals("127.0.0.1", ClientIpResolver.getClientIp(null, false));
        assertEquals("127.0.0.1", ClientIpResolver.getClientIp(null, true));

        MockHttpServletRequest request = new MockHttpServletRequest();
        request.setRemoteAddr("");
        assertEquals("127.0.0.1", ClientIpResolver.getClientIp(request, false));
        assertEquals("127.0.0.1", ClientIpResolver.getClientIp(request, true));
    }
}

