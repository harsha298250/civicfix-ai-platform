# CivicFix — Phase 2 Remediation Step 2.1: Evidence Download Bug & Authorization Audit Report

**Date:** 2026-10-22  
**Role:** Senior Spring Boot Engineer & Application Security Engineer  
**Component:** Evidence Storage & Retrieval Subsystem (`ComplaintService`, `ComplaintController`, `ResolutionEvidenceRepository`, `LocalStorageService`)  
**Status:** Remediated & Fully Verified  

---

## 1. Executive Summary

During Phase 2 manual audit (`docs/PHASE_2_CORE_WORKFLOW_SECURITY_AUDIT.md`), a functional defect and a potential authorization bypass were identified in the resolution evidence download flow:
1. **Defect:** Worker repair evidence photos are stored on disk under `uploads/evidence/complaints/{complaintId}/evidence-{uuid}.jpg`. However, `ComplaintService.loadEvidenceFile(filename, principal)` previously called `storageService.loadFileAsResource(filename, "complaints")` without the `{complaintId}` subdirectory, causing officer retrieval of repair photos via `GET /api/complaints/evidence/files/{filename}` to return **HTTP 404 Not Found**.
2. **Security Vulnerability:** Files that might exist on disk in the upload root without being linked to an active database `ResolutionEvidence` record could theoretically be served or exposed without ownership/complaint validation if `evidenceOpt.isEmpty()` was not strictly rejected.

In Step 2.1, this defect was remediated with strict defense-in-depth authorization, path traversal protection, database linkage validation, and scoped complaint subdirectory resolution.

---

## 2. Root Cause Verification in Actual Code

### Actual Upload Flow (`submitEvidence`)
When a field worker uploads repair photos in `ComplaintService.submitEvidence`:
```java
// ComplaintService.java:374
String storedUrl = storageService.storeFile(file, "complaints/" + complaint.getId());
```
- Physical storage location: `backend/uploads/evidence/complaints/{complaintId}/evidence-{uuid}.jpg`
- Stored `photoUrl` in database `resolution_evidence`: `/api/complaints/evidence/files/evidence-{uuid}.jpg`

### Previous Retrieval Flow (`loadEvidenceFile`)
```java
// Pre-remediation ComplaintService.java:510
return storageService.loadFileAsResource(cleanName, "complaints");
```
- Looked inside `backend/uploads/evidence/complaints/evidence-{uuid}.jpg` (missing the `{complaintId}` subdirectory level).
- Because the physical file resided in `complaints/{complaintId}/`, `storageService.loadFileAsResource` threw `FileNotFoundException`, and the endpoint returned HTTP 404.
- Previous unit test `ComplaintServiceOfficerTest` masked this defect by stubbing `when(storageService.loadFileAsResource("evidence-123.jpg", "complaints")).thenReturn(fakeResource)` without testing integration with `ResolutionEvidenceRepository`.

---

## 3. Files Changed and Technical Implementation

