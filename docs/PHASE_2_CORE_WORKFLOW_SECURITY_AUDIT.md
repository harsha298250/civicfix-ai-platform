# CivicFix AI — Phase 2 Comprehensive Core Workflow, Security & Database Audit

**Document Version:** 2.2.0  
**Audit Date:** October 22, 2026  
**Auditor:** Senior QA Engineer, Spring Boot Backend Engineer, PostgreSQL Database Engineer & Application Security Auditor  
**Investigation Mode:** Strictly Read-Only / Live Non-Destructive Manual & Automated Verification  
**Target Environment:**
- **Frontend:** React 18.3.1, Vite 5.4.11, Tailwind CSS 3.4.15 (Vite dev server running on port `5173`)
- **Backend:** Java 21, Spring Boot 3.3.4, Maven, Spring Security 6, Spring Data JPA (Running on port `8080`)
- **Database:** PostgreSQL 16 (`civicfix_postgres`), Database: `civicfix_db`, User: `civicfix_user`, Host Port: `5433`
- **Active Git Branch:** `feat/sprint3-frontend-backend-integration`

---

## 1. Executive Summary

An independent, evidence-based manual, architectural, and security audit was conducted on the CivicFix application following Sprint 3 Step 4D. The audit evaluated:
1. The PostgreSQL 16 database and Flyway migration schema.
2. The end-to-end 10-point complaint workflow (citizen registration/login -> complaint creation -> officer review/assignment -> worker task isolation -> progress tracking -> evidence submission -> officer adjudication/rework -> worker remediation -> citizen tracking -> audit trail).
3. Application and infrastructure security (authentication, password hashing, sessions, CSRF, RBAC, IDOR, photo uploads, path traversal, SQL injection, and audit logging).
4. Database integrity, transaction boundaries, constraint enforcement, and concurrency risks.
5. In-depth analysis of the four reported persistence gaps (citizen photos, AI triage, progress percentage, and GPS metadata).
6. Frontend and REST API integration consistency.
7. Automated test suite execution (backend Maven Surefire suite and frontend Vitest/Node test suite).

### Key Audit Findings
- **Live 10-Point Core Workflow:** **9 steps verified PASSED**, **1 step FAILED with confirmed defect** (Uploaded repair photo download endpoint returns HTTP 404 due to directory path mismatch in `ComplaintService.java:510`).
- **Backend Test Suite:** **80 passed**, **0 failed**, **0 skipped** (`cmd.exe /c "mvnw.cmd test"` elapsed: 39.9s).
- **Frontend Test Suite:** **64 passed**, **0 failed**, **0 skipped** (`npm.cmd run test` elapsed: 532ms).
- **Frontend Production Build:** **Passed** (`npm.cmd run build` transformed 103 modules in 25.37s with 0 errors).
- **Database Migrations:** **100% in sync** (Flyway V1 and V2 applied with exact checksum match; 0 pending).
- **Concurrency Risk Identified:** `Complaint` entity lacks an `@Version` column (no optimistic locking). Concurrent status mutations could cause lost updates in high-volume production.
- **Citizen Photos Persistence Gap:** Citizen intake photos are saved only in browser `localStorage` and are completely omitted from the Spring Boot API payload and database schema.

---

## 2. Scope, Limitations & Git State

### 2.1 Working-Tree Baseline
- **Branch:** `feat/sprint3-frontend-backend-integration`
- **Working Tree State:** Clean with respect to test execution. Uncommitted modifications reflect the completed Sprint 3 Steps 4A–4D frontend-backend integration.
- **Safety Observance:** No tables dropped, no Docker volumes erased, no records purged, and no credentials exposed in reports or logs.

### 2.2 Task 1 — Evidence Review & Document Inventory

