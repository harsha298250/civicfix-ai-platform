# CivicFix AI — Backend REST API Specification

This document details the REST API endpoints implemented in Sprint 2, along with request/response schemas, security expectations, and error handling.

---

## 1. Global Conventions

- **Base URL:** `http://localhost:8080`
- **Content-Type:** `application/json`
- **Credentials:** Cookie-based sessions (`credentials: 'include'`)
- **Session Cookie:** `CIVICFIX_SESSION` (HttpOnly, SameSite=Lax)
- **CSRF Protection:** Cookie `XSRF-TOKEN` must be read by the frontend client and passed in the `X-XSRF-TOKEN` header on all mutating requests (`POST`, `PUT`, `DELETE`, `PATCH`).

### Standard Response Envelope (`ApiResponse<T>`)
```json
{
  "timestamp": "2026-10-21T14:15:30.123Z",
  "status": 200,
  "message": "Operation successful",
  "data": { ... },
  "errors": null
}
```

### Standard Error Envelope
```json
{
  "timestamp": "2026-10-21T14:15:30.123Z",
  "status": 400,
  "message": "Validation failed",
  "data": null,
  "errors": {
    "title": "Title cannot be blank",
    "latitude": "Latitude must be between -90 and 90"
  }
}
```

---

## 2. Health Endpoint

### `GET /api/health`
Exposes safe, non-sensitive application health information.
- **Authorization:** Public
- **Response (200 OK):**
```json
{
  "timestamp": "2026-10-21T14:15:30.123Z",
  "status": 200,
  "message": "CivicFix AI Backend is running",
  "data": {
    "status": "UP",
    "database": "CONNECTED",
    "timestamp": 1729517130123
  },
  "errors": null
}
```

---

## 3. Authentication Endpoints

### `POST /api/auth/register`
Registers a new citizen account. Public registration cannot grant `OFFICER`, `WORKER`, or `ADMIN` roles.
- **Authorization:** Public
- **Request Body:**
```json
{
  "fullName": "Aarav Sharma",
  "email": "aarav.sharma@example.com",
  "password": "SecurePassword123!",
  "phoneNumber": "+919876543210"
}
```
- **Response (201 Created):**
```json
{
  "timestamp": "2026-10-21T14:16:00.000Z",
  "status": 201,
  "message": "Citizen registered successfully",
  "data": {
    "id": "3fa85f64-5717-4562-b3fc-2c963f66afa6",
    "fullName": "Aarav Sharma",
    "email": "aarav.sharma@example.com",
    "phoneNumber": "+919876543210",
    "status": "ACTIVE",
    "roles": ["ROLE_CITIZEN"]
  },
  "errors": null
}
```

### `POST /api/auth/login`
Authenticates a user and creates a server-managed session.
- **Authorization:** Public
- **Request Body:**
```json
{
  "email": "citizen@civicfix.local",
  "password": "Password123!"
}
```
- **Response (200 OK):**
Sets `Set-Cookie: CIVICFIX_SESSION=...; Path=/; HttpOnly; SameSite=Lax`.
Sets `Set-Cookie: XSRF-TOKEN=...; Path=/; SameSite=Lax`.

### `POST /api/auth/logout`
Invalidates the server-side session and clears the session cookie.
- **Authorization:** Authenticated
- **Response (200 OK):**
```json
{
  "timestamp": "2026-10-21T14:17:00.000Z",
  "status": 200,
  "message": "Logged out successfully",
  "data": null,
  "errors": null
}
```

### `GET /api/auth/me`
Returns current authenticated user details.
- **Authorization:** Authenticated
- **Response (200 OK):**
```json
{
  "timestamp": "2026-10-21T14:18:00.000Z",
  "status": 200,
  "message": "Current user retrieved",
  "data": {
    "id": "11111111-1111-1111-1111-111111111111",
    "fullName": "Aarav Citizen",
    "email": "citizen@civicfix.local",
    "phoneNumber": "+919876543210",
    "status": "ACTIVE",
    "roles": ["ROLE_CITIZEN"]
  },
  "errors": null
}
```

---

## 4. Complaint Endpoints

