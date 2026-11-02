package com.civicfix.ai.vision;

import ch.qos.logback.classic.Logger;
import ch.qos.logback.classic.spi.ILoggingEvent;
import ch.qos.logback.core.read.ListAppender;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.slf4j.LoggerFactory;

import java.net.http.HttpRequest;
import java.net.http.HttpTimeoutException;
import java.nio.charset.StandardCharsets;

import static org.junit.jupiter.api.Assertions.*;

class XaiVisionTriageProviderTest {

    private VisionTriageProperties properties;
    private FakeHttpClient fakeHttpClient;
    private XaiVisionTriageProvider provider;

    private static final String SECRET_API_KEY = "test-secret-xai-key-67890";

    @BeforeEach
    void setUp() {
        properties = new VisionTriageProperties();
        properties.setXaiApiKey(SECRET_API_KEY);
        properties.setXaiModel("grok-2-vision-1212");
        properties.setTimeoutMs(5000);
        properties.setXaiBaseUrl("https://api.x.ai");

        fakeHttpClient = new FakeHttpClient();
        provider = new XaiVisionTriageProvider(properties, fakeHttpClient);
    }

    @Test
    @DisplayName("xAI provider returns valid VisionTriageOutput on HTTP 200")
    void testSuccessfulXaiResponse() throws Exception {
        String xaiResponseBody = """
                {
                  "choices": [
                    {
                      "message": {
                        "content": "{\\"category\\": \\"STREET_LIGHT\\", \\"severity\\": 3, \\"confidence\\": 0.88, \\"reason\\": \\"Broken street light fixture.\\"}"
                      }
                    }
                  ]
                }
                """;

        fakeHttpClient.statusCodeToReturn = 200;
        fakeHttpClient.bodyToReturn = xaiResponseBody;

        byte[] fakeImage = "fake-png-bytes".getBytes(StandardCharsets.UTF_8);
        VisionTriageOutput output = provider.analyze(fakeImage, "image/png");

        assertNotNull(output);
        assertEquals("STREET_LIGHT", output.getCategory());
        assertEquals(3, output.getSeverity());
        assertEquals("Broken street light fixture.", output.getReason());
        assertEquals("XAI", provider.getProviderName());
        assertEquals("grok-2-vision-1212", provider.getModelName());

        HttpRequest sentRequest = fakeHttpClient.lastRequest;
        assertNotNull(sentRequest);
        assertEquals("https://api.x.ai/v1/chat/completions", sentRequest.uri().toString());
        assertEquals("Bearer " + SECRET_API_KEY, sentRequest.headers().firstValue("Authorization").orElse(""));
    }

    @Test
    @DisplayName("xAI provider throws exception on HTTP 429 rate limit")
    void testRateLimit429() {
        fakeHttpClient.statusCodeToReturn = 429;
        fakeHttpClient.bodyToReturn = "{\"error\": \"Rate limit exceeded\"}";

        byte[] fakeImage = "fake-png-bytes".getBytes(StandardCharsets.UTF_8);
        RuntimeException ex = assertThrows(RuntimeException.class, () -> provider.analyze(fakeImage, "image/png"));
        assertTrue(ex.getMessage().contains("429"));
    }

    @Test
    @DisplayName("xAI provider throws exception on HTTP 500 server error")
    void testServerError500() {
        fakeHttpClient.statusCodeToReturn = 500;
        fakeHttpClient.bodyToReturn = "Server Error";

        byte[] fakeImage = "fake-png-bytes".getBytes(StandardCharsets.UTF_8);
        RuntimeException ex = assertThrows(RuntimeException.class, () -> provider.analyze(fakeImage, "image/png"));
        assertTrue(ex.getMessage().contains("500"));
    }

    @Test
    @DisplayName("xAI provider propagates timeout exception")
    void testTimeout() {
        fakeHttpClient.exceptionToThrow = new HttpTimeoutException("request timed out");

        byte[] fakeImage = "fake-png-bytes".getBytes(StandardCharsets.UTF_8);
        assertThrows(HttpTimeoutException.class, () -> provider.analyze(fakeImage, "image/png"));
    }

    @Test
    @DisplayName("xAI provider rejects missing API key")
    void testMissingApiKey() {
        properties.setXaiApiKey("");
        byte[] fakeImage = "fake-png-bytes".getBytes(StandardCharsets.UTF_8);
        assertThrows(IllegalStateException.class, () -> provider.analyze(fakeImage, "image/png"));
    }

    @Test
    @DisplayName("API key and image bytes never appear in logs")
    void testApiKeyNeverLogged() throws Exception {
        Logger providerLogger = (Logger) LoggerFactory.getLogger(XaiVisionTriageProvider.class);
        ListAppender<ILoggingEvent> listAppender = new ListAppender<>();
        listAppender.start();
        providerLogger.addAppender(listAppender);

        fakeHttpClient.statusCodeToReturn = 200;
        fakeHttpClient.bodyToReturn = """
                {
                  "choices": [{
                    "message": {
                      "content": "{\\"category\\": \\"GARBAGE\\", \\"severity\\": 2, \\"confidence\\": 0.9, \\"reason\\": \\"Overflowing trash can.\\"}"
                    }
                  }]
                }
                """;

        byte[] fakeImage = "super-secret-xai-image-bytes".getBytes(StandardCharsets.UTF_8);
        provider.analyze(fakeImage, "image/png");

        for (ILoggingEvent event : listAppender.list) {
            assertFalse(event.getFormattedMessage().contains(SECRET_API_KEY), "xAI API key was leaked in log message!");
            assertFalse(event.getFormattedMessage().contains("super-secret-xai-image-bytes"), "Image bytes were leaked in log message!");
        }

        providerLogger.detachAppender(listAppender);
    }
}
