package com.civicfix;

import org.junit.jupiter.api.Test;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.ActiveProfiles;

@SpringBootTest
@ActiveProfiles("test")
class CivicFixApplicationTests {

    @Test
    void contextLoads() {
        // Verifies Spring context, Flyway migration, PostgreSQL connectivity, and JPA initialization
    }
}
