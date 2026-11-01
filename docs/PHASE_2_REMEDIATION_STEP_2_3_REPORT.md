# CivicFix — Phase 2 Remediation Step 2.3: Dynamic Complaint Location Details Report

**Date:** 2026-10-22  
**Role:** Senior Frontend Engineer & Application Security Engineer  
**Component:** Complaint Geolocation & Evidence Telemetry Subsystem (`ComplaintDetailsPage.jsx`, `complaintService.js`, `complaintService.test.js`)  
**Status:** Remediated & Fully Verified  

---

## 1. Verified Root Cause

During the Phase 2 Core Workflow & Security Audit (`docs/PHASE_2_CORE_WORKFLOW_SECURITY_AUDIT.md`), hardcoded location values and synthetic coordinate fallbacks were identified in the citizen complaint details flow:

1. **Hardcoded Telemetry String (`ComplaintDetailsPage.jsx:383`):**  
   Inside the *Field Resolution Proof & Official Review* card, the string `"GPS Telemetry Validated: 13.0850° N, 80.2101° E"` was statically hardcoded in JSX rather than reading resolution coordinates from the worker's submitted evidence or the complaint's geotag.
2. **Hardcoded Coordinate Fallback in UI (`ComplaintDetailsPage.jsx:438`):**  
   Inside the *Incident Geolocation* card, coordinates were rendered with `|| 13.0850` and `|| 80.2101`. In JavaScript, zero-valued coordinates (e.g. `lat: 0.0, lng: 0.0`) are falsy, which erroneously forced valid zero coordinates to display as Anna Nagar, Chennai (`13.0850° N, 80.2101° E`).
3. **Synthetic Coordinate Default in Service Mapping (`complaintService.js:55-58`):**  
   When mapping raw backend entities in `mapBackendComplaintToFrontend`, missing coordinates (`item.latitude == null`) defaulted to `{ lat: 13.0845, lng: 80.2155 }`. This fabricated non-existent coordinates for complaints submitted without location coordinates.
4. **Hardcoded District and Default Labels:**  
   `complaintService.js` previously forced `'District 4'` and `'Ward 08'` when backend fields were null or unassigned.

---

## 2. Technical Implementation & Files Changed

### 1. `src/services/complaintService.js`
- **Introduced `hasValidCoordinates(coords)`:**
  - Validates coordinate objects (`{ lat, lng }` or `{ latitude, longitude }`).
  - Supports numeric values and parseable decimal strings.
  - Strictly preserves valid zero-valued coordinates (`lat: 0, lng: 0`).
  - Enforces geographical boundary rules: `-90 <= lat <= 90` and `-180 <= lng <= 180`.
  - Rejects `null`, `undefined`, empty strings, `NaN`, and out-of-bounds coordinates.
- **Introduced `formatCoordinates(coords)`:**
  - Formats coordinates into standard compass notation: e.g. `13.0850° N, 80.2101° E` or `33.8688° S, 151.2093° E`.
  - Accurately renders zero coordinates as `0.0000° N, 0.0000° E`.
  - Returns `null` when coordinates are absent or invalid.
- **Updated `mapBackendComplaintToFrontend(item)`:**
  - Coordinates are derived strictly from the backend record (`item.location?.coordinates` or top-level `item.latitude`/`item.longitude`).
  - If backend coordinates are absent or null, `mapped.location.coordinates` is set to `null` (no fabricated defaults).
  - Worker resolution evidence coordinates are mapped dynamically from `item.evidence[0].latitude` and `longitude`.
  - Removed hardcoded `'District 4'` fallback; preserves actual `district` if present or `null` if unassigned.
  - Preserves raw `address` and `ward` strings without forced `'Reported Location'` / `'Ward 08'` placeholders.
- **Updated `complaintService.create` & Offline Fallback:**
  - Preserves exact coordinates from submission response or local payload; sets `coordinates: null` if not provided.

### 2. `src/pages/citizen/ComplaintDetailsPage.jsx`
- **Imported `formatCoordinates` & `hasValidCoordinates`** from `complaintService.js`.
- **Field Crew Completion Report Telemetry (Line 383):**
  - Replaced the hardcoded string with dynamic resolution telemetry:
    - If `complaint.resolutionEvidence?.coordinates` is present: renders `GPS Telemetry Validated: {formatCoordinates(coords)}`.
    - If evidence coords are omitted but incident coords exist: renders `GPS Telemetry Validated: {formatCoordinates(complaint.location.coordinates)}`.
    - If neither is present: displays `GPS Telemetry: Location unavailable`.
