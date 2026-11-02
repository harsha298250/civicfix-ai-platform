package com.civicfix.features.dto;

import com.fasterxml.jackson.annotation.JsonInclude;

@JsonInclude(JsonInclude.Include.NON_NULL)
public class PublicFeaturesResponse {

    private boolean visionEnabled;
    private String visionProviderName;

    public PublicFeaturesResponse() {}

    public PublicFeaturesResponse(boolean visionEnabled, String visionProviderName) {
        this.visionEnabled = visionEnabled;
        this.visionProviderName = visionProviderName;
    }

    public boolean isVisionEnabled() {
        return visionEnabled;
    }

    public void setVisionEnabled(boolean visionEnabled) {
        this.visionEnabled = visionEnabled;
    }

    public String getVisionProviderName() {
        return visionProviderName;
    }

    public void setVisionProviderName(String visionProviderName) {
        this.visionProviderName = visionProviderName;
    }
}

