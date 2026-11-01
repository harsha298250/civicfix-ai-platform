# CivicFix — Phase 5 Notification & Communication Implementation Report
## Staged Engineering Log: In-App Notifications & Decoupled Communication

**Date:** 2026-10-23  
**Lead Engineer:** Lead Software Architect, Full-Stack Engineer & QA Lead  
**Target Branch:** `feat/sprint3-frontend-backend-integration`  
**Database:** PostgreSQL 16.4 in Docker (`civicfix_postgres`), Host Port `5433`  
**Backend:** Java 21, Spring Boot 3.3.4, Maven Wrapper  
**Frontend:** React 18, Vite 5.4.21, Tailwind CSS  
**Phase Status:** IN PROGRESS (Stage 5 Complete)

---

## 1. Executive Summary

Phase 5 introduces a reliable, database-backed notification engine into CivicFix to inform citizens, municipal officers, field workers, and administrators about vital municipal operations.

- **Stage 1 (Architecture Audit & Plan)**: Completed read-only inspection; produced [PHASE_5_NOTIFICATION_ARCHITECTURE_AUDIT.md](file:///c:/Users/harsh/Downloads/stitch_civicfix_ai_platform_design/docs/archive/PHASE_5_NOTIFICATION_ARCHITECTURE_AUDIT.md) and [PHASE_5_IMPLEMENTATION_PLAN.md](file:///c:/Users/harsh/Downloads/stitch_civicfix_ai_platform_design/docs/archive/PHASE_5_IMPLEMENTATION_PLAN.md).
- **Stage 2 (Database Migration & Core Persistence)**: **COMPLETED & VERIFIED**. Flyway forward-only migration V7 successfully created the `notifications` table in PostgreSQL. JPA entity, enums, and repository were implemented and verified with 6 automated persistence tests.
- **Stage 3 (Event-Driven Engine & Complaint Lifecycle Integration)**: **COMPLETED & VERIFIED**. Domain event `ComplaintEvent` and `ComplaintEventType` implemented for 8 core business operations. Decoupled asynchronous event listening implemented via Spring `ApplicationEventPublisher`, `@TransactionalEventListener(phase = TransactionPhase.AFTER_COMMIT)`, and `@Transactional(propagation = Propagation.REQUIRES_NEW)`. Recipient resolution and 30-second deduplication guard implemented. Full regression suite passed: 162 backend tests (including 10 new integration tests) and 93 frontend tests with zero failures. Database integrity confirmed with 165 persisted notifications and zero data loss.
- **Stage 4 (Notification REST APIs and Security)**: **COMPLETED & VERIFIED**. Secure REST APIs implemented in `NotificationController` and `NotificationService` for `GET /api/notifications` (paginated, unread-only filter), `GET /api/notifications/unread-count`, `PATCH /api/notifications/{id}/read`, and `PATCH /api/notifications/read-all` (with `POST /api/notifications/mark-all-read` alias). Strict server-side principal ownership enforced (never client-supplied recipient ID), preventing ID guessing and enumeration by returning 404 for foreign notification IDs. Full regression suite passed: 173 backend tests (including 11 new controller/security integration tests) and 93 frontend tests with zero failures. Zero data loss verified across all 120 users, 838 complaints, 1,804 status history records, 4,005 audit logs, and 374 persisted notifications.
- **Stage 5 (Frontend Notification Integration)**: **COMPLETED & VERIFIED**. Connected existing CivicFix notification UI to backend REST endpoints. Removed all mock notification data (`mockData.js`) and `localStorage`-based notification state from `AppContext.jsx`. Implemented `apiClient.notifications` and `notificationService.js`. Integrated live unread badge counters across all role layouts (`CitizenLayout`, `OfficerLayout`, `WorkerLayout`, `AdminLayout`). Connected real-time list, pagination controls, unread toggle, mark-as-read, mark-all-as-read, and deep links across all four persona screens (`CitizenNotificationsPage`, `OfficerNotificationsPage`, `WorkerNotificationsPage`, `AdminNotificationsPage`). Integrated in-flight request deduplication via `useRef` guards. All 110 frontend tests passing (17 new notification unit/integration tests). Vite production build succeeded cleanly with 0 errors. Backend notification test suite (27 tests) passed 100%. Live PostgreSQL database verified with 120 users, 848 complaints, 1,812 status histories, 4,023 audit logs, and 400 persisted notifications.

-----

## 2. Stage 2 Implementation Details

### A. Database Migration: Flyway V7
- **Migration File**: `backend/src/main/resources/db/migration/V7__create_notifications_table.sql`
- **PostgreSQL Table Created**: `notifications`
- **Columns (13)**:
  - `id UUID PRIMARY KEY DEFAULT gen_random_uuid()`
  - `recipient_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE`
  - `actor_id UUID REFERENCES users(id) ON DELETE SET NULL`
  - `complaint_id UUID REFERENCES complaints(id) ON DELETE SET NULL`
  - `reference_id VARCHAR(50)`
  - `title VARCHAR(200) NOT NULL`
  - `message TEXT NOT NULL`
  - `notification_type VARCHAR(50) NOT NULL`
  - `severity VARCHAR(30) NOT NULL DEFAULT 'INFO'`
  - `target_url VARCHAR(255)`
  - `is_read BOOLEAN NOT NULL DEFAULT FALSE`
  - `read_at TIMESTAMP WITH TIME ZONE`
  - `created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()`
- **Indexes**:
  - `idx_notifications_recipient_read_created`: `(recipient_id, is_read, created_at DESC)` for fast unread count queries and paginated list sorting.
  - `idx_notifications_complaint`: `(complaint_id)` for complaint-associated lookup.
  - `idx_notifications_recipient`: `(recipient_id)` foreign key lookup.
  - `idx_notifications_actor`: `(actor_id)` foreign key lookup.
- **Foreign Key Safeguards**:
  - `recipient_id` cascades on user deletion.
  - `actor_id` sets null if the initiating user account is deleted, preserving notification auditability.
  - `complaint_id` sets null if the associated complaint is deleted, preserving citizen notification history.

### B. Java Backend Entity & Repository Components
1. **`NotificationType.java`**:
   `COMPLAINT_CREATED`, `WORKER_ASSIGNED`, `STATUS_CHANGED`, `RESOLUTION_SUBMITTED`, `COMPLAINT_RESOLVED`, `REWORK_REQUESTED`, `COMPLAINT_REJECTED`, `NOTE_ADDED`, `BLOCKER_REPORTED`, `TRIAGE_ADJUDICATED`, `DUPLICATE_LINKED`, `ADMIN_ALERT`.
2. **`NotificationSeverity.java`**:
   `INFO`, `SUCCESS`, `WARNING`, `ACTION_REQUIRED`, `CRITICAL`.
3. **`Notification.java`**:
   JPA entity mapped to `notifications` table with `@PrePersist` defaults, helper `markAsRead()` method, and lazy associations to `User` and `Complaint`.
4. **`NotificationRepository.java`**:
   Spring Data JPA repository providing:
   - `findByRecipientIdOrderByCreatedAtDesc(UUID recipientId, Pageable pageable)`
   - `findByRecipientIdAndIsReadOrderByCreatedAtDesc(UUID recipientId, boolean isRead, Pageable pageable)`
   - `countByRecipientIdAndIsReadFalse(UUID recipientId)`
   - `findByIdAndRecipientId(UUID id, UUID recipientId)` (strict tenant boundary guard)
   - `markAllAsReadByRecipientId(UUID recipientId, OffsetDateTime now)`
   - `existsByRecipientIdAndComplaintIdAndNotificationTypeAndCreatedAtAfter(UUID recipientId, UUID complaintId, NotificationType type, OffsetDateTime after)` (deduplication guard)

---

## 3. Verification & Evidence

### A. Flyway Schema History (`flyway_schema_history`)
```text
 installed_rank | version |             description              |                    script                    | success 
----------------+---------+--------------------------------------+----------------------------------------------+---------
              1 | 1       | initial schema                       | V1__initial_schema.sql                       | t
              2 | 2       | seed roles and dev users             | V2__seed_roles_and_dev_users.sql             | t
              3 | 3       | add complaint photos                 | V3__add_complaint_photos.sql                 | t
              4 | 4       | add complaint version                | V4__add_complaint_version.sql                | t
              5 | 5       | add complaint spatial index          | V5__add_complaint_spatial_index.sql          | t
              6 | 6       | add ai triage and duplicate tracking | V6__add_ai_triage_and_duplicate_tracking.sql | t
              7 | 7       | create notifications table           | V7__create_notifications_table.sql           | t
```
- Migration V7 applied cleanly (`success = t`).
- Migrations V1 through V6 remain untouched.

### B. Database Integrity & Zero Data Loss
Query of table row counts after migration V7:
```text
 users_count | complaints_count | history_count | audit_count 
-------------+------------------+---------------+-------------
         107 |              664 |          1516 |        3391
```
- Zero data loss: All 107 users, 664 complaints, 1,516 status history entries, and 3,391 audit logs remain intact.

### C. Automated Persistence Tests (`NotificationPersistenceTest.java`)
```text
[INFO] Running com.civicfix.notification.NotificationPersistenceTest
[INFO] Tests run: 6, Failures: 0, Errors: 0, Skipped: 0, Time elapsed: 3.180 s
```
Verifications performed:
1. `testFlywayV7MigrationAndSchemaIntegrity`: Validates V7 applied state and presence of all 13 columns in PostgreSQL metadata.
2. `testNotificationEntityPersistenceAndRetrieval`: Persists a notification with foreign keys, verifies generated UUID, default `is_read = false`, and timestamp.
3. `testUnreadCountAndPagination`: Verifies `countByRecipientIdAndIsReadFalse` and paginated retrieval.
4. `testMarkAsReadAndMarkAllAsRead`: Verifies single item read state and bulk `markAllAsReadByRecipientId` query.
5. `testTenantIsolation`: Verifies User A cannot retrieve User B's notification via `findByIdAndRecipientId`.
6. `testDeduplicationQuery`: Verifies `existsByRecipientIdAndComplaintIdAndNotificationTypeAndCreatedAtAfter` detects recent duplicate notifications within time window.

### D. Full Regression Suite Results
1. **Backend Maven Test Suite (`.\mvnw.cmd test`)**:
   ```text
   [INFO] Results:
   [INFO] Tests run: 152, Failures: 0, Errors: 0, Skipped: 0
   [INFO] BUILD SUCCESS (Total time: 58.915 s)
   ```
   - **152 tests passed (146 existing + 6 new)** with 0 failures, 0 errors, 0 skipped.
2. **Frontend Vitest Test Suite (`npm.cmd test`)**:
   ```text
   ℹ tests 93
   ℹ suites 11
   ℹ pass 93
   ℹ fail 0
   ℹ duration_ms 1244.0064
   ```
   - **93 tests passed** with 0 failures.

---

## 4. Inventory of Files Changed in Stage 2

### A. New Database Migration
- `backend/src/main/resources/db/migration/V7__create_notifications_table.sql`

### B. New Backend Persistence Classes
- `backend/src/main/java/com/civicfix/notification/Notification.java`
- `backend/src/main/java/com/civicfix/notification/NotificationType.java`
- `backend/src/main/java/com/civicfix/notification/NotificationSeverity.java`
- `backend/src/main/java/com/civicfix/notification/NotificationRepository.java`

### C. New Automated Test Suite
- `backend/src/test/java/com/civicfix/notification/NotificationPersistenceTest.java`

### D. Documentation Deliverables
- `docs/PHASE_5_IMPLEMENTATION_REPORT.md` (Created)
- `docs/CIVICFIX_MASTER_ROADMAP.md` (Updated)

---

## 5. Stage 3 Implementation Details: Event-Driven Notification Engine

### A. Domain Event Model
- **`ComplaintEventType.java`**:
  Defines 8 lifecycle event types representing actual business operations:
  1. `COMPLAINT_CREATED`: Triggered on initial citizen complaint submission.
  2. `WORKER_ASSIGNED`: Triggered when an officer assigns a complaint to a technician.
  3. `WORK_STARTED`: Triggered when the assigned field worker begins on-site resolution (`IN_PROGRESS`).
  4. `RESOLUTION_SUBMITTED`: Triggered when the technician completes physical work and uploads evidence.
  5. `COMPLAINT_RESOLVED`: Triggered when the reviewing officer approves the resolution evidence.
  6. `REWORK_REQUESTED`: Triggered when the reviewing officer rejects resolution evidence and requests rework.
  7. `COMPLAINT_REJECTED`: Triggered when intake triage or review determines the complaint is invalid/rejected.
  8. `DUPLICATE_LINKED`: Triggered when an officer marks a complaint as a duplicate of an existing primary master.

- **`ComplaintEvent.java`**:
  Immutable domain event object holding:
  - `eventType`: `ComplaintEventType`
  - `complaint`: Snapshot of the `Complaint` entity
  - `actor`: `User` who performed the business action
  - `details`: Contextual metadata (e.g., officer rejection reason, rework instructions, duplicate master ID)
  - `timestamp`: Event creation instant (`Instant.now()`)

### B. Transactional Decoupling & Execution Semantics
- **Publishing (`ApplicationEventPublisher`)**:
  Integrated into `ComplaintService` for:
  - `createComplaint(...)` -> publishes `COMPLAINT_CREATED`
  - `assignWorker(...)` -> publishes `WORKER_ASSIGNED`
  - `transitionStatus(...)`:
    - `IN_PROGRESS` -> publishes `WORK_STARTED`
    - `RESOLUTION_SUBMITTED` -> publishes `RESOLUTION_SUBMITTED`
    - `RESOLVED` -> publishes `COMPLAINT_RESOLVED`
    - `REWORK_REQUESTED` -> publishes `REWORK_REQUESTED`
    - `REJECTED` -> publishes `COMPLAINT_REJECTED`
  - `linkDuplicate(...)` -> publishes `DUPLICATE_LINKED`
- **Listener Isolation (`NotificationEventListener`)**:
  - Uses `@TransactionalEventListener(phase = TransactionPhase.AFTER_COMMIT)`: notifications are NEVER created if the originating complaint transaction aborts or rolls back.
  - Failures in notification generation do NOT undo an already committed complaint transaction.
- **Independent Transaction for Persistence (`NotificationService`)**:
  - Because `AFTER_COMMIT` runs after the primary database transaction has committed, `NotificationService.handleComplaintEvent` executes under `@Transactional(propagation = Propagation.REQUIRES_NEW)`.
  - All persistence errors are trapped and logged at `ERROR` level, preventing listener thread termination or uncaught transaction leaks.

### C. Role-Based Notification Recipient Resolution & Data Minimization
Notifications are routed strictly to legitimate stakeholders according to municipal governance rules:

| Lifecycle Event | Recipient | Notification Type | Severity | Content / Data Minimization Rules |
| :--- | :--- | :--- | :--- | :--- |
| **COMPLAINT_CREATED** | Citizen (Author) | `COMPLAINT_CREATED` | `INFO` | Acknowledgment ticket reference #CF-...; no internal staff notes. |
| **COMPLAINT_CREATED** | Ward Officers | `COMPLAINT_CREATED` | `ACTION_REQUIRED` | New intake assignment alert with category, ward, and urgency. |
| **WORKER_ASSIGNED** | Assigned Worker | `WORKER_ASSIGNED` | `INFO` | Dispatch task assignment with ward and title; direct link to task. |
| **WORKER_ASSIGNED** | Citizen (Author) | `WORKER_ASSIGNED` | `INFO` | Reassurance notification that field staff has been assigned. |
| **WORK_STARTED** | Citizen (Author) | `STATUS_CHANGED` | `INFO` | Status updated to In Progress with operational note. |
| **RESOLUTION_SUBMITTED**| Reviewing Officer| `RESOLUTION_SUBMITTED`| `ACTION_REQUIRED`| Inspection alert with link to resolution evidence for review. |
| **RESOLUTION_SUBMITTED**| Citizen (Author) | `STATUS_CHANGED` | `INFO` | Update that physical work is completed, pending officer audit. |
| **COMPLAINT_RESOLVED** | Citizen (Author) | `COMPLAINT_RESOLVED` | `SUCCESS`| Resolution confirmation; issue closed successfully. |
| **COMPLAINT_RESOLVED** | Assigned Worker | `COMPLAINT_RESOLVED` | `SUCCESS`| Approval notice that resolution evidence passed officer inspection.|
| **REWORK_REQUESTED** | Assigned Worker | `REWORK_REQUESTED` | `WARNING`| Rework directive including officer instructions and corrective action.|
| **COMPLAINT_REJECTED** | Citizen (Author) | `COMPLAINT_REJECTED` | `WARNING`| Formal notification with officer reason explaining rejection. |
| **DUPLICATE_LINKED** | Citizen (Author) | `DUPLICATE_LINKED` | `INFO` | Reassurance linking ticket to existing master issue with master ref.|

- **Tenant Isolation**: Citizens only receive notifications for their own complaints (`complaint.getCitizen()`). Workers only receive notifications for tasks assigned to them (`complaint.getAssignedWorker()`).
- **Privacy Protection**: Officers only receive ward/department notices. PII of other citizens and internal administrative notes are never leaked across roles.

### D. Short-Window Deduplication (30s Guard)
- Before creating a notification, `NotificationService` calls `notificationRepository.existsByRecipientIdAndComplaintIdAndNotificationTypeAndCreatedAtAfter(...)` with a 30-second window.
- Rapid double-clicks or repeated event deliveries are suppressed cleanly with a debug log, preventing duplicate inbox entries.

---

## 6. Stage 3 Verification & Evidence

### A. Automated Integration Test Suite (`NotificationEventIntegrationTest.java`)
A dedicated integration test suite verifying transactional behavior, all 8 lifecycle events, rollback protection, deduplication, and role isolation:
```text
[INFO] Running com.civicfix.notification.NotificationEventIntegrationTest
[INFO] Tests run: 10, Failures: 0, Errors: 0, Skipped: 0, Time elapsed: 20.01 s
```

Tests Executed:
1. `testComplaintCreatedEvent`: Citizen receives intake notice; active officers receive action-required triage notices.
2. `testWorkerAssignedEvent`: Assigned field worker receives work order notification; author citizen receives dispatch notice.
3. `testWorkStartedEvent`: Author citizen receives status in-progress notification when technician arrives on-site.
4. `testResolutionSubmittedEvent`: Officer receives resolution verification request; author citizen receives repair completion notice.
5. `testComplaintResolvedEvent`: Author citizen receives success resolution notice; assigned worker receives resolution approval notice.
6. `testReworkRequestedEvent`: Assigned worker receives warning rework notice with specific officer reason.
7. `testComplaintRejectedEvent`: Author citizen receives rejection notice with official reason.
8. `testDuplicateLinkedEvent`: Author citizen receives duplicate notice referencing the parent master complaint.
9. `testRollbackSafety_NoNotificationCreatedOnRollback`: Confirms zero notifications are generated when the complaint transaction rolls back.
10. `testShortWindowDeduplication`: Confirms duplicate events within 30 seconds are suppressed and do not generate duplicate notifications.

### B. Full Regression Suite Results
1. **Backend Maven Test Suite (`.\mvnw.cmd test`)**:
   ```text
   [INFO] Results:
   [INFO] Tests run: 162, Failures: 0, Errors: 0, Skipped: 0
   [INFO] BUILD SUCCESS (Total time: 01:06 min)
   ```
   - **162 tests passed (152 existing + 10 Stage 3 tests)** with 0 failures, 0 errors, 0 skipped.
2. **Frontend Test Suite (`npm.cmd test`)**:
   ```text
   ℹ tests 93
   ℹ suites 11
   ℹ pass 93
   ℹ fail 0
   ℹ duration_ms 1269.188
   ```
   - **93 tests passed** with 0 failures.

### C. Live Database State & Data Preservation
Inspected PostgreSQL table rows post-testing:
```text
SELECT count(*) FROM notifications;
 count: 165

  notification_type   |    severity     | count 
----------------------+-----------------+-------
 COMPLAINT_CREATED    | INFO            |    47
 WORKER_ASSIGNED      | INFO            |    44
 COMPLAINT_CREATED    | ACTION_REQUIRED |    35
 STATUS_CHANGED       | INFO            |    18
 COMPLAINT_RESOLVED   | SUCCESS         |     8
 DUPLICATE_LINKED     | INFO            |     4
 RESOLUTION_SUBMITTED | ACTION_REQUIRED |     3
 COMPLAINT_REJECTED   | WARNING         |     3
 REWORK_REQUESTED     | WARNING         |     3
(9 rows)
```
- Core database entity counts:
  - Users: 117
  - Complaints: 770
  - Status History: 1,699
  - Audit Logs: 3,774
  - Flyway Migrations: 7 (V1 through V7, `success = t`)
- Zero data loss: Existing operational records, status histories, and audit logs remain intact.

---

## 7. Inventory of Files Changed in Stage 3

### A. New Domain Event & Notification Classes
- `backend/src/main/java/com/civicfix/complaint/event/ComplaintEventType.java`
- `backend/src/main/java/com/civicfix/complaint/event/ComplaintEvent.java`
- `backend/src/main/java/com/civicfix/notification/NotificationEventListener.java`
- `backend/src/main/java/com/civicfix/notification/NotificationService.java`

### B. Modified Existing Backend Components
- `backend/src/main/java/com/civicfix/complaint/ComplaintService.java` (Injected `ApplicationEventPublisher`; published 8 lifecycle events)
- `backend/src/main/java/com/civicfix/user/UserRepository.java` (Added `findActiveUsersByRoleName(RoleName roleName)`)

### C. New Automated Integration Tests
- `backend/src/test/java/com/civicfix/notification/NotificationEventIntegrationTest.java`

### D. Documentation Deliverables
- `docs/PHASE_5_IMPLEMENTATION_REPORT.md` (Updated with Stage 3 engineering evidence)
- `docs/CIVICFIX_MASTER_ROADMAP.md` (Updated with Stage 3 status)

---

## 8. Delivery Guarantees & Trade-Off Analysis

1. **At-Least-Once Database Notification Persistence**:
   - Notifications are written directly into PostgreSQL in their own transaction after the originating complaint transaction commits.
   - If the database write fails (e.g. transient connection timeout), the failure is logged without disrupting the complaint lifecycle.
2. **Transactional Decoupling**:
   - The originating complaint transaction never waits on or rolls back due to downstream notification handling.
3. **Outbox Pattern Architectural Consideration**:
   - If absolute zero-loss notification delivery under database disconnection during listener execution is required, an **Outbox Pattern** (storing an outbox record inside the complaint transaction itself) could be introduced.
   - *Scope Recommendation*: For the current in-app notification engine with collocated PostgreSQL, `@TransactionalEventListener(phase = AFTER_COMMIT)` + `@Transactional(REQUIRES_NEW)` provides optimal performance and isolation without the additional polling worker complexity of an outbox table.

---

## 9. Stage 4 Implementation Details: Notification REST APIs & Security

### A. API Endpoints & Routes (`NotificationController.java`)
All endpoints are strictly guarded by `@PreAuthorize("isAuthenticated()")` and identify the user exclusively through `@AuthenticationPrincipal UserPrincipal principal`:

| Method | Route | Description | Security & Tenant Rules |
| :--- | :--- | :--- | :--- |
| `GET` | `/api/notifications` | Paginated notifications (newest first). Supports optional `?unreadOnly=true`, `?page=0&size=15`. | Strictly queries `recipient_id = principal.getId()`. Rejects `page < 0` and `size <= 0` with HTTP 400. Clamps max size to 100. |
| `GET` | `/api/notifications/unread-count` | Unread badge count for authenticated user. | Lightweight aggregate query `countByRecipientIdAndIsReadFalse(principal.getId())`. |
| `PATCH`| `/api/notifications/{id}/read` | Marks a single notification as read. | Queries `findByIdAndRecipientId(id, principal.getId())`. Returns **HTTP 404** if not found or owned by another user to eliminate ID-guessing enumeration. Sets `readAt = NOW()`. |
| `PATCH`| `/api/notifications/read-all` | Marks all unread notifications for current user as read. | Executes efficient single-statement database UPDATE `markAllAsReadByRecipientId` without in-memory entity hydration. |
| `POST` | `/api/notifications/mark-all-read` | Alias route providing backward-compatibility with alternative REST clients. | Identical implementation and security guarantees as `PATCH /read-all`. |

### B. Security & Data Minimization Guardrails
1. **Server-Side Principal Enforcement**:
   - Zero reliance on client-supplied recipient IDs or parameters. Every database operation uses `principal.getId()`.
2. **Anti-Enumeration Protection**:
   - Probing or guessing notification UUIDs belonging to other users immediately yields `HTTP 404 Not Found` via `ResourceNotFoundException`.
   - Malformed UUID strings yield `HTTP 400 Bad Request` via centralized handler in `GlobalExceptionHandler.java`.
3. **Information Disclosure Prevention**:
   - `NotificationResponse` DTO exposes only reference metadata (`referenceId`, `title`, `message`, `notificationType`, `severity`, `targetUrl`, `isRead`, `readAt`, `createdAt`, `complaintId`, `actorName`).
   - Internal credentials, password hashes, officer triage notes, and citizen PII are strictly excluded.
4. **Spring Security Configuration**:
   - Explicit route registration in `SecurityConfig.java`: `.requestMatchers("/api/notifications/**").authenticated()`.

---

## 10. Stage 4 Verification & Test Evidence

### A. Automated Integration Test Suite (`NotificationApiIntegrationTest.java`)
```text
[INFO] Running com.civicfix.notification.NotificationApiIntegrationTest
[INFO] Tests run: 11, Failures: 0, Errors: 0, Skipped: 0, Time elapsed: 14.15 s
```

11 Target Scenarios Verified:
1. `testAuthenticatedUserRetrievesOwnNotifications`: Authenticated user retrieves their own notifications wrapped in standard `PagedResponse<NotificationResponse>`.
2. `testNotificationsOrderAndPagination`: Results returned in strict newest-first order; pagination parameters (`page`, `size`) honored; `unreadOnly=true` filter properly isolates unread notifications.
3. `testUnreadCountCorrectForCurrentUser`: Badge endpoint returns exact unread count matching database state.
4. `testUserCanMarkOwnNotificationAsRead`: Valid notification transition to `isRead = true` with timestamped `readAt` in database.
5. `testMarkAllAffectsOnlyCurrentUserNotifications`: Bulk update affects only the current user's unread notifications; other users' unread records remain completely unmodified.
6. `testUnauthenticatedRequestsRejected`: Unauthenticated requests to all endpoints are rejected with `HTTP 401 Unauthorized`.
7. `testUserCannotSeeAnotherUsersNotification`: User A's notification list never contains notifications belonging to User B.
8. `testUserCannotMarkAnotherUsersNotificationAsRead`: Attempting to mark another user's notification returns `HTTP 404 Not Found` without altering target record.
9. `testMissingNotificationIdsHandled`: Non-existent UUID returns `HTTP 404 Not Found`; malformed UUID string returns `HTTP 400 Bad Request`.
10. `testInvalidPaginationParameters`: Negative page (`page=-1`) and non-positive sizes (`size=0`, `size=-5`) return `HTTP 400 Bad Request` with clear validation error.
11. `testMarkAllReadAliasEndpoint`: `POST /api/notifications/mark-all-read` alias endpoint operates identically to `PATCH /read-all`.

### B. Full Test Suite Regression Results
1. **Backend Maven Test Suite (`.\mvnw.cmd test`)**:
   ```text
   [INFO] Results:
   [INFO] Tests run: 173, Failures: 0, Errors: 0, Skipped: 0
   [INFO] BUILD SUCCESS (Total time: 01:02 min)
   ```
   - **173 tests passed (162 existing + 11 new Stage 4 tests)** with 0 failures, 0 errors, 0 skipped.
2. **Notification Subsystem Tests (`.\mvnw.cmd test -Dtest=Notification*Test`)**:
   ```text
   [INFO] Results:
   [INFO] Tests run: 27, Failures: 0, Errors: 0, Skipped: 0
   [INFO] BUILD SUCCESS (Total time: 32.062 s)
   ```
   - **27 tests passed** across `NotificationApiIntegrationTest` (11), `NotificationEventIntegrationTest` (10), and `NotificationPersistenceTest` (6).
3. **Frontend Regression Suite (`npm.cmd test`)**:
   ```text
   ℹ tests 93
   ℹ suites 11
   ℹ pass 93
   ℹ fail 0
   ℹ duration_ms 687.6286
   ```
   - **93 tests passed** with 0 failures across 11 test suites.

### C. Live Database State & Data Preservation
Direct PostgreSQL verification:
```sql
SELECT (SELECT count(*) FROM users) as users_count,
       (SELECT count(*) FROM complaints) as complaints_count,
       (SELECT count(*) FROM complaint_status_history) as history_count,
       (SELECT count(*) FROM audit_logs) as audit_count,
       (SELECT count(*) FROM notifications) as notifications_count;
```
```text
 users_count | complaints_count | history_count | audit_count | notifications_count 
-------------+------------------+---------------+-------------+---------------------
         120 |              838 |          1804 |        4005 |                 374
```
- Flyway Migrations V1–V7 validated cleanly; no migrations added or altered.
- All existing users, complaints, status histories, and audit logs remain intact with zero data loss.

---

## 11. Inventory of Files Changed in Stage 4

### A. New Backend DTOs & Controller
- `backend/src/main/java/com/civicfix/notification/dto/NotificationResponse.java`
- `backend/src/main/java/com/civicfix/notification/dto/UnreadCountResponse.java`
- `backend/src/main/java/com/civicfix/notification/dto/MarkAllReadResponse.java`
- `backend/src/main/java/com/civicfix/notification/NotificationController.java`

### B. Modified Existing Backend Components
- `backend/src/main/java/com/civicfix/notification/NotificationService.java` (Added `getUserNotifications`, `getUnreadCount`, `markAsRead`, and `markAllAsRead`)
- `backend/src/main/java/com/civicfix/config/SecurityConfig.java` (Explicitly secured `/api/notifications/**`)
- `backend/src/main/java/com/civicfix/common/exception/GlobalExceptionHandler.java` (Added `MethodArgumentTypeMismatchException` and `IllegalArgumentException` handling for invalid UUIDs)

### C. New Automated Integration Tests
- `backend/src/test/java/com/civicfix/notification/NotificationApiIntegrationTest.java` (11 tests covering all security, pagination, and ownership invariants)

### D. Documentation Deliverables
- `docs/PHASE_5_IMPLEMENTATION_REPORT.md` (Updated with Stage 4 engineering log)
- `docs/CIVICFIX_MASTER_ROADMAP.md` (Updated with Stage 4 status)

---

## 13. Stage 5 Implementation Details: Frontend Notification Integration

### A. Architectural Objective & Elimination of Mock State
Prior to Stage 5, notifications on the frontend were simulated via `INITIAL_NOTIFICATIONS` in `src/mockData.js` and stored in `localStorage` under the key `'cf_notifications'`. This created synchronization drift between client states, prevented real-time operational alerts from reaching users, and bypassed the database-backed notification engine built in Stages 2–4.

Stage 5 completely eliminated mock notification dependencies:
1. Removed `INITIAL_NOTIFICATIONS` and `localStorage` notification hydration/mutation from `src/context/AppContext.jsx`.
2. Replaced all local state operations with live calls to the Spring Boot backend REST endpoints via `apiClient.notifications` and `notificationService.js`.
3. Preserved all existing UI layouts, styling, dark mode tokens, and responsive designs across all four user personas.

### B. Frontend Service Layer & In-Flight Request Deduplication
1. **`src/services/apiClient.js`**:
   - Added `notifications` namespace exposing:
     - `list(params)`: Queries `/api/notifications?page={page}&size={size}&unreadOnly={bool}`.
     - `getUnreadCount()`: Queries `/api/notifications/unread-count`.
     - `markAsRead(id)`: Sends `PATCH /api/notifications/{id}/read` with CSRF `X-XSRF-TOKEN` token.
     - `markAllAsRead()`: Sends `PATCH /api/notifications/read-all` with CSRF token.
2. **`src/services/notificationService.js`**:
   - `mapBackendNotificationToFrontend(raw)`: Normalizes backend DTOs into frontend structures with fallback deep links, severity normalization (`INFO` -> `info`), and relative time display (`Just now`, `5m ago`, `2h ago`, `3d ago`).
   - `getNotifications(params)`: Deserializes pagination metadata (`content`, `totalElements`, `totalPages`, `last`, `page`).
   - `getUnreadCount()`: Extracts unread counts supporting `{ unreadCount: N }` or numeric formats.
   - `markAsRead(id)`: Validates UUID and propagates server response.
   - `markAllAsRead()`: Returns updated count.
3. **`src/context/AppContext.jsx`**:
   - Added global notification state: `notifications`, `unreadCount`, `notificationsLoading`, `notificationsError`, `notificationsPagination`.
   - Exposed helper actions: `refreshNotifications`, `refreshUnreadCount`, `markNotificationRead`, `markAllNotificationsRead`.
   - **In-Flight Request Deduplication**: Implemented `isFetchingNotificationsRef` and `isFetchingUnreadRef` via React `useRef` to prevent concurrent duplicate polling and fetch storms across re-renders and persona navigation.
   - **Expired Session Handling**: HTTP 401 / 403 errors are intercepted cleanly; unread counters reset to 0 upon logout and authenticate state clearing.

### C. Persona Layouts & Nav Badges
All four layout components were updated to consume live `unreadCount` from `AppContext`:
1. `src/components/layout/CitizenLayout.jsx`: Notification nav link displays live `unreadCount` badge; automatically refreshes upon user actions.
2. `src/components/layout/OfficerLayout.jsx`: Officer sidebar notification counter bound to backend unread count.
3. `src/components/layout/WorkerLayout.jsx`: Worker navigation bar displays dynamic operational alert badge.
4. `src/components/layout/AdminLayout.jsx`: Admin sidebar "Notifications & Alerts" item displays real-time system unread counter.

### D. Connected Persona Notification Pages
1. **`src/pages/citizen/CitizenNotificationsPage.jsx`**:
   - Connected to real backend notifications via `useApp()`.
   - Added unread-only filter toggle with live query execution.
   - Added paginated controls (Previous / Next page buttons displaying current page and total count).
   - "Mark as Read" action mutates backend state and immediately synchronizes badge count.
   - Deep links redirect directly to complaint details (`/citizen/complaints/{complaintId}`).
2. **`src/pages/officer/OfficerNotificationsPage.jsx`**:
   - Connected to backend API data; removed static mock filtering.
   - "Mark all as read" button triggers `markAllNotificationsRead()` with real-time UI synchronization.
   - Filter tabs ("All" vs "Unread Only") query backend with active pagination.
   - Deep links route to officer verification queues and complaint work orders.
3. **`src/pages/worker/WorkerNotificationsPage.jsx`**:
   - Connected to real field task assignments and urgent dispatches.
   - Filter toggles between All and Unread.
   - Deep links navigate workers directly to `/worker/tasks/{complaintId}`.
   - Individual notifications can be marked read directly from task cards.
4. **`src/pages/admin/AdminNotificationsPage.jsx`**:
   - "Acknowledge All Alerts" triggers `markAllNotificationsRead()`.
   - Real-time audit and critical incident alert stream rendered from backend events.
   - Supports paginated browsing of historical administrative notifications.

---

## 14. Verification & Evidence (Stage 5)

### A. Automated Frontend Tests (`npm.cmd test`)
Comprehensive unit and integration test suite created in `tests/notificationService.test.js` validating mappings, relative timestamps, query parameter serialization, unread count extraction, mark as read mutations, and session expiration (401/403) propagation.

```text
> civicfix-ai@1.0.0 test
> node --test tests/**/*.test.js

▶ Notification Service Integration & Unit Tests (Phase 5, Stage 5)
  ▶ formatRelativeTime
    ✔ returns "Just now" for very recent timestamps
    ✔ returns minutes ago format for timestamps within an hour
    ✔ returns hours ago format for timestamps within a day
    ✔ returns days ago format for older timestamps
    ✔ handles invalid or empty dates gracefully
  ✔ formatRelativeTime
  ▶ mapBackendNotificationToFrontend
    ✔ accurately maps standard backend notification response
    ✔ generates fallback link when targetUrl is missing but complaintId is present
    ✔ normalizes is_read boolean when provided in snake_case
  ✔ mapBackendNotificationToFrontend
  ▶ getNotifications API calls
    ✔ fetches paginated notifications and returns mapped items and pagination metadata
    ✔ passes unreadOnly=true query param when filter is requested
    ✔ strictly propagates 401 Unauthorized without silent fallback
  ✔ getNotifications API calls
  ▶ getUnreadCount API calls
    ✔ extracts unread count from { count: N } response
    ✔ handles numeric primitive response directly
    ✔ strictly propagates 403 Forbidden without masking
  ✔ getUnreadCount API calls
  ▶ markAsRead API calls
    ✔ calls PATCH /api/notifications/{id}/read and returns mapped notification
    ✔ rejects missing or empty notificationId with 400 Bad Request error
  ✔ markAsRead API calls
  ▶ markAllAsRead API calls
    ✔ calls PATCH /api/notifications/read-all and returns updated count
  ✔ markAllAsRead API calls
✔ Notification Service Integration & Unit Tests (Phase 5, Stage 5)

ℹ tests 110
ℹ suites 18
ℹ pass 110
ℹ fail 0
ℹ duration_ms 483.043
```
- **110 / 110 tests passed** with 0 failures across 18 test suites (including 17 new Stage 5 tests).

### B. Frontend Production Build (`npm.cmd run build`)
```text
> civicfix-ai@1.0.0 build
> vite build

vite v5.4.21 building for production...
transforming...
✓ 105 modules transformed.
rendering chunks...
computing gzip size...
dist/index.html                   1.41 kB │ gzip:   0.73 kB
dist/assets/index-E_F2gSD5.css   72.36 kB │ gzip:  16.23 kB
dist/assets/index-DDJmdhSp.js   924.29 kB │ gzip: 219.03 kB
✓ built in 22.60s
```
- Zero build errors, syntax issues, or broken module imports.

### C. Backend Regression Suite (`.\mvnw.cmd test -Dtest=Notification*Test`)
```text
[INFO] Running com.civicfix.notification.NotificationApiIntegrationTest
[INFO] Tests run: 11, Failures: 0, Errors: 0, Skipped: 0
[INFO] Running com.civicfix.notification.NotificationEventIntegrationTest
[INFO] Tests run: 10, Failures: 0, Errors: 0, Skipped: 0
[INFO] Running com.civicfix.notification.NotificationPersistenceTest
[INFO] Tests run: 6, Failures: 0, Errors: 0, Skipped: 0
[INFO] Results:
[INFO] Tests run: 27, Failures: 0, Errors: 0, Skipped: 0
[INFO] BUILD SUCCESS
```
- 27 / 27 backend notification tests passed with zero failures.

### D. Live Database State & Data Preservation
Direct PostgreSQL verification:
```sql
SELECT (SELECT count(*) FROM users) as users_count,
       (SELECT count(*) FROM complaints) as complaints_count,
       (SELECT count(*) FROM complaint_status_history) as history_count,
       (SELECT count(*) FROM audit_logs) as audit_count,
       (SELECT count(*) FROM notifications) as notifications_count;
```
```text
 users_count | complaints_count | history_count | audit_count | notifications_count 
-------------+------------------+---------------+-------------+---------------------
         120 |              848 |          1812 |        4023 |                 400
```
- Zero data loss: All 120 users, 848 complaints, 1,812 status history entries, 4,023 audit logs, and 400 notifications remain fully intact.
- Flyway migrations V1–V7 remain untouched.

---

## 15. Inventory of Files Changed in Stage 5

### A. New Frontend Service & Tests
- `src/services/notificationService.js` (Frontend notification adapter module with mapper and relative time formatter)
- `tests/notificationService.test.js` (17 unit and integration tests covering mapper, API calls, and error handling)

### B. Modified Existing Frontend Components
- `src/services/apiClient.js` (Added `notifications` namespace for list, unread-count, markAsRead, and markAllAsRead)
- `src/context/AppContext.jsx` (Replaced mock data and `localStorage` with real backend notification state and deduplicated fetching)
- `src/components/layout/CitizenLayout.jsx` (Connected unread badge counter)
- `src/components/layout/OfficerLayout.jsx` (Connected unread badge counter)
- `src/components/layout/WorkerLayout.jsx` (Connected unread badge counter)
- `src/components/layout/AdminLayout.jsx` (Connected unread badge counter)
- `src/pages/citizen/CitizenNotificationsPage.jsx` (Connected to live backend data, unread toggle, and pagination)
- `src/pages/officer/OfficerNotificationsPage.jsx` (Connected to live backend data, "Mark all as read", unread toggle, and pagination)
- `src/pages/worker/WorkerNotificationsPage.jsx` (Connected to live backend data, task deep links, unread toggle, and pagination)
- `src/pages/admin/AdminNotificationsPage.jsx` (Connected to live backend data, "Acknowledge all alerts", and pagination)
- `tests/apiClient.test.js` (Added assertion checks for `apiClient.notifications` methods)

### C. Documentation Deliverables
- `docs/PHASE_5_IMPLEMENTATION_REPORT.md` (Updated with Stage 5 engineering log and verification)
- `docs/CIVICFIX_MASTER_ROADMAP.md` (Updated with Stage 5 status)

---

## 16. Stopping Boundary & Next Steps

Stage 5 is **COMPLETE and VERIFIED**. In compliance with the stopping boundary:
- All Stage 5 deliverables are implemented and tested.
- All mock notification data and `localStorage` states have been replaced with live backend APIs.
- Existing UI layouts, dark mode styling, and responsive designs are preserved.
- No email service integration (Resend/SMTP) has been started.
- Stopped before Stage 6.

**Next Authorized Action (upon user review):**
Proceed to **Phase 5 — Stage 6: Decoupled Email Communication (Optional Resend HTTP API)**.


