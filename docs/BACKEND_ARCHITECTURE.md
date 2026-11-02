# CivicFix — Backend & Production Architecture Specification

> **Implemented Stack**: Java 21 + Spring Boot 3.3.x + Spring Security 6 + Spring Data JPA + PostgreSQL 16 (PostGIS) + Flyway + Bucket4j

---

## 1. Architectural Boundary & Data Flow

```
┌────────────────────────────────────────────────────────┐
│         CivicFix React 18 + Vite Frontend              │
│    (Leaflet GIS + Camera Uploads + Local Fonts PWA)    │
└───────────────────────────┬────────────────────────────┘
                            │ HTTPS JSON / Multipart Form-Data
                            ▼
┌────────────────────────────────────────────────────────┐
│             Spring Boot API Gateway Layer              │
│  - Spring Security (HTTP-Only Session Cookie)          │
│  - XSRF-TOKEN Cookie + X-XSRF-TOKEN Header             │
│  - Bucket4j Token Bucket Rate Limiting Interceptor     │
│  - ClientIpResolver (Trusted-Proxy-Aware X-Forwarded)  │
│  - Input Validation (@Valid / JSR-380 Constraints)     │
└──────────┬───────────────────────────────┬─────────────┘
           │                               │
           ▼                               ▼
┌──────────────────────────┐   ┌─────────────────────────┐
│ Business Core Services   │   │ External Integrations   │
│ - ComplaintService       │   │ - OpenStreetMap Leaflet │
│ - DeterministicTriage    │   │                         │
│ - DuplicateDetection     │   └─────────────────────────┘
│ - SlaEscalationService   │
│ - OfficerAnalyticsService│
│ - SupervisorService      │
│ - AdminService           │
│ - LocalStorageService    │
└──────────┬───────────────┘
           │
           ├───────────────────────────────┐
           ▼                               ▼
┌────────────────────────────────┐ ┌─────────────────────────────┐
│ PostgreSQL 16 + PostGIS        │ │ Server Local Filesystem     │
│ - complaints (spatial index)   │ │ - uploads/complaints/       │
│ - complaint_photos             │ │ - uploads/evidence/         │
│ - resolution_evidence          │ │ - EXIF & GPS stripped on    │
│ - status_history & audit_logs  │ │   ImageIO decode/re-encode  │
│ - users, roles, user_roles     │ └─────────────────────────────┘
│ - sla_policies & notifications │
└────────────────────────────────┘
```

---

## 2. Service Interfaces Contract

### 2.1 Authentication & Session (`/api/auth`)
- `POST /api/auth/login`: Authenticates with identifier (email or phone) and password. Issues secure `CIVICFIX_SESSION` HTTP-only session cookie. Protected by dual rate limit (identifier + IP and global account lockout).
- `POST /api/auth/register`: One-step citizen onboarding with server-side validation and BCrypt password hashing (cost factor 10). Direct registration against PostgreSQL without client-side simulated OTP.
- `POST /api/auth/logout`: Invalidates session and clears `CIVICFIX_SESSION` cookie.
- `GET /api/auth/me`: Returns sanitized authenticated session user profile and granted authorities.

### 2.2 Complaint Management (`/api/complaints`)
- `POST /api/complaints`: Multipart request with defect metadata (`title`, `category`, `description`, `lat`, `lng`, `address`, `ward`) and binary images. Performs automated deterministic triage and Haversine duplicate detection.
- `GET /api/complaints`: Paginated citizen or staff complaint list with role-based isolation (citizens view only their own records; staff view jurisdictional records).
- `GET /api/complaints/{id}`: Detailed defect record with status timeline and photo URLs.
- `GET /api/complaints/{id}/history`: Immutable chronological status history trail.
- `POST /api/complaints/{id}/assign`: Officer dispatches field crew lead (`status -> ASSIGNED`).
- `POST /api/complaints/{id}/status`: Transitions status (`ASSIGNED -> IN_PROGRESS` by worker; notes or operational updates).
- `POST /api/complaints/{id}/notes`: Appends operational progress notes without state change.
- `POST /api/complaints/{id}/evidence`: Field worker submits completion photos, repair notes, and device GPS telemetry. Server validates distance against defect coordinates within 100 meters (`status -> RESOLUTION_SUBMITTED`).
- `POST /api/complaints/{id}/confirm-resolution`: Citizen confirms resolution (`status -> RESOLVED`).
- `POST /api/complaints/{id}/reject-resolution`: Citizen rejects resolution with mandatory reason and optional photographic proof (`status -> REOPENED`).
- `GET /api/complaints/public/map`: Privacy-preserving public feed with coordinates fuzzed/rounded to 3 decimal places (~110m) and personal data excluded.
- `GET /api/complaints/public/trust`: Public aggregate closure trust score per municipal ward.

