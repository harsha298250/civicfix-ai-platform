# CivicFix — Central Master Roadmap & Project Tracker

**Repository Path:** `C:\Users\harsh\Downloads\stitch_civicfix_ai_platform_design`  
**Active Working Branch:** `feat/sprint3-frontend-backend-integration`  
**Runtime Architecture:**  
- **Frontend:** React 18, Vite 5.4.21, Tailwind CSS  
- **Backend:** Java 21, Spring Boot 3.3.4, Maven Wrapper  
- **Database:** PostgreSQL 16.4 in Docker (`civicfix_postgres`), Host Port `5433`  
**Last Updated:** 2026-10-23  
**Status Standard:** Evidence-based, verified against active codebase and database.

---

## 1. Master Phase Tracker Overview

| Phase # | Phase Title | Status | Primary Audit / Report Reference | Verified Test Evidence |
| :---: | :--- | :---: | :--- | :--- |
| **Phase 1** | **Core Application & Baseline** | **PASS** | `docs/PHASE_0_VERIFIED_BASELINE_REPORT.md` | Core Auth, Roles, JPA schema verified |
| **Phase 2** | **Remediation & Security Hardening** | **PASS** | `docs/PHASE_2_FINAL_VERIFICATION_REPORT.md` | Optimistic locking (`@Version`), evidence security, photo persistence |
| **Phase 3** | **GIS & Location Intelligence** | **PASS** | `docs/PHASE_3_FINAL_VERIFICATION_REPORT.md` | Sanitized public map API, bounding-box queries, reverse geocode proxy, mini-maps |
| **Phase 4** | **AI Intelligence (Triage & Duplicates)** | **PASS** | `docs/PHASE_4_FINAL_VERIFICATION_REPORT.md` | 146 Backend tests, 93 Frontend tests, live multi-role adjudication & duplicate linking |
| **Phase 5** | **Notifications & Communication** | **IN PROGRESS** | `docs/PHASE_5_NOTIFICATION_ARCHITECTURE_AUDIT.md`<br>`docs/PHASE_5_IMPLEMENTATION_PLAN.md`<br>`docs/PHASE_5_IMPLEMENTATION_REPORT.md` | Stage 2 (Flyway V7 & Core Persistence) complete; 152 backend & 93 frontend tests pass |
| **Phase 6** | **Analytics & Reporting** | **IN PROGRESS** | Database SQL Aggregates (`/api/officer/analytics/summary`) | Live PostgreSQL aggregates for resolution hours, rework rate, ward/category breakdown |
| **Phase 7** | **UI/UX & Accessibility** | **NOT STARTED** | *(Awaits Phase 6 completion)* | N/A |
| **Phase 8** | **Performance & QA** | **NOT STARTED** | *(Awaits Phase 7 completion)* | N/A |
| **Phase 9** | **Deployment & Production Readiness** | **NOT STARTED** | *(Awaits Phase 8 completion)* | N/A |
| **Phase 10** | **Final Documentation & Viva Prep** | **NOT STARTED** | *(Awaits Phase 9 completion)* | N/A |

---

## 2. Detailed Phase Status & Traceability Matrix

### Phase 1: Core Application
- **Status:** **PASS**
- **Requirements Covered:**
  - Citizen, Municipal Officer, Field Worker, and Administrator persona authentication.
  - Complaint lifecycle state machine (`SUBMITTED`, `ASSIGNED`, `IN_PROGRESS`, `RESOLUTION_SUBMITTED`, `RESOLVED`, `REWORK_REQUESTED`, `REJECTED`).
  - PostgreSQL Flyway migrations V1 (Initial Schema) and V2 (Seed Roles & Users).
  - RBAC authorization via Spring Security with session cookies and CSRF tokens.
- **Evidence Files:**
  - `docs/PHASE_0_VERIFIED_BASELINE_REPORT.md`
  - `docs/BACKEND_API.md`
  - `docs/BACKEND_ARCHITECTURE.md`
  - `docs/BACKEND_SECURITY.md`

