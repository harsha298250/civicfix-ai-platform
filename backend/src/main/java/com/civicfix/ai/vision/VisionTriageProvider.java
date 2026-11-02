package com.civicfix.ai.vision;

import com.civicfix.ai.triage.TriageProvider;

/**
 * Interface for multimodal vision models analyzing defect photos.
 */
public interface VisionTriageProvider extends TriageProvider {

    /**
     * Name of the active model being called (e.g., "gemini-1.5-flash", "grok-2-vision-1212").
     */
    String getModelName();

    /**
     * Analyzes an EXIF-stripped image payload and returns structured triage findings.
     *
     * @param imageBytes validated JPEG or PNG binary bytes
     * @param mimeType "image/jpeg" or "image/png"
     * @return parsed and clamped VisionTriageOutput
     * @throws Exception on network, timeout, quota, or parsing failure
     */
    VisionTriageOutput analyze(byte[] imageBytes, String mimeType) throws Exception;
}

