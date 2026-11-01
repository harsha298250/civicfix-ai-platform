# CivicFix — Phase 5 Notification & Communication Architecture Audit
## Read-Only Technical Inspection & Readiness Assessment

**Date:** 2026-10-23  
**Auditor:** Lead Software Architect, Security Reviewer & Full-Stack Engineer  
**Evaluation Target:** CivicFix Platform — Phase 5 Notification & Communication  
**Target Branch:** `feat/sprint3-frontend-backend-integration`  
**Database:** PostgreSQL 16.4 in Docker (`civicfix_postgres`), Host Port `5433`  
**Backend Runtime:** Java 21, Spring Boot 3.3.4 (PID live instance on Port 8080)  
**Frontend Runtime:** React 18, Vite 5.4.21, Tailwind CSS  
**Audit Scope:** Read-Only inspection of existing notification infrastructure, database schema, complaint lifecycle event triggers, frontend notification pages, and email delivery options (including Resend HTTP API).

---

## 1. Executive Summary

A comprehensive, read-only architectural audit was conducted on the CivicFix codebase and active runtime environment to assess readiness for **Phase 5: Notifications and Communication**.

### Key Findings at a Glance
1. **Frontend Mock Disconnection [VERIFIED]**: The frontend features 4 dedicated role-specific notification pages (`CitizenNotificationsPage`, `OfficerNotificationsPage`, `WorkerNotificationsPage`, `AdminNotificationsPage`) and layout navigation badges. However, all notification state is currently powered by **6 static mock objects in `src/services/mockData.js` synced only to browser `localStorage` (`civicfix_notifs_v1`)**. No real backend notification APIs exist.
2. **Backend Infrastructure Absence [VERIFIED]**: The Spring Boot backend contains **zero** notification entities, tables, controllers, repositories, DTOs, or event publishers. No notification database table exists in PostgreSQL.
3. **Complaint Lifecycle Readiness [VERIFIED]**: The core business logic in `ComplaintService.java` is robust, transactional, and mature. Every consequential action (`CREATE_COMPLAINT`, `ASSIGN_WORKER`, `TRANSITION_STATUS`, `ADJUDICATE_AI_TRIAGE`, `LINK_DUPLICATE`) already updates `complaint_status_history` and `audit_logs`. These exact operational checkpoints provide ideal anchor points for Spring `ApplicationEvent` dispatch.
4. **Database Safety & Forward Migration [VERIFIED]**: The active PostgreSQL database has 6 intact Flyway migrations (V1–V6). A new, forward-only migration (`V7__create_notifications_table.sql`) can be added without altering or breaking existing tables (`complaints`, `users`, `audit_logs`).
5. **Core vs. Optional Architecture [VERIFIED]**: Persistent in-app notifications stored in PostgreSQL represent the **mandatory core** of Phase 5. They require zero external credentials, zero network dependencies, and zero financial cost. Email delivery via **Resend HTTP API** is evaluated as an **optional, decoupled enhancement** that must remain disabled by default with an offline logging fallback.

---

## 2. Inventory of Existing Code & Current State

### A. Backend Inventory (Spring Boot 3.3.4 & Java 21)

| Area | Status | Location / Details | Audit Observation |
| :--- | :---: | :--- | :--- |
| **Notification Entity** | **MISSING** | `backend/src/main/java/com/civicfix/notification/` | No JPA entity exists for notifications. |
| **Notification Repository** | **MISSING** | N/A | No Spring Data JPA repository. |
| **Notification Controller** | **MISSING** | N/A | No REST controller for `/api/notifications`. |
| **Notification Service** | **MISSING** | N/A | No service managing notification creation, read status, or unread tallies. |
| **Domain Event Bus** | **MISSING** | N/A | Business logic updates database tables directly; no `ApplicationEventPublisher` used for notifications. |
| **Mail / Email Starter** | **OMITTED** | `backend/pom.xml` | `spring-boot-starter-mail` is NOT present. No email dependencies. |
| **Storage & Actuator** | **PRESENT** | `backend/src/main/resources/application.yml` | Health, info, file storage, Flyway, and PostgreSQL configured. |