- **Incident Geolocation Card (Lines 420-441):**
  - **Street Address:** Displays `complaint.location?.address || complaint.address || 'Location unavailable'`.
  - **Ward & District:** Displays `[complaint.location?.ward || complaint.ward, complaint.location?.district].filter(Boolean).join(' • ') || 'Ward details unassigned'`.
  - **Landmark:** Only rendered if `complaint.location?.landmark` is non-empty.
  - **GPS Coordinates:**
    - When valid coordinates exist: displays formatted coordinate string (`{formatCoordinates(complaint.location.coordinates)}`).
    - When missing or null: displays `<span className="text-tertiary font-normal italic">Location unavailable</span>`.
    - Zero coordinates (`lat: 0, lng: 0`) correctly display as `0.0000° N, 0.0000° E`.

---

## 3. Actual Data Fields Used

| Context | Backend Response Field (`ComplaintResponse.java`) | Mapped Frontend Property (`complaintService.js`) | UI Component Render (`ComplaintDetailsPage.jsx`) |
| :--- | :--- | :--- | :--- |
| **Address** | `address` or `location.address` | `complaint.location.address` | `{complaint.location?.address \|\| complaint.address \|\| 'Location unavailable'}` |
| **Ward** | `ward` or `location.ward` | `complaint.location.ward` | Filtered list join (`ward • district`) or `'Ward details unassigned'` |
| **District** | `location.district` (if present) | `complaint.location.district` | Subordinate badge / detail |
| **Landmark** | `location.landmark` (if present) | `complaint.location.landmark` | Conditional badge (`Landmark: ...`) |
| **Incident Coordinates** | `location.coordinates.lat`, `location.coordinates.lng` | `complaint.location.coordinates` (`{ lat, lng }` or `null`) | `formatCoordinates(...)` or `'Location unavailable'` |
| **Resolution Telemetry** | `evidence[0].latitude`, `evidence[0].longitude` | `complaint.resolutionEvidence.coordinates` | `GPS Telemetry Validated: ...` or `'Location unavailable'` |

---

## 4. Test Results

### 4.1 Automated Frontend Test Suite
**Command:** `npm.cmd run test`  
**Output:** **PASS** (72 tests executed across 8 test suites)

```text
▶ Dynamic Complaint Location Details (Phase 2 Step 2.3)
  ✔ hasValidCoordinates accurately validates coordinate formats and bounds (0.5628ms)
  ✔ formatCoordinates returns standard geographic representation (0.5188ms)
  ✔ 1. Complaint with valid coordinates maps dynamically without fallback tampering (0.5673ms)
  ✔ 2. Complaint with missing coordinates leaves coordinates null instead of fabricating defaults (0.2175ms)
  ✔ 3. Complaint with valid zero-valued coordinates preserves lat:0 and lng:0 (0.2345ms)
  ✔ 4. Different complaints display their own distinct dynamic locations (0.3764ms)
  ✔ 5. Resolution evidence telemetry coordinates map dynamically and accurately (0.4512ms)
✔ Dynamic Complaint Location Details (Phase 2 Step 2.3) (3.7433ms)

ℹ tests 72
ℹ suites 8
ℹ pass 72
ℹ fail 0
ℹ duration_ms 1074.6576
```

### 4.2 Production Bundle Verification
**Command:** `npm.cmd run build`  
**Output:** **SUCCESS**  
- 103 modules transformed without errors or lint warnings.
- Output assets generated: `dist/index.html`, `dist/assets/index-CSgxvNQ2.css`, `dist/assets/index-00REoHZB.js`.

---

## 5. Screens and Behaviors for Manual Verification

The following items should be verified in a browser:
1. **Complaint with Valid Coordinates:**  
   Navigate to `/citizen/complaint/:id` for a ticket with known coordinates (e.g. `13.0845, 80.2155`). Confirm the Incident Geolocation card shows `13.0845° N, 80.2155° E`.
2. **Complaint with Null Coordinates:**  
   Navigate to `/citizen/complaint/:id` for a ticket created without coordinates. Confirm the GPS Coordinates line renders `Location unavailable` in italicized tertiary styling without fallback coordinates.
3. **Resolution Evidence Telemetry:**  
   Navigate to a complaint in `RESOLUTION_SUBMITTED` or `RESOLVED` status where field crew submitted repair proof. Confirm the completion report footer displays `GPS Telemetry Validated: {lat}° N, {lng}° E` corresponding to the worker's submitted GPS.
4. **Distinct Ticket Locations:**  
   Open two distinct complaints filed at different addresses (e.g. one in Anna Nagar, another in T. Nagar). Confirm each detail page displays its own distinct street address, ward, and coordinates without cross-contamination.
