package com.civicfix.complaint;

import com.civicfix.security.UserPrincipal;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.core.io.ByteArrayResource;
import org.springframework.core.io.Resource;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;

import static org.junit.jupiter.api.Assertions.*;

class EvidencePhotoHeadersTest {

    private final ComplaintService stubService = new ComplaintService(
            null, null, null, null, null, null, null, null, null, null, null
    ) {
        @Override
        public Resource loadEvidenceFile(String filename, UserPrincipal principal) {
            return new ByteArrayResource(new byte[]{1, 2, 3, 4});
        }
    };

    private final ComplaintController controller = new ComplaintController(stubService, null);

    @Test
    @DisplayName("Hardening: Evidence photo endpoint sends 'private, no-store' and 'X-Content-Type-Options: nosniff'")
    void evidencePhotoHeadersContainPrivateNoStoreAndNosniff() {
        ResponseEntity<Resource> response = controller.getEvidenceFile("evidence-abc-123.jpg", null);

        assertEquals(HttpStatus.OK, response.getStatusCode());
        assertEquals("private, no-store", response.getHeaders().getFirst(HttpHeaders.CACHE_CONTROL));
        assertEquals("nosniff", response.getHeaders().getFirst("X-Content-Type-Options"));
        assertEquals(MediaType.IMAGE_JPEG, response.getHeaders().getContentType());
        assertNotNull(response.getBody());
    }

    @Test
    @DisplayName("Hardening: Evidence photo PNG and WebP also send secure caching and nosniff headers")
    void differentMediaTypesPreserveHardeningHeaders() {
        ResponseEntity<Resource> pngResp = controller.getEvidenceFile("evidence-abc.png", null);
        assertEquals("private, no-store", pngResp.getHeaders().getFirst(HttpHeaders.CACHE_CONTROL));
        assertEquals("nosniff", pngResp.getHeaders().getFirst("X-Content-Type-Options"));
        assertEquals(MediaType.IMAGE_PNG, pngResp.getHeaders().getContentType());

        ResponseEntity<Resource> webpResp = controller.getEvidenceFile("evidence-abc.webp", null);
        assertEquals("private, no-store", webpResp.getHeaders().getFirst(HttpHeaders.CACHE_CONTROL));
        assertEquals("nosniff", webpResp.getHeaders().getFirst("X-Content-Type-Options"));
        assertEquals(MediaType.parseMediaType("image/webp"), webpResp.getHeaders().getContentType());
    }
}

