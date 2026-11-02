package com.civicfix.ai.vision;

import com.civicfix.complaint.Complaint;
import com.civicfix.complaint.ComplaintPhoto;
import com.civicfix.complaint.ComplaintPhotoRepository;
import com.civicfix.complaint.ComplaintPriority;
import com.civicfix.complaint.ComplaintRepository;
import com.civicfix.security.ratelimit.RateLimiterService;
import com.civicfix.storage.StorageService;
import io.github.bucket4j.ConsumptionProbe;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Qualifier;
import org.springframework.core.io.Resource;
import org.springframework.core.task.TaskExecutor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;

import java.time.OffsetDateTime;
import java.time.ZoneOffset;
import java.util.List;
import java.util.UUID;

@Service
public class VisionTriageAsyncService {

    private static final Logger log = LoggerFactory.getLogger(VisionTriageAsyncService.class);
    private static final long MAX_PHOTO_BYTES = 4 * 1024 * 1024; // 4 MB

    private final ComplaintRepository complaintRepository;
    private final ComplaintPhotoRepository complaintPhotoRepository;
    private final StorageService storageService;
    private final RateLimiterService rateLimiterService;
    private final VisionTriageProperties properties;
    private final GeminiVisionTriageProvider geminiProvider;
    private final XaiVisionTriageProvider xaiProvider;
    private final TaskExecutor taskExecutor;

    public VisionTriageAsyncService(
            ComplaintRepository complaintRepository,
            ComplaintPhotoRepository complaintPhotoRepository,
            StorageService storageService,
            RateLimiterService rateLimiterService,
            VisionTriageProperties properties,
            GeminiVisionTriageProvider geminiProvider,
            XaiVisionTriageProvider xaiProvider,
            @Qualifier("visionTaskExecutor") TaskExecutor taskExecutor) {
        this.complaintRepository = complaintRepository;
        this.complaintPhotoRepository = complaintPhotoRepository;
        this.storageService = storageService;
        this.rateLimiterService = rateLimiterService;
        this.properties = properties;
        this.geminiProvider = geminiProvider;
        this.xaiProvider = xaiProvider;
        this.taskExecutor = taskExecutor;
    }

    public void submitVisionTriage(UUID complaintId, UUID citizenId) {
        taskExecutor.execute(new RejectableVisionTask(complaintId, citizenId));
    }

