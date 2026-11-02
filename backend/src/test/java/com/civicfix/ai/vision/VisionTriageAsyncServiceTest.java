package com.civicfix.ai.vision;

import com.civicfix.complaint.*;
import com.civicfix.security.ratelimit.RateLimiterService;
import com.civicfix.storage.StorageService;
import io.github.bucket4j.ConsumptionProbe;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.core.io.ByteArrayResource;
import org.springframework.core.task.SyncTaskExecutor;

import java.lang.reflect.Proxy;
import java.math.BigDecimal;
import java.time.Duration;
import java.time.OffsetDateTime;
import java.util.*;

import static org.junit.jupiter.api.Assertions.*;

class VisionTriageAsyncServiceTest {

    private ComplaintRepository complaintRepository;
    private ComplaintPhotoRepository complaintPhotoRepository;
    private StorageService storageService;
    private RateLimiterService rateLimiterService;
    private VisionTriageProperties properties;
    private FakeHttpClient geminiHttpClient;
    private FakeHttpClient xaiHttpClient;
    private GeminiVisionTriageProvider geminiProvider;
    private XaiVisionTriageProvider xaiProvider;

    private VisionTriageAsyncService service;

    private UUID complaintId;
    private UUID citizenId;
    private Complaint complaint;
    private List<ComplaintPhoto> photosList;
    private long dailyInvocationsCount = 0;
    private int claimCount = 0;

    // Captured repo updates
    private String lastUpdatedStatus;
    private String lastUpdatedReason;
    private String lastSuccessCategory;
    private Integer lastSuccessSeverity;
    private BigDecimal lastSuccessConfidence;
    private String lastSuccessReason;
    private String lastSuccessModel;
    private Boolean lastSuccessDisagreement;
    private String lastSuccessPrioritySource;
    private ComplaintPriority lastSuccessPriority;

    private boolean rateLimiterAllowed = true;

    @BeforeEach
    void setUp() {
        claimCount = 0;
        dailyInvocationsCount = 0;
        rateLimiterAllowed = true;
        photosList = new ArrayList<>();
        lastUpdatedStatus = null;
        lastUpdatedReason = null;
        lastSuccessCategory = null;
        lastSuccessSeverity = null;
        lastSuccessConfidence = null;
        lastSuccessReason = null;
        lastSuccessModel = null;
        lastSuccessDisagreement = null;
        lastSuccessPrioritySource = null;
        lastSuccessPriority = null;

        complaintId = UUID.randomUUID();
        citizenId = UUID.randomUUID();

        complaint = new Complaint();
        complaint.setId(complaintId);
        complaint.setAiDetectedCategory("ROADS");
        complaint.setAiRecommendedPriority(ComplaintPriority.MEDIUM);
        complaint.setVisionConsent(true);
        complaint.setVisionStatus("NOT_RUN");

        properties = new VisionTriageProperties();
        properties.setEnabled(true);
        properties.setProvider("gemini");
        properties.setDailyCap(200);
        properties.setGoogleApiKey("test-key");
        properties.setXaiApiKey("test-xai-key");
        properties.setGeminiModel("gemini-1.5-flash");
        properties.setXaiModel("grok-2-vision-1212");

        geminiHttpClient = new FakeHttpClient();
        xaiHttpClient = new FakeHttpClient();
        geminiProvider = new GeminiVisionTriageProvider(properties, geminiHttpClient);
        xaiProvider = new XaiVisionTriageProvider(properties, xaiHttpClient);

        complaintRepository = (ComplaintRepository) Proxy.newProxyInstance(
                ComplaintRepository.class.getClassLoader(),
                new Class<?>[]{ComplaintRepository.class},
                (proxy, method, args) -> {
                    String name = method.getName();
                    if ("findById".equals(name)) {
                        return Optional.of(complaint);
                    }
                    if ("claimForVisionTriage".equals(name)) {
                        claimCount++;
                        return 1;
                    }
                    if ("countDailyVisionInvocations".equals(name)) {
                        return dailyInvocationsCount;
                    }
                    if ("updateVisionStatus".equals(name)) {
                        lastUpdatedStatus = (String) args[1];
                        lastUpdatedReason = (String) args[2];
                        return 1;
                    }
                    if ("updateVisionSuccess".equals(name)) {
                        lastSuccessCategory = (String) args[1];
                        lastSuccessSeverity = (Integer) args[2];
                        lastSuccessConfidence = (BigDecimal) args[3];
                        lastSuccessReason = (String) args[4];
                        lastSuccessModel = (String) args[5];
                        lastUpdatedStatus = (String) args[6];
                        lastSuccessDisagreement = (Boolean) args[8];
                        lastSuccessPrioritySource = (String) args[9];
                        lastSuccessPriority = (ComplaintPriority) args[10];
                        return 1;
                    }
                    if ("cleanupStuckRunningRows".equals(name)) {
                        return 3;
                    }
                    return null;
                }
        );

        complaintPhotoRepository = (ComplaintPhotoRepository) Proxy.newProxyInstance(
                ComplaintPhotoRepository.class.getClassLoader(),
                new Class<?>[]{ComplaintPhotoRepository.class},
                (proxy, method, args) -> {
                    if ("findByComplaintIdOrderByCreatedAtAsc".equals(method.getName())) {
                        return photosList;
                    }
                    return Collections.emptyList();
                }
        );

        storageService = (StorageService) Proxy.newProxyInstance(
                StorageService.class.getClassLoader(),
                new Class<?>[]{StorageService.class},
                (proxy, method, args) -> {
                    if ("loadFileAsResource".equals(method.getName())) {
                        return new ByteArrayResource("valid-jpeg-bytes".getBytes());
                    }
                    return null;
                }
        );

        rateLimiterService = new RateLimiterService() {
            @Override
            public ConsumptionProbe tryConsume(String key, long capacity, Duration duration) {
                if (!rateLimiterAllowed) {
                    return ConsumptionProbe.rejected(0, 1000L, 1000L);
                }
                return super.tryConsume(key, capacity, duration);
            }
        };

        service = new VisionTriageAsyncService(
                complaintRepository,
                complaintPhotoRepository,
                storageService,
                rateLimiterService,
                properties,
                geminiProvider,
                xaiProvider,
                new SyncTaskExecutor()
        );
    }