### Phase 2: Remediation & Security Hardening
- **Status:** **PASS**
- **Requirements Covered:**
  - Complaint evidence access control: strict role/ownership verification preventing unauthorized downloads.
  - Citizen intake photo persistence: Flyway V3 (`complaint_photos` table) and local filesystem storage abstraction.
  - Dynamic location handling: preserved zero-valued coordinates `(0, 0)`, removed hardcoded coordinate fallbacks.
  - Concurrency & Optimistic Locking: Flyway V4 (`version` column on `complaints`) returning HTTP 409 Conflict on stale updates.
- **Evidence Files:**
  - `docs/PHASE_2_FINAL_VERIFICATION_REPORT.md`
  - `docs/PHASE_2_CORE_WORKFLOW_SECURITY_AUDIT.md`
  - `docs/PHASE_2_REMEDIATION_STEP_2_1_REPORT.md` through `2_4_REPORT.md`

### Phase 3: GIS & Location Intelligence
- **Status:** **PASS**
- **Requirements Covered:**
  - Spatial index migration: Flyway V5 (`V5__add_complaint_spatial_index.sql`).
  - Sanitized public complaint map endpoint: `GET /api/complaints/public/map` strictly omitting citizen PII and sensitive internal fields.
  - Server-side geographic bounding box (`minLat`, `maxLat`, `minLng`, `maxLng`) and ward filtering with input validation.
  - Nominatim-compliant reverse geocoding proxy with custom User-Agent, in-memory spatial cache, and graceful fallback.
  - Interactive location mini-maps in Citizen Complaint Details and Officer Review screens.
- **Evidence Files:**
  - `docs/PHASE_3_FINAL_VERIFICATION_REPORT.md`
  - `docs/PHASE_3_GIS_ARCHITECTURE_AUDIT.md`
  - `docs/PHASE_3_IMPLEMENTATION_PLAN.md`
  - `docs/PHASE_3_IMPLEMENTATION_REPORT.md`

### Phase 4: AI Intelligence (Triage & Duplicates)
- **Status:** **PASS**
- **Requirements Covered:**
  - Local deterministic keyword and heuristic triage engine (`LocalDeterministicTriageEngine`): evaluates category, recommended priority, rule match confidence, and hazard assessment at zero cost without external API keys.
  - Flyway V6 migration (`V6__add_ai_triage_and_duplicate_tracking.sql`): added triage columns and non-destructive `duplicate_of_id` foreign key.
  - Officer adjudication API (`POST /api/complaints/{id}/ai/adjudicate`): supports `ACCEPT`, `OVERRIDE` (with mandatory reason), and `DISMISS`.
  - Spatial proximity and lexical duplicate candidate screening (`GET /api/complaints/{id}/duplicates`).
  - Non-destructive duplicate linking (`POST /api/complaints/{id}/duplicates/link`) with cycle and chained duplicate prevention.
  - Frontend honest UI integration: replaced simulated Gemini cards with authentic automated triage status and officer review controls.
  - Full regression test execution: 146 backend tests passing, 93 frontend tests passing, clean Vite production build.
- **Evidence Files:**
  - `docs/PHASE_4_FINAL_VERIFICATION_REPORT.md`
  - `docs/PHASE_4_AI_ARCHITECTURE_AUDIT.md`
  - `docs/PHASE_4_IMPLEMENTATION_PLAN.md`
  - `docs/PHASE_4_IMPLEMENTATION_REPORT.md`
  - `docs/PHASE_4_STAGE_3_REPORT.md`