### 1. `backend/src/main/java/com/civicfix/complaint/ComplaintService.java`
- **Method Annotated:** Marked `loadEvidenceFile` with `@Transactional(readOnly = true)`.
- **Pre-Execution Sanitization:**
  - Null/blank check: throws `BadRequestException("Filename cannot be empty.")`.
  - Traversal check: cleans path with `StringUtils.cleanPath(filename.trim())` and rejects any path containing `..`, `/`, or `\`, preventing directory traversal attempts.
- **Mandatory Database Linkage Verification:**
  - Queries `evidenceRepository.findFirstByPhotoUrlContaining(cleanName)`.
  - If no matching `ResolutionEvidence` record exists in the database, immediately throws `ResourceNotFoundException("Evidence photo not found: " + cleanName)`.
  - Eliminates the vulnerability where arbitrary or unlinked files on the server's disk could be probed or served.
- **Enterprise RBAC & Object-Level Access Control (ABAC):**
  - Calls `enforceReadPermission(evidence.getComplaint(), principal)`:
    - **ROLE_ADMIN** and **ROLE_OFFICER**: Granted read access across municipal jurisdictions.
    - **ROLE_WORKER**: Granted read access **only** if assigned to the associated complaint (`complaint.getAssignedWorker().getId().equals(principal.getId())`), otherwise throws `ForbiddenException`.
    - **ROLE_CITIZEN**: Granted read access **only** if the citizen created the complaint (`complaint.getCitizen().getId().equals(principal.getId())`), otherwise throws `ForbiddenException`.
- **Subdirectory Path Resolution:**
  - Resolves file strictly using the complaint-specific subdirectory: `"complaints/" + evidence.getComplaint().getId()`.
  - Calls `storageService.loadFileAsResource(cleanName, subDirectory)`.
- **Safe Error Handling:**
  - Catches `IOException` and throws `ResourceNotFoundException("Evidence photo not found or not readable: " + cleanName)` without exposing absolute filesystem paths, server OS details, or stack traces.

### 2. `backend/src/main/java/com/civicfix/complaint/ComplaintController.java`
- Added `@PreAuthorize("isAuthenticated()")` defense-in-depth method security annotation to `getEvidenceFile` endpoint.

### 3. `backend/src/test/java/com/civicfix/complaint/ComplaintServiceOfficerTest.java`
- Expanded test coverage from 1 simple mock to 11 targeted unit tests covering all authorization branches, parameter validation, path traversal rejections, unlinked file rejections, and storage IO error masking.

### 4. `backend/src/test/java/com/civicfix/complaint/WorkerTaskIntegrationTest.java`
- Added end-to-end integration test `testEvidenceDownloadResolutionAndAuthorization`:
  - Worker uploads real multipart image bytes.
  - Officer retrieves evidence file -> 200 OK with identical binary bytes.
  - Assigned worker retrieves evidence file -> 200 OK with identical binary bytes.
  - Complaint owner citizen retrieves evidence file -> 200 OK with identical binary bytes.
  - Independent citizen from different ward registered dynamically -> 403 Forbidden.
  - Non-existent or unlinked file -> 404 Not Found.
  - Path traversal `..%2F..%2Fsecret.jpg` -> 400 Bad Request.

---

## 4. Security Matrix & Verification

| Security Scenario | Actor / Request | Expected Outcome | Verification Status |
| :--- | :--- | :--- | :--- |
| **Legitimate Officer Retrieval** | Municipal Officer (`OFFICER`) accessing linked evidence in `complaints/{id}` | HTTP 200 OK, valid image stream | **PASS** (Unit & Integration) |
| **Legitimate Worker Retrieval** | Assigned Field Worker (`WORKER`) | HTTP 200 OK, valid image stream | **PASS** (Unit & Integration) |
| **Legitimate Citizen Retrieval** | Citizen Owner (`CITIZEN`) | HTTP 200 OK, valid image stream | **PASS** (Unit & Integration) |
| **Unauthorized Citizen** | Another Citizen (`CITIZEN`) requesting private evidence | HTTP 403 Forbidden | **PASS** (Unit & Integration) |
| **Unauthorized Worker** | Worker not assigned to ticket | HTTP 403 Forbidden | **PASS** (Unit test) |
| **Unauthenticated Request** | Anonymous / Null Principal | HTTP 403 Forbidden | **PASS** (Unit test) |
| **Unlinked File on Disk** | Any role requesting filename not linked in DB | HTTP 404 Not Found (no disk lookup) | **PASS** (Unit & Integration) |
| **Missing Physical File** | File linked in DB but deleted from storage disk | HTTP 404 Not Found (safe message, no leak) | **PASS** (Unit test) |
| **Path Traversal Attempt** | Filename containing `..`, `/`, `\` | HTTP 400 Bad Request | **PASS** (Unit & Integration) |
| **Empty Filename** | Blank or whitespace filename | HTTP 400 Bad Request | **PASS** (Unit test) |

---

## 5. Verification Commands and Outcomes

### Backend Test Execution
```bash
cmd.exe /c "mvnw.cmd test"
```
**Outcome:**
- `ComplaintServiceOfficerTest`: 20 tests run, 0 failures, 0 errors, 0 skipped.
- `WorkerTaskIntegrationTest`: 16 tests run, 0 failures, 0 errors, 0 skipped.
- Total Backend Suite: **89 tests run, 0 failures, 0 errors, 0 skipped**.
- **Result:** `BUILD SUCCESS` (Execution time: 41.5 s).

### Frontend Test Execution
```bash
npm.cmd run test
```
**Outcome:**
- Tests: **64 passed, 0 failed** across 7 test suites.
- Duration: 1.13 s.

### Live Server End-to-End Verification
```bash
python scratch/verify_live_workflow.py
```
**Outcome:**
- Step 7: Worker uploads authentic repair photo -> Status: 200.
- Officer retrieves evidence photo file via `GET /api/complaints/evidence/files/{filename}` -> **Status: 200 OK** (previously returned 404).
- All 12 workflow steps completed end-to-end against live PostgreSQL and Spring Boot runtime.

---

## 6. Unresolved Concerns / Out-of-Scope Items Noted
1. **Citizen Intake Photos (Step 2.2):** As specified in safety rules, citizen intake photo upload was untouched and remains scheduled for Step 2.2.
2. **Database Integrity:** No migrations or schema changes were performed. PostgreSQL tables, Flyway history (V1 and V2), and existing upload artifacts were preserved intact.
