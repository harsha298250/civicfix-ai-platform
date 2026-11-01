package com.civicfix.gis;

import com.civicfix.common.ApiResponse;
import com.civicfix.gis.dto.ReverseGeocodeResponse;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/gis")
public class GisController {

    private final GisService gisService;

    public GisController(GisService gisService) {
        this.gisService = gisService;
    }

    @GetMapping("/reverse-geocode")
    public ResponseEntity<ApiResponse<ReverseGeocodeResponse>> reverseGeocode(
            @RequestParam Double lat,
            @RequestParam Double lng) {
        ReverseGeocodeResponse response = gisService.reverseGeocode(lat, lng);
        return ResponseEntity.ok(ApiResponse.success(response));
    }
}
