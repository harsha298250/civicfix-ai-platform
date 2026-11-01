# CivicFix — Phase 2 Remediation Step 2.4: Optimistic Locking and Concurrent Update Safety Report

**Date:** 2026-10-22  
**Role:** Senior Java Spring Boot Engineer & Application Security Engineer  
**Component:** Concurrency Governance Subsystem (`Complaint.java`, `ComplaintService.java`, `GlobalExceptionHandler.java`, `V4__add_complaint_version.sql`, `ComplaintOptimisticLockingIntegrationTest.java`)  
**Status:** Remediated & Fully Verified  

---

## 1. Initial Findings

During the Phase 2 audit (`docs/PHASE_2_CORE_WORKFLOW_SECURITY_AUDIT.md`), concurrent update safety across the complaint lifecycle was audited:

1. **Absence of Optimistic Concurrency Control:**  
   The `Complaint` JPA entity lacked a `@Version` field, and the PostgreSQL `complaints` table lacked a `version` column.
2. **Risk of Blind Overwrites / Lost Updates:**  
   When two actors (e.g. an officer assigning a technician while a worker submits evidence, or two officers adjudicating the same complaint simultaneously) retrieved the entity at state A and committed divergent updates, the database executed an unrestricted `UPDATE complaints SET ... WHERE id = ?`. The latter transaction silently overwrote the earlier transition without detection.
3. **Unexplained HTTP 500 Responses on Collision:**  
   `GlobalExceptionHandler.java` lacked handlers for JPA/Hibernate optimistic locking exceptions (`ObjectOptimisticLockingFailureException`, `OptimisticLockException`, `StaleObjectStateException`). Any concurrency conflict would have resulted in an uninformative HTTP 500 Internal Server Error instead of a structured HTTP 409 Conflict response.
4. **No Client-Facing Version Tracking:**  
   `ComplaintResponse` DTO did not expose the record's version, preventing frontend and API consumers from knowing whether they were submitting updates against a stale record.

---

## 2. Technical Implementation & Files Changed

### 1. `backend/src/main/resources/db/migration/V4__add_complaint_version.sql`
- Added Flyway migration V4 matching existing repository conventions (`V1__initial_schema.sql`, `V2__seed_roles_and_dev_users.sql`, `V3__add_complaint_photos.sql`).
- Executed `ALTER TABLE complaints ADD COLUMN version BIGINT NOT NULL DEFAULT 0;`.
- Ensures existing complaints are defaulted to version 0 and backwards compatibility is preserved.
- Hibernate `ddl-auto: validate` successfully validates the schema.

### 2. `backend/src/main/java/com/civicfix/complaint/Complaint.java`
- Added JPA optimistic locking annotation:
  ```java
  @Version
  @Column(name = "version", nullable = false)
  private Long version = 0L;
  ```
- Added `getVersion()` and `setVersion(Long version)` accessors.

### 3. `backend/src/main/java/com/civicfix/complaint/dto/ComplaintResponse.java`
- Added `private Long version;` with getters/setters.
- In `fromEntity(Complaint c)`, populated `resp.setVersion(c.getVersion());`.

### 4. `backend/src/main/java/com/civicfix/complaint/dto/UpdateStatusRequest.java` & `AssignComplaintRequest.java`
- Added optional `private Long version;` with getters and setters, allowing API consumers to supply their known version for upfront conflict verification.

### 5. `backend/src/main/java/com/civicfix/common/exception/GlobalExceptionHandler.java`
- Added exception handler for JPA/Spring optimistic locking exceptions:
  ```java
  @ExceptionHandler({
          org.springframework.orm.ObjectOptimisticLockingFailureException.class,
          jakarta.persistence.OptimisticLockException.class,
          org.hibernate.StaleObjectStateException.class
  })
  public ResponseEntity<Map<String, Object>> handleOptimisticLockConflict(Exception ex, WebRequest req) {
      return buildResponse(HttpStatus.CONFLICT, "Complaint has been modified by another transaction or user. Please refresh the record and try again.", req);
  }
  ```
- Catches any concurrent database collisions and maps them to clean HTTP 409 Conflict responses.

### 6. `backend/src/main/java/com/civicfix/complaint/ComplaintService.java`
- In `assignWorker`: added check comparing `req.getVersion()` against `complaint.getVersion()`. If mismatched, throws `ConflictException`.
- In `transitionStatus`: added check comparing `req.getVersion()` against `complaint.getVersion()`. If mismatched, throws `ConflictException`.
- Added `complaintRepository.flush()` in `assignWorker`, `transitionStatus`, `addProgressNote`, and `submitEvidence` to ensure SQL UPDATE statements are dispatched to PostgreSQL immediately, allowing concurrency conflicts to trigger inside the method boundary.
- In `submitEvidence`: wrapped persistence in a `try / catch` block that automatically unlinks any uploaded files via `storageService.deleteFile(...)` if persistence fails or a concurrency collision occurs, preventing orphaned files.

### 7. `src/services/complaintService.js`
- Updated `mapBackendComplaintToFrontend` to propagate `version: item.version != null ? Number(item.version) : 0` to frontend state.

---

## 3. Conflict-Handling Behavior

