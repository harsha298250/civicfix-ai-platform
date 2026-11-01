# CivicFix — Phase 2 Remediation Step 2.2: Citizen Complaint Photo Persistence Report

**Date:** 2026-10-22  
**Role:** Senior Spring Boot Engineer & Application Security Engineer  
**Component:** Citizen Complaint Intake Subsystem (`ComplaintService`, `ComplaintController`, `ComplaintPhoto`, `ComplaintPhotoRepository`, `LocalStorageService`, `complaintService.js`)  
**Status:** Remediated & Fully Verified  

---

## 1. Verified Root Cause & Original Behavior

### Original Behavior
During Phase 2 Audit (`docs/PHASE_2_CORE_WORKFLOW_SECURITY_AUDIT.md`), it was verified that photos attached by citizens when reporting civic defects were never persisted by the backend:
1. `CreateComplaintRequest.java` and `ComplaintController.java` only accepted JSON fields (`title`, `description`, `category`, `priority`, `address`, `latitude`, `longitude`, `ward`) without any file or photo metadata.
2. The PostgreSQL database schema had no table linking intake photos to complaints.
3. In `ReportComplaintPage.jsx`, photos selected from disk or captured via camera were converted to temporary browser blob URLs (`blob:...`) or fallback unsplash URLs.
4. In `complaintService.js:328`, `photos: newComplaint.photos || []` was simply cached in the browser's `localStorage`.
5. Upon browser session clear, page reload, or inspection by municipal officers or field workers on another device/browser, the citizen's intake photos were completely missing.

---

## 2. Architecture & Design