### `POST /api/complaints`
Submits a new civic complaint.
- **Authorization:** `ROLE_CITIZEN`
- **Request Body:**
```json
{
  "title": "Severe pothole near Metro Pillar 42",
  "description": "Deep crater in the road causing traffic congestion and hazard to two-wheelers.",
  "category": "ROADS",
  "priority": "HIGH",
  "address": "MG Road, Pillar 42, Bengaluru",
  "latitude": 12.9716,
  "longitude": 77.5946
}
```
- **Response (201 Created):**
```json
{
  "timestamp": "2026-10-21T14:19:00.000Z",
  "status": 201,
  "message": "Complaint submitted successfully",
  "data": {
    "id": "e4b6d37f-2b73-45a8-8e6d-616a2b8478d1",
    "trackingNumber": "CF-20261021-9842",
    "title": "Severe pothole near Metro Pillar 42",
    "description": "Deep crater in the road causing traffic congestion...",
    "category": "ROADS",
    "priority": "HIGH",
    "status": "SUBMITTED",
    "address": "MG Road, Pillar 42, Bengaluru",
    "latitude": 12.9716,
    "longitude": 77.5946,
    "citizenId": "11111111-1111-1111-1111-111111111111",
    "citizenName": "Aarav Citizen",
    "assignedOfficerId": null,
    "assignedWorkerId": null,
    "createdAt": "2026-10-21T14:19:00.000Z",
    "updatedAt": "2026-10-21T14:19:00.000Z"
  },
  "errors": null
}
```

### `GET /api/complaints`
Retrieves paginated complaints according to caller's role:
- `CITIZEN`: returns only complaints submitted by the citizen.
- `WORKER`: returns complaints assigned to the worker.
- `OFFICER` / `ADMIN`: returns complaints across jurisdiction.
- **Query Parameters:** `page=0&size=20&sort=createdAt,desc&status=SUBMITTED&category=ROADS`
- **Response (200 OK):**
```json
{
  "timestamp": "2026-10-21T14:20:00.000Z",
  "status": 200,
  "message": "Complaints retrieved successfully",
  "data": {
    "content": [ ... ],
    "page": 0,
    "size": 20,
    "totalElements": 1,
    "totalPages": 1,
    "last": true
  },
  "errors": null
}
```

### `GET /api/complaints/{id}`
Retrieves details of a specific complaint. Citizens can only view their own complaints.
- **Authorization:** Authenticated (Role/Ownership enforced)
- **Response (200 OK):** `ComplaintResponse` object.

### `GET /api/complaints/{id}/history`
Retrieves chronological status transition audit log for the complaint.
- **Authorization:** Authenticated (Role/Ownership enforced)
- **Response (200 OK):**
```json
{
  "timestamp": "2026-10-21T14:21:00.000Z",
  "status": 200,
  "message": "Complaint history retrieved successfully",
  "data": [
    {
      "id": "7a94...",
      "complaintId": "e4b6...",
      "fromStatus": null,
      "toStatus": "SUBMITTED",
      "changedById": "1111...",
      "changedByName": "Aarav Citizen",
      "reason": "Initial submission by citizen",
      "createdAt": "2026-10-21T14:19:00.000Z"
    }
  ],
  "errors": null
}
```

### `POST /api/complaints/{id}/assign`
Assigns an officer or field worker to a complaint.
- **Authorization:** `ROLE_OFFICER`, `ROLE_ADMIN`
- **Request Body:**
```json
{
  "officerId": "22222222-2222-2222-2222-222222222222",
  "workerId": "33333333-3333-3333-3333-333333333333",
  "reason": "Assigned to road maintenance unit"
}
```

### `POST /api/complaints/{id}/status`
Transitions complaint status according to state machine rules.
- **Authorization:** Authenticated (Role-restricted transitions)
- **Request Body:**
```json
{
  "newStatus": "IN_PROGRESS",
  "reason": "Maintenance crew deployed on site"
}
```

---

## 5. Real-Time Architecture Specification (Sprint 3 Roadmap)

To prepare for real-time dashboard updates without prematurely coupling unverified WebSocket connections, the backend architecture is designed for **Spring WebSocket with STOMP over SockJS**:

### Broker Topology
- **Endpoint:** `/ws`
- **Application Destination Prefix:** `/app`
- **Broker Destinations:** `/topic` (broadcasts) and `/user/queue` (targeted notifications)

### Planned Topic Hierarchy
- `/topic/complaints.public`: New complaint counters & anonymized civic telemetry.
- `/topic/officers.complaints`: Officer dispatch board updates (assignment alerts, escalation notices).
- `/user/queue/complaints`: User-scoped updates (e.g. notifications to the citizen when their complaint changes status, notifications to a worker when assigned a task).

### Transactional Event Delivery Principle
WebSocket STOMP messages must only be broadcast using `@TransactionalEventListener(phase = TransactionPhase.AFTER_COMMIT)` to ensure events are never dispatched for transactions that subsequently roll back.
