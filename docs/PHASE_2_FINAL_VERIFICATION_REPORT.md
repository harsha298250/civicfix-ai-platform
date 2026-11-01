# CivicFix — Phase 2 Final Verification and Exit Audit Report

**Audit Date:** October 22, 2026  
**Auditor Roles:** Senior Full-Stack Engineer, Application Security Engineer, QA Lead  
**Audit Scope:** Remediation Steps 2.1, 2.2, 2.3, and 2.4 across Frontend, Backend, Database, and Security Layers  
**Current Git Branch:** `feat/sprint3-frontend-backend-integration`  
**Target Environment:**  
- Backend: Java 21, Spring Boot 3.3.4, Hibernate 6.5 (`ddl-auto: validate`), Maven  
- Database: PostgreSQL 16 (`civicfix_postgres` container on host port 5433, db `civicfix_db`)  
- Frontend: React 18, Vite 5.4.21, Tailwind CSS  

---

## 1. Executive Summary & Phase 2 Exit Recommendation

### Executive Summary
Phase 2 remediation addressed four critical defect clusters identified during the core workflow and security audit:
1. **Step 2.1 (Evidence Download & Storage Traversal):** Resolution evidence file download 404s, path traversal vulnerabilities, and unauthenticated/unauthorized evidence access were remediated by implementing database-linked validation, complaint-scoped subdirectory storage, strict filename sanitization, and entity-level RBAC enforcement.
2. **Step 2.2 (Citizen Photo Persistence & Flyway V3):** Citizen intake photos, previously stored only in browser `localStorage`, were transitioned to persistent server-side storage and tracked via PostgreSQL table `complaint_photos` managed by Flyway migration `V3__add_complaint_photos.sql`.
3. **Step 2.3 (Dynamic Complaint Location Details):** Hardcoded coordinates (`13.0850, 80.2101`), static ward labels (`Ward 08`), and mock district values (`District 4`) were removed from citizen, officer, and worker views. True dynamic coordinates, valid zero coordinates (`0.0, 0.0`), and explicit distinction between citizen-reported incident coordinates and worker GPS telemetry were implemented.
4. **Step 2.4 (Optimistic Locking & Concurrency Control):** Concurrent complaint mutations leading to lost updates were prevented by introducing Flyway migration `V4__add_complaint_version.sql`, applying JPA `@Version` on `Complaint`, handling `ObjectOptimisticLockingFailureException` as HTTP 409 Conflict, and wiring optimistic version checks into officer assignment and status update flows.

### Phase 2 Exit Recommendation
**RECOMMENDATION: Phase 2 Complete**

All checklist criteria have been rigorously tested and verified through source code inspection, database validation, automated integration test suites (103 backend tests, 72 frontend tests), and production frontend bundling. Zero regressions were detected.

---

## 2. Findings Classification Summary