    @Transactional(propagation = Propagation.REQUIRES_NEW)
    public void processVisionTriage(UUID complaintId, UUID citizenId) {
        if (!properties.isEnabled()) {
            return;
        }

        // 1. Claim the row atomically
        int claimed = complaintRepository.claimForVisionTriage(complaintId, OffsetDateTime.now());
        if (claimed == 0) {
            log.debug("Row for complaint ID [{}] not in NOT_RUN state; claim skipped.", complaintId);
            return;
        }

        Complaint complaint = complaintRepository.findById(complaintId).orElse(null);
        if (complaint == null) {
            return;
        }

        if (!complaint.isVisionConsent()) {
            log.debug("Complaint ID [{}] does not have vision consent; skipping vision triage.", complaintId);
            return;
        }

        // 2. Verify photos
        List<ComplaintPhoto> photos = complaintPhotoRepository.findByComplaintIdOrderByCreatedAtAsc(complaintId);
        if (photos == null || photos.isEmpty()) {
            complaintRepository.updateVisionStatus(complaintId, "SKIPPED", "No photo attached", OffsetDateTime.now());
            log.info("Vision triage status: SKIPPED (reason: No photo attached) for complaint ID [{}]", complaintId);
            return;
        }

        ComplaintPhoto photo = photos.get(0);
        String fileName = photo.getFileName() != null ? photo.getFileName().toLowerCase() : "";
        String photoUrl = photo.getPhotoUrl() != null ? photo.getPhotoUrl().toLowerCase() : "";
        String contentType = photo.getContentType() != null ? photo.getContentType().toLowerCase() : "";

        // Check WebP - explicit skip to prevent unstripped EXIF/GPS leakage
        boolean isWebp = fileName.endsWith(".webp") || photoUrl.endsWith(".webp") || "image/webp".equals(contentType);
        if (isWebp) {
            complaintRepository.updateVisionStatus(complaintId, "SKIPPED", "WebP image format skipped to prevent unstripped EXIF metadata leakage", OffsetDateTime.now());
            log.info("Vision triage status: SKIPPED (reason: WebP image format) for complaint ID [{}]", complaintId);
            return;
        }

        boolean isJpegOrPng = fileName.endsWith(".jpg") || fileName.endsWith(".jpeg") || fileName.endsWith(".png") ||
                              photoUrl.endsWith(".jpg") || photoUrl.endsWith(".jpeg") || photoUrl.endsWith(".png") ||
                              "image/jpeg".equals(contentType) || "image/jpg".equals(contentType) || "image/png".equals(contentType);
        if (!isJpegOrPng) {
            complaintRepository.updateVisionStatus(complaintId, "SKIPPED", "Unsupported image format for vision triage", OffsetDateTime.now());
            log.info("Vision triage status: SKIPPED (reason: Unsupported image format) for complaint ID [{}]", complaintId);
            return;
        }

        if (photo.getFileSize() != null && photo.getFileSize() > MAX_PHOTO_BYTES) {
            complaintRepository.updateVisionStatus(complaintId, "SKIPPED", "Photo exceeds maximum 4 MB size limit for vision triage", OffsetDateTime.now());
            log.info("Vision triage status: SKIPPED (reason: Photo exceeds 4 MB) for complaint ID [{}]", complaintId);
            return;
        }

        // 3. Global Daily Cap from DB
        OffsetDateTime startOfDay = OffsetDateTime.now(ZoneOffset.UTC).toLocalDate().atStartOfDay().atOffset(ZoneOffset.UTC);
        long dailyCount = complaintRepository.countDailyVisionInvocations(startOfDay);
        if (dailyCount >= properties.getDailyCap()) {
            complaintRepository.updateVisionStatus(complaintId, "SKIPPED", "Daily vision triage cap of " + properties.getDailyCap() + " reached", OffsetDateTime.now());
            log.info("Vision triage status: SKIPPED (reason: Daily cap reached) for complaint ID [{}]", complaintId);
            return;
        }

        // 4. Per-User Rate Limit
        if (citizenId != null) {
            ConsumptionProbe probe = rateLimiterService.tryConsume(
                    "ai_vision:user:" + citizenId,
                    properties.getUserMinuteCapacity(),
                    properties.getUserMinuteDuration()
            );
            if (!probe.isConsumed()) {
                complaintRepository.updateVisionStatus(complaintId, "SKIPPED", "User per-minute vision rate limit exceeded", OffsetDateTime.now());
                log.info("Vision triage status: SKIPPED (reason: User rate limit exceeded) for complaint ID [{}]", complaintId);
                return;
            }
        }

        // 5. Read image bytes
        byte[] imageBytes;
        try {
            String storedFilename = extractFilename(photo.getPhotoUrl());
            Resource resource = storageService.loadFileAsResource(storedFilename, "complaints/" + complaintId);
            if (!resource.exists() || !resource.isReadable()) {
                complaintRepository.updateVisionStatus(complaintId, "FAILED", "Could not read stored photo from disk", OffsetDateTime.now());
                log.warn("Vision triage status: FAILED (reason: Could not read photo from disk) for complaint ID [{}]", complaintId);
                return;
            }
            imageBytes = resource.getInputStream().readAllBytes();
            if (imageBytes.length > MAX_PHOTO_BYTES) {
                complaintRepository.updateVisionStatus(complaintId, "SKIPPED", "Photo bytes exceed 4 MB", OffsetDateTime.now());
                log.info("Vision triage status: SKIPPED (reason: Photo bytes exceed 4 MB) for complaint ID [{}]", complaintId);
                return;
            }
        } catch (Exception e) {
            complaintRepository.updateVisionStatus(complaintId, "FAILED", "Error loading photo file: " + e.getMessage(), OffsetDateTime.now());
            log.warn("Vision triage status: FAILED (reason: Error reading photo file) for complaint ID [{}]", complaintId);
            return;
        }

        // 6. Select provider
        VisionTriageProvider provider = selectProvider();
        String mimeType = (fileName.endsWith(".png") || photoUrl.endsWith(".png") || "image/png".equals(contentType))
                ? "image/png"
                : "image/jpeg";

        VisionTriageOutput output;
        try {
            output = provider.analyze(imageBytes, mimeType);
        } catch (Exception e) {
            String errorReason = e.getMessage() != null && !e.getMessage().isBlank() ? e.getMessage() : e.getClass().getSimpleName();
            if (errorReason.length() > 300) {
                errorReason = errorReason.substring(0, 300);
            }
            complaintRepository.updateVisionStatus(complaintId, "FAILED", errorReason, OffsetDateTime.now());
            log.warn("Vision triage status: FAILED (reason: {}) for complaint ID [{}]", errorReason, complaintId);
            return;
        }

        // 7. Calculate disagreement
        boolean disagreement = false;
        String visionCat = output.getCategory();
        if (visionCat != null && !visionCat.equalsIgnoreCase("UNKNOWN") && complaint.getAiDetectedCategory() != null) {
            if (!visionCat.equalsIgnoreCase(complaint.getAiDetectedCategory())) {
                disagreement = true;
            }
        }

        // 8. Calculate priority elevation (severity 5 elevates by at most one level, never lowers)
        ComplaintPriority elevatedPriority = complaint.getAiRecommendedPriority();
        String prioritySource = "RULE_ENGINE";
        if (output.getSeverity() == 5 && complaint.getAiRecommendedPriority() != null) {
            switch (complaint.getAiRecommendedPriority()) {
                case LOW -> elevatedPriority = ComplaintPriority.MEDIUM;
                case MEDIUM -> elevatedPriority = ComplaintPriority.HIGH;
                case HIGH -> elevatedPriority = ComplaintPriority.CRITICAL;
                case CRITICAL -> elevatedPriority = ComplaintPriority.CRITICAL;
            }
            if (elevatedPriority != complaint.getAiRecommendedPriority()) {
                prioritySource = "VISION_SEVERITY_5";
            }
        }

        // 9. Targeted update
        complaintRepository.updateVisionSuccess(
                complaintId,
                visionCat,
                output.getSeverity(),
                output.getConfidence(),
                output.getReason(),
                provider.getModelName(),
                "OK",
                OffsetDateTime.now(),
                disagreement,
                prioritySource,
                elevatedPriority
        );

        log.info("Vision triage status: OK for complaint ID [{}] (provider: {}, model: {}, disagreement: {})",
                complaintId, provider.getProviderName(), provider.getModelName(), disagreement);
    }

