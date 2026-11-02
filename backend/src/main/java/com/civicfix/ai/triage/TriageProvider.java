package com.civicfix.ai.triage;

/**
 * Common abstraction for civic complaint triage engines (deterministic rules and multimodal vision).
 */
public interface TriageProvider {

    /**
     * Unique identifier for the provider (e.g., "DETERMINISTIC_RULES", "GEMINI", "XAI").
     */
    String getProviderName();
}

