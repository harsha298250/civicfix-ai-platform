package com.civicfix.notification;

import com.civicfix.auth.dto.LoginRequest;
import com.civicfix.notification.dto.NotificationResponse;
import com.civicfix.user.User;
import com.civicfix.user.UserRepository;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.mock.web.MockHttpSession;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.MvcResult;
import org.springframework.transaction.annotation.Transactional;

import java.time.OffsetDateTime;
import java.util.UUID;

import static org.hamcrest.Matchers.*;
import static org.junit.jupiter.api.Assertions.*;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.csrf;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.patch;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
public class NotificationApiIntegrationTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private ObjectMapper objectMapper;

    @Autowired
    private NotificationRepository notificationRepository;

    @Autowired
    private UserRepository userRepository;

    private User citizenAlex;
    private User officerElena;

    @BeforeEach
    public void setUp() {
        citizenAlex = userRepository.findByEmailIgnoreCase("alex.m@citizen.org")
                .orElseThrow(() -> new IllegalStateException("Seed citizen Alex not found"));
        officerElena = userRepository.findByEmailIgnoreCase("elena.vance@metro.gov")
                .orElseThrow(() -> new IllegalStateException("Seed officer Elena not found"));
    }

    private MockHttpSession loginAs(String email, String password) throws Exception {
        LoginRequest req = new LoginRequest(email, password);
        MvcResult result = mockMvc.perform(post("/api/auth/login")
                        .with(csrf())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(req)))
                .andExpect(status().isOk())
                .andReturn();
        return (MockHttpSession) result.getRequest().getSession();
    }

    private Notification createTestNotification(User recipient, String title, String message, boolean isRead) {
        Notification notification = new Notification(
                recipient,
                null,
                null,
                "CF-TEST-" + UUID.randomUUID().toString().substring(0, 8),
                title,
                message,
                NotificationType.STATUS_CHANGED,
                NotificationSeverity.INFO,
                "/citizen/complaints/test"
        );
        if (isRead) {
            notification.markAsRead();
        }
        return notificationRepository.save(notification);
    }

    @Test
    @DisplayName("1. Authenticated user retrieves their own notifications with pagination")
    public void testAuthenticatedUserRetrievesOwnNotifications() throws Exception {
        createTestNotification(citizenAlex, "Alex Notice 1", "Message 1", false);
        createTestNotification(citizenAlex, "Alex Notice 2", "Message 2", true);

        MockHttpSession session = loginAs("alex.m@citizen.org", "CivicSecure#2026!");

        mockMvc.perform(get("/api/notifications")
                        .session(session)
                        .param("page", "0")
                        .param("size", "10"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success", is(true)))
                .andExpect(jsonPath("$.data.content", notNullValue()))
                .andExpect(jsonPath("$.data.page", is(0)))
                .andExpect(jsonPath("$.data.size", is(10)))
                .andExpect(jsonPath("$.data.totalElements", greaterThanOrEqualTo(2)));
    }

    @Test
    @DisplayName("2. Notifications are returned in newest-first order with working pagination and unread filter")
    public void testNotificationsOrderAndPagination() throws Exception {
        Notification first = createTestNotification(citizenAlex, "Older Notification", "Old", false);
        Thread.sleep(100);
        Notification second = createTestNotification(citizenAlex, "Newer Notification", "New", false);

        MockHttpSession session = loginAs("alex.m@citizen.org", "CivicSecure#2026!");

        MvcResult result = mockMvc.perform(get("/api/notifications")
                        .session(session)
                        .param("page", "0")
                        .param("size", "2"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success", is(true)))
                .andExpect(jsonPath("$.data.content", hasSize(2)))
                .andReturn();

        JsonNode root = objectMapper.readTree(result.getResponse().getContentAsString());
        JsonNode items = root.path("data").path("content");
        OffsetDateTime item0Created = OffsetDateTime.parse(items.get(0).path("createdAt").asText());
        OffsetDateTime item1Created = OffsetDateTime.parse(items.get(1).path("createdAt").asText());
        assertTrue(item0Created.isAfter(item1Created) || item0Created.isEqual(item1Created),
                "Expected newest notification first");

        // Filter unreadOnly
        mockMvc.perform(get("/api/notifications")
                        .session(session)
                        .param("unreadOnly", "true")
                        .param("page", "0")
                        .param("size", "50"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success", is(true)))
                .andExpect(jsonPath("$.data.content.[*].read", everyItem(is(false))));
    }

    @Test
    @DisplayName("3. Unread count is correct for the current user")
    public void testUnreadCountCorrectForCurrentUser() throws Exception {
        createTestNotification(citizenAlex, "Unread Ticket 1", "Content", false);
        createTestNotification(citizenAlex, "Unread Ticket 2", "Content", false);

        MockHttpSession session = loginAs("alex.m@citizen.org", "CivicSecure#2026!");

        long expectedCount = notificationRepository.countByRecipientIdAndIsReadFalse(citizenAlex.getId());

        mockMvc.perform(get("/api/notifications/unread-count")
                        .session(session))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success", is(true)))
                .andExpect(jsonPath("$.data.unreadCount", is((int) expectedCount)));
    }

    @Test
    @DisplayName("4. User can mark their own notification as read")
    public void testUserCanMarkOwnNotificationAsRead() throws Exception {
        Notification notification = createTestNotification(citizenAlex, "Alex Read Test", "Mark me", false);
        assertFalse(notification.isRead());

        MockHttpSession session = loginAs("alex.m@citizen.org", "CivicSecure#2026!");

        mockMvc.perform(patch("/api/notifications/" + notification.getId() + "/read")
                        .session(session)
                        .with(csrf()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success", is(true)))
                .andExpect(jsonPath("$.data.id", is(notification.getId().toString())))
                .andExpect(jsonPath("$.data.read", is(true)))
                .andExpect(jsonPath("$.data.readAt", notNullValue()));

        Notification refreshed = notificationRepository.findById(notification.getId()).orElseThrow();
        assertTrue(refreshed.isRead());
        assertNotNull(refreshed.getReadAt());
    }

    @Test
    @DisplayName("5. Mark-all affects only the current user's notifications")
    public void testMarkAllAffectsOnlyCurrentUserNotifications() throws Exception {
        // Ensure Alex has unread notifications
        createTestNotification(citizenAlex, "Alex Unread A", "Msg", false);
        createTestNotification(citizenAlex, "Alex Unread B", "Msg", false);

        // Ensure Elena (Officer) has unread notifications
        createTestNotification(officerElena, "Elena Unread X", "Officer msg", false);
        long elenaUnreadBefore = notificationRepository.countByRecipientIdAndIsReadFalse(officerElena.getId());
        assertTrue(elenaUnreadBefore > 0);

        MockHttpSession alexSession = loginAs("alex.m@citizen.org", "CivicSecure#2026!");

        // Alex calls PATCH /api/notifications/read-all
        mockMvc.perform(patch("/api/notifications/read-all")
                        .session(alexSession)
                        .with(csrf()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success", is(true)))
                .andExpect(jsonPath("$.data.updatedCount", greaterThanOrEqualTo(2)));

        // Alex unread count must now be 0
        long alexUnreadAfter = notificationRepository.countByRecipientIdAndIsReadFalse(citizenAlex.getId());
        assertEquals(0, alexUnreadAfter, "Alex unread count should be 0 after mark-all");

        // Elena unread count must remain completely untouched
        long elenaUnreadAfter = notificationRepository.countByRecipientIdAndIsReadFalse(officerElena.getId());
        assertEquals(elenaUnreadBefore, elenaUnreadAfter, "Officer Elena's unread notifications must not be modified");
    }

    @Test
    @DisplayName("6. Unauthenticated requests are rejected with 401")
    public void testUnauthenticatedRequestsRejected() throws Exception {
        mockMvc.perform(get("/api/notifications"))
                .andExpect(status().isUnauthorized());

        mockMvc.perform(get("/api/notifications/unread-count"))
                .andExpect(status().isUnauthorized());

        mockMvc.perform(patch("/api/notifications/" + UUID.randomUUID() + "/read")
                        .with(csrf()))
                .andExpect(status().isUnauthorized());

        mockMvc.perform(patch("/api/notifications/read-all")
                        .with(csrf()))
                .andExpect(status().isUnauthorized());

        mockMvc.perform(post("/api/notifications/mark-all-read")
                        .with(csrf()))
                .andExpect(status().isUnauthorized());
    }

    @Test
    @DisplayName("7. A user cannot see another user's notifications in their list")
    public void testUserCannotSeeAnotherUsersNotification() throws Exception {
        Notification elenaNotification = createTestNotification(officerElena, "Elena Confidential", "Internal dispatch", false);

        MockHttpSession alexSession = loginAs("alex.m@citizen.org", "CivicSecure#2026!");

        MvcResult result = mockMvc.perform(get("/api/notifications")
                        .session(alexSession)
                        .param("size", "100"))
                .andExpect(status().isOk())
                .andReturn();

        JsonNode root = objectMapper.readTree(result.getResponse().getContentAsString());
        for (JsonNode item : root.path("data").path("content")) {
            assertNotEquals(elenaNotification.getId().toString(), item.path("id").asText(),
                    "Alex must not see Elena's notification ID");
            assertNotEquals("Elena Confidential", item.path("title").asText());
        }
    }

    @Test
    @DisplayName("8. A user cannot mark another user's notification as read (returns 404 to prevent guessing)")
    public void testUserCannotMarkAnotherUsersNotificationAsRead() throws Exception {
        Notification elenaNotification = createTestNotification(officerElena, "Officer Work Order", "Strictly Officer", false);

        MockHttpSession alexSession = loginAs("alex.m@citizen.org", "CivicSecure#2026!");

        // Alex attempts to mark Elena's notification as read
        mockMvc.perform(patch("/api/notifications/" + elenaNotification.getId() + "/read")
                        .session(alexSession)
                        .with(csrf()))
                .andExpect(status().isNotFound())
                .andExpect(jsonPath("$.status", is(404)))
                .andExpect(jsonPath("$.message", containsString("Notification not found with id")));

        // Verify Elena's notification remains unread
        Notification freshElenaNotice = notificationRepository.findById(elenaNotification.getId()).orElseThrow();
        assertFalse(freshElenaNotice.isRead(), "Elena's notification must not be marked read by Alex");
    }

    @Test
    @DisplayName("9. Missing and invalid notification IDs are handled correctly")
    public void testMissingNotificationIdsHandled() throws Exception {
        MockHttpSession alexSession = loginAs("alex.m@citizen.org", "CivicSecure#2026!");

        // Non-existent UUID -> 404
        UUID nonExistentId = UUID.randomUUID();
        mockMvc.perform(patch("/api/notifications/" + nonExistentId + "/read")
                        .session(alexSession)
                        .with(csrf()))
                .andExpect(status().isNotFound())
                .andExpect(jsonPath("$.status", is(404)));

        // Malformed UUID string -> 400 Bad Request
        mockMvc.perform(patch("/api/notifications/invalid-uuid-string/read")
                        .session(alexSession)
                        .with(csrf()))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.status", is(400)));
    }

    @Test
    @DisplayName("10. Invalid pagination parameters are rejected with 400 Bad Request")
    public void testInvalidPaginationParameters() throws Exception {
        MockHttpSession alexSession = loginAs("alex.m@citizen.org", "CivicSecure#2026!");

        // Negative page
        mockMvc.perform(get("/api/notifications")
                        .session(alexSession)
                        .param("page", "-1")
                        .param("size", "10"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.status", is(400)))
                .andExpect(jsonPath("$.message", containsString("Page index cannot be negative")));

        // Zero or negative size
        mockMvc.perform(get("/api/notifications")
                        .session(alexSession)
                        .param("page", "0")
                        .param("size", "0"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.status", is(400)))
                .andExpect(jsonPath("$.message", containsString("Page size must be greater than zero")));

        mockMvc.perform(get("/api/notifications")
                        .session(alexSession)
                        .param("page", "0")
                        .param("size", "-5"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.status", is(400)))
                .andExpect(jsonPath("$.message", containsString("Page size must be greater than zero")));
    }

    @Test
    @DisplayName("11. POST /api/notifications/mark-all-read alias endpoint functions identically to PATCH /read-all")
    public void testMarkAllReadAliasEndpoint() throws Exception {
        createTestNotification(citizenAlex, "Alias Test", "Alias endpoint validation", false);

        MockHttpSession alexSession = loginAs("alex.m@citizen.org", "CivicSecure#2026!");

        mockMvc.perform(post("/api/notifications/mark-all-read")
                        .session(alexSession)
                        .with(csrf()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success", is(true)))
                .andExpect(jsonPath("$.data.updatedCount", greaterThanOrEqualTo(1)));
    }
}