### 2.3 Supervisor & SLA Escalations (`/api/supervisor`)
- `GET /api/supervisor/escalations`: Paged view of tickets approaching or exceeding SLA thresholds.
- `POST /api/supervisor/complaints/{id}/reassign`: Reassigns overdue complaints across field workers.
- `GET /api/supervisor/workers`: Directory of municipal field crew specialists.

### 2.4 Officer Analytics (`/api/officer/analytics`)
- `GET /api/officer/analytics/summary`: Aggregate counts, SLA compliance ratios, and throughput telemetry.
- `GET /api/officer/analytics/trust`: Closure trust scores per ward and per officer.

### 2.5 Administration (`/api/admin`)
- `GET /api/admin/users`: Directory of platform accounts with role and status filtering.
- `POST /api/admin/users`: Provisions verified staff accounts (`OFFICER`, `WORKER`).
- `PATCH /api/admin/users/{id}/status`: Activates or suspends user accounts.
- `GET /api/admin/audit-logs`: Paged, immutable system audit trail with RFC 4180 CSV export capability.
- `GET /api/admin/dashboard/summary`: Live database metrics and role distribution.
- `GET /api/admin/sla-policies`: Reads live resolution windows from `sla_policies` table.
- `GET /api/admin/demo/status`: Queries whether the server is operating under the `dev` profile.
- `POST /api/admin/demo/reset`: Reseeds deterministic 40-ticket Chennai dataset (active under `dev` profile only).

---

## 3. Photograph Storage & Media Privacy Architecture

- **Server Filesystem Storage**: Uploaded files are persisted in local directories (`uploads/complaints/` and `uploads/evidence/`) with unguessable UUID-prefixed filenames.
- **PostgreSQL Tracking**: Relative storage paths, MIME types, and timestamps are tracked in `complaint_photos` and `resolution_evidence` tables.
- **EXIF Metadata Stripping**: Uploaded JPEG and PNG images undergo server-side decoding and re-encoding (`javax.imageio.ImageIO`), stripping all embedded EXIF camera metadata, device identifiers, and GPS coordinates prior to disk persistence.
- **Integrity Validation**: Magic byte inspection verifies genuine image headers (JPEG `FF D8 FF`, PNG `89 50 4E 47`, WebP `RIFF....WEBP`), and maximum pixel dimension guards prevent decompression bomb attacks.

---

## 4. Rate Limiting & Abuse Prevention (Bucket4j)

All sensitive endpoints enforce server-side rate limits using the **Token Bucket** algorithm (Bucket4j):

| Endpoint / Operation | Bucket Capacity | Refill Duration | Throttling Key | Response on Limit |
|---|---|---|---|---|
| `POST /api/auth/login` (Standard) | 5 attempts | 15 minutes | Client IP + Identifier | HTTP 429 Too Many Requests |
| `POST /api/auth/login` (Account Lockout) | 20 attempts | 1 hour | Account Identifier | HTTP 429 Account Temporarily Locked |
| `POST /api/auth/register` | 10 requests | 1 hour | Client IP | HTTP 429 Too Many Requests |
| `POST /api/complaints` | 10 complaints | 1 minute | Client IP | HTTP 429 Rate Limit Exceeded |
| `/evidence` Uploads | 10 uploads | 1 minute | Client IP | HTTP 429 Rate Limit Exceeded |
| Reverse-Geocode Proxy | 30 requests | 1 minute | Client IP | HTTP 429 Service Throttled |

- **Trusted Proxy Resolution**: Controlled via `civicfix.security.trusted-proxy-enabled`. When `true`, `ClientIpResolver` reads the client IP from the last entry of `X-Forwarded-For`; when `false`, `request.getRemoteAddr()` is strictly used.

