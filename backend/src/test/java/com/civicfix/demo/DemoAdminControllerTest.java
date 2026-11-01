package com.civicfix.demo;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;

import java.util.Map;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class DemoAdminControllerTest {

    @Mock
    private DemoDataSeeder demoDataSeeder;

    @InjectMocks
    private DemoAdminController controller;

    @Test
    @DisplayName("POST /api/admin/demo/reset delegates to DemoDataSeeder.reset and returns success response")
    void testResetDemoData_Success() {
        when(demoDataSeeder.reset()).thenReturn(40);

        ResponseEntity<Map<String, Object>> response = controller.resetDemoData();

        assertEquals(HttpStatus.OK, response.getStatusCode());
        assertNotNull(response.getBody());
        assertEquals("SUCCESS", response.getBody().get("status"));
        assertEquals(40, response.getBody().get("complaintCount"));
        verify(demoDataSeeder).reset();
    }
}

