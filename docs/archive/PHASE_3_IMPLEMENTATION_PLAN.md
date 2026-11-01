# CivicFix — Phase 3 GIS & Location Intelligence Implementation Plan

**Date:** October 23, 2026  
**Document Status:** Approved Architecture Plan  
**Target Git Branch:** `feat/sprint3-frontend-backend-integration`  
**Reference Document:** `docs/PHASE_3_GIS_ARCHITECTURE_AUDIT.md`  

---

## 1. Objective and Scope

Implement a production-grade, secure, and privacy-preserving Geographic Information System (GIS) and Location Intelligence capability for CivicFix. This implementation delivers:
1. Validated server-side spatial bounding-box (`minLat`, `maxLat`, `minLng`, `maxLng`) and `ward` filtering over PostgreSQL.
2. A database performance index (`CREATE INDEX idx_complaints_lat_lng ON complaints (latitude, longitude)`) via Flyway migration `V5`.
3. A public, sanitized map API (`GET /api/complaints/public/map`) exposing strictly non-sensitive metadata for map pin rendering while eliminating citizen PII.
4. Live backend connections for `CivicIssueMapPage.jsx`, `PublicMapPage.jsx`, and a re-enabled `/citizen/map` (`CitizenIssueMapPage.jsx`).
5. Elimination of fabricated fallback coordinates in GeoJSON exports and UI components.
6. Embedded Leaflet location mini-maps in citizen complaint details and officer complaint review.
7. OpenStreetMap Nominatim compliance via a server-side cached reverse geocoding proxy endpoint (`GET /api/gis/reverse-geocode`) with custom `User-Agent`.
8. Comprehensive automated test suites (backend JUnit 5 integration tests and frontend Vitest tests) ensuring zero regression of Phase 2 improvements.

---

## 2. Architecture & File Inventory

### 2.1 Files to Create
| File Path | Component / Layer | Responsibility |
|---|---|---|
| `backend/src/main/resources/db/migration/V5__add_complaint_spatial_index.sql` | Database Migration | Creates compound index on `complaints(latitude, longitude)`. |
| `backend/src/main/java/com/civicfix/complaint/dto/PublicMapComplaintResponse.java` | DTO Layer | Sanitized DTO exposing only public-safe fields (id, referenceId, title, category, status, priority, latitude, longitude, ward, createdAt). |
| `backend/src/main/java/com/civicfix/gis/GisController.java` | Controller Layer | Reverse-geocoding proxy endpoint (`GET /api/gis/reverse-geocode`) with input validation and caching. |
| `backend/src/main/java/com/civicfix/gis/GisService.java` | Service Layer | Service executing reverse-geocoding with identifiable `User-Agent`, Spring caching, and Nominatim rate limiting. |
| `backend/src/main/java/com/civicfix/gis/dto/ReverseGeocodeResponse.java` | DTO Layer | Structured address response DTO for reverse geocoding. |
| `src/components/common/LocationMiniMap.jsx` | Frontend Component | Reusable Leaflet mini-map for complaint details and officer review cards with empty/unavailable fallback. |
| `backend/src/test/java/com/civicfix/complaint/ComplaintGisIntegrationTest.java` | Test Layer | Backend integration tests for bounding box, ward filter, public sanitized DTO, and spatial queries. |
| `tests/gis.test.js` | Test Layer | Frontend tests for geographic utilities, bounding box query params, GeoJSON export, and mini-map validation. |