### Phase 5: Notifications & Communication
- **Status:** **IN PROGRESS (Stage 5 Frontend Notification Integration Complete)**
- **Scope & Objectives:**
  - Persistent PostgreSQL-backed in-app notification engine (Flyway V7 `notifications` table verified).
  - Notification JPA entity, enums, and repository verified with 6 persistence tests.
  - Event-driven notification publisher (`ApplicationEventPublisher`) and transactional decoupling (`@TransactionalEventListener(phase = TransactionPhase.AFTER_COMMIT)` + `@Transactional(propagation = Propagation.REQUIRES_NEW)`).
  - Business event creation and notification generation across all 8 supported lifecycle operations: `COMPLAINT_CREATED`, `WORKER_ASSIGNED`, `WORK_STARTED`, `RESOLUTION_SUBMITTED`, `COMPLAINT_RESOLVED`, `REWORK_REQUESTED`, `COMPLAINT_REJECTED`, and `DUPLICATE_LINKED`.
  - Secure REST APIs: `GET /api/notifications` (paginated, unread filter), `GET /api/notifications/unread-count`, `PATCH /api/notifications/{id}/read`, and `PATCH /api/notifications/read-all` (with `POST /api/notifications/mark-all-read` alias).
  - Role-specific recipient routing and strict server-side principal ownership, preventing cross-tenant access and ID guessing enumeration (HTTP 404 for foreign notification IDs).
  - 30-second deduplication guard and transactional rollback safety (zero notifications on failed complaint operations).
  - Unread counts, read/unread state transitions, and direct deep-links to complaints.
  - Elimination of frontend mock notifications (`mockData.js`/`localStorage`) in favor of live backend endpoints (`apiClient.notifications` and `notificationService.js`).
  - Real-time unread badges across layouts (`CitizenLayout`, `OfficerLayout`, `WorkerLayout`, `AdminLayout`) and connected notification pages with pagination, unread toggle, and in-flight request deduplication.
  - Optional, decoupled Resend HTTP API email delivery service (disabled by default, requiring no external keys for core system).
- **Active Documents:**
  - `docs/PHASE_5_NOTIFICATION_ARCHITECTURE_AUDIT.md`
  - `docs/PHASE_5_IMPLEMENTATION_PLAN.md`
  - `docs/PHASE_5_IMPLEMENTATION_REPORT.md`
- **Current Test Evidence:**
  - Backend: 173 / 173 tests passing (`.\mvnw.cmd test`, 0 failures, 0 skipped, including 11 `NotificationApiIntegrationTest` tests).
  - Targeted Notification Subsystem: 27 / 27 tests passing (`.\mvnw.cmd test -Dtest=Notification*Test`).
  - Frontend: 110 / 110 tests passing (`npm.cmd test`, 0 failures, 0 skipped across 18 test suites, including 17 new `notificationService.test.js` tests).
  - Production Build: `npm.cmd run build` passed cleanly with 0 errors (105 modules transformed, 22.60s build time).
  - Database: Flyway V7 applied (`success = t`); 400 notifications persisted; 120 users, 848 complaints, 1,812 status history entries, 4,023 audit logs intact.
- **Next Authorized Action:** Present Stage 5 report and await user approval before proceeding to Stage 6 (Decoupled Email Communication / Optional Resend HTTP API).

### Phase 6: Analytics, SLA Governance & Supervisory Escalations
- **Status:** **IN PROGRESS**
- **Verified Deliverables:**
  - Forward migration V9: `sla_policies` matrix seeded across CivicLexicon, `SUPERVISOR` role, and `sla_due_at`/`escalated_at` columns.
  - Server-side SLA state calculator (`NOT_SET`, `ON_TRACK`, `DUE_SOON`, `OVERDUE`, `STOPPED`) and configurable `@Scheduled` escalation engine.
  - Role-protected endpoints: `POST /api/complaints/{id}/escalate`, `GET /api/supervisor/escalations`, `POST /api/supervisor/complaints/{id}/reassign`.
  - Frontend integration: `SupervisorLayout`, `SupervisorEscalationsPage`, technician reassignment modal with version lock, and `SlaBadge` chip.
  - Dev supervisor seeder (`sarah.jenkins@metro.gov`) and comprehensive test coverage (142 frontend, 16 backend tests passing).

