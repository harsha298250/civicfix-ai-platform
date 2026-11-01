# CivicFix PostgreSQL Schema and Migration Audit Report

**Date:** October 22, 2026  
**Auditor:** Antigravity AI Assistant  
**Database Host/Port:** `localhost:5433` (Docker container: `civicfix_postgres`)  
**Database Name:** `civicfix_db`  
**Database User:** `civicfix_user`  
**Investigation Mode:** Read-only (no files modified, no migrations executed, no database state altered)

---

## 1. Executive Summary

An audit of the CivicFix PostgreSQL database schema, Flyway migrations, JPA entity mappings, and persistence behavior was performed against the live container `civicfix_postgres` and the repository codebase.

### Key Audit Findings
1. **Flyway Migration Status:**  
   - Migration directory contains exactly **2** SQL files: `V1__initial_schema.sql` and `V2__seed_roles_and_dev_users.sql`.
   - `flyway_schema_history` in PostgreSQL contains exactly **2** records corresponding to V1 and V2.
   - **0 pending migrations**, **0 failed migrations**, and **0 checksum mismatches**.
2. **Hibernate DDL Configuration:**  
   - `spring.jpa.hibernate.ddl-auto` is set to **`validate`** across both `application.yml` and `application-test.yml`.
   - At startup, Hibernate strictly verifies that JPA entities match the existing PostgreSQL schema; it does not alter, generate, or drop tables.
3. **JPA Entity to Table Alignment:**  
   - All 6 JPA entities (`Complaint`, `ResolutionEvidence`, `ComplaintStatusHistory`, `AuditLog`, `User`, `Role`) and join table `user_roles` match PostgreSQL column names, types, and constraints 1:1.
   - The test suite (80 unit and Spring integration tests) passes with strict Hibernate schema validation.
4. **Application Fields vs Persisted Database Columns (Persistence Tracing):**  
   - **Resolution Evidence Metadata:** The worker evidence upload endpoint accepts `accuracy` and `deviceReported`. These are **not** separate columns in `resolution_evidence`; they are formatted and persisted directly into `evidence_notes` (TEXT).
   - **Rework Notes:** Officer rework notes are persisted in `complaint_status_history.notes` (TEXT) and recorded in `audit_logs.action = 'REQUEST_REWORK'`. There is no dedicated `rework_notes` column on `complaints`.
   - **Citizen Intake Photos:** Frontend mock and demo models define `photos: []`, but neither `complaints` nor any child table stores citizen intake photos. Citizen-uploaded photos are currently unpersisted in the backend.
   - **AI Triage & Progress Tracking:** Frontend fields like `aiTriage` (hazard score, SLA, confidence) and `progressPercent` are simulated client-side and not persisted in PostgreSQL.
5. **Sprint 3 Step 4A–4D Reports Verification:**  
   - The implementation reports for Steps 4A, 4B, 4C, and 4D were inspected. None of the reports claim any new migrations or schema changes. All reports accurately state that the existing V1 and V2 schema satisfied the Sprint 3 requirements.

---

## 2. Flyway Migration Inventory and Database Comparison

### 2.1 Repository Migration Files
Path: `backend/src/main/resources/db/migration/`

| File Name | Version | Description | Checksum | Type | Script Size |
| :--- | :--- | :--- | :--- | :--- | :--- |
| `V1__initial_schema.sql` | 1 | initial schema | 1191342462 | SQL | 105 lines |
| `V2__seed_roles_and_dev_users.sql` | 2 | seed roles and dev users | -1807810933 | SQL | 90 lines |

### 2.2 Live `flyway_schema_history` in `civicfix_db`

Query:
```sql
SELECT installed_rank, version, description, type, script, checksum, installed_by, installed_on, execution_time, success 
FROM flyway_schema_history 
ORDER BY installed_rank;
```

**Result:**
| installed_rank | version | description | type | script | checksum | installed_by | installed_on | execution_time | success |
| :---: | :---: | :--- | :---: | :--- | :---: | :--- | :--- | :---: | :---: |
| 1 | 1 | initial schema | SQL | `V1__initial_schema.sql` | 1191342462 | civicfix_user | 2026-03-31 03:00:19.467888 | 18 ms | `true` |
| 2 | 2 | seed roles and dev users | SQL | `V2__seed_roles_and_dev_users.sql` | -1807810933 | civicfix_user | 2026-03-31 03:00:19.539304 | 14 ms | `true` |