---

## 5. Security & RBAC Enforcement

- **Spring Security Method Security**: `@PreAuthorize("hasRole('ADMIN')")`, `@PreAuthorize("hasRole('OFFICER')")`, and `@PreAuthorize("hasAnyRole('OFFICER','SUPERVISOR','ADMIN')")` enforce least-privilege boundaries at the service and controller layers.
- **Stateful Session Isolation**: Spring Security manages sessions with HTTP-only cookies (`CIVICFIX_SESSION`).
- **CSRF Defense**: Cookie-based CSRF protection with `XSRF-TOKEN` cookie validated against incoming `X-XSRF-TOKEN` headers.
- **Workflow State Machine**: Strictly validated transitions:
  - `SUBMITTED -> UNDER_REVIEW -> ASSIGNED -> IN_PROGRESS -> RESOLUTION_SUBMITTED -> PENDING_CITIZEN_CONFIRMATION -> RESOLVED`.
  - Reopen flow: `PENDING_CITIZEN_CONFIRMATION -> REOPENED` (or auto-confirm transition to `RESOLVED` after configurable window).

---

## 6. Optional Multimodal Vision Triage Architecture

CivicFix features an optional, pluggable multimodal vision provider layer behind the existing deterministic triage engine:

```
                  ┌──────────────────────────────────────────────┐
                  │          Complaint Creation Flow             │
                  └──────────────────────┬───────────────────────┘
                                         │
                                         ▼
                  ┌──────────────────────────────────────────────┐
                  │    DeterministicTriageEngine (Rules Engine)   │
                  │  (Immediate synchronous triage - unchanged)   │
                  └──────────────────────┬───────────────────────┘
                                         │
                                         ▼
                  ┌──────────────────────────────────────────────┐
                  │       PostgreSQL Transaction Commit          │
                  └──────────────────────┬───────────────────────┘
                                         │
                                         ▼ AFTER_COMMIT Event
                  ┌──────────────────────────────────────────────┐
                  │       VisionTriageEventListener (Async)      │
                  │  (Checks: AI_VISION_ENABLED && visionConsent)│
                  └──────────────────────┬───────────────────────┘
                                         │
                     ┌───────────────────┴───────────────────┐
                     ▼                                       ▼
        [Consent False / Flag Off]               [Consent True && Enabled]
                     │                                       │
                     ▼                                       ▼
             Status: NOT_RUN                    VisionTriageAsyncService
                                                             │
                                        ┌────────────────────┼────────────────────┐
                                        ▼                    ▼                    ▼
                                [No Photo / WebP /      [Daily Cap Hit /     [Eligible JPEG/PNG
                                  Photo > 4 MB]         User Limit Hit]           <= 4 MB]
                                        │                    │                    │
                                        ▼                    ▼                    ▼
                                 Status: SKIPPED      Status: SKIPPED      Atomic Claim (RUNNING)
                                                                                  │
                                                             ┌────────────────────┴────────────────────┐
                                                             ▼                                         ▼
                                                   [GeminiVisionProvider]                     [XaiVisionProvider]
                                                   (Google Gemini v1beta)                     (xAI Grok v1/chat)
                                                             │                                         │
                                                             └────────────────────┬────────────────────┘
                                                                                  │
                                                                                  ▼
                                                                     Targeted Column Update
                                                                     (Status: OK / FAILED)
```

### 6.1 Provider Abstraction & Providers
- **`TriageProvider`**: Common root interface implemented by `DeterministicTriageEngine` and `VisionTriageProvider`.
- **Supported Multimodal Providers**:
  1. **Google Gemini** (`GeminiVisionTriageProvider`): Calls official Google AI Studio `v1beta/models/{model}:generateContent` with inline base64 image payload.
  2. **xAI Grok** (`XaiVisionTriageProvider`): Calls official xAI OpenAI-compatible `/v1/chat/completions` endpoint with `image_url` base64 payload.
- **Provider Selection**: Controlled strictly by `AI_VISION_PROVIDER` (`gemini` or `xai`, default `gemini`). No automatic cross-provider fallback.

