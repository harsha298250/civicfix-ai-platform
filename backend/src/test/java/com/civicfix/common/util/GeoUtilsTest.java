package com.civicfix.common.util;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import java.math.BigDecimal;

import static org.junit.jupiter.api.Assertions.*;

class GeoUtilsTest {

    @Test
    @DisplayName("Haversine: Known distance for 0.001 degrees latitude is ~111.2 meters")
    void testKnownLatitudeDistance() {
        double lat1 = 13.0827;
        double lon1 = 80.2707;
        double lat2 = 13.0837; // 0.001 deg north
        double lon2 = 80.2707;

        double distance = GeoUtils.haversineDistance(lat1, lon1, lat2, lon2);

        // 1 deg latitude is approx 111,195 m => 0.001 deg is approx 111.2 m
        assertTrue(distance >= 111.0 && distance <= 111.5,
                "Expected distance ~111.2m, got " + distance);
    }

    @Test
    @DisplayName("Haversine: Distance calculation is symmetric distance(A, B) == distance(B, A)")
    void testSymmetry() {
        double latA = 13.0827;
        double lonA = 80.2707;
        double latB = 13.0845;
        double lonB = 80.2730;

        double distAB = GeoUtils.haversineDistance(latA, lonA, latB, lonB);
        double distBA = GeoUtils.haversineDistance(latB, lonB, latA, lonA);

        assertEquals(distAB, distBA, 1e-9, "Distance between A->B and B->A must be identical");
    }

    @Test
    @DisplayName("Haversine: Identical point coordinates return zero distance")
    void testZeroDistance() {
        double lat = 13.0827;
        double lon = 80.2707;

        double distance = GeoUtils.haversineDistance(lat, lon, lat, lon);

        assertEquals(0.0, distance, 1e-6);
    }

    @Test
    @DisplayName("Validation: Valid coordinates accept standard geographic values")
    void testValidCoordinates() {
        assertTrue(GeoUtils.isValidCoordinatePair(BigDecimal.valueOf(13.0827), BigDecimal.valueOf(80.2707)));
        assertTrue(GeoUtils.isValidCoordinatePair(BigDecimal.valueOf(-33.8688), BigDecimal.valueOf(151.2093))); // Sydney
        assertTrue(GeoUtils.isValidCoordinatePair(BigDecimal.valueOf(90.0), BigDecimal.valueOf(180.0))); // North pole max
        assertTrue(GeoUtils.isValidCoordinatePair(BigDecimal.valueOf(-90.0), BigDecimal.valueOf(-180.0))); // South pole min
    }

    @Test
    @DisplayName("Validation: Exact (0, 0) Null Island coordinates are rejected")
    void testNullIslandRejected() {
        assertFalse(GeoUtils.isValidCoordinatePair(BigDecimal.ZERO, BigDecimal.ZERO));
        assertFalse(GeoUtils.isValidCoordinatePair(BigDecimal.valueOf(0.0), BigDecimal.valueOf(0.0000000)));
    }

    @Test
    @DisplayName("Validation: Coordinates out of bounds or null are rejected")
    void testOutOfBoundsAndNullRejected() {
        assertFalse(GeoUtils.isValidCoordinatePair(null, BigDecimal.valueOf(80.0)));
        assertFalse(GeoUtils.isValidCoordinatePair(BigDecimal.valueOf(13.0), null));
        assertFalse(GeoUtils.isValidCoordinatePair(BigDecimal.valueOf(91.0), BigDecimal.valueOf(80.0)));
        assertFalse(GeoUtils.isValidCoordinatePair(BigDecimal.valueOf(-90.1), BigDecimal.valueOf(80.0)));
        assertFalse(GeoUtils.isValidCoordinatePair(BigDecimal.valueOf(13.0), BigDecimal.valueOf(180.1)));
        assertFalse(GeoUtils.isValidCoordinatePair(BigDecimal.valueOf(13.0), BigDecimal.valueOf(-180.5)));
    }
}

