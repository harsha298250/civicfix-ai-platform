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

class GeminiVisionTriageProviderTest {

    private VisionTriageProperties properties;
    private FakeHttpClient fakeHttpClient;
    private GeminiVisionTriageProvider provider;

    private static final String SECRET_API_KEY = "test-secret-gemini-key-12345";

    @BeforeEach
    void setUp() {
        properties = new VisionTriageProperties();
        properties.setGoogleApiKey(SECRET_API_KEY);
        properties.setGeminiModel("gemini-1.5-flash");
        properties.setTimeoutMs(5000);
        properties.setGeminiBaseUrl("https://generativelanguage.googleapis.com");

        fakeHttpClient = new FakeHttpClient();
        provider = new GeminiVisionTriageProvider(properties, fakeHttpClient);
    }

    @Test
    @DisplayName("Gemini provider returns valid VisionTriageOutput on HTTP 200")
    void testSuccessfulGeminiResponse() throws Exception {
        String geminiResponseBody = """
                {
                  "candidates": [
                    {
                      "content": {
                        "parts": [
                          {
                            "text": "{\\"category\\": \\"ROADS\\", \\"severity\\": 4, \\"confidence\\": 0.95, \\"reason\\": \\"Severe pothole on roadway.\\"}"
                          }
                        ]
                      }
                    }
                  ]
                }
                """;

        fakeHttpClient.statusCodeToReturn = 200;
        fakeHttpClient.bodyToReturn = geminiResponseBody;

        byte[] fakeImage = "fake-jpeg-bytes".getBytes(StandardCharsets.UTF_8);
        VisionTriageOutput output = provider.analyze(fakeImage, "image/jpeg");

        assertNotNull(output);
        assertEquals("ROADS", output.getCategory());
        assertEquals(4, output.getSeverity());
        assertEquals("Severe pothole on roadway.", output.getReason());
        assertEquals("GEMINI", provider.getProviderName());
        assertEquals("gemini-1.5-flash", provider.getModelName());

        HttpRequest sentRequest = fakeHttpClient.lastRequest;
        assertNotNull(sentRequest);
        assertEquals("https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent", sentRequest.uri().toString());
        assertEquals(SECRET_API_KEY, sentRequest.headers().firstValue("x-goog-api-key").orElse(""));
    }

    @Test
    @DisplayName("Gemini provider throws exception on HTTP 429 rate limit")
    void testRateLimit429() {
        fakeHttpClient.statusCodeToReturn = 429;
        fakeHttpClient.bodyToReturn = "{\"error\": \"Quota exceeded\"}";

        byte[] fakeImage = "fake-jpeg-bytes".getBytes(StandardCharsets.UTF_8);
        RuntimeException ex = assertThrows(RuntimeException.class, () -> provider.analyze(fakeImage, "image/jpeg"));
        assertTrue(ex.getMessage().contains("429"));
    }

    @Test
    @DisplayName("Gemini provider throws exception on HTTP 500 server error")
    void testServerError500() {
        fakeHttpClient.statusCodeToReturn = 500;
        fakeHttpClient.bodyToReturn = "Internal Server Error";

        byte[] fakeImage = "fake-jpeg-bytes".getBytes(StandardCharsets.UTF_8);
        RuntimeException ex = assertThrows(RuntimeException.class, () -> provider.analyze(fakeImage, "image/jpeg"));
        assertTrue(ex.getMessage().contains("500"));
    }

    @Test
    @DisplayName("Gemini provider propagates timeout exception")
    void testTimeout() {
        fakeHttpClient.exceptionToThrow = new HttpTimeoutException("request timed out");

        byte[] fakeImage = "fake-jpeg-bytes".getBytes(StandardCharsets.UTF_8);
        assertThrows(HttpTimeoutException.class, () -> provider.analyze(fakeImage, "image/jpeg"));
    }

    @Test
    @DisplayName("Gemini provider rejects missing API key")
    void testMissingApiKey() {
        properties.setGoogleApiKey("");
        byte[] fakeImage = "fake-jpeg-bytes".getBytes(StandardCharsets.UTF_8);
        assertThrows(IllegalStateException.class, () -> provider.analyze(fakeImage, "image/jpeg"));
    }

    @Test
    @DisplayName("API key and image bytes never appear in logs")
    void testApiKeyNeverLogged() throws Exception {
        Logger providerLogger = (Logger) LoggerFactory.getLogger(GeminiVisionTriageProvider.class);
        ListAppender<ILoggingEvent> listAppender = new ListAppender<>();
        listAppender.start();
        providerLogger.addAppender(listAppender);

        fakeHttpClient.statusCodeToReturn = 200;
        fakeHttpClient.bodyToReturn = """
                {
                  "candidates": [{
                    "content": {
                      "parts": [{ "text": "{\\"category\\": \\"ROADS\\", \\"severity\\": 3, \\"confidence\\": 0.8, \\"reason\\": \\"Pothole\\"}" }]
                    }
                  }]
                }
                """;

        byte[] fakeImage = "super-secret-image-content-bytes".getBytes(StandardCharsets.UTF_8);
        provider.analyze(fakeImage, "image/jpeg");

        for (ILoggingEvent event : listAppender.list) {
            assertFalse(event.getFormattedMessage().contains(SECRET_API_KEY), "API key was leaked in log message!");
            assertFalse(event.getFormattedMessage().contains("super-secret-image-content-bytes"), "Image bytes were leaked in log message!");
        }

        providerLogger.detachAppender(listAppender);
    }
}
