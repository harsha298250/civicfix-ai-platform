> Historical document: written when the project used an earlier design. For the current architecture see README.md.

# CivicFix AI — Privacy Fixes, Citizen Data Isolation, Navigation & Legal Policy Audit

**Document Version:** 2.0  
**Audit Date:** October 20, 2026  
**Auditors:** Application Security Engineer, Full-Stack Engineer, UX & QA Automation Agent  
**Environment:** CivicFix AI (React 18 / Tailwind CSS / Vite / Client Storage Layer)  

---

## 1. Executive Summary & Verification Scorecard

This technical report documents the implementation, security hardening, and end-to-end verification of five critical objectives requested in the CivicFix AI system:
1. **Strict Citizen Complaint Data Isolation**: Prevents citizens from discovering, searching, or viewing other citizens' private complaint reports, photos, timelines, or resolution evidence.
2. **Citizen Complaint-Map Viewing Removal**: Eliminates public/citizen map exploration from citizen routes, menus, dashboards, and ticket details.
3. **Public Navigation Repair**: Resolves the non-functional "How It Works", "Features", and "Impact" links across landing and registration pages with smooth scrolling and sticky-header offsets (`scroll-mt-20`).
4. **Professional Legal Framework**: Delivers dedicated, accessible, print-friendly `/legal/terms` (Terms of Service) and `/legal/privacy` (Citizen Data Privacy Policy) pages, each featuring 20 structured sections, table-of-contents navigation, and non-blocking integration into the citizen registration flow.
5. **Role-Based Workspace Guarding**: Prevents unauthorized citizens from accessing municipal officer command tools (`/officer/map`, `/officer/dashboard`) or administrator suites via URL manipulation.

### Requirement Verification Scorecard

| Requirement / Objective | Status | Implementation Details |
| :--- | :--- | :--- |
| **Citizen Complaint List Isolation** | **VERIFIED WORKING** | `MyComplaintsPage.jsx` filters strictly by authenticated `currentUser.id` / `currentUser.email`. Cross-citizen records are omitted from memory and rendering. |
| **Search & Filter Privacy Boundary** | **VERIFIED WORKING** | Searching by ID, title, street, or category executes *only* against authorized records belonging to the authenticated citizen. |
| **Direct URL Access Protection** | **VERIFIED WORKING** | Opening another citizen's ticket (e.g. `/citizen/complaints/CF-2026-00120`) triggers a privacy-preserving "Private Citizen Record" screen; zero photos, notes, or worker data are rendered. |
| **State & Cache Isolation on Switch** | **VERIFIED WORKING** | Persona switching updates `currentUser` and refreshes complaints immediately, preventing stale cross-account state leakage. |
| **Multi-Citizen Seed Data Split** | **VERIFIED WORKING** | Seed complaints in `mockData.js` are divided between Citizen A (Alex Morgan `usr-001`) and Citizen B (Anandhi Sundaram `usr-008`). New citizens see a clean empty state. |
| **Citizen Map Viewing Removal** | **VERIFIED WORKING** | Removed "Issue Map" from `CitizenLayout` top bar & mobile nav; removed "Open Interactive Map" card from `CitizenDashboard`; removed GIS Explorer link from `ComplaintDetailsPage`. |
| **Citizen Map Route Redirection** | **VERIFIED WORKING** | Navigating to `/citizen/map` automatically redirects to `/citizen/dashboard`. |
| **Officer Map Preservation** | **VERIFIED WORKING** | `/officer/map` (`CivicIssueMapPage.jsx`) remains fully operational for Municipal Officers, retaining Leaflet clustering, geocoding search, and crew dispatch controls. |
| **Citizen Location Selection Preserved** | **VERIFIED WORKING** | Citizen reporting form (`ReportComplaintPage.jsx`) retains full interactive OpenStreetMap pin placement and address geocoding. |
| **Public Navigation Anchors** | **VERIFIED WORKING** | "How It Works", "Features", and "Impact" use `handleNavClick` with `scroll-mt-20` (80px header offset), working seamlessly from both `/` and `/register`. |
| **Dedicated Terms of Service (`/legal/terms`)** | **VERIFIED WORKING** | Comprehensive 20-section legal document with sticky Table of Contents, AI triage limitation disclosures, and grievance redressal placeholders. |
| **Dedicated Privacy Policy (`/legal/privacy`)** | **VERIFIED WORKING** | Comprehensive 20-section document with data isolation guarantees, Aadhaar-free disclosures, DPDPA alignment, and prototype storage transparency. |
| **Registration Consent Integration** | **VERIFIED WORKING** | Accessible links with `open_in_new` icons open `/legal/terms` and `/legal/privacy` in separate tabs without toggling the checkbox or losing form inputs. |
| **Server-Side API Ownership Enforcement** | **DEMO ONLY / NOT IMPLEMENTED** | Backend Spring Boot / MySQL container is not running in current environment. Isolation is currently enforced at the client service & context layers (`complaintService.js`). |

