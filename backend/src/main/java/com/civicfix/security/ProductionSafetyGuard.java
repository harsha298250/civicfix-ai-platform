package com.civicfix.security;

import com.civicfix.ai.vision.VisionTriageProperties;
import com.civicfix.user.User;
import com.civicfix.user.UserRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.context.annotation.Profile;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.UUID;

/**
 * ProductionSafetyGuard — Startup guard active exclusively with the 'prod' profile.
 * Enforces production security invariants:
 * 1. Rejects application startup if the database password equals the dev default or is empty.
 * 2. Disables the 4 V2 seed accounts (UUIDs 00000000-0000-0000-0000-000000000001 to ...0004)
 *    unless ALLOW_SEED_ACCOUNTS=true is explicitly configured.
 * 3. Fails fast if AI_VISION_ENABLED=true and the selected provider API key is missing.
 */
@Component
@Profile("prod")
public class ProductionSafetyGuard implements ApplicationRunner {

    private static final Logger log = LoggerFactory.getLogger(ProductionSafetyGuard.class);

    public static final String DEV_DEFAULT_DB_PASSWORD = "civicfix_dev_password_only";

    public static final List<UUID> V2_SEED_ACCOUNT_IDS = List.of(
            UUID.fromString("00000000-0000-0000-0000-000000000001"), // Alex Morgan (CITIZEN)
            UUID.fromString("00000000-0000-0000-0000-000000000002"), // Elena Vance (OFFICER)
            UUID.fromString("00000000-0000-0000-0000-000000000003"), // Marcus Chen (WORKER)
            UUID.fromString("00000000-0000-0000-0000-000000000004")  // Priya Sharma (ADMIN)
    );

    private final UserRepository userRepository;
    private final String dbPassword;
    private final boolean allowSeedAccounts;
    private final VisionTriageProperties visionProperties;

    @Autowired
    public ProductionSafetyGuard(
            UserRepository userRepository,
            @Value("${spring.datasource.password:}") String dbPassword,
            @Value("${civicfix.security.allow-seed-accounts:${ALLOW_SEED_ACCOUNTS:false}}") boolean allowSeedAccounts,
            @Autowired(required = false) VisionTriageProperties visionProperties) {
        this.userRepository = userRepository;
        this.dbPassword = dbPassword;
        this.allowSeedAccounts = allowSeedAccounts;
        this.visionProperties = visionProperties;
    }

    public ProductionSafetyGuard(
            UserRepository userRepository,
            String dbPassword,
            boolean allowSeedAccounts) {
        this(userRepository, dbPassword, allowSeedAccounts, null);
    }

    @Override
    @Transactional
    public void run(ApplicationArguments args) {
        validateDatabasePassword();
        enforceSeedAccountPolicy();
        validateVisionConfiguration();
    }

    /**
     * Requirement (b): Refuse startup if database password is empty or equals the dev default.
     */
    public void validateDatabasePassword() {
        if (dbPassword == null || dbPassword.trim().isEmpty() || DEV_DEFAULT_DB_PASSWORD.equalsIgnoreCase(dbPassword.trim())) {
            throw new IllegalStateException(
                    "Production startup rejected: Database password cannot be empty or the dev default ('"
                            + DEV_DEFAULT_DB_PASSWORD + "'). Configure a secure, unique DB_PASSWORD environment variable."
            );
        }
    }

    /**
     * Requirement (a): Disable V2 seed account UUIDs unless ALLOW_SEED_ACCOUNTS=true.
     */
    public int enforceSeedAccountPolicy() {
        if (allowSeedAccounts) {
            log.warn("SECURITY WARNING: ALLOW_SEED_ACCOUNTS=true in production profile. V2 seed accounts remain active.");
            return 0;
        }

        int disabledCount = 0;
        for (UUID seedId : V2_SEED_ACCOUNT_IDS) {
            var userOpt = userRepository.findById(seedId);
            if (userOpt.isPresent()) {
                User user = userOpt.get();
                if (!"DISABLED".equalsIgnoreCase(user.getAccountStatus())) {
                    user.setAccountStatus("DISABLED");
                    userRepository.save(user);
                    disabledCount++;
                    log.info("Production safety: Disabled V2 seed user {} ({})", user.getEmail(), seedId);
                }
            }
        }
        return disabledCount;
    }

    public boolean isAllowSeedAccounts() {
        return allowSeedAccounts;
    }

    public String getDbPassword() {
        return dbPassword;
    }

    /**
     * Requirement (c): Reject startup if AI_VISION_ENABLED=true and the selected provider's API key is missing.
     */
    public void validateVisionConfiguration() {
        if (visionProperties != null && visionProperties.isEnabled()) {
            String provider = visionProperties.getProvider() != null ? visionProperties.getProvider().toLowerCase().trim() : "gemini";
            if ("gemini".equals(provider)) {
                if (visionProperties.getGoogleApiKey() == null || visionProperties.getGoogleApiKey().trim().isEmpty()) {
                    throw new IllegalStateException(
                            "Production startup rejected: AI_VISION_ENABLED=true with GEMINI provider, but GOOGLE_AI_API_KEY is not configured."
                    );
                }
            } else if ("xai".equals(provider)) {
                if (visionProperties.getXaiApiKey() == null || visionProperties.getXaiApiKey().trim().isEmpty()) {
                    throw new IllegalStateException(
                            "Production startup rejected: AI_VISION_ENABLED=true with XAI provider, but XAI_API_KEY is not configured."
                    );
                }
            }
        }
    }
}