    @Test
    @DisplayName("Disabled flag means no call and status remains unchanged")
    void testDisabledFlagMeansNoCall() {
        properties.setEnabled(false);

        service.processVisionTriage(complaintId, citizenId);

        assertEquals(0, claimCount);
        assertNull(lastUpdatedStatus);
    }

    @Test
    @DisplayName("Consent false means no vision triage call")
    void testConsentFalseMeansNoCall() {
        complaint.setVisionConsent(false);

        service.processVisionTriage(complaintId, citizenId);

        assertEquals(1, claimCount);
        assertNull(lastUpdatedStatus);
    }

    @Test
    @DisplayName("No photo attached marks vision_status as SKIPPED")
    void testNoPhotoMarksSkipped() {
        photosList.clear();

        service.processVisionTriage(complaintId, citizenId);

        assertEquals("SKIPPED", lastUpdatedStatus);
        assertEquals("No photo attached", lastUpdatedReason);
    }

    @Test
    @DisplayName("WebP photo is SKIPPED to prevent unstripped EXIF/GPS leakage")
    void testWebpPhotoIsSkipped() {
        ComplaintPhoto photo = new ComplaintPhoto(complaint, "/api/complaints/evidence/files/evidence-123.webp");
        photo.setFileName("defect.webp");
        photo.setContentType("image/webp");
        photo.setFileSize(500_000L);
        photosList.add(photo);

        service.processVisionTriage(complaintId, citizenId);

        assertEquals("SKIPPED", lastUpdatedStatus);
        assertTrue(lastUpdatedReason.contains("WebP image format skipped"));
    }

    @Test
    @DisplayName("Photo over 4 MB is SKIPPED")
    void testPhotoOver4MbIsSkipped() {
        ComplaintPhoto photo = new ComplaintPhoto(complaint, "/api/complaints/evidence/files/evidence-large.jpg");
        photo.setFileName("defect.jpg");
        photo.setContentType("image/jpeg");
        photo.setFileSize(5 * 1024 * 1024L); // 5 MB
        photosList.add(photo);

        service.processVisionTriage(complaintId, citizenId);

        assertEquals("SKIPPED", lastUpdatedStatus);
        assertTrue(lastUpdatedReason.contains("4 MB"));
    }

    @Test
    @DisplayName("Daily cap blocks calls with SKIPPED status")
    void testDailyCapBlocksCalls() {
        ComplaintPhoto photo = new ComplaintPhoto(complaint, "/api/complaints/evidence/files/evidence-valid.jpg");
        photo.setFileName("defect.jpg");
        photo.setContentType("image/jpeg");
        photo.setFileSize(1_000_000L);
        photosList.add(photo);
        dailyInvocationsCount = 200L; // Cap reached

        service.processVisionTriage(complaintId, citizenId);

        assertEquals("SKIPPED", lastUpdatedStatus);
        assertTrue(lastUpdatedReason.contains("Daily vision triage cap"));
    }

