# CivicFix — Central Master Roadmap & Project Tracker

**Repository Path:** `c:\Users\harsh\Downloads\stitch_civicfix_ai_platform_design`  
**Runtime Architecture:**  
- **Frontend:** React 18, Vite 5.4.21, Tailwind CSS, Leaflet GIS  
- **Backend:** Java 21, Spring Boot 3.3.4, Spring Security, Maven Wrapper  
- **Database:** PostgreSQL 16 in Docker (`civicfix_postgres`), Host Port `5433`  
**Last Verified Audit Date:** 2026-11-02  
**Status Standard:** Evidence-based, verified against active codebase and automated test suites.

---

## 1. Feature Implementation Status Matrix

| ID / Capability | Category | Status | One-Line Evidence Note |
|---|---|:---:|---|
| **Core Authentication & RBAC** | Auth / Security | **Done** | `AuthController.java`, `AuthService.java` (HTTP-only cookies, BCrypt, 4 roles) |
| **Password Reset** | Auth / Security | **Not done** | `ForgotPasswordPage.jsx` shows honest manual administrator notice; no mail provider wired |
| **Email Verification & Transactional Mail** | Notifications | **Not done** | In-app notifications only in `NotificationService.java`; no SMTP/Resend provider wired |
| **Complaint State Machine & Assignment** | Lifecycle | **Done** | `ComplaintService.java` enforces full transition flow (`SUBMITTED` -> `ASSIGNED` -> `IN_PROGRESS`) |
| **Citizen Confirmation & Reopen (A2)** | Lifecycle | **Done** | `ComplaintController.java` (`/confirm-resolution`, `/reject-resolution`), `CitizenConfirmationIntegrationTest.java` |
| **GPS Evidence Distance Validation (A3)** | Evidence | **Done** | `ComplaintService.java` (<=100m check or required location note), `EvidenceLocationVerificationTest.java` |
| **Supervisor Role & SLA Escalations (A1)** | Governance | **Done** | `SupervisorService.java`, `SlaEscalationScheduler.java`, `SupervisorEscalationsPage.jsx` |
| **Optimistic Locking & Concurrency Guard** | Persistence | **Done** | `@Version` on `Complaint.java`, HTTP 409 Conflict handled across frontend and backend |
| **Tamper-Evident Audit Ledger** | Governance | **Done** | `audit_logs` table, `AdminService.java`, `AdminAuditLogIntegrationTest.java` |
| **Deterministic Keyword Triage Engine** | Triage | **Done** | `DeterministicTriageEngine.java`, evaluated in [`docs/evaluation/results.md`](evaluation/results.md) |
| **Spatial & Token Duplicate Screening** | Triage | **Done** | `DuplicateDetectionEngine.java` (Haversine distance + Jaccard token similarity) |
| **Image-Based AI / Computer Vision** | Triage | **Not done** | Text-only triage; photo analysis and damage assessment from images do not exist |
| **Sanitized Public Map Endpoint** | GIS / Mapping | **Done** | `GET /api/complaints/public/map` with 3-decimal coordinate rounding (~110m) and PII stripped |
| **Nominatim Reverse Geocoding Cache Proxy** | GIS / Mapping | **Done** | `GisService.java` with in-memory bounding cache and graceful fallback (`gis.test.js`) |
| **Ward Polygons & PostGIS Boundary Queries (A5)** | GIS / Mapping | **Not done** | Coordinates stored as numeric doubles; GeoJSON ward boundary polygons not loaded |
| **Spatial Hotspots & Density Clusters (A6)** | GIS / Mapping | **Not done** | No DBSCAN clustering or heatmap density aggregation endpoints exist |
| **Public Transparency Page (B3)** | Public Portal | **Not done** | `/map` shows basic incident points; dedicated ward transparency KPI portal not built |
| **Bilingual Tamil Support (i18n)** | Accessibility | **Partial** | Citizen portal, auth pages, and status badges translated in `ta.json`; Officer, Worker, Admin, and Legal pages are English-only |
| **PWA & Offline Guard Shell** | Mobile / PWA | **Done** | `vite.config.js` (`VitePWA`), local font bundle (`/fonts/`), `offline.html`, `tests/pwa.test.js` |
| **OpenAPI / Swagger Documentation** | Developer Docs | **Not done** | Markdown API spec in [`docs/BACKEND_API.md`](BACKEND_API.md); no OpenAPI UI dependency in `pom.xml` |
| **BDD Tests (Cucumber / Gherkin)** | Testing | **Not done** | Automated testing uses JUnit 5 and Node.js native test runner; no BDD framework |
| **Mutation Testing (Pitest / Stryker)** | Testing | **Not done** | No mutation testing plugins configured in `pom.xml` or `package.json` |
| **Monitoring Dashboards (Prometheus / Grafana)** | Operations | **Not done** | Standard Spring `/actuator/health` only; no APM metrics or Grafana dashboards deployed |
| **Kubernetes Deployment (Helm / K8s)** | Operations | **Not done** | Docker Compose only (`docker-compose.yml`); no Kubernetes manifests exist |
| **Production Cloud Deployment** | Operations | **Not done** | Local containerized development environment; live production host deployment not completed |

