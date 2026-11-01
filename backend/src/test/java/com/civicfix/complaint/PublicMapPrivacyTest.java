package com.civicfix.complaint;

import com.civicfix.complaint.dto.PublicMapComplaintResponse;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.datatype.jsr310.JavaTimeModule;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import java.math.BigDecimal;
import java.time.OffsetDateTime;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.*;

class PublicMapPrivacyTest {

    private final ObjectMapper objectMapper = new ObjectMapper().registerModule(new JavaTimeModule());

    @Test
    @DisplayName("Public map DTO rounds coordinates to 3 decimals (~110m) and strips title, referenceId, and UUID")
    void publicMapDtoSanitizesAndRoundsCoordinates() throws Exception {
        Complaint complaint = new Complaint();
        complaint.setId(UUID.randomUUID());
        complaint.setReferenceId("CF-2026-99999");
        complaint.setTitle("Leaking pipe directly outside my house door 42");
        complaint.setDescription("My name is John Doe, call me at +91 98401 23456");
        complaint.setAddress("42 Private Resident Lane, Anna Nagar");
        complaint.setCategory("Water & Sewage");
        complaint.setStatus(ComplaintStatus.UNDER_REVIEW);
        complaint.setPriority(ComplaintPriority.HIGH);
        complaint.setWard("Ward 102");
        complaint.setLatitude(new BigDecimal("13.0827194"));
        complaint.setLongitude(new BigDecimal("80.2707321"));
        complaint.setCreatedAt(OffsetDateTime.now());

        PublicMapComplaintResponse resp = PublicMapComplaintResponse.fromEntity(complaint, 42);

        // Verify non-identifying sequential index is used instead of real UUID
        assertEquals(42, resp.getId());
        assertEquals("Water & Sewage", resp.getCategory());
        assertEquals("UNDER_REVIEW", resp.getStatus());
        assertEquals("HIGH", resp.getPriority());
        assertEquals("Ward 102", resp.getWard());

        // Verify coordinates are rounded to at most 3 decimal places
        assertNotNull(resp.getLatitude());
        assertNotNull(resp.getLongitude());
        assertEquals(new BigDecimal("13.083"), resp.getLatitude());
        assertEquals(new BigDecimal("80.271"), resp.getLongitude());
        assertTrue(resp.getLatitude().scale() <= 3);
        assertTrue(resp.getLongitude().scale() <= 3);

        // Serialize to JSON and verify strictly no identifying fields exist
        String json = objectMapper.writeValueAsString(resp);
        JsonNode node = objectMapper.readTree(json);

        assertFalse(node.has("title"), "Public map response must NEVER contain complaint title");
        assertFalse(node.has("referenceId"), "Public map response must NEVER contain reference ID");
        assertFalse(node.has("description"), "Public map response must NEVER contain description");
        assertFalse(node.has("address"), "Public map response must NEVER contain address");
        assertFalse(node.has("citizen"), "Public map response must NEVER contain citizen PII");
        assertFalse(node.has("citizenId"), "Public map response must NEVER contain citizen ID");
        assertFalse(node.has("citizenPhone"), "Public map response must NEVER contain phone");
        assertFalse(node.has("citizenEmail"), "Public map response must NEVER contain email");
        assertFalse(node.has("internalNotes"), "Public map response must NEVER contain internal notes");
        assertFalse(node.has("assignedOfficer"), "Public map response must NEVER contain assigned officer");
        assertFalse(node.has("assignedWorker"), "Public map response must NEVER contain assigned worker");

        // Verify public safe fields
        assertTrue(node.has("id"));
        assertTrue(node.has("category"));
        assertTrue(node.has("status"));
        assertTrue(node.has("priority"));
        assertTrue(node.has("ward"));
        assertTrue(node.has("latitude"));
        assertTrue(node.has("longitude"));
        assertTrue(node.has("createdAt"));

        assertEquals(13.083, node.get("latitude").asDouble(), 0.0001);
        assertEquals(80.271, node.get("longitude").asDouble(), 0.0001);
    }

    @Test
    @DisplayName("Null coordinates remain null without throwing exception")
    void nullCoordinatesHandledGracefully() {
        Complaint complaint = new Complaint();
        complaint.setLatitude(null);
        complaint.setLongitude(null);

        PublicMapComplaintResponse resp = PublicMapComplaintResponse.fromEntity(complaint, 1);
        assertNull(resp.getLatitude());
        assertNull(resp.getLongitude());
        assertEquals(1, resp.getId());
    }
}

