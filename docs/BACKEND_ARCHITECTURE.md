# CivicFix AI — Backend & Production Architecture Specification

> **Target Stack**: Java 21 + Spring Boot 3.3.x + Spring Security 6 + Spring Data JPA + MySQL 8.0 + Bucket4j

---

## 1. Architectural Boundary & Data Flow

```
┌──────────────────────────────────────┐
│  CivicFix AI React + Vite Frontend   │
│  (Leaflet + Camera API + HTML5 GPS)  │
└──────────────────┬───────────────────┘
                   │ HTTPS JSON / Multipart Form-Data
                   ▼
┌────────────────────────────────────────────────────────┐
│             Spring Boot API Gateway Layer              │
│  - Spring Security (JWT / Statefull Session Cookies)   │
│  - Bucket4j Token Bucket Rate Limiting Filter          │
│  - Input Validation (@Valid / JSR-380)                 │
└──────────┬───────────────────────────────┬─────────────┘
           │                               │
           ▼                               ▼
┌──────────────────────┐       ┌──────────────────────┐
│ Business Core        │       │ External Integrations│
│ Services & Workflows │       │ - Google Gemini API  │
│ - ComplaintService   │       │ - SMS / OTP Gateway  │
│ - TriageService      │       │ - OpenStreetMap GIS  │
│ - VerificationService│       └──────────────────────┘
└──────────┬───────────┘
           │
           ▼
┌──────────────────────────────────────┐
│ MySQL 8.0 Relational Storage         │
│ - complaints (InnoDB, spatial index) │
│ - users, roles, authorities          │
│ - audit_logs (immutable ledger)      │
│ - photo_metadata (S3 / disk pointers)│
└──────────────────────────────────────┘
```

---

## 2. Service Interfaces Contract

### 2.1 Authentication & Registration (`/api/v1/auth`)
- `POST /api/v1/auth/login`: Validates credentials (`email`/`phone` + `password`). Issues HTTP-only session cookie or JWT.
- `POST /api/v1/auth/register-citizen`: Creates citizen profile in `UNVERIFIED` status. Generates secure 6-digit cryptographic OTP.
- `POST /api/v1/auth/verify-otp`: Validates single-use OTP against hash, checks expiry (5 min), transitions contact to `VERIFIED`.
- `POST /api/v1/auth/resend-otp`: Enforces 60-second cooldown and hourly contact throttles.

### 2.2 Complaint Management (`/api/v1/complaints`)
- `POST /api/v1/complaints`: Multipart request with JSON metadata (`title`, `category`, `description`, `lat`, `lng`, `address`) and optional binary `MultipartFile[]`.
- `GET /api/v1/complaints`: Paginated list supporting filters (`status`, `priority`, `categoryId`, `ward`).
- `GET /api/v1/complaints/{id}`: Full defect details, timeline, and photo URLs.
- `PUT /api/v1/complaints/{id}/assign`: Officer dispatches field crew lead (`status -> ASSIGNED`).
- `PUT /api/v1/complaints/{id}/progress`: Field worker records progress notes or blockers (`status -> IN_PROGRESS`).
- `POST /api/v1/complaints/{id}/evidence`: Field worker submits completion photos (`status -> RESOLUTION_SUBMITTED`).
- `PUT /api/v1/complaints/{id}/verify`: Authorized officer signoff (`status -> RESOLVED` or `REWORK_REQUESTED`).

---

## 3. Photograph Storage Architecture

- **No binary BLOBs in MySQL**: Raw image binaries are stored in S3-compatible object storage or local filesystem with hashed paths (`/uploads/{year}/{month}/{uuid}.webp`).
- **MySQL `complaint_photos` Table**:
  ```sql
  CREATE TABLE complaint_photos (
    id VARCHAR(36) PRIMARY KEY,
    complaint_id VARCHAR(36) NOT NULL,
    storage_path VARCHAR(255) NOT NULL,
    mime_type VARCHAR(50) NOT NULL,
    file_size_bytes BIGINT NOT NULL,
    photo_type ENUM('INITIAL_REPORT', 'RESOLUTION_EVIDENCE') NOT NULL,
    uploaded_by VARCHAR(36) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (complaint_id) REFERENCES complaints(id) ON DELETE CASCADE
  );
  ```

---

## 4. Rate Limiting & Abuse Prevention Plan (Bucket4j)

All endpoints enforce server-side rate limits using a **Token Bucket** algorithm (via Bucket4j + Redis or in-memory cache):

| Endpoint / Operation | Bucket Capacity | Refill Rate | Throttling Key | Exceeded Response |
|---|---|---|---|---|
| `POST /api/v1/auth/login` | 5 attempts | 1 token / 10 min | IP + Normalized Username | HTTP 429 Too Many Requests |
| `POST /api/v1/auth/register-citizen` | 3 requests | 1 token / hour | IP + Contact Identifier | HTTP 429 Too Many Requests |
| `POST /api/v1/auth/verify-otp` | 5 attempts | Lock for 15 min | Contact Identifier | HTTP 429 Account Locked |
| `POST /api/v1/complaints` | 10 complaints | 2 tokens / hour | Authenticated Citizen ID + IP | HTTP 429 Rate Limit Exceeded |
| `POST /api/v1/complaints/{id}/evidence` | 6 uploads | 5 tokens / hour | Worker ID | HTTP 429 Rate Limit Exceeded |
| Geocoding / Search Proxy | 30 requests | 10 tokens / min | Session ID / IP | HTTP 429 Service Throttled |

### HTTP 429 Standard Error Payload
```json
{
  "status": 429,
  "error": "Too Many Requests",
  "message": "Rate limit exceeded. Please wait 180 seconds before attempting again.",
  "retryAfterSeconds": 180,
  "timestamp": "2026-10-13T15:20:00Z"
}
```

---

## 5. Security & RBAC Enforcement

- **Spring Security Method Security**: `@PreAuthorize("hasRole('OFFICER')")` on verification signoff and dispatch endpoints.
- **Strict Role Boundary**: Public users cannot self-assign `OFFICER`, `WORKER`, or `ADMIN` roles. Staff accounts remain in `PENDING_APPROVAL` until an administrator approves them.
- **Workflow State Machine**: Java backend validates allowable status transitions:
  - `SUBMITTED -> UNDER_REVIEW -> ASSIGNED -> IN_PROGRESS -> RESOLUTION_SUBMITTED -> RESOLVED`.
  - Field workers attempting to transition directly to `RESOLVED` will receive `403 Forbidden`.
