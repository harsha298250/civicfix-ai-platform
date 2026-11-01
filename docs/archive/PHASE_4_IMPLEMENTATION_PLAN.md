# CivicFix — Phase 4 AI Intelligence Implementation Plan

**Date:** October 23, 2026  
**Document Status:** Approved Roadmap & Stage 1 Complete  
**Target Git Branch:** `feat/sprint3-frontend-backend-integration`  
**Reference Document:** `docs/PHASE_4_AI_ARCHITECTURE_AUDIT.md`  

---

## 1. Objective and Architectural Guardrails

Phase 4 introduces automated AI and machine-assisted intelligence into the CivicFix platform to enhance municipal incident triage, hazard prioritization, explainable recommendations, and duplicate detection.

### Approved Guardrails:
1. **Local Deterministic Triage Engine as Default:** Zero external API keys, zero cloud costs, 100% on-premises privacy, sub-millisecond execution.
2. **Advisory Role for AI:** AI triage does not automatically reject complaints, dispatch crews, or mutate official priority without authorized officer confirmation.
3. **Optimistic Locking & DB Safety:** Retain PostgreSQL 16.4 and Docker setup. All schema modifications are forward-only migrations. Existing `@Version` optimistic locking remains intact.
4. **Cloud AI Optionality:** Any external LLM provider (e.g. Gemini) remains optional, disabled by default, and requires explicit configuration.

---

## 2. Stage Breakdown & Execution Plan

### Stage 1: Database & Core Backend (COMPLETED)
- [x] Create Flyway migration `V6__add_ai_triage_and_duplicate_tracking.sql`.
- [x] Update JPA entity `Complaint.java` with AI triage fields and `duplicate_of_id` relationship.
- [x] Build `com.civicfix.ai.triage.CivicLexicon` containing municipal domain keywords and hazard severity rules.
- [x] Build `com.civicfix.ai.triage.TextSimilarityUtils` (Levenshtein + Jaccard token overlap).
- [x] Build `com.civicfix.ai.triage.DeterministicTriageEngine` with category classification, hazard scoring, transparent explanation synthesis, and bounded heuristic match scoring.
- [x] Build `com.civicfix.ai.duplicate.DuplicateDetectionEngine` using Great-Circle Haversine distance ($\le 150\text{m}$) and textual similarity.
- [x] Build `com.civicfix.ai.AiTriageService` coordinating advisory triage on complaint creation.
- [x] Update `ComplaintResponse.java` DTO to expose AI triage metadata.
- [x] Implement comprehensive unit tests: `DeterministicTriageEngineTest`, `DuplicateDetectionEngineTest`, `AiTriageServiceTest`.

### Stage 2: Service Integration, REST Endpoints & Adjudication (UPCOMING)
- [ ] Add `POST /api/complaints/{id}/triage` (Re-run advisory triage for an existing ticket).
- [ ] Add `POST /api/complaints/{id}/triage/adjudicate` (Officer accepts or overrides AI triage with audit record).
- [ ] Add `GET /api/complaints/{id}/duplicates` (Query advisory duplicate candidate tickets).
- [ ] Add `POST /api/complaints/{id}/duplicates/merge` (Merge duplicate candidate ticket into parent ticket).
- [ ] Enforce Spring Security role authorization (`ROLE_OFFICER`, `ROLE_ADMIN`).
- [ ] Add backend integration tests covering triage API, officer override, and duplicate merge.

### Stage 3: Frontend Integration & Stitch UI Alignment (UPCOMING)
- [ ] Update `src/services/apiClient.js` with triage adjudication and duplicate endpoints.
- [ ] Update `src/services/complaintService.js` to map real backend AI triage DTOs.
- [ ] Connect `ComplaintReviewPage.jsx`:
  - Bind confidence, detected defect, and hazard score to live backend data.
  - Display real explainable reasoning card.
  - Display dynamic `Duplicate Candidate Cluster Detected` card with distance and candidate comparison button.
  - Connect **Accept AI Suggestions**, **Modify Category**, and **Override Priority** buttons.
  - Implement **Compare & Merge Candidate** modal.
- [ ] Connect `ComplaintDetailsPage.jsx` to render live backend triage metadata.
- [ ] Clean up simulated progress bar in `ReportComplaintPage.jsx`.

### Stage 4: Verification, Regression Audit & Final Deliverables (UPCOMING)
- [ ] Full backend test run (`mvnw test`).
- [ ] Full frontend test run (`npm test`).
- [ ] Production bundle build (`npm run build`).
- [ ] End-to-end audit verifying Phase 2 security, Phase 3 GIS mapping, and Phase 4 AI triage.
- [ ] Produce `docs/PHASE_4_FINAL_VERIFICATION_REPORT.md`.
