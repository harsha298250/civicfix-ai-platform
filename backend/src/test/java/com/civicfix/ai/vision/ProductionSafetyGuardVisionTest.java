package com.civicfix.ai.vision;

import com.civicfix.security.ProductionSafetyGuard;
import com.civicfix.user.UserRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import java.lang.reflect.Proxy;

import static org.junit.jupiter.api.Assertions.assertDoesNotThrow;
import static org.junit.jupiter.api.Assertions.assertThrows;

class ProductionSafetyGuardVisionTest {

    private UserRepository userRepository;
    private VisionTriageProperties properties;

    @BeforeEach
    void setUp() {
        userRepository = (UserRepository) Proxy.newProxyInstance(
                UserRepository.class.getClassLoader(),
                new Class<?>[]{UserRepository.class},
                (proxy, method, args) -> null
        );
        properties = new VisionTriageProperties();
    }

    @Test
    @DisplayName("Prod safety guard rejects empty Google API key when Gemini vision is enabled")
    void testProdRejectsEmptyGeminiKey() {
        properties.setEnabled(true);
        properties.setProvider("gemini");
        properties.setGoogleApiKey("");

        ProductionSafetyGuard guard = new ProductionSafetyGuard(userRepository, "secure_prod_password_123", false, properties);
        assertThrows(IllegalStateException.class, guard::validateVisionConfiguration);
    }

    @Test
    @DisplayName("Prod safety guard rejects empty xAI API key when xAI vision is enabled")
    void testProdRejectsEmptyXaiKey() {
        properties.setEnabled(true);
        properties.setProvider("xai");
        properties.setXaiApiKey("");

        ProductionSafetyGuard guard = new ProductionSafetyGuard(userRepository, "secure_prod_password_123", false, properties);
        assertThrows(IllegalStateException.class, guard::validateVisionConfiguration);
    }

    @Test
    @DisplayName("Prod safety guard passes when configured with valid keys")
    void testProdPassesWithConfiguredKeys() {
        properties.setEnabled(true);
        properties.setProvider("gemini");
        properties.setGoogleApiKey("valid-google-key");

        ProductionSafetyGuard guard = new ProductionSafetyGuard(userRepository, "secure_prod_password_123", false, properties);
        assertDoesNotThrow(guard::validateVisionConfiguration);
    }

    @Test
    @DisplayName("Prod safety guard passes when vision is disabled even if keys are blank")
    void testProdPassesWhenVisionDisabled() {
        properties.setEnabled(false);
        properties.setGoogleApiKey("");
        properties.setXaiApiKey("");

        ProductionSafetyGuard guard = new ProductionSafetyGuard(userRepository, "secure_prod_password_123", false, properties);
        assertDoesNotThrow(guard::validateVisionConfiguration);
    }
}

