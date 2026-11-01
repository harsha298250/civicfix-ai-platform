package com.civicfix.common.util;

import java.math.BigDecimal;

/**
 * Spatial and Geographic Utilities.
 * Pure static methods for Great-Circle geodesic distance calculations.
 */
public final class GeoUtils {

    public static final double EARTH_RADIUS_METERS = 6371000.0;

    private GeoUtils() {}

    /**
     * Compute Great-Circle Haversine distance between two coordinates in meters.
     *
     * @param lat1 Latitude of point 1 in degrees (-90 to 90)
     * @param lon1 Longitude of point 1 in degrees (-180 to 180)
     * @param lat2 Latitude of point 2 in degrees (-90 to 90)
     * @param lon2 Longitude of point 2 in degrees (-180 to 180)
     * @return Distance in meters
     */
    public static double haversineDistance(double lat1, double lon1, double lat2, double lon2) {
        double dLat = Math.toRadians(lat2 - lat1);
        double dLon = Math.toRadians(lon2 - lon1);

        double a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
                Math.cos(Math.toRadians(lat1)) * Math.cos(Math.toRadians(lat2)) *
                        Math.sin(dLon / 2) * Math.sin(dLon / 2);

        double c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
        return EARTH_RADIUS_METERS * c;
    }

    /**
     * Compute Great-Circle Haversine distance from BigDecimal coordinates.
     */
    public static double haversineDistance(BigDecimal lat1, BigDecimal lon1, BigDecimal lat2, BigDecimal lon2) {
        if (lat1 == null || lon1 == null || lat2 == null || lon2 == null) {
            throw new IllegalArgumentException("Coordinates must not be null");
        }
        return haversineDistance(lat1.doubleValue(), lon1.doubleValue(), lat2.doubleValue(), lon2.doubleValue());
    }

    /**
     * Validate latitude (-90 to 90) and longitude (-180 to 180).
     * Rejects NaN, infinite, out of bounds, and the exact null island (0, 0).
     */
    public static boolean isValidCoordinatePair(BigDecimal lat, BigDecimal lon) {
        if (lat == null || lon == null) {
            return false;
        }
        double dLat = lat.doubleValue();
        double dLon = lon.doubleValue();

        if (Double.isNaN(dLat) || Double.isInfinite(dLat) || Double.isNaN(dLon) || Double.isInfinite(dLon)) {
            return false;
        }
        if (dLat < -90.0 || dLat > 90.0 || dLon < -180.0 || dLon > 180.0) {
            return false;
        }
        // Exact null island (0.0, 0.0) rejected per requirement
        if (Double.compare(dLat, 0.0) == 0 && Double.compare(dLon, 0.0) == 0) {
            return false;
        }
        return true;
    }
}

