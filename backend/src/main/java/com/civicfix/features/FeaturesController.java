package com.civicfix.features;

import com.civicfix.ai.vision.VisionTriageProperties;
import com.civicfix.common.ApiResponse;
import com.civicfix.features.dto.PublicFeaturesResponse;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

/**
 * FeaturesController — Public endpoint exposing enabled feature flags and public display metadata.
 * Strictly avoids leaking internal configuration secrets, API keys, URLs, model names, or infrastructure details.
 */
@RestController
@RequestMapping("/api/public/features")
public class FeaturesController {

    private final VisionTriageProperties visionProperties;

    @Autowired
    public FeaturesController(@Autowired(required = false) VisionTriageProperties visionProperties) {
        this.visionProperties = visionProperties;
    }

    @GetMapping
    public ResponseEntity<ApiResponse<PublicFeaturesResponse>> getPublicFeatures() {
        boolean enabled = visionProperties != null && visionProperties.isEnabled();
        String providerName = null;

        if (enabled) {
            String p = visionProperties.getProvider() != null ? visionProperties.getProvider().trim().toLowerCase() : "gemini";
            if ("xai".equals(p) || p.contains("grok")) {
                providerName = "xAI Grok";
            } else {
                providerName = "Google Gemini";
            }
        }

        PublicFeaturesResponse response = new PublicFeaturesResponse(enabled, providerName);
        return ResponseEntity.ok(ApiResponse.success(response));
    }
}