### Phase 7: UI/UX & Accessibility
- **Status:** **NOT STARTED**
- **Prerequisites:** Phase 6 completion.
- **Planned Scope:** Responsive layout consistency across all personas, accessibility (WCAG 2.1 AA), keyboard navigation, contrast ratios, and loading/empty/error states.

### Phase 8: Performance & Quality Assurance
- **Status:** **NOT STARTED**
- **Prerequisites:** Phase 7 completion.
- **Planned Scope:** End-to-end load testing, query profiling, index optimization, frontend bundle splitting, and complete multi-role regression testing.

### Phase 9: Deployment & Production Readiness
- **Status:** **NOT STARTED**
- **Prerequisites:** Phase 8 completion.
- **Planned Scope:** Production Docker containerization, environment secret management, HTTPS reverse proxy configuration, database backup/restore procedures, and operational runbooks.

### Phase 10: Final Documentation & Viva Preparation
- **Status:** **NOT STARTED**
- **Prerequisites:** Phase 9 completion.
- **Planned Scope:** Comprehensive project dissertation, architectural diagrams, API catalogues, viva presentation decks, and demonstrable Q&A walkthroughs.

### Security & Dev-Mode Hardening (DemoRoleSwitcher)
- **Status:** **PASS**
- **Changes Applied:**
  - Gated `DemoRoleSwitcher` UI behind `VITE_DEMO_MODE === 'true'` (default off; returns `null` when unset/false).
  - Gated `authService.switchRole` and `AppContext.switchRole` to throw clear error when demo mode is inactive.
  - Removed "Reset Demo Data" button from switcher; updated README to mark feature as development-only.
  - Documented `VITE_DEMO_MODE=false` in `.env.example` with mandatory production-off notice.
  - Added test suite `tests/demoMode.test.js` verifying default disabling, execution block, and toggle behavior.

### Server-Authoritative Hardening (Eliminated Offline Fallbacks)
- **Status:** **PASS**
- **Changes Applied:**
  - Removed offline demo fallbacks & local write paths in `authService.js` (login, registerCitizen, rate limits).
  - Enforced failure with "Cannot reach the server. Nothing was saved." on all auth and complaint write actions.
  - Refactored `checkSession` to clear sessions and signal server-unreachable state instead of using cached users.
  - Removed offline complaint generation and local storage writes in `complaintService.js`.
  - Added "server unreachable" alert banner in UI and updated test suites (120 frontend tests passing).

### AI Triage Server Mapping & Label Modernization
- **Status:** **PASS**
- **Changes Applied:**
  - Removed hardcoded AI literals (`confidence: 96.5`, `slaHoursRemaining: 48`, fixed hazard scores) in `complaintService.js`.
  - Mapped real backend AI triage fields (`detectedCategory`, `recommendedPriority`, `confidence`, `hazardScore`, `explanation`, `adjudicationStatus`, `triagedAt`) from `ComplaintResponse.java`.
  - Untriaged or null triage data shows "AI triage pending" / "Not available" without numeric placeholders.
  - Renamed UI labels from "AI confidence" / "AI Match" to "Rule-match score" and surfaced engine explanation.
  - Removed `slaHoursRemaining` across UI and services until formal SLA feature implementation.