| Finding ID | Area | Description | Severity | Status |
|---|---|---|---|---|
| **FINDING-2.1-A** | Evidence Storage | Worker evidence and citizen photos saved to complaint-scoped subdirectories and persisted in PostgreSQL | No Finding | **Verified Remediated** |
| **FINDING-2.1-B** | Evidence Access Control | Evidence and photo downloads require valid database records; unlinked files return 404; unauthorized roles return 403 Forbidden | No Finding | **Verified Remediated** |
| **FINDING-2.1-C** | Filename Validation | Path traversal sequences (`..`, `/`, `\`) safely rejected with HTTP 400 Bad Request | No Finding | **Verified Remediated** |
| **FINDING-2.1-D** | Orphan File Cleanup | Storage write failures or database rollback triggers automatic disk file cleanup | No Finding | **Verified Remediated** |
| **FINDING-2.3-A** | Location Coordinates | Fabricated coordinates, ward labels, and district defaults eliminated from UI mapping | No Finding | **Verified Remediated** |
| **FINDING-2.3-B** | Coordinate Boundaries | Missing coordinates show "Location unavailable"; valid zero coordinates (`0.0, 0.0`) are preserved | No Finding | **Verified Remediated** |
| **FINDING-2.3-C** | Telemetry Distinction | Incident location and worker resolution GPS telemetry are strictly decoupled and accurately labeled | No Finding | **Verified Remediated** |
| **FINDING-2.4-A** | Schema Compatibility | Flyway V4 `version BIGINT NOT NULL DEFAULT 0` backwards-compatible with existing data | No Finding | **Verified Remediated** |
| **FINDING-2.4-B** | Concurrent Collision Safety | Optimistic locking triggers HTTP 409; transactional rollback prevents partial state writes | No Finding | **Verified Remediated** |
| **FINDING-2.4-C** | Frontend Concurrency UX | Frontend surfaces HTTP 409 conflict notifications to prompt users to refresh without silent retries | Low | **Verified Remediated** (Recommendation for automatic draft preservation in future sprints) |

---

## 3. Detailed Audit Checklist & Verification Evidence

### Section A: Evidence and Photo Storage (Steps 2.1 & 2.2)

#### 1. Disk Storage & PostgreSQL Persistence
- **Citizen Photos:**
  - Persisted in PostgreSQL table `complaint_photos`:
    ```sql
    CREATE TABLE IF NOT EXISTS complaint_photos (
        id UUID PRIMARY KEY,
        complaint_id UUID NOT NULL REFERENCES complaints(id) ON DELETE CASCADE,
        photo_url VARCHAR(500) NOT NULL,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
    );
    ```
  - Disk storage directory: `uploads/evidence/complaints/{complaintId}/complaint-{uuid}.{ext}`.
- **Worker Resolution Evidence:**
  - Persisted in PostgreSQL table `resolution_evidence`:
    ```sql
    complaint_id UUID NOT NULL REFERENCES complaints(id)
    photo_url VARCHAR(500) NOT NULL
    evidence_notes TEXT
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
    ```
  - Disk storage directory: `uploads/evidence/complaints/{complaintId}/evidence-{uuid}.{ext}`.

#### 2. Database-Linked File Retrieval
- In `ComplaintService.java`:
  - Worker evidence:
    ```java
    ResolutionEvidence evidence = evidenceRepository.findFirstByPhotoUrlContaining(sanitizedFilename)
        .orElseThrow(() -> new ResourceNotFoundException("Evidence file not found or not linked to any valid record"));
    ```
  - Citizen complaint photo:
    ```java
    ComplaintPhoto photo = complaintPhotoRepository.findFirstByPhotoUrlContaining(sanitizedFilename)
        .orElseThrow(() -> new ResourceNotFoundException("Complaint photo not found or not linked to any valid record"));
    ```
  - **Verdict:** An unlinked file existing on disk cannot be retrieved via API; it returns HTTP 404 Not Found.

#### 3. Role-Based Access Control (RBAC) on File Downloads
- Download endpoints call `enforceReadPermission(complaint)`:
  - `ROLE_ADMIN` & `ROLE_OFFICER`: Unrestricted access across all complaints.
  - `ROLE_CITIZEN`: Allowed only if `currentUser.getId().equals(complaint.getCitizen().getId())`.
  - `ROLE_WORKER`: Allowed only if `complaint.getAssignedWorker() != null && currentUser.getId().equals(complaint.getAssignedWorker().getId())`.
  - Any unauthorized user: Throws `AccessDeniedException("You do not have permission to view evidence for this complaint")` returning HTTP 403 Forbidden.

#### 4. Complaint-Specific Subdirectory Resolution
- Storage paths are dynamically constructed from the database record's parent complaint:
  ```java
  storageService.loadFileAsResource(sanitizedFilename, "complaints/" + complaint.getId());
  ```
  This resolves the previous bug where downloads looked into `complaints/` instead of `complaints/{complaintId}/`.

#### 5. Malformed Filename & Path Traversal Rejection
- In `ComplaintService.java` & `LocalStorageService.java`:
  ```java
  if (filename.contains("..") || filename.contains("/") || filename.contains("\\")) {
      throw new InvalidRequestException("Invalid file name format");
  }
  ```
  Returns HTTP 400 Bad Request immediately.

#### 6. Orphan File Prevention on Transaction Failure
- In `ComplaintService.submitEvidence`:
  ```java
  try {
      evidence = evidenceRepository.save(evidence);
      complaintRepository.save(complaint);
  } catch (Exception e) {
      storageService.deleteFile(storedFilename, "complaints/" + id);
      throw new FileStorageException("Failed to persist evidence record in database", e);
  }
  ```
  Uncommitted files on disk are deleted if database persistence fails.

---

### Section B: Complaint Locations (Step 2.3)

#### 1. Removal of Fabricated Location Defaults
- In `src/services/complaintService.js`:
  - Removed `13.0850, 80.2101` and `13.0845, 80.2155` default fallbacks.
  - Removed hardcoded `"Ward 08"` and `"District 4"` strings.
  - Dynamic mapping:
    ```javascript
    coordinates: hasValidCoordinates(backendComplaint.latitude, backendComplaint.longitude)
      ? { lat: Number(backendComplaint.latitude), lng: Number(backendComplaint.longitude) }
      : null,
    ward: backendComplaint.ward || null,
    district: backendComplaint.district || null,
    ```

#### 2. Missing Coordinates Display
- If coordinates are `null`:
  - Details card renders `"Location unavailable"`.
  - Map widget shows a fallback banner stating coordinates were not provided at intake; no fabricated pin is plotted.

#### 3. Preservation of Valid Zero Coordinates
- `hasValidCoordinates` utility:
  ```javascript
  export function hasValidCoordinates(lat, lng) {
    if (lat === null || lat === undefined || lng === null || lng === undefined) return false;
    const numLat = Number(lat);
    const numLng = Number(lng);
    if (isNaN(numLat) || isNaN(numLng)) return false;
    return numLat >= -90 && numLat <= 90 && numLng >= -180 && numLng <= 180;
  }
  ```
  Latitude `0.0` and longitude `0.0` evaluate to `true` and format accurately as `0.0000° N, 0.0000° E`.

#### 4. Incident vs. Resolution Telemetry Segregation
- Citizen-reported incident coordinates are displayed under **"Incident Location"**.
- Worker resolution telemetry coordinates submitted with evidence notes are parsed and labeled as **"GPS Telemetry Validated: {lat}, {lng}"**.
- Device coordinates are never falsely labeled as "government-verified" unless confirmed by officer review.

---

### Section C: Optimistic Locking & Concurrency Control (Step 2.4)

#### 1. Flyway V4 Migration Compatibility
- `V4__add_complaint_version.sql`:
  ```sql
  ALTER TABLE complaints ADD COLUMN IF NOT EXISTS version BIGINT NOT NULL DEFAULT 0;
  ```
- Backwards compatible with all existing complaint rows; defaults to `0`.

#### 2. JPA `@Version` & Hibernate Schema Validation
- `Complaint.java`:
  ```java
  @Version
  @Column(name = "version", nullable = false)
  private Long version = 0L;
  ```
- Verified matching running PostgreSQL schema:
  ```
  column_name: version | data_type: bigint | is_nullable: NO | column_default: 0
  ```
- Application boot validates schema (`ddl-auto: validate`) with 0 errors.

#### 3. Concurrent Collision Rejection & HTTP 409
- In `ComplaintService.java`:
  ```java
  if (request.getVersion() != null && !request.getVersion().equals(complaint.getVersion())) {
      throw new ConflictException("Complaint has been modified by another transaction. Please reload and try again.");
  }
  ```
- In `GlobalExceptionHandler.java`:
  - `ObjectOptimisticLockingFailureException`, `OptimisticLockException`, `StaleObjectStateException`, and `ConflictException` map to `HttpStatus.CONFLICT` (409).
- Tested via `ComplaintOptimisticLockingIntegrationTest.java`:
  - 5 tests verifying stale version rejection, JPA concurrency detection, and clean rollback.

#### 4. Clean Rollback Guarantee
- All update operations are marked `@Transactional`.
- When an optimistic lock exception occurs before or during flush, the entire transaction rolls back.
- Status history entries and audit logs within the failed transaction are discarded by PostgreSQL.

#### 5. Mutation Workflow Audit
| Workflow | Method | Sends Client Version? | Enforces JPA Version? | Direct SQL Bypass? |
|---|---|---|---|---|
| **Officer Assignment** | `POST /api/complaints/{id}/assign` | Yes (`AssignComplaintRequest.version`) | Yes | No |
| **Status Update** | `PUT /api/complaints/{id}/status` | Yes (`UpdateStatusRequest.version`) | Yes | No |
| **Worker Evidence Submit** | `POST /api/complaints/{id}/evidence` | Managed in session | Yes (JPA flush updates version) | No |
| **Progress Note Add** | `POST /api/complaints/{id}/notes` | Managed in session | Yes (JPA flush updates version) | No |

#### 6. Frontend Handling of 409 Responses
- `apiClient.js` parses HTTP 409 and attaches `error.status = 409`.
- Worker and Officer review pages catch 409 errors and present actionable toasts:
  > *"Conflict Detected: This complaint was updated by another user. Reloading latest state..."*
- Stale updates are never silently retried.

---

### Section D: Regression and Security Verification

#### 1. Role-Based Access Control Verification
- **Citizen:** Can only view own complaints, upload intake photos, view progress notes. Blocked from officer assignment, direct status manipulation, and other citizens' files.
- **Worker:** Can only view assigned tasks, update assigned task status (`IN_PROGRESS`), submit resolution evidence, add progress notes. Blocked from reassigning or reviewing tasks.
- **Officer:** Can assign workers, reject complaints, verify resolution evidence (`APPROVE`, `REQUEST_REWORK`), download all complaint evidence.
- **Admin:** Full access across all queues and audit endpoints.

#### 2. Migration Stability
- Database verified live:
  ```
  V1__initial_schema.sql (Success)
  V2__seed_roles_and_dev_users.sql (Success)
  V3__add_complaint_photos.sql (Success)
  V4__add_complaint_version.sql (Success)
  ```
- All foreign keys, cascade deletes, and primary keys intact.

---

## 4. Test Commands and Actual Results

### Backend Test Execution
```bash
cd backend
cmd.exe /c "mvnw.cmd test"
```
**Actual Output:**
```
[INFO] Results:
[INFO] 
[INFO] Tests run: 103, Failures: 0, Errors: 0, Skipped: 0
[INFO] 
[INFO] ------------------------------------------------------------------------
[INFO] BUILD SUCCESS
[INFO] ------------------------------------------------------------------------
[INFO] Total time:  01:37 min
[INFO] Finished at: 2026-10-22T21:35:49+05:30
[INFO] ------------------------------------------------------------------------
```
*Note: Test coverage includes 5 optimistic locking tests, 11 officer assignment tests, 16 worker task tests, 20 officer service unit tests, 24 worker service unit tests, 9 local storage tests, and 5 citizen photo integration tests.*

### Frontend Test Execution
```bash
npm.cmd test -- --run
```
**Actual Output:**
```
> civicfix-ai@1.0.0 test
> node --test tests/**/*.test.js --run

✔ API Client Adapter Tests (110.905ms)
✔ AuthService Stabilization Tests (1339.2438ms)
✔ ComplaintService Integration Tests (Sprint 3, Step 2) (219.634ms)
✔ Dynamic Complaint Location Details (Phase 2 Step 2.3) (7.5412ms)
✔ OfficerService Integration Tests (Sprint 3, Step 3) (197.1817ms)
✔ Phone & Contact Utilities (13.0527ms)
✔ WorkerService Integration Tests (Sprint 3, Step 4A) (244.8935ms)
✔ XSS Security Sanitization Tests (Defect 7) (6.8173ms)

ℹ tests 72
ℹ suites 8
ℹ pass 72
ℹ fail 0
ℹ cancelled 0
ℹ skipped 0
ℹ todo 0
ℹ duration_ms 1592.7821
```

### Production Frontend Build
```bash
npm.cmd run build
```
**Actual Output:**
```
> civicfix-ai@1.0.0 build
> vite build

vite v5.4.21 building for production...
transforming...
✓ 103 modules transformed.
rendering chunks...
computing gzip size...
dist/index.html                   1.41 kB │ gzip:   0.73 kB
dist/assets/index-CSgxvNQ2.css   70.48 kB │ gzip:  15.94 kB
dist/assets/index--UZX3Va_.js   865.38 kB │ gzip: 207.14 kB
✓ built in 11.66s
```

---

## 5. Remaining Risks and Manual Checks

1. **Storage Volume Lifecycle (Low Risk):**
   - Uploaded files are currently stored on the local filesystem (`uploads/evidence/`).
   - *Recommendation for production:* Configure an S3-compatible object storage provider (e.g., AWS S3, MinIO) via Spring Profile for cloud deployments.
2. **Citizen Offline Form Recovery (Low Risk):**
   - When submitting a complaint, if network fails after photo upload, draft recovery relies on browser state.
   - *Recommendation for future phase:* Store draft complaints in IndexedDB with retry queue.
3. **Chunk Size Optimization (Low Risk):**
   - Vite build reported single bundle size (`865 kB`). Consider manual chunking (`build.rollupOptions.output.manualChunks`) in Phase 3 performance tuning.

---

## 6. Official Exit Decision

| Exit Gate | Required Criteria | Audit Assessment | Status |
|---|---|---|---|
| **Gate 1: Evidence Storage & Access** | Files saved to disk, linked to DB, path sanitized, RBAC protected | Verified in code and tests | **PASS** |
| **Gate 2: Dynamic Locations** | No synthetic coordinates, proper zero handling, telemetry segregated | Verified across frontend services & UI | **PASS** |
| **Gate 3: Optimistic Locking** | Flyway V4 applied, JPA `@Version` active, 409 conflict handled | Verified in DB, backend, tests | **PASS** |
| **Gate 4: Test Suites & Build** | All tests pass, production bundle compiles cleanly | 103 backend + 72 frontend pass, build OK | **PASS** |

### Final Decision: **Phase 2 Complete**

The CivicFix platform has successfully satisfied all remediation objectives and security criteria established for Phase 2. The codebase is stable, secure, and ready for Phase 3 planning.