---

## 2. Master Phase Tracker Overview

| Phase # | Phase Title | Status | Historical Archive Reference |
| :---: | :--- | :---: | :--- |
| **Phase 1** | **Core Application Baseline** | **Done** | [`docs/archive/PHASE_0_VERIFIED_BASELINE_REPORT.md`](archive/PHASE_0_VERIFIED_BASELINE_REPORT.md) |
| **Phase 2** | **Remediation & Security Hardening** | **Done** | [`docs/archive/PHASE_2_FINAL_VERIFICATION_REPORT.md`](archive/PHASE_2_FINAL_VERIFICATION_REPORT.md) |
| **Phase 3** | **GIS & Location Screening** | **Done** | [`docs/archive/PHASE_3_FINAL_VERIFICATION_REPORT.md`](archive/PHASE_3_FINAL_VERIFICATION_REPORT.md) |
| **Phase 4** | **Rule-Based Triage & Duplicates** | **Done** | [`docs/archive/PHASE_4_FINAL_VERIFICATION_REPORT.md`](archive/PHASE_4_FINAL_VERIFICATION_REPORT.md) |
| **Phase 5** | **In-App Notifications** | **Done** | [`docs/archive/PHASE_5_IMPLEMENTATION_REPORT.md`](archive/PHASE_5_IMPLEMENTATION_REPORT.md) |
| **Phase 6** | **Analytics & SLA Governance** | **Done** | [`docs/archive/SPRINT_3_STEP_4D_IMPLEMENTATION_REPORT.md`](archive/SPRINT_3_STEP_4D_IMPLEMENTATION_REPORT.md) |
| **Phase 7** | **Bilingual i18n & PWA Offline Shell** | **Partial** | Citizen/Auth translated; Staff interfaces in English; PWA offline shell complete |
| **Phase 8** | **Performance & Production Readiness** | **Not done** | Local containerization complete; cloud staging, K8s, and live deployment pending |

---

## 3. Documentation Map

- [**Current Documentation Index**](README.md)
- [**Production Architecture Specification**](BACKEND_ARCHITECTURE.md)
- [**REST API Reference**](BACKEND_API.md)
- [**Security & RBAC Architecture**](BACKEND_SECURITY.md)
- [**Production Deployment Checklist**](DEPLOYMENT_CHECKLIST.md)
- [**PostgreSQL Setup & Migration Guide**](POSTGRESQL_SETUP.md)
- [**Triage & Duplicate Benchmark Report**](evaluation/results.md)
- [**Historical Phase & Audit Archive**](archive/README.md)