### PostgreSQL Repeatable Demo Dataset & Admin Reset
- **Status:** **PASS**
- **Changes Applied:**
  - Added migration V8 (`is_demo BOOLEAN NOT NULL DEFAULT FALSE`) to `complaints` with performance index.
  - Implemented `DemoDataSeeder` (dev profile only, guarded by `CIVICFIX_SEED_DEMO=true`, idempotent & deterministic).
  - Seeded 40 complaints across Chennai localities (Anna Nagar, T. Nagar, Adyar, Velachery, etc.) with all 9 statuses, 3 duplicate clusters, realistic timelines, and rule-based AI triage.
  - Implemented `POST /api/admin/demo/reset` (ADMIN only, dev profile only) purging exclusively `is_demo=true` rows before reseeding.
  - Wired admin "Reset demo data" action in frontend (`SystemSettingsPage`, `DemoRoleSwitcher`, `AppContext`) to the API.
  - Added unit test suites `DemoDataSeederTest` and `DemoAdminControllerTest` (33 backend slice tests passing).

### Admin Governance & Management Platform Endpoints
- **Status:** **PASS**
- **Changes Applied:**
  - Implemented `/api/admin` backend controller and service (`GET /users`, `GET /users/{id}`, `POST /users`, `PATCH /users/{id}/status`, `GET /audit-logs`, `GET /dashboard/summary`) with `@PreAuthorize("hasRole('ADMIN')")`.
  - Added self-suspension blocking and sanitized user responses without password hashes; records audit log for all admin actions.
  - Added `adminService.js` and wired `apiClient.admin` methods to frontend.
  - Refactored `AdminDashboard`, `UserManagementPage`, `UserDetailsPage`, `CreateStaffPage`, `AuditLogsPage`, and `RolesPermissionsPage` to consume real backend data, removing all fake offsets and mock data.
  - Added backend tests (`AdminControllerTest`, `AdminServiceTest`) and frontend tests (`tests/adminService.test.js`).

### Phase 6: Officer Operational Analytics & Database Aggregates
- **Status:** **PASS**
- **Changes Applied:**
  - Added `GET /api/officer/analytics/summary` (OFFICER and ADMIN) with SQL aggregates: counts by status, ward, category, avg/median resolution hours, rework rate, duplicates linked, AI adjudication counts.
  - Returns null for unconfigured SLA adhering to zero-invented-metrics rule ("SLA not configured").
  - Added `apiClient.officer.getAnalyticsSummary` and wired `officerService.getAnalyticsSummary`.
  - Refactored `OfficerAnalyticsPage`, `OfficerDashboard`, and `AdminDashboard` to consume database aggregates with loading, empty, and error states.
  - Added backend tests (`OfficerAnalyticsControllerTest`, `OfficerAnalyticsServiceTest`) and frontend tests (`tests/officerService.test.js`, `tests/apiClient.test.js`).

### Rate Limiting & Login Lockout Security Infrastructure
- **Status:** **PASS**
- **Changes Applied:**
  - Integrated Bucket4j 8.10.1 in-memory rate limiting and lockout services (`RateLimiterService`, `LoginLockoutService`).
  - Configured thresholds in `application.yml` (test overrides in `application-test.yml`): login 5 failed attempts/15m per identifier+IP; register 5/h per IP; complaint create 10/m per user; upload 10/m per user; reverse-geocode 30/m per IP.
  - Implemented `RateLimitInterceptor` (`WebMvcConfig`) and `GlobalExceptionHandler` returning HTTP 429 with `Retry-After` header and structured JSON.
  - Hardened login authentication: 6th failed attempt triggers 429 lockout; non-existent accounts return identical 401 response without enumeration.
  - Frontend (`apiClient.js`, `authService.js`, `complaintService.js`) displays user-friendly retry message on 429 without auto-retrying in loops.
  - Added unit & integration tests (`RateLimiterServiceTest`, `LoginLockoutServiceTest`, `RateLimitInterceptorTest`, `RateLimitIntegrationTest`, `AuthLoginLockoutIntegrationTest`, `apiClient.test.js`, `authService.test.js`).