### B. Database Schema Inventory (PostgreSQL 16.4)

Direct inspection of `civicfix_postgres` via `\dt` confirmed 9 active relations:
```text
 Schema |           Name           | Type  |     Owner     
--------+--------------------------+-------+---------------
 public | audit_logs               | table | civicfix_user
 public | complaint_photos         | table | civicfix_user
 public | complaint_status_history | table | civicfix_user
 public | complaints               | table | civicfix_user
 public | flyway_schema_history    | table | civicfix_user
 public | resolution_evidence      | table | civicfix_user
 public | roles                    | table | civicfix_user
 public | user_roles               | table | civicfix_user
 public | users                    | table | civicfix_user
```
- **Flyway Migrations:** V1 through V6 all verified with `success = t`.
- **Notification Table:** **NONE**. There is no table for user notifications.

### C. Frontend Inventory (React 18 & Vite)

| Component / File | Current Implementation | Data Source | Gap / Defect |
| :--- | :--- | :--- | :--- |
| `src/context/AppContext.jsx` | Manages `notifications` state; defines `markNotificationRead`, `markAllNotificationsRead` | `localStorage.getItem('civicfix_notifs_v1')` falling back to `INITIAL_NOTIFICATIONS` | Client-only simulation; not connected to Spring Boot API. |
| `src/services/mockData.js` | Defines `INITIAL_NOTIFICATIONS` array (6 items: 2 Citizen, 2 Officer, 1 Worker, 1 Admin) | Static JavaScript mock array | Hardcoded static tickets (`CF-2026-00124`, `CF-2026-00120`, etc.). |
| `src/pages/citizen/CitizenNotificationsPage.jsx` | Renders notification list for `CITIZEN` role; provides "View Ticket" and "Mark as read" buttons | `useApp().notifications` | Visuals and layout are functional, but data does not reflect real user complaints. |
| `src/pages/officer/OfficerNotificationsPage.jsx` | Renders operational alerts for `OFFICER`; provides "Mark All as Read" | `useApp().notifications` | Not updated when new complaints are submitted or evidence uploaded. |
| `src/pages/worker/WorkerNotificationsPage.jsx` | Renders field dispatch alerts for `WORKER`; links to `/worker/tasks/{id}` | `useApp().notifications` | Not updated when officer dispatches worker to a complaint. |
| `src/pages/admin/AdminNotificationsPage.jsx` | Renders system warnings and security notices | `useApp().notifications` | Not updated when credentials are requested or SLA breaches occur. |
| `src/components/layout/CitizenLayout.jsx` | Renders unread badge in navigation bar (`unreadNotifs > 0`) | `notifications.filter(n => n.role === 'CITIZEN' && !n.read).length` | Badge counts static localStorage data. |
| `src/components/layout/OfficerLayout.jsx` | Renders unread badge in navigation bar (`unreadOfficerNotifs > 0`) | `notifications.filter(n => (n.role === 'OFFICER' || n.role === 'ALL') && !n.read).length` | Badge counts static localStorage data. |
| `src/components/layout/WorkerLayout.jsx` | Renders notification link in navigation bar | Static link to `/worker/notifications` | No dynamic badge count currently hooked up. |
| `src/components/layout/AdminLayout.jsx` | Renders notification link in navigation bar | Static link to `/admin/notifications` | No dynamic badge count currently hooked up. |
| `src/services/apiClient.js` | HTTP client for backend REST endpoints | No `apiClient.notifications` module | Complete absence of notification network calls. |

---

## 3. Complaint Lifecycle & Notification Event Mapping

The backend's `ComplaintService.java` manages all complaint lifecycle operations. An audit of each mutating method identified the exact triggers and target recipients:

