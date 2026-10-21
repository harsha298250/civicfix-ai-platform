package com.civicfix.security;

import org.junit.jupiter.api.Test;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;

import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;

class PasswordHashingTest {

    @Test
    void testBCryptPasswordHashing() {
        BCryptPasswordEncoder encoder = new BCryptPasswordEncoder(10);
        String rawPassword = "CivicSecure#2026!";
        String encoded = encoder.encode(rawPassword);

        System.out.println("VERIFIED_BCRYPT_HASH=" + encoded);

        assertTrue(encoder.matches(rawPassword, encoded), "Encoded password should match original");
        assertFalse(encoder.matches("WrongPassword", encoded), "Wrong password should be rejected");
        assertFalse(encoded.contains(rawPassword), "Encoded hash must not reveal raw password");
    }
}
