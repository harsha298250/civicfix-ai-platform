package com.civicfix.security;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import static org.junit.jupiter.api.Assertions.*;

class SeedAccountStartupLoggerTest {

    @Test
    @DisplayName("Startup Logger: allowSeedAccounts flag is respected and executes warning without exception")
    void testSeedAccountStartupLoggerExecution() {
        SeedAccountStartupLogger enabledLogger = new SeedAccountStartupLogger(true);
        assertTrue(enabledLogger.isAllowSeedAccounts());
        assertDoesNotThrow(() -> enabledLogger.run(null));

        SeedAccountStartupLogger disabledLogger = new SeedAccountStartupLogger(false);
        assertFalse(disabledLogger.isAllowSeedAccounts());
        assertDoesNotThrow(() -> disabledLogger.run(null));
    }
}