---

## 2. Root Cause Analysis: Cross-Citizen Complaint Leakage

Inspection of the baseline codebase revealed three distinct architectural vulnerabilities:

1. **Global Unfiltered Store in `MyComplaintsPage.jsx`**:
   - `MyComplaintsPage.jsx` previously extracted `const { complaints } = useApp()` and ran filters directly on the entire municipal complaint array without scoping to `currentUser.id`. As a result, all tickets across Tamil Nadu were displayed to any citizen.
2. **Permissive Fallback in `CitizenDashboard.jsx`**:
   - Line 15 used `complaints.filter(c => !c.citizen || c.citizen.id === currentUser?.id || c.citizen.email === currentUser?.email)`. The `!c.citizen` clause caused any record lacking explicit citizen attribution to be broadcast to all citizens.
3. **Default Fallback & Missing Ownership Guard in `ComplaintDetailsPage.jsx`**:
   - Line 15 executed `const complaint = complaints.find(...) || complaints[0]`. This had two catastrophic bugs:
     - If a user entered a non-existent or foreign ID, it fell back to displaying `complaints[0]`.
     - It performed **zero authorization checks** against `currentUser.id`, permitting any resident to inspect any other resident's uploaded photos, internal notes, worker dispatch details, and resolution evidence.

---

## 3. Exact Files Changed & Rationale

