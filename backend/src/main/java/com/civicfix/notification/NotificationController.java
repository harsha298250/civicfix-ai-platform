package com.civicfix.notification;

import com.civicfix.common.ApiResponse;
import com.civicfix.common.PagedResponse;
import com.civicfix.common.exception.BadRequestException;
import com.civicfix.notification.dto.MarkAllReadResponse;
import com.civicfix.notification.dto.NotificationResponse;
import com.civicfix.notification.dto.UnreadCountResponse;
import com.civicfix.security.UserPrincipal;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.UUID;

@RestController
@RequestMapping("/api/notifications")
@PreAuthorize("isAuthenticated()")
public class NotificationController {

    private final NotificationService notificationService;

    public NotificationController(NotificationService notificationService) {
        this.notificationService = notificationService;
    }

    /**
     * GET /api/notifications
     * Returns paginated notifications for the authenticated user, newest first.
     */
    @GetMapping
    public ResponseEntity<ApiResponse<PagedResponse<NotificationResponse>>> getNotifications(
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "15") int size,
            @RequestParam(defaultValue = "false") boolean unreadOnly,
            @AuthenticationPrincipal UserPrincipal principal) {

        if (page < 0) {
            throw new BadRequestException("Page index cannot be negative.");
        }
        if (size <= 0) {
            throw new BadRequestException("Page size must be greater than zero.");
        }

        Pageable pageable = PageRequest.of(page, Math.min(size, 100));
        PagedResponse<NotificationResponse> response = notificationService.getUserNotifications(principal, unreadOnly, pageable);
        return ResponseEntity.ok(ApiResponse.success(response));
    }

    /**
     * GET /api/notifications/unread-count
     * Returns the unread notification badge count for the authenticated user.
     */
    @GetMapping("/unread-count")
    public ResponseEntity<ApiResponse<UnreadCountResponse>> getUnreadCount(
            @AuthenticationPrincipal UserPrincipal principal) {
        long unreadCount = notificationService.getUnreadCount(principal);
        return ResponseEntity.ok(ApiResponse.success(new UnreadCountResponse(unreadCount)));
    }

    /**
     * PATCH /api/notifications/{id}/read
     * Marks a single notification as read.
     * Prevents ID guessing: returns 404 if notification doesn't exist or belongs to another user.
     */
    @PatchMapping("/{id}/read")
    public ResponseEntity<ApiResponse<NotificationResponse>> markNotificationAsRead(
            @PathVariable UUID id,
            @AuthenticationPrincipal UserPrincipal principal) {
        NotificationResponse response = notificationService.markAsRead(id, principal);
        return ResponseEntity.ok(ApiResponse.success("Notification marked as read.", response));
    }

    /**
     * PATCH /api/notifications/read-all
     * Marks all unread notifications for the authenticated user as read.
     */
    @PatchMapping("/read-all")
    public ResponseEntity<ApiResponse<MarkAllReadResponse>> markAllNotificationsAsRead(
            @AuthenticationPrincipal UserPrincipal principal) {
        int updatedCount = notificationService.markAllAsRead(principal);
        return ResponseEntity.ok(ApiResponse.success("All notifications marked as read.", new MarkAllReadResponse(updatedCount)));
    }

    /**
     * POST /api/notifications/mark-all-read
     * Alias endpoint providing backward-compatibility with alternative REST conventions.
     */
    @PostMapping("/mark-all-read")
    public ResponseEntity<ApiResponse<MarkAllReadResponse>> markAllNotificationsAsReadAlias(
            @AuthenticationPrincipal UserPrincipal principal) {
        int updatedCount = notificationService.markAllAsRead(principal);
        return ResponseEntity.ok(ApiResponse.success("All notifications marked as read.", new MarkAllReadResponse(updatedCount)));
    }
}