### Storage Design
- **Storage Subdirectory:** Citizen intake photos are stored via `LocalStorageService.storeFile(file, "complaints/" + complaintId)`.
- **Physical Location:** `backend/uploads/evidence/complaints/{complaintId}/evidence-{uuid}.{ext}`.
- **Path Traversal & Filename Generation:** Filenames are generated server-side using unguessable UUIDs; client-supplied filenames and path sequences (`..`, `/`, `\`) are sanitized and rejected.
- **Allowed MIME Types & Extensions:** Restricted to `image/jpeg`, `image/png`, `image/webp` with a 10MB per-file limit and a maximum of 5 photos per complaint.
- **Rollback / Cleanup:** If file storage or database persistence fails during a batch upload, all partially created disk files are immediately unlinked via `storageService.deleteFile(...)` and the database transaction is rolled back.

### Database Migration & Schema Changes
Created Flyway migration `V3__add_complaint_photos.sql` (`backend/src/main/resources/db/migration/V3__add_complaint_photos.sql`):
```sql
CREATE TABLE complaint_photos (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    complaint_id UUID NOT NULL REFERENCES complaints(id) ON DELETE CASCADE,
    photo_url VARCHAR(500) NOT NULL,
    file_name VARCHAR(255),
    file_size BIGINT,
    content_type VARCHAR(100),
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_complaint_photos_complaint ON complaint_photos(complaint_id);
```
- Validated with Hibernate `ddl-auto: validate`.
- Mapped to JPA Entity `ComplaintPhoto.java` and linked bidirectionally via `@OneToMany(mappedBy = "complaint", cascade = CascadeType.ALL, orphanRemoval = true) List<ComplaintPhoto> photos` in `Complaint.java`.

### API Contract (Before & After)

#### Before
- `POST /api/complaints`: Consumed only `application/json` (no photo upload capability).
- `GET /api/complaints/{id}`: Returned `ComplaintResponse` without `photos` field.

#### After
- `POST /api/complaints` (`consumes = application/json`): Retained for 100% backward compatibility for text-only complaints.
- `POST /api/complaints` (`consumes = multipart/form-data`): Accepts `CreateComplaintRequest` form fields alongside `files` (`List<MultipartFile>`), creating the complaint and persisting intake photos atomically.
- `POST /api/complaints/{id}/photos` (`consumes = multipart/form-data`): Allows complaint author, officer, or admin to upload follow-up intake photos to an existing ticket.
- `GET /api/complaints/evidence/files/{filename}` & `GET /api/complaints/photos/files/{filename}`: Secure photo retrieval endpoint. Validates that the requested file is linked to either a `ResolutionEvidence` or a `ComplaintPhoto` record in the database before resolving from disk.
- `ComplaintResponse`: Now includes `List<String> photos`, populated with persistent backend URLs (`/api/complaints/evidence/files/evidence-{uuid}.{ext}`).

### Authorization Matrix
`ComplaintService.loadEvidenceFile(filename, principal)`:
1. Validates that the file exists in `resolution_evidence` OR `complaint_photos`. If unlinked, returns HTTP 404 (prevents arbitrary file discovery on disk).
2. Evaluates `enforceReadPermission(complaint, principal)`:
   - **ROLE_ADMIN** & **ROLE_OFFICER**: Granted access across all municipal complaints.
   - **ROLE_WORKER**: Granted access **only** if assigned to the complaint (enables field workers to review defect photos before dispatch).
   - **ROLE_CITIZEN**: Granted access **only** if the citizen created the complaint.
   - **Unassigned Worker / Non-Author Citizen**: Rejected with HTTP 403 Forbidden.
   - **Unauthenticated Visitor**: Rejected with HTTP 401/403.

---

## 3. Files Changed and Why

| File | Changes Made |
| :--- | :--- |
| `backend/src/main/resources/db/migration/V3__add_complaint_photos.sql` | New Flyway migration adding `complaint_photos` table and index. |
| `backend/src/main/java/com/civicfix/complaint/ComplaintPhoto.java` | New JPA entity matching `complaint_photos` table. |
| `backend/src/main/java/com/civicfix/complaint/ComplaintPhotoRepository.java` | New Spring Data JPA repository for complaint photos. |
| `backend/src/main/java/com/civicfix/complaint/Complaint.java` | Added `photos` collection mapping (`@OneToMany`) and getters/setters. |
| `backend/src/main/java/com/civicfix/complaint/dto/ComplaintResponse.java` | Added `photos` field and mapped `c.getPhotos()` URLs in `fromEntity`. |
| `backend/src/main/java/com/civicfix/complaint/ComplaintService.java` | Injected `ComplaintPhotoRepository`; overloaded `createComplaint` to support multipart files; added `addComplaintPhotos`; updated `loadEvidenceFile` to verify `ComplaintPhoto` alongside `ResolutionEvidence`. |
| `backend/src/main/java/com/civicfix/complaint/ComplaintController.java` | Added multipart `createComplaint` overload, added `uploadComplaintPhotos`, and added dual path mapping (`/evidence/files/...`, `/photos/files/...`). |
| `src/services/apiClient.js` | Added `apiClient.complaints.uploadPhotos` helper. |
| `src/services/complaintService.js` | Updated `create` to construct `FormData` when real files are provided; mapped `photos` from backend response. |
| `src/pages/citizen/ReportComplaintPage.jsx` | Filtered real `File` objects from `formData.photos` and passed them to `complaintService.create`. |
| `backend/src/test/java/com/civicfix/complaint/CitizenComplaintPhotoIntegrationTest.java` | New integration test suite covering single/multi photo upload, backwards compatibility, invalid types, size limits, worker access, and citizen privacy. |
| `backend/src/test/java/com/civicfix/complaint/ComplaintServiceOfficerTest.java` | Added `complaintPhotoRepository` mock. |
| `backend/src/test/java/com/civicfix/complaint/ComplaintServiceWorkerTest.java` | Added `complaintPhotoRepository` mock. |
| `tests/complaintService.test.js` | Added unit tests verifying FormData construction and backend photo array preservation. |

---

## 4. Verification and Test Results

### 1. Focused Integration Test Suite
```bash
cmd.exe /c "mvnw.cmd test -Dtest=CitizenComplaintPhotoIntegrationTest"
```
**Outcome:**
- `citizenCreatesComplaintWithSinglePhoto`: PASS (201 Created, 1 persistent photo URL returned, retrieved via GET).
- `citizenCreatesComplaintWithMultiplePhotos`: PASS (201 Created, 2 photos persisted and retrieved by officer).
- `complaintCreationWithoutPhotosSucceeds`: PASS (201 Created, backward-compatible JSON endpoint).
- `invalidFileTypeRejected`: PASS (400 Bad Request on shellscript file).
- `exceedingMaxPhotosRejected`: PASS (400 Bad Request when 6 photos submitted).
- `unauthenticatedUploadRejected`: PASS (401 Unauthorized for anonymous requests).
- `unauthorizedCitizenCannotAccessOtherCitizenPhoto`: PASS (403 Forbidden for non-author citizen).
- `workerAccessPolicyOnCitizenPhoto`: PASS (403 when unassigned, 200 OK after dispatch).
- `citizenCanAddPhotosToExistingComplaint`: PASS (200 OK via `POST /{id}/photos`).
- **Tests run: 9, Failures: 0, Errors: 0, Skipped: 0** (`BUILD SUCCESS`).

### 2. Full Backend Test Suite
```bash
cmd.exe /c "mvnw.cmd test"
```
**Outcome:**
- **Tests run: 98, Failures: 0, Errors: 0, Skipped: 0** (`BUILD SUCCESS`).
- All 9 test suites passed with zero regressions.

### 3. Frontend Test Suite
```bash
npm.cmd run test
```
**Outcome:**
- **Tests: 65 passed, 0 failed** across 7 test suites.

### 4. Frontend Production Build
```bash
npm.cmd run build
```
**Outcome:**
- Vite build completed in 19.97 s with 0 errors.

### 5. Live Server End-to-End Workflow Verification
```bash
python scratch/verify_live_workflow.py
```
**Outcome:**
- Step 2: Citizen submitted complaint with real multipart intake photo -> Status: 201, Photos Count: 1.
- Citizen retrieved own intake photo -> Status: 200 OK (Bytes: 40).
- Officer viewed complaint queue and assigned Marcus Chen.
- Marcus Chen transitioned task, completed repairs, uploaded repair evidence photo -> Status: 200.
- Officer retrieved worker evidence photo -> Status: 200.
- All 12 workflow steps completed end-to-end against live PostgreSQL and Spring Boot runtime.

---

## 5. Remaining Limitations & Recommended Next Steps

1. **AI Defect Detection / Triage (Phase 3):** Currently, AI confidence and triage scores remain client-simulated. Once citizen intake photos are persisted on disk, a backend deep-learning/vision triage pipeline can ingest these images.
2. **Citizen Photo Deletion / Replacement:** Currently, citizen intake photos cannot be individually deleted once the complaint is locked in `ASSIGNED` or `IN_PROGRESS` status (by audit policy design).
3. **Thumbnail Generation:** Images are served directly; future optimization can introduce webp thumbnail resizing.

---

## 6. Conclusion
Step 2.2 is completely implemented, verified, and backward-compatible. No schema errors or data loss occurred, all 98 backend tests and 65 frontend tests pass, and live end-to-end verification confirms photo upload, PostgreSQL linkage, and authorized retrieval.