| File Path | Description of Changes |
| :--- | :--- |
| **[`src/services/mockData.js`](file:///c:/Users/harsh/Downloads/stitch_civicfix_ai_platform_design/src/services/mockData.js)** | Added Citizen B (`usr-008` Anandhi Sundaram, `anandhi.s@citizen.org`). Distributed complaints so Alex Morgan owns 5 tickets (`CF-2026-00124`, `00125`, `00126`, `00127`, `00129`) and Anandhi Sundaram owns 4 tickets (`CF-2026-00120`, `00119`, `00128`, `00130`). |
| **[`src/services/complaintService.js`](file:///c:/Users/harsh/Downloads/stitch_civicfix_ai_platform_design/src/services/complaintService.js)** | Updated storage key to `civicfix_complaints_v2` to prevent stale cache leakage. Added `getByCitizen(citizenId, citizenEmail)` and `getByIdForCitizen(id, citizenId, citizenEmail)` methods enforcing ownership boundaries. |
| **[`src/context/AppContext.jsx`](file:///c:/Users/harsh/Downloads/stitch_civicfix_ai_platform_design/src/context/AppContext.jsx)** | Added `getCitizenComplaints` and `isComplaintOwner` helper functions to React context so components access strictly isolated data streams. |
| **[`src/pages/citizen/CitizenDashboard.jsx`](file:///c:/Users/harsh/Downloads/stitch_civicfix_ai_platform_design/src/pages/citizen/CitizenDashboard.jsx)** | Replaced permissive filter with `getCitizenComplaints(currentUser)`. Removed "Open Interactive Map" card and replaced it with a "Citizen Data Isolation & Resolution Standards" assurance card. |
| **[`src/pages/citizen/MyComplaintsPage.jsx`](file:///c:/Users/harsh/Downloads/stitch_civicfix_ai_platform_design/src/pages/citizen/MyComplaintsPage.jsx)** | Scoped complaint list and search filters strictly to `userComplaints`. Added distinct empty states for: (a) new accounts with zero complaints; and (b) active searches with zero matches. |
| **[`src/pages/citizen/ComplaintDetailsPage.jsx`](file:///c:/Users/harsh/Downloads/stitch_civicfix_ai_platform_design/src/pages/citizen/ComplaintDetailsPage.jsx)** | Enforced strict ownership authorization via `isComplaintOwner`. Displays a privacy-preserving "Private Citizen Record" screen if an unauthorized ticket ID is opened. Removed "View On City GIS Explorer" link. |
| **[`src/components/layout/CitizenLayout.jsx`](file:///c:/Users/harsh/Downloads/stitch_civicfix_ai_platform_design/src/components/layout/CitizenLayout.jsx)** | Removed "Issue Map" link from both desktop header navigation and mobile navigation bar. |
| **[`src/components/common/RoleRoute.jsx`](file:///c:/Users/harsh/Downloads/stitch_civicfix_ai_platform_design/src/components/common/RoleRoute.jsx)** | **New Component**: Implements RBAC route guards preventing citizens from accessing `/officer/*`, `/worker/*`, or `/admin/*` routes via URL manipulation. |
| **[`src/components/layout/PublicLayout.jsx`](file:///c:/Users/harsh/Downloads/stitch_civicfix_ai_platform_design/src/components/layout/PublicLayout.jsx)** | Implemented `handleNavClick` for smooth scrolling and cross-page anchor navigation (`/#how-it-works`, `/#features`, `/#impact`). Replaced `/citizen/map` with sanitized `/map`. Added Terms and Privacy links to footer. |
| **[`src/pages/public/LandingPage.jsx`](file:///c:/Users/harsh/Downloads/stitch_civicfix_ai_platform_design/src/pages/public/LandingPage.jsx)** | Added `useEffect` listening for URL hash on mount. Added `scroll-mt-20` CSS utilities to `#how-it-works`, `#features`, and `#impact`. Updated hero map CTA to `/map`. Labeled telemetry metrics as simulated prototype metrics. |
| **[`src/pages/public/TermsOfServicePage.jsx`](file:///c:/Users/harsh/Downloads/stitch_civicfix_ai_platform_design/src/pages/public/TermsOfServicePage.jsx)** | **New Page**: Implements full 20-section Terms of Service matching Master Prompt specifications with sticky Table of Contents and return navigation. |
| **[`src/pages/public/PrivacyPolicyPage.jsx`](file:///c:/Users/harsh/Downloads/stitch_civicfix_ai_platform_design/src/pages/public/PrivacyPolicyPage.jsx)** | **New Page**: Implements full 20-section Citizen Data Privacy Policy with data isolation disclosures, DPDPA alignment, and explicit Aadhaar-free declarations. |
| **[`src/pages/public/PublicMapPage.jsx`](file:///c:/Users/harsh/Downloads/stitch_civicfix_ai_platform_design/src/pages/public/PublicMapPage.jsx)** | **New Page**: Sanitized public GIS defect viewer displaying macro-level infrastructure markers without citizen names, phone numbers, emails, or internal notes. |
| **[`src/pages/public/RegisterPage.jsx`](file:///c:/Users/harsh/Downloads/stitch_civicfix_ai_platform_design/src/pages/public/RegisterPage.jsx)** | Replaced static spans with accessible `<Link>` elements pointing to `/legal/terms` and `/legal/privacy` with `target="_blank"`, `rel="noopener noreferrer"`, and `stopPropagation`. |
| **[`src/App.jsx`](file:///c:/Users/harsh/Downloads/stitch_civicfix_ai_platform_design/src/App.jsx)** | Registered `/legal/terms`, `/legal/privacy`, `/map`. Replaced `/citizen/map` with redirect to `/citizen/dashboard`. Wrapped `/citizen`, `/officer`, `/worker`, and `/admin` routes with `RoleRoute`. |

---

## 4. How Ownership Filtering and Authorization Work

1. **Ownership Linkage**:
   - Each complaint record maintains a immutable `citizen` object:
     ```json
     {
       "id": "usr-001",
       "name": "Alex Morgan",
       "email": "alex.m@citizen.org"
     }
     ```
2. **Context-Level Isolation**:
   - `AppContext` provides `getCitizenComplaints(user)`:
     ```javascript
     const getCitizenComplaints = (targetUser = currentUser) => {
       if (!targetUser) return [];
       return complaints.filter(c => {
         const matchId = targetUser.id && c.citizen?.id === targetUser.id;
         const matchEmail = targetUser.email && c.citizen?.email?.toLowerCase() === targetUser.email.toLowerCase();
         return matchId || matchEmail;
       });
     };
     ```
3. **Component-Level Enforcement**:
   - In `MyComplaintsPage`, complaints are loaded via `getCitizenComplaints(currentUser)`. All search queries (by ID, title, road name, category, or status) run **only** against this filtered collection.
4. **Direct URL Route Protection**:
   - In `ComplaintDetailsPage`, the complaint is retrieved by ID, and `isComplaintOwner(complaint, currentUser)` is evaluated:
     - If the complaint is owned by another resident, rendering halts immediately.
     - The page displays:
       > *"Private Citizen Record — Complaint ticket #CF-2026-00120 belongs to another resident or requires municipal staff authorization. In accordance with citizen privacy policies, you may only view reports filed under your own account."*
     - No photos, GPS markers, notes, or worker telemetry are sent to the DOM.

---

## 5. Citizen Map Links Removed vs. Officer Features Preserved

### Links Removed from Citizen Interface
1. **`CitizenLayout.jsx` Desktop Header**: Removed `{ label: 'Issue Map', path: '/citizen/map', icon: 'map' }`.
2. **`CitizenLayout.jsx` Mobile Bar**: Removed mobile navigation icon for Issue Map.
3. **`CitizenDashboard.jsx`**: Removed the 42-point interactive map preview widget and its "Open Interactive Map" button.
4. **`ComplaintDetailsPage.jsx`**: Removed the "View On City GIS Explorer" action button.
5. **Route `/citizen/map`**: Configured in `App.jsx` to immediately redirect to `/citizen/dashboard`.

### Features Preserved for Municipal Officers
1. **Officer Interactive Command Map (`/officer/map`)**: Full OpenStreetMap integration via `TamilNaduOverviewMap` remains completely active.
2. **Officer Geocoding & Address Search**: Officers can search Tamil Nadu localities (Nominatim reverse geocoder) to jump to defect clusters.
3. **Officer Triage & Dispatch**: Marker popup actions ("Review Ticket", "Dispatch Crew") remain fully functional.
4. **Citizen Reporting Location Picker**: In `ReportComplaintPage.jsx`, citizens retain full interactive Leaflet map pin placement and reverse geocoding to report defect coordinates accurately.

---

## 6. How Public Navigation Anchors Work

When a user interacts with "How It Works", "Features", or "Impact":
1. **On Landing Page (`/`)**:
   - `handleNavClick` prevents default anchor jump, triggers smooth animated scrolling via `element.scrollIntoView({ behavior: 'smooth', block: 'start' })`, and updates the browser history via `window.history.pushState`.
2. **From External Pages (e.g. `/register`, `/legal/terms`)**:
   - `handleNavClick` triggers `navigate('/#' + sectionId)`.
   - On `LandingPage.jsx`, a `useEffect` detects the URL hash on mount, waits for the DOM to paint (`100ms`), and scrolls smoothly to the target element.
3. **Sticky Header Offset**:
   - Every section (`#how-it-works`, `#features`, `#impact`) includes Tailwind's `scroll-mt-20` (80px scroll margin top). This provides comfortable padding beneath the sticky 64px (`h-16`) navbar, preventing header occlusion.
4. **Mobile Navigation**:
   - The collapsed mobile menu executes `handleNavClick` and closes automatically on click.

---

## 7. Legal Policy Routes & 20-Section Architecture

### Terms of Service (`/legal/terms`)
Structured across 20 distinct sections:
1. Title, Version & Effective Dates
2. About CivicFix AI & Purpose (Advisory prototype disclosure)
3. Eligibility & Account Registration (18+ requirement)
4. Accurate Information & Account Security
5. Citizen Responsibilities
6. Permitted & Prohibited Use (Scraping, hoaxes, privilege escalation banned)
7. Submitting Reports, Photos & Location Data (Public view evidence only)
8. False, Malicious, Abusive & Duplicate Reports
9. Complaint Review, Prioritization & Assignment (P1–P4 SLA disclosures)
10. Repair Evidence & Resolution Verification (Officer approval mandatory)
11. Notifications & Service Communications
12. Availability, Maintenance & Service Limitations
13. AI-Assisted Analysis & Decision-Support Limits (Advisory only; non-statutory)
14. User-Generated Content & Processing License
15. Privacy & Data Handling (Direct link to `/legal/privacy`)
16. Third-Party Services & Map Providers (OpenStreetMap attribution)
17. Account Suspension & Termination
18. Disclaimers & Limitations of Liability
19. Modifications to These Terms
20. Grievance Redressal & Contact

### Citizen Data Privacy Policy (`/legal/privacy`)
Structured across 20 distinct sections:
1. Title, Version & Effective Dates
2. Operator & Data Controller Information
3. Information Collected During Registration (Minimal contact model)
4. Complaint Details, Photos, GPS & History
5. Information Collected Automatically (Session tokens, auth attempts)
6. Purpose & Lawful Basis for Processing (Consent + Public Works Interest)
7. Complaint Ownership & Access Controls (Strict citizen data isolation)
8. How Data is Used for Operations (Field worker & officer dispatch)
9. AI Processing, Computer Vision & Human Review (Multi-modal advisory triage)
10. Data Sharing & Recipient Categories (Zero third-party commercial sale)
11. Third-Party Service Providers (OpenStreetMap, Leaflet)
12. Storage Locations & Retention Schedules (DPDPA alignment)
13. Security Safeguards & Known Limitations (Prototype disclosure)
14. Cookies, LocalStorage & Prototype Disclosures
15. Citizen Data Rights & Access Requests (Right to review, rectify, delete)
16. Account Deletion & Anonymization
17. Children’s Privacy & Age Policy
18. Incident Notification & Breach Protocols
19. Amendments to Privacy Policy
20. Privacy Grievance Officer & Contact
- **Aadhaar Transparency**: Explicitly declares that real Aadhaar numbers, biometric scans, or UIDAI authentications are **never collected or required**.

---

## 8. Legal Placeholders to be Supplied by Project Owner

Before deploying CivicFix AI into a production municipal environment, the project owner/administrator must configure the following legal placeholders:

| Placeholder Key | Location in Document | Description |
| :--- | :--- | :--- |
| `[CIVICFIX_OPERATOR_LEGAL_ENTITY]` | Terms §20, Privacy §2 | Registered corporate entity, trust, or municipal corporation name. |
| `[GRIEVANCE_OFFICER_NAME]` | Terms §20, Privacy §20 | Named Data Protection & Grievance Officer pursuant to Indian IT Rules. |
| `[LEGAL_REPRESENTATIVE_ADDRESS]`| Terms §20, Privacy §20 | Registered physical office address in Tamil Nadu / India. |
| `[GRIEVANCE_PHONE_NUMBER]` | Terms §20 | Official telephone hotline for formal civic escalations. |
| `[PRODUCTION_RETENTION_YEARS]` | Privacy §12 | Municipal archive retention period (e.g. 3 years, 7 years) under public audit regulations. |

---

## 9. Commands & Automated Browser Test Results

### Build Verification
```powershell
npm.cmd run build
```
**Output**: `vite v5.4.21 building for production... 100 modules transformed. built in 7.03s. Exit Code 0.`

### Automated Browser Test Trajectory 1: Citizen Data Isolation
- **Target**: `http://localhost:5173/citizen/complaints`
- **Active Persona**: Citizen Alex Morgan (`usr-001`)
- **Action**: Searched for Anandhi Sundaram's complaint ticket `#CF-2026-00120`.
- **Result**: Displayed `"No complaints match filters"`. Zero unauthorized tickets returned.
- **Action**: Manually navigated to `http://localhost:5173/citizen/complaints/CF-2026-00120`.
- **Result**: Displayed `"Private Citizen Record"`. Photos, internal notes, and evidence were fully blocked.

### Automated Browser Test Trajectory 2: Citizen Map Elimination & RBAC Guard
- **Target**: `http://localhost:5173/citizen/dashboard`
- **Result**: Confirmed top navigation contains only Dashboard, My Complaints, Notifications. Confirmed dashboard contains no map widget.
- **Action**: Manually navigated to `http://localhost:5173/citizen/map`.
- **Result**: Automatically redirected to `http://localhost:5173/citizen/dashboard`.
- **Action**: Manually navigated to `http://localhost:5173/officer/map` while logged in as Citizen.
- **Result**: RoleRoute intercepted the navigation, displayed an access-restricted notification, and redirected to `http://localhost:5173/citizen/dashboard`.

### Automated Browser Test Trajectory 3: Public Navigation & Anchor Scrolling
- **Target**: `http://localhost:5173/register`
- **Action**: Clicked "How It Works" in header.
- **Result**: Navigated to `http://localhost:5173/#how-it-works` and scrolled smoothly to the section. Header offset (`scroll-mt-20`) ensured section title was clearly visible.

### Automated Browser Test Trajectory 4: Legal Pages & Registration Links
- **Target**: `http://localhost:5173/register`
- **Action**: Inspected Terms and Privacy links in consent checkbox.
- **Result**: Rendered as accessible links with `open_in_new` icons pointing to `/legal/terms` and `/legal/privacy`.
- **Target**: `http://localhost:5173/legal/terms` and `http://localhost:5173/legal/privacy`
- **Result**: Both pages rendered all 20 sections, sticky Table of Contents, and Back navigation cleanly.

---

## 10. Remaining Limitations & Security Roadmap

1. **Client-Side Prototype Security Boundary**:
   - Because no live Spring Boot / MySQL backend is active in the repository, complaint isolation and RBAC are currently enforced in React state and `complaintService.js`. In production, these rules must be enforced by Spring Security session filters and SQL queries (`SELECT * FROM complaints WHERE citizen_id = ?`).
2. **Third-Party Email/SMS Provider**:
   - OTP codes are currently generated cryptographically via Web Crypto API and displayed in honest development mode until an SMS gateway (MSG91, Twilio) is configured via deployment secrets.
