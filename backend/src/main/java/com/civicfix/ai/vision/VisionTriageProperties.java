package com.civicfix.ai.vision;

import jakarta.annotation.PostConstruct;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.stereotype.Component;

import java.time.Duration;

@Component
@ConfigurationProperties(prefix = "civicfix.ai.vision")
public class VisionTriageProperties {

    private static final Logger log = LoggerFactory.getLogger(VisionTriageProperties.class);

    private boolean enabled = false;
    private String provider = "gemini";
    private String googleApiKey = "";
    private String xaiApiKey = "";
    private String geminiModel = "gemini-1.5-flash";
    private String xaiModel = "grok-2-vision-1212";
    private int timeoutMs = 10000;
    private int dailyCap = 200;
    private String geminiBaseUrl = "https://generativelanguage.googleapis.com";
    private String xaiBaseUrl = "https://api.x.ai";
    private int userMinuteCapacity = 10;
    private Duration userMinuteDuration = Duration.ofMinutes(1);

    @PostConstruct
    public void validateOnStartup() {
        if (enabled) {
            String p = provider != null ? provider.toLowerCase().trim() : "gemini";
            if ("gemini".equals(p) && (googleApiKey == null || googleApiKey.trim().isEmpty())) {
                log.warn("AI_VISION_ENABLED=true with GEMINI provider, but GOOGLE_AI_API_KEY is not configured. Vision triage calls will fail.");
            } else if ("xai".equals(p) && (xaiApiKey == null || xaiApiKey.trim().isEmpty())) {
                log.warn("AI_VISION_ENABLED=true with XAI provider, but XAI_API_KEY is not configured. Vision triage calls will fail.");
            }
        }
    }

    public boolean isEnabled() {
        return enabled;
    }

    public void setEnabled(boolean enabled) {
        this.enabled = enabled;
    }

    public String getProvider() {
        return provider;
    }

    public void setProvider(String provider) {
        this.provider = provider;
    }

    public String getGoogleApiKey() {
        return googleApiKey;
    }

    public void setGoogleApiKey(String googleApiKey) {
        this.googleApiKey = googleApiKey;
    }

    public String getXaiApiKey() {
        return xaiApiKey;
    }

    public void setXaiApiKey(String xaiApiKey) {
        this.xaiApiKey = xaiApiKey;
    }

    public String getGeminiModel() {
        return geminiModel;
    }

    public void setGeminiModel(String geminiModel) {
        this.geminiModel = geminiModel;
    }

    public String getXaiModel() {
        return xaiModel;
    }

    public void setXaiModel(String xaiModel) {
        this.xaiModel = xaiModel;
    }

    public int getTimeoutMs() {
        return timeoutMs;
    }

    public void setTimeoutMs(int timeoutMs) {
        this.timeoutMs = timeoutMs;
    }

    public int getDailyCap() {
        return dailyCap;
    }

    public void setDailyCap(int dailyCap) {
        this.dailyCap = dailyCap;
    }

    public String getGeminiBaseUrl() {
        return geminiBaseUrl;
    }

    public void setGeminiBaseUrl(String geminiBaseUrl) {
        this.geminiBaseUrl = geminiBaseUrl;
    }

    public String getXaiBaseUrl() {
        return xaiBaseUrl;
    }

    public void setXaiBaseUrl(String xaiBaseUrl) {
        this.xaiBaseUrl = xaiBaseUrl;
    }

    public int getUserMinuteCapacity() {
        return userMinuteCapacity;
    }

    public void setUserMinuteCapacity(int userMinuteCapacity) {
        this.userMinuteCapacity = userMinuteCapacity;
    }

    public Duration getUserMinuteDuration() {
        return userMinuteDuration;
    }

    public void setUserMinuteDuration(Duration userMinuteDuration) {
        this.userMinuteDuration = userMinuteDuration;
    }
}
