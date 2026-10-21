# CivicFix AI — Backend Security Architecture

This document specifies the security model, authentication flows, authorization controls, session management, and audit mechanisms implemented in CivicFix AI Sprint 2.

---

## 1. Threat Model & Principles

1. **Zero Client Trust:** The backend never trusts client-supplied roles, claims, or user IDs. All authorization is derived solely from the server-managed session (`SecurityContextHolder`).
2. **No Plaintext Passwords:** Passwords are hashed using BCrypt (cost factor 10) with secure per-user cryptographic salts before persistence.
3. **No Backdoors or Master Passwords:** Universal credentials or authentication bypasses are strictly prohibited.
4. **Least Privilege:** Registration is restricted to `ROLE_CITIZEN`. Administrative and municipal roles (`OFFICER`, `WORKER`, `ADMIN`) can only be assigned through authorized administrative processes.
5. **Session Isolation:** Authenticated sessions use secure HTTP cookies with CSRF defense.

---

## 2. Authentication Mechanism

- **Provider:** Spring Security `DaoAuthenticationProvider` backed by `CustomUserDetailsService`.
- **Credential Storage:** `users.password_hash` column stores BCrypt-encoded strings (`$2a$10$...`).
- **Session Cookie:**
  - Name: `CIVICFIX_SESSION`
  - Attributes: `HttpOnly`, `Path=/`, `SameSite=Lax`
  - Inactive Invalidation: 1800 seconds (30 minutes)
  - Management: Server-side `HttpSessionSecurityContextRepository`

### Password Requirements
- Minimum length: 8 characters
- Validated via `@Size(min = 8)` and `@NotBlank` on registration payloads.

---

## 3. Role-Based Access Control (RBAC) Matrix

| Endpoint | Method | CITIZEN | OFFICER | WORKER | ADMIN | Anonymous |
| :--- | :---: | :---: | :---: | :---: | :---: | :---: |
| `/api/health` | GET | Allowed | Allowed | Allowed | Allowed | Allowed |
| `/api/auth/register` | POST | N/A | N/A | N/A | N/A | Allowed |
| `/api/auth/login` | POST | N/A | N/A | N/A | N/A | Allowed |
| `/api/auth/logout` | POST | Allowed | Allowed | Allowed | Allowed | 401 |
| `/api/auth/me` | GET | Allowed | Allowed | Allowed | Allowed | 401 |
| `/api/complaints` | POST | Allowed | Forbidden | Forbidden | Forbidden | 401 |
| `/api/complaints` | GET | Own only | All (Dept) | Assigned only | All | 401 |
| `/api/complaints/{id}` | GET | Own only | Allowed | Assigned only | Allowed | 401 |
| `/api/complaints/{id}/history` | GET | Own only | Allowed | Assigned only | Allowed | 401 |
| `/api/complaints/{id}/assign` | POST | Forbidden | Allowed | Forbidden | Allowed | 401 |
| `/api/complaints/{id}/status` | POST | Cancel only | Verify/Resolve/Reject | Start/Complete | Full | 401 |

---

## 4. Complaint State Machine Authorization Rules

Transitions between statuses are enforced by business logic in `ComplaintService.transitionStatus`:

- **Citizen:** May only transition from `SUBMITTED` -> `CANCELLED`. A citizen attempting to transition a complaint to `RESOLVED` or `REWORK_REQUESTED` receives `403 FORBIDDEN`.
- **Worker:** May only transition `ASSIGNED` -> `IN_PROGRESS`, and `IN_PROGRESS` -> `COMPLETED`. Workers cannot self-verify into `RESOLVED`.
- **Officer & Admin:** Authorized to verify work and transition `COMPLETED` -> `RESOLVED` or `COMPLETED` -> `REWORK_REQUESTED`. Also authorized to reject (`REJECTED`) or escalate (`ESCALATED`).

---

## 5. CSRF (Cross-Site Request Forgery) Defense

Because authentication relies on browser session cookies, CSRF protection is active:
- **Repository:** `CookieCsrfTokenRepository.withHttpOnlyFalse()`
- **Cookie Issued:** `XSRF-TOKEN` (readable by frontend JavaScript on the same origin/host).
- **Header Expected:** Mutating requests (`POST`, `PUT`, `DELETE`, `PATCH`) must include `X-XSRF-TOKEN`.
- **Frontend Integration:** Handled automatically by `src/services/apiClient.js` which parses document cookies and appends the header to fetch requests.

---

## 6. CORS (Cross-Origin Resource Sharing)

CORS is strictly locked to trusted local development origins:
- **Allowed Origins:** `http://localhost:5173`, `http://localhost:3000`
- **Allowed Methods:** `GET`, `POST`, `PUT`, `DELETE`, `PATCH`, `OPTIONS`
- **Allowed Headers:** `Content-Type`, `X-XSRF-TOKEN`, `Authorization`, `X-Requested-With`
- **Exposed Headers:** `Set-Cookie`, `XSRF-TOKEN`
- **Credentials Allowed:** `true`

---

## 7. Audit Logging

Every critical business and security action is recorded in the `audit_logs` table via `AuditService`:
- `USER_REGISTERED`
- `USER_LOGIN`
- `USER_LOGOUT`
- `COMPLAINT_CREATED`
- `COMPLAINT_ASSIGNED`
- `COMPLAINT_STATUS_CHANGED`

Audit records store:
- `actor_id` (User UUID)
- `action` (String)
- `entity_type` (e.g. `User`, `Complaint`)
- `entity_id` (Entity UUID)
- `ip_address` (Client remote IP)
- `user_agent` (Client user agent header)
- `timestamp` (UTC)

Sensitive data such as passwords, session tokens, or API secrets are **never** written to audit logs.