    @Test
    @DisplayName("Per-user rate limit blocks calls with SKIPPED status")
    void testPerUserRateLimitBlocksCalls() {
        ComplaintPhoto photo = new ComplaintPhoto(complaint, "/api/complaints/evidence/files/evidence-valid.jpg");
        photo.setFileName("defect.jpg");
        photo.setContentType("image/jpeg");
        photo.setFileSize(1_000_000L);
        photosList.add(photo);
        rateLimiterAllowed = false;

        service.processVisionTriage(complaintId, citizenId);

        assertEquals("SKIPPED", lastUpdatedStatus);
        assertTrue(lastUpdatedReason.contains("User per-minute vision rate limit"));
    }

    @Test
    @DisplayName("Valid JSON is stored and severity 5 elevates priority by one level")
    void testValidJsonStoredAndSeverityElevatesPriority() {
        ComplaintPhoto photo = new ComplaintPhoto(complaint, "/api/complaints/evidence/files/evidence-valid.jpg");
        photo.setFileName("defect.jpg");
        photo.setContentType("image/jpeg");
        photo.setFileSize(1_000_000L);
        photosList.add(photo);

        geminiHttpClient.statusCodeToReturn = 200;
        geminiHttpClient.bodyToReturn = """
                {
                  "candidates": [{
                    "content": {
                      "parts": [{ "text": "{\\"category\\": \\"ROADS\\", \\"severity\\": 5, \\"confidence\\": 0.95, \\"reason\\": \\"Dangerous deep crater in arterial road.\\"}" }]
                    }
                  }]
                }
                """;

        service.processVisionTriage(complaintId, citizenId);

        assertEquals("ROADS", lastSuccessCategory);
        assertEquals(5, lastSuccessSeverity);
        assertEquals(new BigDecimal("0.95"), lastSuccessConfidence);
        assertEquals("Dangerous deep crater in arterial road.", lastSuccessReason);
        assertEquals("gemini-1.5-flash", lastSuccessModel);
        assertEquals("OK", lastUpdatedStatus);
        assertFalse(lastSuccessDisagreement);
        assertEquals("VISION_SEVERITY_5", lastSuccessPrioritySource);
        assertEquals(ComplaintPriority.HIGH, lastSuccessPriority);
    }

    @Test
    @DisplayName("Category disagreement sets disagreement=true and source=RULE_ENGINE when severity < 5")
    void testCategoryDisagreementSetsFlag() {
        ComplaintPhoto photo = new ComplaintPhoto(complaint, "/api/complaints/evidence/files/evidence-water.jpg");
        photo.setFileName("water.jpg");
        photo.setContentType("image/jpeg");
        photo.setFileSize(1_000_000L);
        photosList.add(photo);

        geminiHttpClient.statusCodeToReturn = 200;
        geminiHttpClient.bodyToReturn = """
                {
                  "candidates": [{
                    "content": {
                      "parts": [{ "text": "{\\"category\\": \\"WATER_SEWERAGE\\", \\"severity\\": 3, \\"confidence\\": 0.90, \\"reason\\": \\"Burst water pipe flooding street.\\"}" }]
                    }
                  }]
                }
                """;

        service.processVisionTriage(complaintId, citizenId);

        assertEquals("WATER_SEWERAGE", lastSuccessCategory);
        assertEquals(3, lastSuccessSeverity);
        assertEquals(new BigDecimal("0.90"), lastSuccessConfidence);
        assertEquals("Burst water pipe flooding street.", lastSuccessReason);
        assertEquals("gemini-1.5-flash", lastSuccessModel);
        assertEquals("OK", lastUpdatedStatus);
        assertTrue(lastSuccessDisagreement);
        assertEquals("RULE_ENGINE", lastSuccessPrioritySource);
        assertEquals(ComplaintPriority.MEDIUM, lastSuccessPriority);
    }

    @Test
    @DisplayName("Model failure, timeout, or HTTP errors end in FAILED with rule result intact")
    void testModelFailureEndsInFailed() {
        ComplaintPhoto photo = new ComplaintPhoto(complaint, "/api/complaints/evidence/files/evidence-valid.jpg");
        photo.setFileName("defect.jpg");
        photo.setContentType("image/jpeg");
        photo.setFileSize(1_000_000L);
        photosList.add(photo);

        geminiHttpClient.statusCodeToReturn = 500;
        geminiHttpClient.bodyToReturn = "Server Error";

        service.processVisionTriage(complaintId, citizenId);

        assertEquals("FAILED", lastUpdatedStatus);
        assertTrue(lastUpdatedReason.contains("500"));
        assertNull(lastSuccessCategory);
    }

    @Test
    @DisplayName("Stuck rows in RUNNING state are cleaned up by scheduler")
    void testCleanupStuckRunningRows() {
        VisionTriageCleanupScheduler scheduler = new VisionTriageCleanupScheduler(complaintRepository);
        int cleaned = scheduler.cleanupStuckRows();
        assertEquals(3, cleaned);
    }
}