| Interaction Pattern | Mechanism | HTTP Status | Response Message | DB State Integrity |
| :--- | :--- | :---: | :--- | :--- |
| **Client-Supplied Stale Version** | Checked in `ComplaintService` before state mutation | `409 CONFLICT` | `"Complaint has been modified by another transaction or user. Please refresh the record and try again."` | No DB changes made; status history and audit log remain untouched. |
| **Interleaved Database Update** | JPA `@Version` Hibernate `WHERE version = ?` verification on `flush()` | `409 CONFLICT` | `"Complaint has been modified by another transaction or user. Please refresh the record and try again."` | Spring transaction rolls back entirely; previous transaction's data is preserved without corruption. |
| **Sequential Non-Conflicting Updates** | Monotonically incrementing version (0 -> 1 -> 2 ...) | `200 OK` | Standard success response with incremented version | Audit logs and status history entries recorded sequentially. |

---

## 4. Tests Executed & Exact Results

### 4.1 Automated Optimistic Locking Test Suite
**Test Class:** `com.civicfix.complaint.ComplaintOptimisticLockingIntegrationTest`  
**Command:** `cmd.exe /c "mvnw.cmd test -Dtest=ComplaintOptimisticLockingIntegrationTest"`  
**Result:** **BUILD SUCCESS (5/5 tests passed, 0 failures, 0 errors)**

| Test Case | Description | Result |
| :--- | :--- | :---: |
| `testInitialComplaintHasVersionZero` | Verifies that new complaints start with version `0` and are exposed in `ComplaintResponse`. | **PASS** |
| `testSequentialUpdatesIncrementVersionMonotonically` | Verifies assignment (0 -> 1) and status change (1 -> 2) advance version without conflict. | **PASS** |
| `testConcurrentUpdatesRejectStaleUpdateWith409` | Two clients start at version 0; Update 1 succeeds (version 1); Update 2 with stale version 0 is rejected with HTTP 409 Conflict and helpful message. DB remains untouched. | **PASS** |
| `testJpaLevelOptimisticLockingCollision` | Two detached JPA entities with identical initial version attempt concurrent flushes. Second flush throws `ObjectOptimisticLockingFailureException`. | **PASS** |
| `testAuditLogAndHistoryRemainConsistentOnConflict` | Confirms status history and audit ledger record only the successful update, with no phantom records from the rejected transaction. | **PASS** |

### 4.2 Full Backend Regression Test Suite
**Command:** `cmd.exe /c "mvnw.cmd test"`  
**Result:** **BUILD SUCCESS (103/103 tests passed, 0 failures, 0 errors, execution time: 50.560s)**

| Test Class | Executed | Passed | Failed | Skipped | Scope |
| :--- | :---: | :---: | :---: | :---: | :--- |
| `AuthControllerIntegrationTest` | 7 | 7 | 0 | 0 | Auth, Sessions, CSRF, Bad credentials |
| `CitizenComplaintPhotoIntegrationTest` | 13 | 13 | 0 | 0 | Citizen intake photos & multipart upload |
| `CivicFixApplicationTests` | 1 | 1 | 0 | 0 | Context load & Flyway schema validation |
| `ComplaintAuthorizationIntegrationTest` | 1 | 1 | 0 | 0 | Endpoint authorization guards |
| `ComplaintOptimisticLockingIntegrationTest` | 5 | 5 | 0 | 0 | Optimistic concurrency & conflict rejection |
| `ComplaintServiceOfficerTest` | 20 | 20 | 0 | 0 | Officer review, assignment, resolution verification |
| `ComplaintServiceWorkerTest` | 24 | 24 | 0 | 0 | Worker status transitions & evidence checks |
| `OfficerAssignmentIntegrationTest` | 11 | 11 | 0 | 0 | Officer assignment & verification lifecycle |
| `WorkerTaskIntegrationTest` | 16 | 16 | 0 | 0 | Worker task lifecycle & evidence uploads |
| `PasswordHashingTest` | 1 | 1 | 0 | 0 | BCrypt strength and salt generation |
| `LocalStorageServiceTest` | 9 | 9 | 0 | 0 | Upload storage, MIME type validation |
| **Total Backend Tests** | **103** | **103** | **0** | **0** | **100% Pass Rate** |

### 4.3 Frontend Regression Suite & Production Build
**Command:** `npm.cmd run test`  
**Result:** **PASS (72/72 tests passed across 8 suites, 0 failures)**

**Command:** `npm.cmd run build`  
**Result:** **SUCCESS (103 modules transformed in 7.94s, 0 errors)**

---

## 5. Remaining Risks & Unverified Behavior

1. **Frontend Conflict Toast:**  
   When HTTP 409 is returned from backend upon a concurrency collision, the frontend receives `{ status: 409, message: "Complaint has been modified..." }`. Existing error handlers in `OfficerService` and `WorkerService` rethrow the error, prompting the UI error banner or toast. A future enhancement could offer an interactive "Refresh Ticket" button directly inside the conflict toast.
2. **Third-Party / Background Batch Jobs:**  
   Any automated batch scripts interacting directly with SQL (bypassing JPA) would need to include `version = version + 1` in raw UPDATE queries if batch maintenance is added in future sprints.