    private VisionTriageProvider selectProvider() {
        String p = properties.getProvider() != null ? properties.getProvider().trim().toLowerCase() : "gemini";
        if ("xai".equals(p)) {
            return xaiProvider;
        }
        return geminiProvider;
    }

    private String extractFilename(String photoUrl) {
        if (photoUrl == null) return "";
        int idx = photoUrl.lastIndexOf('/');
        if (idx >= 0 && idx < photoUrl.length() - 1) {
            return photoUrl.substring(idx + 1);
        }
        return photoUrl;
    }

    public class RejectableVisionTask implements Runnable {
        private final UUID complaintId;
        private final UUID citizenId;

        public RejectableVisionTask(UUID complaintId, UUID citizenId) {
            this.complaintId = complaintId;
            this.citizenId = citizenId;
        }

        @Override
        public void run() {
            try {
                processVisionTriage(complaintId, citizenId);
            } catch (Exception e) {
                log.error("Unhandled error during async vision triage for complaint ID [{}]", complaintId, e);
                try {
                    complaintRepository.updateVisionStatus(complaintId, "FAILED", "Unexpected async triage failure", OffsetDateTime.now());
                } catch (Exception ignored) {}
            }
        }

        public void onRejected() {
            try {
                complaintRepository.updateVisionStatus(complaintId, "SKIPPED", "Vision triage executor queue full", OffsetDateTime.now());
                log.warn("Marked complaint ID [{}] as SKIPPED due to executor queue rejection.", complaintId);
            } catch (Exception e) {
                log.error("Could not record rejection status for complaint ID [{}]", complaintId, e);
            }
        }
    }
}