### 2.2 Files to Modify
| File Path | Layer | Specific Modification |
|---|---|---|
| `backend/src/main/java/com/civicfix/complaint/ComplaintRepository.java` | Persistence | Add bounding box query with optional status, category, and ward filters (`findBySpatialBoundsAndFilters`). |
| `backend/src/main/java/com/civicfix/complaint/ComplaintService.java` | Business Logic | Add `getComplaintsInBounds` and `getPublicMapComplaints(minLat, maxLat, minLng, maxLng, category, status)`. |
| `backend/src/main/java/com/civicfix/complaint/ComplaintController.java` | API Controller | Add bounding box params to `GET /api/complaints`, add public unauthenticated endpoint `GET /api/complaints/public/map`. |
| `backend/src/main/resources/application.yml` | Config | Enable cache for GIS service, configure Nominatim User-Agent and timeout. |
| `src/services/apiClient.js` | Frontend API | Add `apiClient.complaints.getPublicMap()`, add bounding box parameters to `apiClient.complaints.list()`, add `apiClient.gis.reverseGeocode()`. |
| `src/services/complaintService.js` | Frontend Service | Add `getPublicMapComplaints()` and `getOfficerMapComplaints()`; wire live backend mapping; handle zero coordinates cleanly. |
| `src/pages/public/PublicMapPage.jsx` | Frontend UI | Replace empty `useApp().complaints` with live call to `complaintService.getPublicMapComplaints()`. |
| `src/pages/citizen/CitizenIssueMapPage.jsx` | Frontend UI | Connect to `complaintService.getPublicMapComplaints()`. |
| `src/pages/officer/CivicIssueMapPage.jsx` | Frontend UI | Connect to `complaintService.getOfficerMapComplaints()`; remove hardcoded GeoJSON fallback coordinates. |
| `src/pages/citizen/ComplaintDetailsPage.jsx` | Frontend UI | Embed `LocationMiniMap` in location card. |
| `src/pages/officer/ComplaintReviewPage.jsx` | Frontend UI | Embed `LocationMiniMap` in officer review details. |
| `src/App.jsx` | Router | Re-enable `/citizen/map` route pointing to `CitizenIssueMapPage` consuming the public sanitized feed. |
| `src/components/common/TamilNaduOverviewMap.jsx` | Map Component | Support valid zero coordinates without treating `(0, 0)` as missing; handle dynamic marker bounds safely. |

---

## 3. Database Migration Design (Flyway V5)

### Migration Script: `V5__add_complaint_spatial_index.sql`
```sql
-- Flyway Migration V5: Add spatial index on complaints latitude and longitude
-- Supports high-performance bounding box viewport queries for civic issue maps

CREATE INDEX IF NOT EXISTS idx_complaints_lat_lng 
    ON complaints (latitude, longitude)
    WHERE latitude IS NOT NULL AND longitude IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_complaints_ward
    ON complaints (ward)
    WHERE ward IS NOT NULL;
```
- **Performance:** Partial indexes filter out null coordinate rows, reducing index tree depth.
- **Compatibility:** Zero impact on existing columns or table locks; completely non-blocking.
- **Hibernate Validation:** Compatible with Hibernate `ddl-auto: validate`.

---

## 4. API Contracts and Data Transfer Objects

### 4.1 Public Sanitized Map API
- **Endpoint:** `GET /api/complaints/public/map`
- **Security:** Public unauthenticated endpoint (PermitAll).
- **Query Parameters:**
  - `minLat` (BigDecimal, optional, -90.0 to 90.0)
  - `maxLat` (BigDecimal, optional, -90.0 to 90.0)
  - `minLng` (BigDecimal, optional, -180.0 to 180.0)
  - `maxLng` (BigDecimal, optional, -180.0 to 180.0)
  - `category` (String, optional)
  - `status` (ComplaintStatus, optional)
  - `limit` (Integer, default 250, max 500)
- **Response DTO:** `PublicMapComplaintResponse`
  ```json
  {
    "id": "uuid-string",
    "referenceId": "CF-2026-XXXXX",
    "title": "Severe Pothole on Mount Road",
    "category": "Roads & Potholes",
    "status": "IN_PROGRESS",
    "priority": "HIGH",
    "latitude": 13.0827000,
    "longitude": 80.2707000,
    "ward": "Ward 08",
    "createdAt": "2026-10-23T08:00:00Z"
  }
  ```
- **Strict Privacy Rule:**
  - **Omitted:** Citizen name, citizen ID, citizen phone, citizen email, complaint detailed text description, internal officer notes, worker names, evidence download URLs.
  - Returns only tickets with valid, non-null coordinates.

### 4.2 Officer / Authenticated Bounding Box Search
- **Endpoint:** `GET /api/complaints`
- **Security:** `@PreAuthorize("isAuthenticated()")`
- **New Query Parameters Added:**
  - `minLat`, `maxLat`, `minLng`, `maxLng` (BigDecimal)
  - `ward` (String)