| Lifecycle Action | Method in `ComplaintService.java` | Actor Role | Trigger Event | Primary Recipient(s) | Notification Title & Content | Severity |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **Complaint Submitted** | `createComplaint` | Citizen | `COMPLAINT_CREATED` | **1. Author Citizen**<br>**2. Municipal Officers** | **Citizen:** "Complaint Submitted #CF-XXXXX"<br>**Officers:** "New Intake Defect in Ward [W]" | INFO<br>HIGH (if P1) |
| **Worker Assigned** | `assignWorker` | Officer | `WORKER_ASSIGNED` | **1. Assigned Worker**<br>**2. Author Citizen** | **Worker:** "New Task Dispatched #CF-XXXXX"<br>**Citizen:** "Field Technician Dispatched" | INFO |
| **Work Started** | `transitionStatus(IN_PROGRESS)` | Worker | `STATUS_CHANGED` | **Author Citizen** | "Repair Underway: Crew is on site at #CF-XXXXX" | INFO |
| **Evidence Uploaded** | `transitionStatus(RESOLUTION_SUBMITTED)` | Worker | `RESOLUTION_SUBMITTED` | **1. Assigned Officer**<br>**2. Author Citizen** | **Officer:** "Resolution Proof Awaiting Verification"<br>**Citizen:** "Repair Completed — Verification Pending" | ACTION_REQUIRED<br>INFO |
| **Resolution Approved** | `transitionStatus(RESOLVED)` | Officer | `COMPLAINT_RESOLVED` | **1. Author Citizen**<br>**2. Assigned Worker** | **Citizen:** "Complaint Resolved & Closed"<br>**Worker:** "Resolution Verified by Officer Vance" | SUCCESS |
| **Rework Requested** | `transitionStatus(REWORK_REQUESTED)` | Officer | `REWORK_REQUESTED` | **Assigned Worker** | "Rework Requested on #CF-XXXXX: [Reason]" | WARNING |
| **Complaint Rejected** | `transitionStatus(REJECTED)` | Officer | `COMPLAINT_REJECTED` | **Author Citizen** | "Complaint Closed Without Action: [Reason]" | WARNING |
| **Progress Note / Blocker** | `addProgressNote` | Worker / Officer | `NOTE_ADDED` | **Assigned Officer** (if blocker) | "Blocker Reported on #CF-XXXXX: [Note]" | WARNING |
| **Triage Adjudicated** | `adjudicateTriage` | Officer | `TRIAGE_ADJUDICATED` | **Supervising Officers** (if Critical) | "P1 Priority Escalation Confirmed on #CF-XXXXX" | CRITICAL |
| **Duplicate Linked** | `linkDuplicate` | Officer | `DUPLICATE_LINKED` | **Author Citizen of Child** | "Report Linked to Primary Incident #CF-XXXXX" | INFO |

---

## 4. Evaluation of Core In-App Notification Engine

### A. Architectural Principles
1. **Persistent & Database-Backed**: Notifications must be stored in PostgreSQL as first-class records (`notifications` table).
2. **Transactional Consistency**: A notification must only be persisted if the business transaction (e.g. status transition) commits successfully. If the complaint update fails or rolls back, no orphan notification may be generated.
3. **Decoupled Event Architecture**: Use Spring's `ApplicationEventPublisher` and `@TransactionalEventListener(phase = TransactionPhase.AFTER_COMMIT)`. This ensures that `ComplaintService` publishes events (e.g., `ComplaintStatusChangedEvent`) without tight coupling to the notification storage logic.
4. **Role & Identity Ownership**:
   - Each notification must be bound to a specific `recipient_id (UUID -> users.id)`.
   - Notifications meant for a group (e.g. all officers in a department or ward) should be fan-out persisted to each officer individually or queried via role broadcast. Individual recipient persistence is strongly recommended for accurate personal `is_read` tracking.
5. **Fast Unread Counter Query**: With index on `(recipient_id, is_read)`, `SELECT COUNT(*) FROM notifications WHERE recipient_id = ? AND is_read = false` executes in < 1ms.