### 6.2 Environment & Configuration Properties
All settings are driven by environment variables with safe defaults:
- `AI_VISION_ENABLED`: Boolean toggle (default `false`). When `false`, the rule engine runs as default and vision triage is completely bypassed (`NOT_RUN`).
- `AI_VISION_PROVIDER`: Selected provider (`gemini` or `xai`, default `gemini`).
- `GOOGLE_AI_API_KEY`: API key for Google Gemini (must be kept secret; never logged).
- `XAI_API_KEY`: API key for xAI Grok (must be kept secret; never logged).
- `AI_VISION_MODEL_GEMINI`: Gemini model identifier (default: `gemini-1.5-flash`).
- `AI_VISION_MODEL_XAI`: xAI model identifier (default: `grok-2-vision-1212`).
- `AI_VISION_TIMEOUT_MS`: HTTPS request timeout in milliseconds (default: `10000`).
- `AI_VISION_DAILY_CAP`: Global daily quota limit counted across all complaints (default: `200`).

### 6.3 Citizen Consent & Image Transmission Guards
- **Consent Gate**: Intake requires `vision_consent = true` (column added in `V12__add_vision_triage_and_consent.sql`). If `false`, vision triage is bypassed.
- **Eligible Images**: Only the first intake photograph is sent, and only if it is re-encoded, EXIF-stripped JPEG or PNG with file size $\le 4\text{ MB}$.
- **WebP Protection**: WebP images are skipped with `vision_status = 'SKIPPED'` because `LocalStorageService` does not re-encode WebP, preserving potential EXIF/GPS tags.
- **PII Stripping**: Never transmits citizen names, contact details, phone numbers, exact coordinates, street address, or ward name to external models.

### 6.4 Non-Blocking Async Execution & Optimistic Locking Defense
- **AFTER_COMMIT Event**: The vision call executes only *after* the initial complaint creation transaction commits to PostgreSQL.
- **Targeted UPDATE Only**: `VisionTriageAsyncService` executes a targeted SQL UPDATE modifying only `vision_*` columns, `disagreement`, `final_priority_source`, and (if elevated) `ai_recommended_priority`. It never invokes `complaintRepository.save()`, ensuring the `@Version` optimistic locking counter is **not bumped**. Officer reviews and field assignments are never blocked or invalidated by background vision calls.
- **Atomic Claim Pattern**: Status progresses `NOT_RUN -> RUNNING -> OK / FAILED / SKIPPED`. The worker atomically claims the row via `UPDATE complaints SET vision_status = 'RUNNING' WHERE id = :id AND vision_status = 'NOT_RUN'`.
- **Stuck Row Auto-Repair**: `VisionTriageCleanupScheduler` runs on startup and every 5 minutes, transitioning any rows stuck in `RUNNING` for $> 5\text{ minutes}$ to `FAILED`.

### 6.5 Disagreement & Priority Elevation Mapping
- **Category Disagreement**: If `vision_category` disagrees with `ai_detected_category` (and vision category is not `UNKNOWN`), the system sets `disagreement = true`, surfacing both classifications to the triaging municipal officer.
- **Deterministic Priority Elevation**:
  - The rule engine's priority suggestion is **never lowered** by the vision model.
  - If the vision model reports critical public hazard severity (`severity == 5`), the suggested priority is raised by at most **one tier**:
    - `LOW` $\rightarrow$ `MEDIUM`
    - `MEDIUM` $\rightarrow$ `HIGH`
    - `HIGH` $\rightarrow$ `CRITICAL`
    - `CRITICAL` $\rightarrow$ `CRITICAL`
  - If elevated, `final_priority_source` is recorded as `'VISION_SEVERITY_5'`; otherwise, it remains `'RULE_ENGINE'`.

### 6.6 Abuse Prevention & Global Quota Caps
- **Database-Backed Daily Cap**: The global cap (`AI_VISION_DAILY_CAP: 200`) is calculated via `COUNT` in PostgreSQL for rows where `vision_at >= today` and status in `('OK', 'FAILED')`. Server restarts do not reset this cap.
- **Per-User Rate Limit**: Rate-limited via Bucket4j in `RateLimiterService` using key `ai_vision:user:<userId>` (10 requests / minute). If either cap is reached, the status is set to `SKIPPED`.
