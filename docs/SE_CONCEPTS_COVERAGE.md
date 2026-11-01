# Software Engineering Concepts Coverage (CSA10 Units 1–6)

> **Course**: CSA10 — Advanced Software Engineering  
> **Project**: CivicFix — Explainable, Rule-Assisted Civic Complaint Platform  
> **Repository Audit Date**: November 2026  
> **Compliance Assessment**: Complete, evidence-backed evaluation against curricular outcomes. Every status claim is directly linked to an existing code file, test suite, configuration file, or document.

---

## Unit 1: Software Process, Agile, Feasibility & Design Thinking

| Concept | Evidence in Repository | Status | Notes |
|---|---|---|---|
| **Software Development Life Cycle (SDLC) & Agile** | [`CIVICFIX_MASTER_ROADMAP.md`](file:///c:/Users/harsh/Downloads/stitch_civicfix_ai_platform_design/docs/CIVICFIX_MASTER_ROADMAP.md) | **Done** | Documented sprint cycles, retrospective milestones, and phased feature iterations across core personas. |
| **Feasibility Analysis (Tech, Ops, Economic)** | [`CIVICFIX_MASTER_ROADMAP.md`](file:///c:/Users/harsh/Downloads/stitch_civicfix_ai_platform_design/docs/CIVICFIX_MASTER_ROADMAP.md), [`TRD_FINAL.md`](file:///c:/Users/harsh/Downloads/stitch_civicfix_ai_platform_design/docs/TRD_FINAL.md) | **Done** | Validated zero-cost open-source stack (PostgreSQL, Spring Boot, React, Leaflet), lightweight hardware footprint, and operational workflow fit for municipalities. |
| **Design Thinking & User-Centered Design (UCD)** | [`src/pages/citizen/ReportComplaintPage.jsx`](file:///c:/Users/harsh/Downloads/stitch_civicfix_ai_platform_design/src/pages/citizen/ReportComplaintPage.jsx), [`src/components/common/TamilNaduLocationPicker.jsx`](file:///c:/Users/harsh/Downloads/stitch_civicfix_ai_platform_design/src/components/common/TamilNaduLocationPicker.jsx) | **Done** | One-tap GPS geocoding, bilingual citizen intake, simplified category chips, and accessible mobile PWA layout. |
| **Ethics in Software Engineering (Privacy & PII)** | [`PublicMapComplaintResponse.java`](file:///c:/Users/harsh/Downloads/stitch_civicfix_ai_platform_design/backend/src/main/java/com/civicfix/complaint/dto/PublicMapComplaintResponse.java), [`LocalStorageService.java`](file:///c:/Users/harsh/Downloads/stitch_civicfix_ai_platform_design/backend/src/main/java/com/civicfix/storage/LocalStorageService.java) | **Done** | Automatic EXIF GPS stripping on citizen JPEG/PNG uploads; public map coordinate rounding to 3 decimal places (~110m); PII stripping on public endpoints. |
| **Digital Divide & Accessibility (Multilingual)** | [`src/locales/ta.json`](file:///c:/Users/harsh/Downloads/stitch_civicfix_ai_platform_design/src/locales/ta.json), [`src/context/LanguageContext.jsx`](file:///c:/Users/harsh/Downloads/stitch_civicfix_ai_platform_design/src/context/LanguageContext.jsx) | **Partial** | Citizen-facing flows are fully localized in Tamil (Dashboard, Intake, Complaint Details, Notifications, Login, Register, Status Badges). Staff portals (Officer, Worker, Supervisor, Admin, Legal) remain English-only. |

---

## Unit 2: Requirements, Architecture, Contracts & API Design

| Concept | Evidence in Repository | Status | Notes |
|---|---|---|---|
| **Requirements Engineering (Functional / Non-Functional)** | [`CIVICFIX_MASTER_ROADMAP.md`](file:///c:/Users/harsh/Downloads/stitch_civicfix_ai_platform_design/docs/CIVICFIX_MASTER_ROADMAP.md), [`TRD_FINAL.md`](file:///c:/Users/harsh/Downloads/stitch_civicfix_ai_platform_design/docs/TRD_FINAL.md) | **Done** | Documented functional requirements (roles, lifecycle, triage) and non-functional requirements (SLA timers, rate limiting, EXIF sanitization). |
| **Prioritization Frameworks (MoSCoW / Kano)** | [`CIVICFIX_MASTER_ROADMAP.md`](file:///c:/Users/harsh/Downloads/stitch_civicfix_ai_platform_design/docs/CIVICFIX_MASTER_ROADMAP.md) | **Done** | Prioritized core complaint filing and verification (Must Have) over automated supervisor escalations (Should Have) and advanced spatial analytics (Could Have). |
| **Architectural Patterns (Layered / Hexagonal)** | [`backend/src/main/java/com/civicfix/`](file:///c:/Users/harsh/Downloads/stitch_civicfix_ai_platform_design/backend/src/main/java/com/civicfix/), [`BACKEND_ARCHITECTURE.md`](file:///c:/Users/harsh/Downloads/stitch_civicfix_ai_platform_design/docs/BACKEND_ARCHITECTURE.md) | **Done** | Clean separation of concerns: Controller -> Service -> Repository -> Entity; independent security filters, storage service, and background schedulers. |
| **API-First Design & OpenAPI/Swagger** | N/A | **Not done** | System uses RESTful conventions and JSON contracts, but has no `springdoc-openapi` dependency, Swagger UI, or OpenAPI/Postman specification files. |
| **Design by Contract & Defensive Programming** | [`ComplaintService.java`](file:///c:/Users/harsh/Downloads/stitch_civicfix_ai_platform_design/backend/src/main/java/com/civicfix/complaint/ComplaintService.java), [`ProductionSafetyGuard.java`](file:///c:/Users/harsh/Downloads/stitch_civicfix_ai_platform_design/backend/src/main/java/com/civicfix/security/ProductionSafetyGuard.java) | **Done** | Explicit pre-conditions on status transitions (e.g., forbidding direct transition to `RESOLVED`), invariant checks on production startup, and bounds checking on GPS coordinates. |

---

## Unit 3: Full-Stack Integration, Version Control, Containers & Concurrency

| Concept | Evidence in Repository | Status | Notes |
|---|---|---|---|
| **Full-Stack Integration & Middleware** | [`src/services/apiClient.js`](file:///c:/Users/harsh/Downloads/stitch_civicfix_ai_platform_design/src/services/apiClient.js), [`RateLimitInterceptor.java`](file:///c:/Users/harsh/Downloads/stitch_civicfix_ai_platform_design/backend/src/main/java/com/civicfix/security/ratelimit/RateLimitInterceptor.java) | **Done** | Seamless integration between React SPA and Spring Boot API with CSRF token exchange, session cookies, and rate limiting interceptors. |
| **Git Workflow & Branching Strategy** | `README.md`, Git commit history | **Done** | Traceable commit progression representing iterative delivery and clean separation of features. |
| **Containerization (Docker & Multi-Stage Builds)** | [`Dockerfile`](file:///c:/Users/harsh/Downloads/stitch_civicfix_ai_platform_design/Dockerfile), [`docker-compose.yml`](file:///c:/Users/harsh/Downloads/stitch_civicfix_ai_platform_design/docker-compose.yml) | **Done** | Multi-stage Dockerfile compiling frontend with Node 20 Alpine and serving via Nginx 1.27 Alpine; Compose orchestration for PostgreSQL 16 and Spring Boot. |
| **Container Orchestration (Kubernetes Basics)** | N/A | **Not done** | No Kubernetes manifests (deployments, pods, services, ingress) or Helm charts exist in the repository. Single-node Docker Compose only. |
| **Algorithms & Concurrency Control** | [`Complaint.java`](file:///c:/Users/harsh/Downloads/stitch_civicfix_ai_platform_design/backend/src/main/java/com/civicfix/complaint/Complaint.java#L78), [`RateLimiterService.java`](file:///c:/Users/harsh/Downloads/stitch_civicfix_ai_platform_design/backend/src/main/java/com/civicfix/security/ratelimit/RateLimiterService.java) | **Done** | Optimistic concurrency control via `@Version` to prevent lost updates; Haversine distance algorithm; Bucket4j token bucket concurrency. |

---

## Unit 4: Verification, Quality Assurance, CI/CD & Operations

| Concept | Evidence in Repository | Status | Notes |
|---|---|---|---|
| **Testing Pyramid (Unit & Integration Tests)** | [`backend/src/test/`](file:///c:/Users/harsh/Downloads/stitch_civicfix_ai_platform_design/backend/src/test/), [`tests/`](file:///c:/Users/harsh/Downloads/stitch_civicfix_ai_platform_design/tests/) | **Done** | 295 backend tests (Spring Boot `@SpringBootTest`, Mockito unit tests, surefire integration tests) + 195 frontend Node.js runner tests (490 tests total). |
| **Behavior-Driven Development (BDD)** | N/A | **Not done** | No Cucumber, Gherkin feature files, or SpecFlow style executable specifications are present. |
| **Mutation & Fuzz Testing** | N/A | **Not done** | No mutation testing plugins (e.g., Pitest) or automated fuzzing frameworks are configured in the build system. |
| **Continuous Integration & Automation** | Package and test build scripts in [`package.json`](file:///c:/Users/harsh/Downloads/stitch_civicfix_ai_platform_design/package.json) and [`backend/pom.xml`](file:///c:/Users/harsh/Downloads/stitch_civicfix_ai_platform_design/backend/pom.xml) | **Partial** | Full CLI automation configured (`mvn test`, `npm test`), but no `.github/workflows/` CI pipeline yaml is active in repo. |
| **Deployment Strategies (Blue-Green / Canary)** | N/A | **Not done** | Local container orchestration only; no blue-green, canary, or zero-downtime rolling update deployment scripts. |
| **Monitoring, Telemetry & Logging** | [`HealthController.java`](file:///c:/Users/harsh/Downloads/stitch_civicfix_ai_platform_design/backend/src/main/java/com/civicfix/health/HealthController.java), Spring Boot Actuator (`/actuator/health`) | **Partial** | Basic liveness and health endpoints provided via Spring Actuator; structured SLF4J audit logging. No Prometheus exporter or Grafana dashboards. |

---

## Unit 5: Technical Debt, Refactoring, AI Ethics & Sustainability

| Concept | Evidence in Repository | Status | Notes |
|---|---|---|---|
| **Technical Debt & Architectural Refactoring** | [`ComplaintService.java`](file:///c:/Users/harsh/Downloads/stitch_civicfix_ai_platform_design/backend/src/main/java/com/civicfix/complaint/ComplaintService.java), [`docs/archive/`](file:///c:/Users/harsh/Downloads/stitch_civicfix_ai_platform_design/docs/archive/) | **Done** | Retired legacy mock/localStorage states; removed hardcoded user arrays; consolidated transition state machine; hermetic test isolation. |
| **AI Engineering & Explainability** | [`DeterministicTriageEngine.java`](file:///c:/Users/harsh/Downloads/stitch_civicfix_ai_platform_design/backend/src/main/java/com/civicfix/ai/triage/DeterministicTriageEngine.java), [`docs/evaluation/results.md`](file:///c:/Users/harsh/Downloads/stitch_civicfix_ai_platform_design/docs/evaluation/results.md) | **Done** | Fully explainable, rule-based text triage. Emits human-readable match explanations; human-in-the-loop officer adjudication endpoint. |
| **Image-Based Analysis & Computer Vision** | N/A | **Not done** | No computer vision models (CNN/ViT) are implemented. Photo triage is not supported; defect categorization is strictly keyword-based. |
| **Algorithmic Bias & Fairness Evaluation** | [`docs/evaluation/results.md`](file:///c:/Users/harsh/Downloads/stitch_civicfix_ai_platform_design/docs/evaluation/results.md#L69-L72) | **Done** | Empirically documented priority recall bias: CRITICAL recall is 92.0%, but HIGH is only 38.5% and LOW is 0.0% due to missing de-escalation rules. |
| **Sustainable Software Engineering (Green IT)** | [`DeterministicTriageEngine.java`](file:///c:/Users/harsh/Downloads/stitch_civicfix_ai_platform_design/backend/src/main/java/com/civicfix/ai/triage/DeterministicTriageEngine.java) | **Done** | Zero-GPU footprint. The deterministic keyword matcher executes in sub-millisecond CPU time, consuming orders of magnitude less energy than deep LLMs. |

---

## Unit 6: Capstone Project Governance & Delivery

| Concept | Evidence in Repository | Status | Notes |
|---|---|---|---|
| **Production Cloud Deployment** | N/A | **Not done** | No Terraform, AWS CloudFormation, or live cloud deployment manifests; deployed via local Docker Compose. |
| **Outbound Email & SMS Notifications** | N/A | **Not done** | In-app notifications table only. No SMTP/SendGrid or Twilio SMS gateway integration. |
| **Automated Password Reset** | N/A | **Not done** | UI mock exists, but no backend password reset token generator or email delivery endpoint is implemented. |
| **Comprehensive Technical Specification** | [`TRD_FINAL.md`](file:///c:/Users/harsh/Downloads/stitch_civicfix_ai_platform_design/docs/TRD_FINAL.md) | **Done** | Full technical reference document covering stack versions, database migrations, security, and state machine. |
| **Empirical Evaluation & Truth-in-Documentation** | [`docs/evaluation/results.md`](file:///c:/Users/harsh/Downloads/stitch_civicfix_ai_platform_design/docs/evaluation/results.md), [`CIVICFIX_MASTER_ROADMAP.md`](file:///c:/Users/harsh/Downloads/stitch_civicfix_ai_platform_design/docs/CIVICFIX_MASTER_ROADMAP.md) | **Done** | Ground-truth benchmark statistics and explicit acknowledgements of synthetic test constraints and authoring bias. |

---

## Summary of Non-Implemented Requirements (Explicit "Not Done")
To maintain complete academic and operational honesty, the following features are confirmed as **Not Done**:
1. **Kubernetes Orchestration**: Single-node Docker Compose only.
2. **Behavior-Driven Development (BDD)**: No Cucumber or Gherkin suites.
3. **Mutation Testing**: No Pitest or automated mutation testing.
4. **OpenAPI / Swagger Documentation**: No interactive Swagger UI or OpenAPI schemas.
5. **Prometheus & Grafana Monitoring**: No metrics scraping or visual dashboards.
6. **Image-Based Analysis / Computer Vision**: Text-only triage; images are stored but not analyzed by AI.
7. **Outbound Email & SMS**: In-app notifications only.
8. **Automated Password Reset**: No backend token/email reset flow.
9. **Production Cloud Deployment**: Local containerization only.