### B. Proposed Flyway V7 Database Schema
```sql
-- V7__create_notifications_table.sql
CREATE TABLE notifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    recipient_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    actor_id UUID REFERENCES users(id) ON DELETE SET NULL,
    complaint_id UUID REFERENCES complaints(id) ON DELETE SET NULL,
    reference_id VARCHAR(50),
    title VARCHAR(200) NOT NULL,
    message TEXT NOT NULL,
    notification_type VARCHAR(50) NOT NULL,
    severity VARCHAR(30) NOT NULL DEFAULT 'INFO',
    target_url VARCHAR(255),
    is_read BOOLEAN NOT NULL DEFAULT FALSE,
    read_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- Compound index for optimal unread badge counting and chronological list sorting
CREATE INDEX idx_notifications_recipient_read_created 
ON notifications(recipient_id, is_read, created_at DESC);

CREATE INDEX idx_notifications_complaint 
ON notifications(complaint_id);
```

### C. Proposed REST API Contract

1. `GET /api/notifications`:
   - Returns paginated notifications for the authenticated user (`principal.getId()`).
   - Query params: `page` (default 0), `size` (default 20), `unreadOnly` (optional boolean).
   - Strict tenant isolation: user can only query their own notifications.
2. `GET /api/notifications/unread-count`:
   - Returns lightweight unread tally: `{ "unreadCount": 3 }`.
3. `PATCH /api/notifications/{id}/read`:
   - Marks an individual notification as read (`is_read = true`, `read_at = now()`).
   - Rejects if `notification.recipient_id != principal.getId()` with `HTTP 403 Forbidden`.
4. `PATCH /api/notifications/read-all`:
   - Marks all unread notifications for the authenticated user as read in a single query.

---

## 5. Evaluation of Email Delivery Providers & Resend HTTP API

The master prompt requires evaluating **Resend via its HTTP API** as an optional email integration, while clearly distinguishing it from core in-app notifications and SMTP.

### A. Core Architectural Distinctions
- **In-App Notifications (PostgreSQL)**: Internal, persistent, zero-cost, zero-configuration, 100% offline, guaranteed delivery within application boundaries.
- **SMTP (Simple Mail Transfer Protocol)**: A traditional, stateful push protocol (RFC 5321) over TCP ports 25, 465, or 587. Vulnerable to egress firewalls, connection pool exhaustion, blocking socket hangs, and complex TLS negotiation.
- **Resend HTTP API**: A modern, stateless, transactional cloud email delivery provider accessed via `POST https://api.resend.com/emails` with JSON payloads over HTTPS (port 443).

### B. Resend HTTP API Evaluation

| Criteria | Resend HTTP API Assessment |
| :--- | :--- |
| **Protocol & Port Safety** | Uses standard HTTPS (Port 443). Never blocked by corporate or cloud egress firewalls that restrict SMTP ports 25 or 587. |
| **Dependency Footprint** | **Zero Extra SDKs Required.** Can be executed using Spring Boot 3.3.4's built-in `RestClient` or Java 21's native `java.net.http.HttpClient`. No heavy third-party JARs needed. |
| **Authentication** | Bearer token authorization header: `Authorization: Bearer re_123456...`. Clean, standard, non-interactive. |
| **Payload Structure** | Clean JSON: `{"from": "CivicFix <alerts@domain.gov>", "to": ["citizen@domain.org"], "subject": "Update on #CF-2026-00124", "html": "..."}`. |
| **Error Handling & Observability** | Returns structured JSON with immediate message ID (`{"id": "49a39f9b-..."}`) or clear error codes (e.g. `validation_error`, `daily_quota_exceeded`, `domain_not_verified`). |
| **Webhook Delivery Receipts** | Supports asynchronous webhooks (delivered, bounced, opened, clicked) via cryptographic Svix signatures if delivery tracking is needed in future phases. |

### C. Recommended Integration Strategy
1. **Disabled by Default**: Resend integration must be gated behind `civicfix.notifications.email.enabled: ${EMAIL_NOTIFICATIONS_ENABLED:false}`.
2. **Pluggable Interface**:
   ```java
   public interface EmailDeliveryService {
       void sendEmail(String to, String subject, String htmlContent);
   }
   ```