- **Validation:**
  - `minLat <= maxLat` (throws 400 Bad Request if inverted)
  - `minLng <= maxLng` (throws 400 Bad Request if inverted)
  - All values must fall within `[-90, 90]` and `[-180, 180]`.

### 4.3 Reverse Geocoding Proxy API
- **Endpoint:** `GET /api/gis/reverse-geocode`
- **Security:** Public unauthenticated endpoint with rate-limiting.
- **Parameters:** `lat` (double, -90 to 90), `lng` (double, -180 to 180).
- **Compliance:**
  - Spring `RestClient` or `RestTemplate` sends custom header:
    `User-Agent: CivicFix-AI-Platform/1.0 (https://civicfix.org; contact@civicfix.org)`
  - Uses `@Cacheable("reverseGeocodeCache")` to avoid redundant calls for nearby coordinates.

---

## 5. Security & Privacy Safeguards

1. **Direct Backend Sanitization:**
   The public endpoint constructs `PublicMapComplaintResponse` directly from database projections or entity getters. Private citizen fields never touch the serialized JSON response.
2. **Citizen Isolation Preserved:**
   When an authenticated citizen accesses `GET /api/complaints`, they remain strictly isolated to their own complaints. To view community map pins, the citizen client calls `GET /api/complaints/public/map`.
3. **No Fabricated Fallbacks:**
   Complaints with missing coordinates are excluded from map feeds rather than given synthetic coordinates.
4. **Parameter Validation:**
   Inverted bounding boxes (e.g., `minLat > maxLat`) return HTTP 400 Bad Request with a clear validation error message.

---

## 6. Implementation Stages & Execution Order

1. **Stage 2 (Database & Backend):**
   - Create `V5__add_complaint_spatial_index.sql`.
   - Update `ComplaintRepository` with spatial bounding box queries.
   - Update `ComplaintService` with spatial query methods and coordinate validation.
   - Update `ComplaintController` with query parameters.
2. **Stage 3 (Public Sanitized API & Reverse Geocode Proxy):**
   - Create `PublicMapComplaintResponse.java`.
   - Implement `GET /api/complaints/public/map` in `ComplaintController`.
   - Implement `GisController` and `GisService` for Nominatim compliance.
   - Configure Spring cache in `application.yml`.
3. **Stage 4 (Frontend API & Service Integration):**
   - Update `apiClient.js` with GIS and public map endpoints.
   - Update `complaintService.js` to provide `getPublicMapComplaints` and `getOfficerMapComplaints`.
   - Wire `PublicMapPage.jsx` and `CivicIssueMapPage.jsx` to live data.
   - Re-enable `/citizen/map` route in `App.jsx` pointing to `CitizenIssueMapPage.jsx`.
4. **Stage 5 (Remove Simulated GeoJSON Fallbacks):**
   - In `CivicIssueMapPage.jsx`, remove line 82 hardcoded coordinates `[80.21, 13.085]`.
   - In `TamilNaduOverviewMap.jsx`, handle valid `(0, 0)` coordinates without dropping them.
5. **Stage 6 (Location Mini-Maps):**
   - Create `src/components/common/LocationMiniMap.jsx`.
   - Embed in `ComplaintDetailsPage.jsx` and `ComplaintReviewPage.jsx`.
6. **Stage 7 & 8 (Testing & Verification):**
   - Create `ComplaintGisIntegrationTest.java`.
   - Create `tests/gis.test.js`.
   - Run backend test suite (`mvnw.cmd test`), frontend test suite (`npm.cmd test`), and production build (`npm.cmd run build`).
   - Deliver `docs/PHASE_3_IMPLEMENTATION_REPORT.md` and `docs/PHASE_3_FINAL_VERIFICATION_REPORT.md`.

---

## 7. Rollback & Compatibility Safeguards

- **Schema Rollback:** `V5` index creation is non-destructive and can be dropped via `DROP INDEX IF EXISTS idx_complaints_lat_lng; DROP INDEX IF EXISTS idx_complaints_ward;` without affecting table structure or data.
- **API Backwards Compatibility:** `GET /api/complaints` retains all existing parameters (`status`, `category`, `page`, `size`) and response format; bounding box parameters are optional.
- **Optimistic Locking:** Complaint entity versioning (`@Version`) is untouched and fully preserved.
