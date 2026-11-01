package com.civicfix.security;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.stereotype.Component;

/**
 * Startup runner that emits a prominent security warning whenever the platform boots
 * with pre-seeded demonstration accounts enabled.
 *
 * Seed accounts are designed strictly for local development, testing, and capstone demonstrations.
 * In production environments, ALLOW_SEED_ACCOUNTS must be configured to 'false'.
 */
@Component
public class SeedAccountStartupLogger implements ApplicationRunner {

    private static final Logger log = LoggerFactory.getLogger(SeedAccountStartupLogger.class);

    private final boolean allowSeedAccounts;

    public SeedAccountStartupLogger(
            @Value("${civicfix.security.allow-seed-accounts:${ALLOW_SEED_ACCOUNTS:true}}") boolean allowSeedAccounts) {
        this.allowSeedAccounts = allowSeedAccounts;
    }

    @Override
    public void run(ApplicationArguments args) {
        if (allowSeedAccounts) {
            log.warn("==========================================================================================");
            log.warn("SECURITY WARNING: ALLOW_SEED_ACCOUNTS is ENABLED! Pre-seeded demonstration accounts with");
            log.warn("known default credentials are active in the system. NEVER deploy with these defaults in production!");
            log.warn("Set ALLOW_SEED_ACCOUNTS=false and SPRING_PROFILES_ACTIVE=prod for production environments.");
            log.warn("==========================================================================================");
        }
    }

    public boolean isAllowSeedAccounts() {
        return allowSeedAccounts;
    }
}