### Media Upload Content Validation & EXIF Stripping
- **Status:** **PASS**
- **Changes Applied:**
  - Hardened `LocalStorageService` with strict magic bytes verification (JPEG `FF D8 FF`, PNG `89 50 4E 47 0D 0A 1A 0A`, WebP `RIFF....WEBP`).
  - Added mismatch rejection when byte signature, declared Content-Type, and file extension disagree.
  - Implemented ImageIO decode and re-encode for JPEG and PNG before saving, completely stripping all EXIF and GPS camera metadata.
  - Added pixel limit guard (>40 megapixels) via ImageReader header inspection to prevent decompression bomb attacks.
  - Documented WebP acceptance without re-encode due to standard OpenJDK lack of native WebP ImageWriter.
  - Created `TestImageHelper` shared test utility and updated tests across test suites; added unit tests in `LocalStorageServiceTest` for renamed files, decompression bombs, type mismatch, and EXIF sanitization.

### Public GIS Map Privacy Sanitization & Coordinate Truncation
- **Status:** **PASS**
- **Changes Applied:**
  - Redacted `title`, `referenceId`, and database UUID from `PublicMapComplaintResponse`; replaced with sequential non-identifying integer index.
  - Truncated `latitude` and `longitude` to 3 decimal places (~110m resolution) using `RoundingMode.HALF_UP` to prevent resident re-identification.
  - Retained full complaint metadata on authenticated role-protected endpoints (`/api/complaints`).
  - Updated frontend `complaintService.js`, `PublicMapPage.jsx`, and `CitizenIssueMapPage.jsx` to remove references to `title`/`referenceId`.
  - Updated `TamilNaduOverviewMap.jsx` marker popups to show category, status, and ward only.
  - Added unit test `PublicMapPrivacyTest.java`, updated `ComplaintGisIntegrationTest.java` and `tests/gis.test.js` to guarantee absence of identifying text and unrounded coordinates.

### Production Profile Security & Seed Account Deactivation Guard
- **Status:** **PASS**
- **Changes Applied:**
  - Added `application-prod.yml` configuring secure SameSite=Strict session cookies, show-sql=false, actuator restricted to health, CORS origin from `FRONTEND_ORIGIN`, and strict non-default database password.
  - Implemented `ProductionSafetyGuard` (`@Profile("prod")` `ApplicationRunner`): halts startup if database password is empty or dev default (`civicfix_dev_password_only`), and sets all 4 V2 seed accounts to `DISABLED` unless `ALLOW_SEED_ACCOUNTS=true`.
  - Updated `.gitignore` for `backend/uploads/` and Maven timing artifacts; created `.dockerignore` for root and `backend/`.
  - Documented `docs/DEPLOYMENT_CHECKLIST.md` with required env vars and initial admin creation steps.
  - Added unit test `ProductionSafetyGuardTest.java` verifying startup rejections, account disabling, and login lockout.

---

## 3. Safeguard and Governance Rules

1. **Strict Forward Progression:** Each phase must be formally verified and approved before proceeding to subsequent phases.
2. **Zero Destructive Actions:** Never reset the database, drop volumes, delete existing production/test records, or overwrite migrations V1–V6.
3. **No Unapproved Git Operations:** No commits, pushes, rebases, or branch changes without explicit user authorization.
4. **Data Minimization & Privacy:** No citizen PII or internal officer notes exposed across unauthorized boundaries.
5. **Zero External Credential Reliance:** The core platform must function completely offline and without paid third-party APIs. Optional integrations (e.g. Resend) remain strictly optional and disabled by default.

---

## 4. Future Roadmap & Out-of-Scope Enhancements

- **Email Verification via Mail Provider**: Future work: email verification via a mail provider (e.g., SMTP or transactional provider) rather than simulated client-side OTP. Registration proceeds directly to the server with validation and rate limiting.
- **Email-Based Password Reset with Mail Provider**: Future work: email-based password reset with a mail provider (e.g., SMTP, SendGrid, or AWS SES) for delivering cryptographically signed, expiring recovery links. In the current release, automated email delivery is not configured; users must contact the system administrator for credential assistance.