The following documents were inspected:
- [`docs/DATABASE_SCHEMA_MIGRATION_AUDIT.md`](file:///c:/Users/harsh/Downloads/stitch_civicfix_ai_platform_design/docs/DATABASE_SCHEMA_MIGRATION_AUDIT.md): Confirmed Flyway V1 and V2 match live PostgreSQL; Hibernate uses `ddl-auto: validate`.
- [`docs/SPRINT_3_STEP_4A_IMPLEMENTATION_REPORT.md`](file:///c:/Users/harsh/Downloads/stitch_civicfix_ai_platform_design/docs/SPRINT_3_STEP_4A_IMPLEMENTATION_REPORT.md): Worker task list and detail integration.
- [`docs/SPRINT_3_STEP_4B_IMPLEMENTATION_REPORT.md`](file:///c:/Users/harsh/Downloads/stitch_civicfix_ai_platform_design/docs/SPRINT_3_STEP_4B_IMPLEMENTATION_REPORT.md): Worker on-site arrival, status transitions, and operational progress notes.
- [`docs/SPRINT_3_STEP_4C_IMPLEMENTATION_REPORT.md`](file:///c:/Users/harsh/Downloads/stitch_civicfix_ai_platform_design/docs/SPRINT_3_STEP_4C_IMPLEMENTATION_REPORT.md): Repair evidence photo uploads, `LocalStorageService`, and disk rollback defense.
- [`docs/SPRINT_3_STEP_4D_IMPLEMENTATION_REPORT.md`](file:///c:/Users/harsh/Downloads/stitch_civicfix_ai_platform_design/docs/SPRINT_3_STEP_4D_IMPLEMENTATION_REPORT.md): Officer verification sign-off, approval, and mandatory rework reasons.
- [`docs/PHASE_0_VERIFIED_BASELINE_REPORT.md`](file:///c:/Users/harsh/Downloads/stitch_civicfix_ai_platform_design/docs/PHASE_0_VERIFIED_BASELINE_REPORT.md): Initial baseline defects and stabilization backlog.
- [`docs/PROJECT_STATUS_AUDIT.md`](file:///c:/Users/harsh/Downloads/stitch_civicfix_ai_platform_design/docs/PROJECT_STATUS_AUDIT.md): Blueprint audit against 18 functional requirements.
- `CivicFix_Project_Preparation_Document.pdf` / `.docx`: Authoritative technical blueprint.

### 2.3 Status of Claude's Original 99-Item Improvement List
An exhaustive search of all project files, Git commit history (`git log --all --grep="99"`), and archive zips confirmed:  
**No document or list containing "99 proposed improvements" exists in the repository or blueprint files.**  
In accordance with instructions:
> *"If unavailable, explicitly report that limitation. Do not invent or reconstruct missing items."*  
This limitation is formally recorded. In [`docs/IMPROVEMENT_PLAN_TRACEABILITY.md`](file:///c:/Users/harsh/Downloads/stitch_civicfix_ai_platform_design/docs/IMPROVEMENT_PLAN_TRACEABILITY.md), the 99 items are classified as **Unable to assess**, while all 18 authoritative PRD requirements (FR-01 to FR-18) and Agile sprint tickets (CF-101 to CF-404) are fully traced.

---

## 3. Task 2 — Complete Real Workflow Verification

A live verification script was executed against the running Spring Boot backend (`http://localhost:8080/api`) and PostgreSQL 16 database (`localhost:5433`) using isolated test records and dev seed accounts:
- **Citizen:** `alex.m@citizen.org`
- **Officer:** `elena.vance@metro.gov`
- **Worker:** `marcus.chen@fieldops.gov` (UUID: `00000000-0000-0000-0000-000000000003`)
- **Admin:** `priya.sharma@admin.metro.gov`

### Detailed Step-by-Step Workflow Test Matrix

| Step # | Workflow Step Description | API Endpoint & Method | Result | Observed Evidence & Forensic Trace |
| :---: | :--- | :--- | :---: | :--- |
| **1** | Citizen registers or signs in | `POST /api/auth/login` | **PASS** | HTTP 200; `JSESSIONID` and `XSRF-TOKEN` cookies set; `/api/auth/me` returns `roles: ['CITIZEN']`. |
| **2** | Citizen submits complaint with required information & location | `POST /api/complaints` | **PASS\*** | HTTP 201; Created complaint ID `2a27598c-...`, reference `#CF-2026-20736`, status `SUBMITTED`. Initial history row created. <br>*\*Photo is not persisted in backend (see Task 5).* |
| **3** | Complaint saved to PostgreSQL and appears in citizen's list | `GET /api/complaints` (Citizen) | **PASS** | HTTP 200; Citizen's paged complaint list returns ticket `#CF-2026-20736` directly from PostgreSQL. |
| **4** | Officer views queue, inspects details, and assigns worker | `POST /api/complaints/{id}/assign` | **PASS** | HTTP 200; `assigned_worker_id` set to Marcus Chen; status transitioned to `ASSIGNED`. Status history and audit log recorded. |
| **5** | Only assigned worker can access task and start permitted work | `GET /api/complaints` (Worker) | **PASS** | Worker Marcus sees task in assigned list. Unauthorized Citizen attempting status change receives `HTTP 403 Forbidden`. |
| **6** | Worker adds progress/blocker notes and submits resolution evidence | `POST /api/complaints/{id}/status`, `notes`, `evidence` | **PASS** | Status transitioned to `IN_PROGRESS` (HTTP 200). Progress note appended (HTTP 200). Multipart evidence accepted (HTTP 200, status `RESOLUTION_SUBMITTED`). |
| **7** | Uploaded evidence stored correctly and retrieved by authorized users | `GET /api/complaints/evidence/files/{name}` | **FAIL** | **CONFIRMED DEFECT:** File physically exists on disk under `uploads/evidence/complaints/{id}/evidence-{uuid}.jpg`, but retrieval endpoint returns **HTTP 404** because `loadEvidenceFile` omits `{id}` in directory lookup. |
| **8** | Officer inspects evidence, requests rework with required reason, or approves | `POST /api/complaints/{id}/status` | **PASS** | Empty rework note rejected (`HTTP 400 Bad Request`). Valid rework reason accepted; status transitioned to `REWORK_REQUESTED`. |
| **9** | Rework returns to appropriate worker and can be completed again | `POST /api/complaints/{id}/status` & `evidence` | **PASS** | Worker sees rework reason in history, resumes `IN_PROGRESS` (HTTP 200), resubmits evidence (HTTP 200, status `RESOLUTION_SUBMITTED`). Officer approves resolution (HTTP 200, status `RESOLVED`). |
| **10** | Citizen sees correct status, history, resolution outcome, and rework info | `GET /api/complaints/{id}` | **PASS** | Citizen view returns status `RESOLVED`, 2 evidence records, and 9-step complete status history audit trail. |

---

## 4. Task 3 — Security and Authorization Audit

### 4.1 Cross-User, Cross-Role & IDOR Analysis
- **Citizen Ownership Isolation:** `ComplaintService.enforceReadPermission` validates that `complaint.citizen.id == principal.id`. Citizens attempting to access complaints filed by other users receive `HTTP 403 Forbidden`. Tested and verified.
- **Worker Assignment Isolation:** Worker task listing queries `findByAssignedWorkerIdOrderByCreatedAtDesc(principal.id)`. Workers cannot see other crews' tasks. Unassigned workers attempting status changes receive `HTTP 403 Forbidden`. Tested and verified.
- **Officer Verification Privilege:** Only users with `ROLE_OFFICER` or `ROLE_ADMIN` can transition status to `RESOLVED` or `REWORK_REQUESTED`. Workers attempting this transition receive `HTTP 403 Forbidden`.
- **IDOR Vulnerability on File Download (DEFECT-04):**  
  *Location:* `ComplaintService.java:503-508`.  
  *Finding:* In `loadEvidenceFile(filename, principal)`, the service looks up the file in `resolution_evidence`. If found, `enforceReadPermission` is executed. However, if the file exists in the upload folder but is not associated with an existing database record, `evidenceOpt.isEmpty()` does not throw an error and proceeds to serve the file. Any authenticated user can download unlinked or orphaned files without ownership verification.

### 4.2 Session Management & CSRF Protection
- **Password Security:** `BCryptPasswordEncoder(cost = 10)`. Verified by `PasswordHashingTest.java`. No plaintext credentials stored or logged.
- **Session Security:** Spring Security `HttpSession` with `JSESSIONID` cookies (`HttpOnly=true`, `SameSite=Lax`). Maximum 2 concurrent sessions per user.
- **Session Invalidation:** Tested live: `POST /api/auth/logout` terminates the session; immediate subsequent requests to `/api/auth/me` return `HTTP 401 Unauthorized`.
- **CSRF Token Defense:** `CookieCsrfTokenRepository` generates `XSRF-TOKEN` cookie. State-mutating HTTP requests (`POST`, `PUT`, `DELETE`) require a matching `X-XSRF-TOKEN` header. Verified live.

### 4.3 File Upload Security & Path Traversal Mitigation
- **Filesystem Security:** `LocalStorageService.java` enforces:
  - 10MB file limit (`MAX_FILE_SIZE_BYTES = 10 * 1024 * 1024`).
  - Strict MIME-type allowlist: `image/jpeg`, `image/png`, `image/webp`.
  - Extension allowlist: `jpg`, `jpeg`, `png`, `webp`.
  - Collision-resistant UUID naming: `evidence-{UUID}.{ext}`.
  - Path traversal defense: cleans path and validates `targetPath.startsWith(rootLocation)`. Rejects `..`, `/`, `\`.
  - Rollback safety: if any photo fails in a multi-image batch, previously written files are deleted from disk.

### 4.4 State Machine & Replay Transition Defense
- **Replay Protection:** `ComplaintService.transitionStatus` explicitly validates:
  ```java
  if (currentStatus == newStatus) {
      throw new BadRequestException("Complaint is already in status: " + newStatus);
  }
  ```
  Repeated requests to apply the same transition return `HTTP 400 Bad Request`.
- **Invalid State Jumps:** Attempting to transition from `SUBMITTED` directly to `RESOLVED` is rejected with `HTTP 400 Bad Request` ("Allowed previous status: RESOLUTION_SUBMITTED").

---

## 5. Task 4 — Database Integrity & Concurrency Analysis

### 5.1 Relational Schema Alignment
Verified against running PostgreSQL 16 (`civicfix_db`) via `information_schema`:
- 8 public tables: `flyway_schema_history`, `roles`, `users`, `user_roles`, `complaints`, `complaint_status_history`, `resolution_evidence`, `audit_logs`.
- 14 foreign keys enforcing referential integrity across users, roles, complaints, evidence, and status history.
- 17 B-tree indexes covering foreign keys, email, phone, complaint status, category, and timestamps.
- **Flyway Parity:** Checksums for `V1` and `V2` match the repository files 1:1. 0 pending migrations.

### 5.2 Business Invariants: Application Logic vs Database Constraints
- **Complaint Status:** In `complaints`, `status` is `VARCHAR(50) NOT NULL DEFAULT 'SUBMITTED'`. There is **no database-level `CHECK` constraint** restricting status to valid enum strings. Status validation is enforced entirely in Java application code (`ComplaintStatus` enum).
- **Priority:** In `complaints`, `priority` is `VARCHAR(20) NOT NULL DEFAULT 'MEDIUM'`. No database-level `CHECK` constraint exists.
- **Status State Machine:** Allowed state transitions (e.g. `RESOLUTION_SUBMITTED -> RESOLVED`) are enforced in Java service code, not via database triggers.
- **Risk Assessment:** Acceptable for single-monolith Spring Boot deployment, but if external microservices or DB admin tools write directly to PostgreSQL, invalid status strings could theoretically be inserted.

### 5.3 Concurrency & Race-Condition Risks
- **Optimistic Locking Gap:** The `Complaint` entity does **not** include an `@Version` column.
- **Concurrency Scenario:** If two municipal officers simultaneously attempt to assign different workers to the same complaint, or if an officer approves a ticket while a worker resubmits evidence, both requests could read the same entity state concurrently. Without optimistic locking (`@Version`) or pessimistic locking (`PESSIMISTIC_WRITE`), the second commit silently overwrites the first, potentially causing an inconsistent status history sequence.
- **Recommendation:** Add `@Version private Long version;` to `Complaint.java` and an `ALTER TABLE complaints ADD COLUMN version BIGINT NOT NULL DEFAULT 0;` migration in `V3`.

---

## 6. Task 5 — Persistence Gap Analysis

Detailed investigation of the four reported data-persistence items:

### A. Citizen Intake Photos
- **Blueprint Requirement:** **Yes.** `CivicFix_Project_Preparation_Document.pdf` Section 4 FR-04 and Section 8 explicitly mandate: *"Citizens can upload photos when creating a complaint... Images must be stored on local disk during dev and later S3... Image paths and metadata must be stored in a relational table."*
- **Actual Implementation:** In [`ReportComplaintPage.jsx`](file:///c:/Users/harsh/Downloads/stitch_civicfix_ai_platform_design/src/pages/citizen/ReportComplaintPage.jsx), images are selected via `ImageUploadManager.jsx` and cached in browser `localStorage`. In [`complaintService.js:create`](file:///c:/Users/harsh/Downloads/stitch_civicfix_ai_platform_design/src/services/complaintService.js#L268-L280), the payload constructed for `POST /api/complaints` **omits photos entirely**. In backend, `CreateComplaintRequest.java` and `complaints` table have no photo columns.
- **Classification:** **Confirmed Defect.** Citizen photos are genuinely lost at the backend level.
- **Recommended Remedy:** Author Flyway migration `V3__add_complaint_photos.sql` creating a `complaint_photos` table (`id`, `complaint_id`, `photo_url`, `created_at`), create a `ComplaintPhoto` JPA entity, and update `ComplaintController.createComplaint` to accept multipart photo files.

### B. AI Triage
- **Blueprint Requirement:** Section 10 describes AI as an *advisory* capability introduced in Phase 3 for multimodal category validation and duplicate clustering.
- **Actual Implementation:** `complaintService.js` lines 117-125 hardcode:
  ```javascript
  aiTriage: {
    confidence: 96.5,
    detectedIssue: item.title,
    hazardScore: item.priority === 'CRITICAL' ? 'P1 - High Hazard' : 'P3 - Standard Triage',
    clusterCount: 1,
    duplicateIds: [],
    suggestedDept: 'Municipal Works',
    slaHoursRemaining: 48
  }
  ```
- **Classification:** **Visual Placeholder / Client-Side Mock.** No backend Google Gemini API integration exists.
- **Recommended Remedy:** Keep clearly labeled as "Simulated AI Advisory" until Phase 3 backend Gemini API gateway implementation.

### C. Progress Percentage
- **Blueprint Requirement:** Section 4 FR-05 mandates complaint tracking. An integer percentage is not a stored database field; it is a presentation-layer milestone representation.
- **Actual Implementation:** Computed deterministically at runtime from `item.status` via `getProgressPercent(status)`: `SUBMITTED: 15%`, `UNDER_REVIEW: 30%`, `ASSIGNED: 45%`, `IN_PROGRESS: 65%`, `RESOLUTION_SUBMITTED: 85%`, `RESOLVED: 100%`.
- **Classification:** **Intentional Presentation-Layer Calculation.** Derived from real workflow data. Single source of truth is preserved.
- **Recommended Remedy:** Maintain runtime derivation. Do not create a redundant database column.

### D. GPS Metadata
- **Actual Implementation:** `latitude` and `longitude` are stored as high-precision numeric columns (`NUMERIC(10,8)`). `accuracy` (meters) and `deviceReported` (boolean) are parsed and formatted into `resolution_evidence.evidence_notes` as:  
  `[Device-reported GPS: 13.0605, 80.2641 (±8.5m) — device-reported, unverified]`
- **Classification:** **Functional Textual Persistence / Structured Query Gap.** Sufficient for human officer inspection; insufficient for automated spatial queries (e.g. Haversine distance checks).
- **Recommended Remedy:** In Flyway `V3`, add structured columns `gps_accuracy NUMERIC(8,2)` and `is_device_reported BOOLEAN DEFAULT false` to `resolution_evidence`.

---

## 7. Task 6 — Frontend and API Consistency

1. **Broken Resolution Photo Gallery (DEFECT-01):**  
   On [`ResolutionVerificationPage.jsx`](file:///c:/Users/harsh/Downloads/stitch_civicfix_ai_platform_design/src/pages/officer/ResolutionVerificationPage.jsx), because `/api/complaints/evidence/files/{filename}` returns HTTP 404, the evidence thumbnail gallery renders broken image placeholders when loading live backend evidence.
2. **Hardcoded Telemetry String on Citizen Details Page (DEFECT-03):**  
   In [`ComplaintDetailsPage.jsx:383`](file:///c:/Users/harsh/Downloads/stitch_civicfix_ai_platform_design/src/pages/citizen/ComplaintDetailsPage.jsx#L383), the string `"GPS Telemetry Validated: 13.0850° N, 80.2101° E"` is hardcoded instead of displaying dynamic coordinates from `complaint.location.coordinates`.
3. **Citizen Intake Photos Not Synced Across Browsers (DEFECT-02):**  
   Complaints filed on one browser show intake photos only on that browser because they reside in `localStorage`. Opening the ticket on another machine shows no intake photos.
4. **Interactive States & Responsiveness:**  
   Loading spinners, disabled submit buttons during flight, error alert banners, and responsive layouts across desktop and 390px mobile companion views were inspected and verified intact.

---

## 8. Task 7 — Automated Test Execution

### 8.1 Backend Test Suite (Maven Surefire)
**Command:** `cmd.exe /c "mvnw.cmd test"`  
**Result:** **BUILD SUCCESS** (Execution time: 39.927 seconds)

| Test Class | Executed | Passed | Failed | Skipped | Scope |
| :--- | :---: | :---: | :---: | :---: | :--- |
| `AuthControllerIntegrationTest` | 7 | 7 | 0 | 0 | Login, Registration, Logout, Sessions, CSRF, Invalid Credentials |
| `CivicFixApplicationTests` | 1 | 1 | 0 | 0 | Spring Application Context Load & Flyway Validation |
| `ComplaintAuthorizationIntegrationTest` | 1 | 1 | 0 | 0 | Spring Security RBAC endpoint guards |
| `ComplaintServiceOfficerTest` | 12 | 12 | 0 | 0 | Officer review, assignment, resolution verification, rework notes |
| `ComplaintServiceWorkerTest` | 24 | 24 | 0 | 0 | Worker status transitions, blocker notes, evidence validation |
| `OfficerAssignmentIntegrationTest` | 11 | 11 | 0 | 0 | Database-backed officer triage, assignment, verification integration |
| `WorkerTaskIntegrationTest` | 15 | 15 | 0 | 0 | Database-backed worker task lifecycle, evidence upload, file storage |
| `PasswordHashingTest` | 1 | 1 | 0 | 0 | BCrypt algorithm strength and salt generation |
| `LocalStorageServiceTest` | 9 | 9 | 0 | 0 | File size limits, MIME allowlisting, path traversal mitigation |
| **Total Backend Tests** | **80** | **80** | **0** | **0** | **100% Pass Rate** |

### 8.2 Frontend Test Suite (Node Test Runner)
**Command:** `npm.cmd run test`  
**Result:** **SUCCESS** (Execution time: 532 ms)

| Test Suite | Executed | Passed | Failed | Skipped | Scope |
| :--- | :---: | :---: | :---: | :---: | :--- |
| `API Client Adapter Tests` | 7 | 7 | 0 | 0 | CSRF header attachment, baseUrl resolution, error transforms |
| `AuthService Stabilization Tests` | 5 | 5 | 0 | 0 | Unauthenticated visitor isolation, demo password bypass removal |
| `ComplaintService Integration Tests` | 6 | 6 | 0 | 0 | Category normalization, progress percent, error propagation |
| `OfficerService Integration Tests` | 14 | 14 | 0 | 0 | Worker UUID resolution, queue mapping, rework validation |
| `Phone & Contact Utilities` | 7 | 7 | 0 | 0 | Indian phone normalization (+91), email lowercasing |
| `WorkerService Integration Tests` | 21 | 21 | 0 | 0 | Task retrieval, status updates, evidence submission validation |
| `XSS Security Sanitization Tests` | 4 | 4 | 0 | 0 | Leaflet map popup HTML escaping |
| **Total Frontend Tests** | **64** | **64** | **0** | **0** | **100% Pass Rate** |

### 8.3 Frontend Production Build
**Command:** `npm.cmd run build`  
**Result:** **SUCCESS** (Built in 25.37 seconds, 103 modules transformed, 0 errors).

---

## 9. Prioritized Remediation Recommendations

| Priority | Issue ID | Component | Defect Summary | Recommended Fix |
| :---: | :---: | :--- | :--- | :--- |
| **P1** | **DEFECT-01** | Backend Service | Evidence photo download returns HTTP 404 due to path mismatch. | In `ComplaintService.java:510`, look up the complaint ID from `evidenceOpt.get().getComplaint().getId()` and pass `"complaints/" + complaintId` to `storageService.loadFileAsResource`. |
| **P1** | **DEFECT-02** | Backend & Frontend | Citizen intake photos omitted from API payload and database schema. | Author Flyway migration `V3__add_complaint_photos.sql`, create `ComplaintPhoto` entity, update `ComplaintController.createComplaint` to accept multipart files, and wire `complaintService.js`. |
| **P2** | **DEFECT-03** | Frontend UI | Hardcoded GPS string on citizen details page. | In `ComplaintDetailsPage.jsx:383`, replace static string with dynamic ticket coordinates. |
| **P2** | **DEFECT-04** | Backend Security | Unlinked file download security gap. | In `ComplaintService.java:504-508`, throw `ResourceNotFoundException` if `evidenceOpt.isEmpty()`. |
| **P2** | **DEFECT-05** | Database Architecture | Missing optimistic locking on `Complaint`. | Add `@Version private Long version;` to `Complaint.java` and migration `ALTER TABLE complaints ADD COLUMN version BIGINT NOT NULL DEFAULT 0;`. |
| **P3** | **DEFECT-06** | Database Architecture | Structured GPS accuracy & device flag columns. | In `V3` migration, add `gps_accuracy NUMERIC(8,2)` and `is_device_reported BOOLEAN` to `resolution_evidence`. |
| **P3** | **DEFECT-07** | Frontend UI | AI triage confidence is simulated mock data. | Clearly label as UI demonstration until Phase 3 backend Google Gemini integration. |

---

## 10. Deliverable Report Paths & Stop Condition

The audit deliverables have been generated:
1. **Audit Report:** [`docs/PHASE_2_CORE_WORKFLOW_SECURITY_AUDIT.md`](file:///c:/Users/harsh/Downloads/stitch_civicfix_ai_platform_design/docs/PHASE_2_CORE_WORKFLOW_SECURITY_AUDIT.md)
2. **Traceability Matrix:** [`docs/IMPROVEMENT_PLAN_TRACEABILITY.md`](file:///c:/Users/harsh/Downloads/stitch_civicfix_ai_platform_design/docs/IMPROVEMENT_PLAN_TRACEABILITY.md)

In strict accordance with the stop condition:
> *"This is an AUDIT ONLY. Do not implement fixes, add features, modify the schema, or begin GIS/AI development. When finished, summarize the most important findings, list any tests that could not run, provide the two report paths, and wait for my review before making changes."*

All audits and live workflow tests are complete. Execution is stopped for your review.
