# CivicFix Platform Documentation

Authoritative documentation for the CivicFix civic complaint triage and resolution platform.

---

## 🚀 Start Here (Current Documentation)

These documents describe the current, verified system architecture and operational contracts:

- [**CIVICFIX_MASTER_ROADMAP.md**](CIVICFIX_MASTER_ROADMAP.md) — Central project tracker, sprint milestones, and verified implementation status table for all core platform capabilities.
- [**CODE_WALKTHROUGH.md**](CODE_WALKTHROUGH.md) — Comprehensive code walkthrough and viva defense guide covering the 10 core execution flows, design trade-offs, and 30 likely viva questions.
- [**TRD_FINAL.md**](TRD_FINAL.md) — Comprehensive technical reference document: pinned technology stack, system architecture Mermaid diagram, database migration catalog (V1–V11), REST endpoint catalog, complaint lifecycle state machine, and security architecture.
- [**LIMITATIONS_AND_FUTURE_WORK.md**](LIMITATIONS_AND_FUTURE_WORK.md) — Honest analysis of system boundaries, security trade-offs (e.g. single-instance rate limiting, per-account lockout DoS, WebP EXIF gap), and future engineering roadmaps.
- [**BACKEND_ARCHITECTURE.md**](BACKEND_ARCHITECTURE.md) — Production architecture specification covering Java 21, Spring Boot 3.3, PostgreSQL 16 persistence, spatial indexing, rate limiting, and component boundaries.
- [**BACKEND_API.md**](BACKEND_API.md) — REST API specification detailing request and response payloads, HTTP status conventions, and endpoint permissions.
- [**BACKEND_SECURITY.md**](BACKEND_SECURITY.md) — Security model, authentication flows (HTTP-only session cookies), CSRF protections, rate limiting (Bucket4j), and role-based access control.
- [**DEPLOYMENT_CHECKLIST.md**](DEPLOYMENT_CHECKLIST.md) — Production deployment requirements, container orchestration, TLS/HTTPS termination for PWA service workers, and security auditing checklist.
- [**POSTGRESQL_SETUP.md**](POSTGRESQL_SETUP.md) — PostgreSQL container setup, database migration procedures (Flyway), persistent volume guarantees, and backup workflows.

---

## 📊 Evidence (Evaluation & Verification)

Empirical evaluation data and automated test suites validating platform behavior:

- [**SE_CONCEPTS_COVERAGE.md**](SE_CONCEPTS_COVERAGE.md) — Comprehensive curricular coverage audit across CSA10 Units 1–6 with explicit code/test evidence and honest Done/Partial/Not Done statuses.
- [**evaluation/results.md**](evaluation/results.md) — Quantitative benchmark report of the deterministic keyword triage and geospatial duplicate screening engine across 100 test cases, with Wilson 95% confidence intervals, per-class recall, and documented limitations.
- [**evaluation/test_set.csv**](evaluation/test_set.csv) — 100-case synthetic evaluation dataset covering municipal defect categories, priority distributions, and true duplicate pairs.
- **Automated Verification Suites**:
  - **Frontend Suite**: 195 unit and integration tests across 31 suites (`tests/*.test.js`), covering auth, routing, PWA shell, offline guard, i18n bilingual support, and citizen confirmation lifecycle.
  - **Backend Suite**: 295 unit and Spring integration tests (`backend/src/test`), verifying RBAC boundaries, optimistic locking, distance-checked photo evidence, rate limiting, and audit logs.

---

## 📦 Archive (Historical, May Be Outdated)

Working documents, exploratory audit reports, and remediation plans produced during earlier developmental phases:

- [**archive/**](archive/) — Directory containing 32 historical sprint reports, phase audits, and initial discovery artifacts.
- [**archive/README.md**](archive/README.md) — Overview explaining the historical context and cautioning that earlier phase reports were written against earlier prototype designs and may contradict the current system.

