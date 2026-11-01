# CivicFix AI — Backend & Production Architecture Specification

> **Implemented Stack**: Java 21 + Spring Boot 3.3.x + Spring Security 6 + Spring Data JPA + PostgreSQL 16 (PostGIS) + Flyway + Bucket4j

---

## 1. Architectural Boundary & Data Flow

```
┌────────────────────────────────────────────────────────┐
│         CivicFix AI React 18 + Vite Frontend           │
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
│ - ComplaintService       │   │ - Google Gemini AI API  │
│ - DeterministicTriage    │   │ - OpenStreetMap Leaflet │
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
- `POST /api/complaints`: Multipart request with defect metadata (`title`, `category`, `description`, `lat`, `lng`, `address`, `ward`) and binary images. Performs automated deterministic + Gemini AI triage and Haversine duplicate detection.
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
