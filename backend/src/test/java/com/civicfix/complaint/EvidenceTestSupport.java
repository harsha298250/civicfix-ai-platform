package com.civicfix.complaint;

import com.civicfix.storage.TestImageHelper;
import org.springframework.mock.web.MockMultipartFile;
import org.springframework.test.web.servlet.request.MockHttpServletRequestBuilder;
import org.springframework.test.web.servlet.request.MockMultipartHttpServletRequestBuilder;

import java.math.BigDecimal;

import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.csrf;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.multipart;

/**
 * Shared test fixture helper for submitting worker resolution evidence.
 * Generates valid JPEGs and proper GPS coordinates matching the A3 server rules.
 */
public final class EvidenceTestSupport {

    private EvidenceTestSupport() {}

    /**
     * Generates a valid minimal JPEG evidence file.
     */
    public static MockMultipartFile createDefaultEvidenceFile() {
        return new MockMultipartFile(
                "files",
                "repair-evidence.jpg",
                "image/jpeg",
                TestImageHelper.createValidJpeg(2, 2)
        );
    }

    /**
     * Builds a valid multipart request with real JPEG, in-range coordinates, accuracy, and notes.
     */
    public static MockHttpServletRequestBuilder validEvidenceRequest(
            String complaintId,
            BigDecimal complaintLat,
            BigDecimal complaintLon,
            String notes) {
        BigDecimal lat = complaintLat != null ? complaintLat : new BigDecimal("13.0861000");
        BigDecimal lon = complaintLon != null ? complaintLon : new BigDecimal("80.2162000");
        return multipart("/api/complaints/" + complaintId + "/evidence")
                .file(createDefaultEvidenceFile())
                .param("notes", notes != null ? notes : "Completed defect repair as requested.")
                .param("latitude", lat.toPlainString())
                .param("longitude", lon.toPlainString())
                .param("accuracy", "5.0")
                .param("deviceReported", "true")
                .with(csrf());
    }

    /**
     * Builds a variant with no GPS coordinates, and an optional explanation location note.
     */
    public static MockHttpServletRequestBuilder noCoordinatesEvidenceRequest(
            String complaintId,
            String notes,
            String locationNote) {
        MockMultipartHttpServletRequestBuilder builder = multipart("/api/complaints/" + complaintId + "/evidence");
        builder.file(createDefaultEvidenceFile());
        builder.param("notes", notes != null ? notes : "Completed defect repair in basement facility.");
        builder.param("deviceReported", "false");
        if (locationNote != null) {
            builder.param("locationNote", locationNote);
        }
        return builder.with(csrf());
    }

    /**
     * Builds an out-of-range variant (> 100m away), with an optional explanation location note.
     */
    public static MockHttpServletRequestBuilder outOfRangeEvidenceRequest(
            String complaintId,
            BigDecimal complaintLat,
            BigDecimal complaintLon,
            String notes,
            String locationNote) {
        BigDecimal baseLat = complaintLat != null ? complaintLat : new BigDecimal("13.0861000");
        BigDecimal baseLon = complaintLon != null ? complaintLon : new BigDecimal("80.2162000");
        BigDecimal farLat = baseLat.add(new BigDecimal("0.0500000")); // ~5.5 km away
        MockMultipartHttpServletRequestBuilder builder = multipart("/api/complaints/" + complaintId + "/evidence");
        builder.file(createDefaultEvidenceFile());
        builder.param("notes", notes != null ? notes : "Repaired water pipe at junction.");
        builder.param("latitude", farLat.toPlainString());
        builder.param("longitude", baseLon.toPlainString());
        builder.param("accuracy", "5.0");
        builder.param("deviceReported", "true");
        if (locationNote != null) {
            builder.param("locationNote", locationNote);
        }
        return builder.with(csrf());
    }
}