**Verification Status:**
- **Applied Migrations:** 2 (V1, V2)
- **Pending Migrations:** 0
- **Checksum Discrepancy:** None (Checksums match exactly)
- **Failed Migrations:** 0

---

## 3. Database Schema vs Application Entity Mapping

The database schema contains 8 tables in the `public` schema. All tables and columns were compared with JPA entity definitions.

### 3.1 `complaints` Table vs `Complaint.java`
- **Table Name:** `complaints`
- **JPA Entity:** [`Complaint.java`](file:///c:/Users/harsh/Downloads/stitch_civicfix_ai_platform_design/backend/src/main/java/com/civicfix/complaint/Complaint.java)
- **Repository:** [`ComplaintRepository.java`](file:///c:/Users/harsh/Downloads/stitch_civicfix_ai_platform_design/backend/src/main/java/com/civicfix/complaint/ComplaintRepository.java)

| Column Name | PostgreSQL Data Type | Nullable | Default | JPA Field & Mapping | Alignment |
| :--- | :--- | :---: | :--- | :--- | :---: |
| `id` | `uuid` | NO | `gen_random_uuid()` | `@Id UUID id` | MATCH |
| `title` | `varchar(255)` | NO | None | `@Column(nullable = false) String title` | MATCH |
| `description` | `text` | NO | None | `@Column(nullable = false, columnDefinition = "TEXT") String description` | MATCH |
| `category` | `varchar(100)` | NO | None | `@Column(nullable = false, length = 100) String category` | MATCH |
| `status` | `varchar(50)` | NO | `'SUBMITTED'` | `@Enumerated(EnumType.STRING) @Column(nullable = false, length = 50) ComplaintStatus status` | MATCH |
| `priority` | `varchar(20)` | NO | `'MEDIUM'` | `@Column(nullable = false, length = 20) String priority` | MATCH |
| `citizen_id` | `uuid` | YES | None | `@ManyToOne(fetch = FetchType.LAZY) @JoinColumn(name = "citizen_id") User citizen` | MATCH |
| `assigned_worker_id` | `uuid` | YES | None | `@ManyToOne(fetch = FetchType.LAZY) @JoinColumn(name = "assigned_worker_id") User assignedWorker` | MATCH |
| `latitude` | `numeric(10,8)` | YES | None | `@Column(precision = 10, scale = 8) BigDecimal latitude` | MATCH |
| `longitude` | `numeric(11,8)` | YES | None | `@Column(precision = 11, scale = 8) BigDecimal longitude` | MATCH |
| `address` | `varchar(500)` | YES | None | `@Column(length = 500) String address` | MATCH |
| `created_at` | `timestamptz` | NO | `CURRENT_TIMESTAMP` | `@Column(name = "created_at", nullable = false) OffsetDateTime createdAt` | MATCH |
| `updated_at` | `timestamptz` | NO | `CURRENT_TIMESTAMP` | `@Column(name = "updated_at", nullable = false) OffsetDateTime updatedAt` | MATCH |

### 3.2 `resolution_evidence` Table vs `ResolutionEvidence.java`
- **Table Name:** `resolution_evidence`
- **JPA Entity:** [`ResolutionEvidence.java`](file:///c:/Users/harsh/Downloads/stitch_civicfix_ai_platform_design/backend/src/main/java/com/civicfix/complaint/ResolutionEvidence.java)
- **Repository:** [`ResolutionEvidenceRepository.java`](file:///c:/Users/harsh/Downloads/stitch_civicfix_ai_platform_design/backend/src/main/java/com/civicfix/complaint/ResolutionEvidenceRepository.java)

| Column Name | PostgreSQL Data Type | Nullable | Default | JPA Field & Mapping | Alignment |
| :--- | :--- | :---: | :--- | :--- | :---: |
| `id` | `uuid` | NO | `gen_random_uuid()` | `@Id UUID id` | MATCH |
| `complaint_id` | `uuid` | NO | None | `@ManyToOne(fetch = FetchType.LAZY) @JoinColumn(name = "complaint_id", nullable = false) Complaint complaint` | MATCH |
| `worker_id` | `uuid` | NO | None | `@ManyToOne(fetch = FetchType.LAZY) @JoinColumn(name = "worker_id", nullable = false) User worker` | MATCH |
| `photo_url` | `text` | NO | None | `@Column(name = "photo_url", nullable = false, columnDefinition = "TEXT") String photoUrl` | MATCH |
| `evidence_notes` | `text` | YES | None | `@Column(name = "evidence_notes", columnDefinition = "TEXT") String evidenceNotes` | MATCH |
| `latitude` | `numeric(10,8)` | YES | None | `@Column(precision = 10, scale = 8) BigDecimal latitude` | MATCH |
| `longitude` | `numeric(11,8)` | YES | None | `@Column(precision = 11, scale = 8) BigDecimal longitude` | MATCH |
| `created_at` | `timestamptz` | NO | `CURRENT_TIMESTAMP` | `@Column(name = "created_at", nullable = false) OffsetDateTime createdAt` | MATCH |

### 3.3 `complaint_status_history` Table vs `ComplaintStatusHistory.java`
- **Table Name:** `complaint_status_history`
- **JPA Entity:** [`ComplaintStatusHistory.java`](file:///c:/Users/harsh/Downloads/stitch_civicfix_ai_platform_design/backend/src/main/java/com/civicfix/complaint/ComplaintStatusHistory.java)
- **Repository:** [`ComplaintStatusHistoryRepository.java`](file:///c:/Users/harsh/Downloads/stitch_civicfix_ai_platform_design/backend/src/main/java/com/civicfix/complaint/ComplaintStatusHistoryRepository.java)

| Column Name | PostgreSQL Data Type | Nullable | Default | JPA Field & Mapping | Alignment |
| :--- | :--- | :---: | :--- | :--- | :---: |
| `id` | `uuid` | NO | `gen_random_uuid()` | `@Id UUID id` | MATCH |
| `complaint_id` | `uuid` | NO | None | `@ManyToOne(fetch = FetchType.LAZY) @JoinColumn(name = "complaint_id", nullable = false) Complaint complaint` | MATCH |
| `from_status` | `varchar(50)` | YES | None | `@Enumerated(EnumType.STRING) @Column(name = "from_status", length = 50) ComplaintStatus fromStatus` | MATCH |
| `to_status` | `varchar(50)` | NO | None | `@Enumerated(EnumType.STRING) @Column(name = "to_status", nullable = false, length = 50) ComplaintStatus toStatus` | MATCH |
| `changed_by` | `uuid` | YES | None | `@ManyToOne(fetch = FetchType.LAZY) @JoinColumn(name = "changed_by") User changedBy` | MATCH |
| `notes` | `text` | YES | None | `@Column(columnDefinition = "TEXT") String notes` | MATCH |
| `created_at` | `timestamptz` | NO | `CURRENT_TIMESTAMP` | `@Column(name = "created_at", nullable = false) OffsetDateTime createdAt` | MATCH |

### 3.4 `audit_logs` Table vs `AuditLog.java`
- **Table Name:** `audit_logs`
- **JPA Entity:** [`AuditLog.java`](file:///c:/Users/harsh/Downloads/stitch_civicfix_ai_platform_design/backend/src/main/java/com/civicfix/audit/AuditLog.java)
- **Repository:** [`AuditLogRepository.java`](file:///c:/Users/harsh/Downloads/stitch_civicfix_ai_platform_design/backend/src/main/java/com/civicfix/audit/AuditLogRepository.java)

| Column Name | PostgreSQL Data Type | Nullable | Default | JPA Field & Mapping | Alignment |
| :--- | :--- | :---: | :--- | :--- | :---: |
| `id` | `uuid` | NO | `gen_random_uuid()` | `@Id UUID id` | MATCH |
| `user_id` | `uuid` | YES | None | `@ManyToOne(fetch = FetchType.LAZY) @JoinColumn(name = "user_id") User user` | MATCH |
| `action` | `varchar(100)` | NO | None | `@Column(nullable = false, length = 100) String action` | MATCH |
| `entity_name` | `varchar(100)` | NO | None | `@Column(name = "entity_name", nullable = false, length = 100) String entityName` | MATCH |
| `entity_id` | `uuid` | YES | None | `@Column(name = "entity_id") UUID entityId` | MATCH |
| `details` | `text` | YES | None | `@Column(columnDefinition = "TEXT") String details` | MATCH |
| `ip_address` | `varchar(45)` | YES | None | `@Column(name = "ip_address", length = 45) String ipAddress` | MATCH |
| `created_at` | `timestamptz` | NO | `CURRENT_TIMESTAMP` | `@Column(name = "created_at", nullable = false) OffsetDateTime createdAt` | MATCH |

### 3.5 User and Role Security Tables
- `users`: Maps to [`User.java`](file:///c:/Users/harsh/Downloads/stitch_civicfix_ai_platform_design/backend/src/main/java/com/civicfix/user/User.java) (`id`, `full_name`, `email`, `password_hash`, `phone_number`, `created_at`, `updated_at`).
- `roles`: Maps to [`Role.java`](file:///c:/Users/harsh/Downloads/stitch_civicfix_ai_platform_design/backend/src/main/java/com/civicfix/user/Role.java) (`id`, `name`).
- `user_roles`: Join table mapped via `@ManyToMany` with `@JoinTable(name = "user_roles", joinColumns = @JoinColumn(name = "user_id"), inverseJoinColumns = @JoinColumn(name = "role_id"))`.

---

## 4. Persistence Behavior Tracing for Specific Application Fields

Tracing how fields submitted through REST APIs or present in frontend view models are actually handled in Spring backend services:

### 4.1 Resolution Evidence Metadata (`accuracy`, `deviceReported`)
- **API Endpoint:** `POST /api/complaints/{id}/evidence` (multipart request accepting `file`, `evidenceNotes`, `latitude`, `longitude`, `accuracy`, `deviceReported`).
- **Database Reality:** `resolution_evidence` has columns `latitude` (`NUMERIC(10,8)`), `longitude` (`NUMERIC(11,8)`), and `evidence_notes` (`TEXT`). It does **not** have dedicated `accuracy` or `device_reported` columns.
- **Trace in [`ComplaintService.java`](file:///c:/Users/harsh/Downloads/stitch_civicfix_ai_platform_design/backend/src/main/java/com/civicfix/complaint/ComplaintService.java#L470-L515):**
  ```java
  StringBuilder formattedNotes = new StringBuilder();
  if (notes != null && !notes.isBlank()) {
      formattedNotes.append(notes.trim());
  }
  if (latitude != null && longitude != null) {
      if (formattedNotes.length() > 0) formattedNotes.append(" | ");
      formattedNotes.append(String.format("GPS: %s, %s", latitude, longitude));
      if (accuracy != null) {
          formattedNotes.append(String.format(" (±%.1fm)", accuracy));
      }
      if (Boolean.TRUE.equals(deviceReported)) {
          formattedNotes.append(" [device-reported]");
      }
  }
  ```
- **Conclusion:** Metadata is intentionally packaged into `evidence_notes`. It is fully persisted as text rather than structured numerical/boolean database columns. When deserialized into `EvidenceResponse`, `evidenceNotes` returns this combined text.

### 4.2 Officer Rework Notes
- **API Endpoint:** `POST /api/complaints/{id}/rework` (accepts `ReworkRequest` with `notes`).
- **Database Reality:** There is no `rework_notes` column in `complaints`.
- **Trace in [`ComplaintService.java`](file:///c:/Users/harsh/Downloads/stitch_civicfix_ai_platform_design/backend/src/main/java/com/civicfix/complaint/ComplaintService.java#L397-L435):**
  1. Complaint status transitions from `RESOLVED` to `REWORK_REQUESTED`.
  2. A new record is inserted into `complaint_status_history` with:
     - `from_status = 'RESOLVED'`
     - `to_status = 'REWORK_REQUESTED'`
     - `changed_by = officer.getId()`
     - `notes = request.notes()` (mandatory non-blank text)
  3. An audit log is inserted into `audit_logs` with `action = 'REQUEST_REWORK'` and `details = "Complaint reopened for rework. Reason: " + request.notes()`.
- **Conclusion:** Rework notes are persisted across two immutable audit-trail tables (`complaint_status_history` and `audit_logs`). Frontend worker and officer screens fetch rework notes by querying the complaint's status history endpoint (`GET /api/complaints/{id}/history`).

### 4.3 Status Transitions
The status transitions enforced by `ComplaintService.java`:
- `SUBMITTED` -> `ASSIGNED` (by Officer/Admin)
- `ASSIGNED` -> `IN_PROGRESS` (by assigned Worker)
- `IN_PROGRESS` -> `RESOLVED` (by assigned Worker upon evidence submission)
- `RESOLVED` -> `CLOSED` (by Officer verification/approval)
- `RESOLVED` -> `REWORK_REQUESTED` (by Officer requesting rework)
- `REWORK_REQUESTED` -> `IN_PROGRESS` (by assigned Worker re-commencing work)

Each valid transition persists:
1. `complaints.status` update + `updated_at`.
2. A new row in `complaint_status_history`.
3. A structured record in `audit_logs`.

### 4.4 Citizen Intake Photos
- **Frontend Observation:** Citizen complaint lists and cards in frontend templates show a `photos: []` property on mock complaints.
- **Database Reality:**
  - `complaints` table has no `photos` or `photo_url` column.
  - There is no `complaint_photos` join table.
  - `CreateComplaintRequest` in backend only accepts `title`, `description`, `category`, `latitude`, `longitude`, `address`, and `priority`.
- **Conclusion:** Intake photos are not currently supported or persisted by the Spring backend schema. Only *resolution* evidence photos (submitted by workers via `resolution_evidence`) are stored.

### 4.5 AI Triage & Progress Tracking
- **Frontend Observation:** UI mock cards show `aiTriage: { hazardScore, confidence, suggestedDept, slaHours }` and `progressPercent`.
- **Database Reality:** None of these fields exist in `complaints` table.
- **Conclusion:** These values are client-side mock/heuristic calculations. The database stores the authoritative operational status (`SUBMITTED`, `ASSIGNED`, `IN_PROGRESS`, etc.).

---

## 5. Hibernate DDL Configuration Analysis

Inspected configuration files:
- `backend/src/main/resources/application.yml`
- `backend/src/test/resources/application-test.yml`

```yaml
spring:
  jpa:
    hibernate:
      ddl-auto: validate
    properties:
      hibernate:
        dialect: org.hibernate.dialect.PostgreSQLDialect
        format_sql: true
```

### Implications
1. **Startup Safety:** With `ddl-auto: validate`, Spring Boot fails fast on boot if any `@Entity` or `@Column` does not strictly exist with matching types in the database.
2. **Flyway Primacy:** All DDL changes MUST be authored as versioned Flyway migrations (`V{n}__{description}.sql`). Hibernate is prevented from altering or creating tables automatically.
3. **Verified Consistency:** Because all tests pass under `ddl-auto: validate`, the Java entities and PostgreSQL schema are in 100% agreement.

---

## 6. Review of Sprint 3 Step 4A–4D Implementation Reports

The implementation reports for Sprint 3 Steps 4A through 4D were reviewed to verify whether any report falsely claimed database changes:

| Report | Stated Schema / Migration Action | Reality in Database |
| :--- | :--- | :--- |
| **`SPRINT_3_STEP_4A_IMPLEMENTATION_REPORT.md`** | "No database schema changes were required. Existing `complaints`, `complaint_status_history`, `users`, and `roles` tables satisfy all task list and detail requirements." | Matches database reality. |
| **`SPRINT_3_STEP_4B_IMPLEMENTATION_REPORT.md`** | "No database migrations or schema alterations were needed. Existing status enum and history tables support worker transitions." | Matches database reality. |
| **`SPRINT_3_STEP_4C_IMPLEMENTATION_REPORT.md`** | "No database migrations required. Existing `resolution_evidence` table matches `ResolutionEvidence` entity. Storage uses local disk backend." | Matches database reality. |
| **`SPRINT_3_STEP_4D_IMPLEMENTATION_REPORT.md`** | "No schema changes required. Rework notes and approvals leverage `complaint_status_history` and `audit_logs`." | Matches database reality. |

**Audit Conclusion:**  
No discrepancy exists between the Sprint 3 implementation reports and the database state. No unapplied or ghost migrations were promised or claimed.

---

## 7. Current Database State & Row Counts

Direct inspection of `civicfix_postgres` (`civicfix_db`):

| Table Name | Row Count | Primary Key Type | Foreign Keys | Key Indexes |
| :--- | :---: | :---: | :--- | :--- |
| `flyway_schema_history` | 2 | `installed_rank` (INT) | None | Primary Key |
| `roles` | 4 | `id` (UUID) | None | Unique(`name`) |
| `users` | 23 | `id` (UUID) | None | Unique(`email`), Idx(`phone_number`) |
| `user_roles` | 23 | Composite (`user_id`, `role_id`) | `users(id)`, `roles(id)` | Composite PK |
| `complaints` | 82 | `id` (UUID) | `users(citizen_id)`, `users(assigned_worker_id)` | Idx(`citizen_id`), Idx(`assigned_worker_id`), Idx(`status`), Idx(`category`) |
| `complaint_status_history` | 208 | `id` (UUID) | `complaints(complaint_id)`, `users(changed_by)` | Idx(`complaint_id`), Idx(`created_at`) |
| `resolution_evidence` | 24 | `id` (UUID) | `complaints(complaint_id)`, `users(worker_id)` | Idx(`complaint_id`), Idx(`worker_id`) |
| `audit_logs` | 474 | `id` (UUID) | `users(user_id)` | Idx(`user_id`), Idx(`entity_name`, `entity_id`), Idx(`created_at`) |

---

## 8. Confirmed Issues, Uncertainties, and Recommendations

### 8.1 Confirmed Findings & Constraints
1. **Zero Schema Debt for Sprint 3:** The current database schema fully satisfies the existing Sprint 3 implementation (Worker tasks, Worker progress, Evidence uploads, and Officer Verification/Rework).
2. **Strict Migration Parity:** The Flyway files in `backend/src/main/resources/db/migration` and the `flyway_schema_history` in PostgreSQL are identical and in sync.
3. **No Unapplied Migrations:** There are no lingering or pending migration files.

### 8.2 Architectural Observations & Future Gaps
1. **Resolution Evidence GPS Metadata:**
   - *Current State:* `accuracy` and `deviceReported` are embedded in `evidence_notes` text.
   - *Future Consideration:* If future features require spatial queries, GPS accuracy filtering, or anti-spoofing verification queries, a `V3` migration could introduce dedicated `gps_accuracy NUMERIC(8,2)` and `is_device_reported BOOLEAN` columns on `resolution_evidence`.
2. **Citizen Intake Photos:**
   - *Current State:* Citizen intake does not support photo attachment in the backend API or schema.
   - *Future Consideration:* If citizen photo reporting is required in Sprint 4+, a `V3` migration will be needed to add an intake photos relationship or table (e.g., `complaint_photos` or `photo_urls TEXT[]`).
3. **AI Triage Fields:**
   - *Current State:* Priority is persisted (`MEDIUM`, `HIGH`, etc.), but hazard scores and SLA deadlines are computed on the client.
   - *Future Consideration:* If municipal SLA enforcement is scheduled for backend automation, `sla_due_at TIMESTAMPTZ` and `hazard_score NUMERIC(4,2)` columns would require a migration.

### 8.3 Recommended Next Steps
1. **Preserve Current State:** Do not modify `V1` or `V2` migration files. They are already applied in production/docker environments and modifying them will corrupt the Flyway checksum.
2. **Any Future Changes Must Use `V3__*.sql`:** If citizen photos or dedicated GPS columns are requested in subsequent sprints, create a new `V3__*.sql` Flyway migration script and update JPA entities in tandem.
3. **Review Complete:** The schema audit is finished and the project is ready for review.
