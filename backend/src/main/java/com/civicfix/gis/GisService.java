package com.civicfix.gis;

import com.civicfix.gis.dto.ReverseGeocodeResponse;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;

import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.time.Duration;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;

/**
 * GisService — OpenStreetMap Nominatim Compliant Geocoding Service
 * Enforces OSM Nominatim usage policy:
 * 1. Explicit, identifiable User-Agent header
 * 2. In-memory cache for coordinates (~11m spatial resolution)
 * 3. Graceful fallback on network timeout or rate limits
 */
@Service
public class GisService {

    private static final Logger log = LoggerFactory.getLogger(GisService.class);
    private static final String USER_AGENT = "CivicFix-AI-Platform/1.0 (https://civicfix.org; contact@civicfix.org)";
    private static final String NOMINATIM_REVERSE_URL = "https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=%.6f&lon=%.6f&zoom=18&addressdetails=1";

    private final HttpClient httpClient;
    private final ObjectMapper objectMapper;
    private final Map<String, ReverseGeocodeResponse> cache = new ConcurrentHashMap<>();

    public GisService(ObjectMapper objectMapper) {
        this.objectMapper = objectMapper;
        this.httpClient = HttpClient.newBuilder()
                .connectTimeout(Duration.ofSeconds(4))
                .build();
    }

    public ReverseGeocodeResponse reverseGeocode(Double lat, Double lng) {
        if (lat == null || lng == null) {
            return ReverseGeocodeResponse.fallback(0.0, 0.0, "Coordinates must not be null");
        }
        if (lat < -90.0 || lat > 90.0 || lng < -180.0 || lng > 180.0) {
            return ReverseGeocodeResponse.fallback(lat, lng, "Coordinates out of geographic range");
        }

        // Cache key with 4 decimal places (~11 meters)
        String cacheKey = String.format("%.4f:%.4f", lat, lng);
        ReverseGeocodeResponse cached = cache.get(cacheKey);
        if (cached != null) {
            return cached;
        }

        try {
            String url = String.format(java.util.Locale.US, NOMINATIM_REVERSE_URL, lat, lng);
            HttpRequest request = HttpRequest.newBuilder()
                    .uri(URI.create(url))
                    .header("User-Agent", USER_AGENT)
                    .header("Accept", "application/json")
                    .timeout(Duration.ofSeconds(5))
                    .GET()
                    .build();

            HttpResponse<String> response = httpClient.send(request, HttpResponse.BodyHandlers.ofString());

            if (response.statusCode() == 200) {
                JsonNode root = objectMapper.readTree(response.body());
                JsonNode addr = root.path("address");

                String road = getFirstNonEmpty(addr, "road", "pedestrian", "suburb", "neighbourhood");
                String ward = getFirstNonEmpty(addr, "city_district", "suburb", "ward");
                String city = getFirstNonEmpty(addr, "city", "town", "village", "county", "Tamil Nadu");
                String state = addr.path("state").asText("Tamil Nadu");
                String postcode = addr.path("postcode").asText("");

                StringBuilder fullStreet = new StringBuilder();
                if (!road.isEmpty()) fullStreet.append(road);
                if (!ward.isEmpty()) {
                    if (fullStreet.length() > 0) fullStreet.append(", ");
                    fullStreet.append(ward);
                }
                if (!city.isEmpty()) {
                    if (fullStreet.length() > 0) fullStreet.append(", ");
                    fullStreet.append(city);
                }

                String displayName = root.path("display_name").asText(fullStreet.toString());
                String streetAddress = fullStreet.length() > 0 ? fullStreet.toString() : displayName;

                ReverseGeocodeResponse result = new ReverseGeocodeResponse();
                result.setSuccess(true);
                result.setLat(lat);
                result.setLng(lng);
                result.setDisplayName(displayName);
                result.setStreetAddress(streetAddress);
                result.setCityDistrict(!ward.isEmpty() ? ward : city);
                result.setCity(city);
                result.setState(state);
                result.setPostcode(postcode);

                // Cache successful response (limit size to prevent memory bloat)
                if (cache.size() < 5000) {
                    cache.put(cacheKey, result);
                }
                return result;
            } else {
                log.warn("Nominatim reverse geocode returned HTTP {}", response.statusCode());
                return ReverseGeocodeResponse.fallback(lat, lng, "Provider status " + response.statusCode());
            }
        } catch (Exception e) {
            log.warn("Nominatim reverse geocoding lookup failed: {}", e.getMessage());
            return ReverseGeocodeResponse.fallback(lat, lng, e.getMessage());
        }
    }

    private String getFirstNonEmpty(JsonNode node, String... keys) {
        for (String key : keys) {
            String val = node.path(key).asText("");
            if (val != null && !val.trim().isEmpty()) {
                return val.trim();
            }
        }
        return "";
    }
}