3. **Safe Offline Default (`LoggingEmailService`)**:
   When `EMAIL_NOTIFICATIONS_ENABLED=false` or no API key is provided, the system loads a `LoggingEmailService` that formats and logs the email to the backend log without network activity.
4. **Resend Service (`ResendEmailService`)**:
   Loaded conditionally via `@ConditionalOnProperty(name = "civicfix.notifications.email.enabled", havingValue = "true")`.
   Reads `RESEND_API_KEY` from environment. If key is missing or invalid, it gracefully degrades to logging and records a warning rather than aborting business transactions.
5. **Asynchronous Execution**:
   Email delivery must run inside `@Async` executor tasks so that external network latency never slows down the primary complaint transaction or UI response.

---

## 6. Security, Authorization & Privacy Assessment

1. **Strict Tenant & Role Isolation**:
   - A Citizen must only receive notifications where `recipient_id == citizen.id`.
   - A Citizen must never receive internal triage notes, worker dispatch metadata, or other citizens' complaints.
   - An Officer must only receive operational alerts relevant to their jurisdiction or assigned department.
   - A Field Worker must only receive task dispatches assigned directly to them.
2. **Data Minimization in Notification Payloads**:
   - Notification titles and messages must contain public reference IDs (`#CF-2026-XXXXX`), status summaries, and general category names.
   - PII such as citizen phone numbers, citizen email addresses, password hashes, or internal server IPs must **never** be injected into notification messages.
3. **Preventing Notification Flooding (Deduplication)**:
   - Rapid status flipping or idempotent retries should not spam the user.
   - Event listener must check whether an identical unread notification for the same `(recipient_id, complaint_id, notification_type)` was created within the last 60 seconds before inserting.
4. **CSRF & Authentication**:
   - All notification mutating endpoints (`PATCH /api/notifications/...`) require valid session authentication and CSRF token (`X-XSRF-TOKEN`).

---

## 7. Verified Findings Matrix

| Finding # | Description | Classification | Evidence Path |
| :---: | :--- | :---: | :--- |
| **F-01** | Frontend notification pages and badges exist for all 4 roles but consume static mock data from `localStorage`. | **VERIFIED** | `src/pages/*/*NotificationsPage.jsx`<br>`src/context/AppContext.jsx:71-85` |
| **F-02** | Spring Boot backend contains zero notification entities, controllers, or database tables. | **VERIFIED** | `backend/src/main/java/com/civicfix/` (grep search returned 0 results) |
| **F-03** | PostgreSQL database contains 9 tables; no `notifications` table exists. Flyway V1–V6 are intact. | **VERIFIED** | `docker exec civicfix_postgres psql ... \dt`<br>`flyway_schema_history` query |
| **F-04** | All complaint lifecycle state transitions in `ComplaintService` are transactional and audited. | **VERIFIED** | `ComplaintService.java:100-985`<br>`audit_logs` & `complaint_status_history` tables |
| **F-05** | Core in-app notifications can be implemented with zero cost, zero keys, and zero external services. | **VERIFIED** | PostgreSQL-backed schema with Spring Data JPA. |
| **F-06** | Resend HTTP API can be implemented natively using Spring `RestClient` without external dependencies. | **VERIFIED** | Spring Boot 3.3.4 built-in `RestClient` & Java 21 `HttpClient`. |
| **F-07** | Forward migration `V7__create_notifications_table.sql` will not disrupt existing tables or data. | **VERIFIED** | Read-only schema review; new table with FK to `users(id)` and `complaints(id)`. |

---

## 8. Audit Conclusion & Next Steps

The repository is in an ideal state to begin Phase 5. The existing frontend UI provides complete visual scaffolding that can be connected to real backend endpoints without redesign. The backend's transactional complaint service is primed for event-driven notification generation.

### Immediate Next Step
Review the detailed staged implementation plan in `docs/PHASE_5_IMPLEMENTATION_PLAN.md` and authorize Stage 2 (Database Schema Migration & Core Backend Entity).
