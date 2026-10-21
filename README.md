# CivicFix AI — Municipal Infrastructure Platform

> **Final-Year Engineering Capstone Project**  
> Complete frontend implementation and centralized navigation integration based on **Google Stitch UI/UX Designs**.

---

## 🏛️ Platform Overview

**CivicFix AI** is an intelligent, full-lifecycle municipal infrastructure triage and field resolution system. The frontend empowers citizens to report urban defects (potholes, water leaks, traffic hazards, electrical faults), utilizes AI-driven damage assessment and duplicate detection, enables municipal officers to review and dispatch specialized crews, coordinates field worker telemetry and photographic evidence capture, and provides administrators with tamper-evident audit ledgers and RBAC governance.

---

## 🎨 Design System & Visual Tokens

The platform preserves the **Civic Precision** design identity from Google Stitch:

| Token / Concept | Hex Value | Semantic Usage |
|---|---|---|
| **Background** | `#F5F7FA` | Canvas background |
| **Surface** | `#FFFFFF` | Cards, panels, modal dialogs |
| **Main Text** | `#18232F` | Headings, primary typography |
| **Secondary Text** | `#667384` | Subtitles, helper text, timestamps |
| **Sidebar / Chrome** | `#151D26` | Deep navy municipal navigation rail |
| **Primary Teal** | `#137A70` | Primary action buttons, brand accents |
| **Light Teal** | `#E8F4F1` | Active badges, highlight containers |
| **AI Accent** | `#7C6CF2` | Multimodal AI confidence, vision insights |
| **Warning / Caution** | `#D97706` | Medium priority, rework notices |
| **Error / Critical** | `#C63F48` | High hazards, blockers, alerts |
| **Success / Verified** | `#198754` | Resolved status, valid verification signoffs |
| **Border / Divider** | `#E2E7ED` | Consistent structural borders |

---

## 🧭 Centralized Route Architecture

The platform uses client-side routing powered by `react-router-dom`:

### 1. Public & Authentication Portal
- `/` — Public Landing Page (Citizen statistics, AI pipeline demo, how-it-works)
- `/login` — Unified Municipal & Citizen Sign-In Portal
- `/register` — Citizen Account Enrollment
- `/forgot-password` — Credential Recovery
- `/reset-password` — Secure Password Reset

### 2. Citizen Portal
- `/citizen/dashboard` — Citizen Overview (active complaints, status timeline, nearby reports)
- `/citizen/complaints` — My Submitted Complaints Directory
- `/citizen/complaints/new` — 4-Step Interactive Complaint Reporting Wizard (Category, Details, GPS, Photo Upload)
- `/citizen/complaints/:complaintId` — Detailed Complaint Tracker & Timeline
- `/citizen/notifications` — Status Alerts & Municipal Feedback
- `/citizen/profile` — Citizen Profile & Communication Preferences

### 3. Municipal Officer Command
- `/officer/dashboard` — Command Dashboard (live ticket stream, SLA indicators, sector workload)
- `/officer/complaints` — Comprehensive Complaint Triage Queue
- `/officer/complaints/:complaintId/review` — Multi-factor Review, Urgency Assessment & Crew Dispatch
- `/officer/assignments` — Active Crew Dispatch Board
- `/officer/verifications` — Resolution Verification Queue
- `/officer/verifications/:complaintId` — Side-by-Side Photographic Verification Signoff
- `/officer/map` — Interactive GIS Civic Issue Map
- `/officer/analytics` — SLA Compliance & Resolution Velocity Analytics
- `/officer/notifications` — Emergency Escalations & SLA Breaches
- `/officer/profile` — Officer Credentials & Departmental Assignment

### 4. Field Worker Mobile Companion
- `/worker/dashboard` — Field Operations Dashboard (active dispatch, map route, crew lead badge)
- `/worker/tasks` — Assigned Work Order Queue
- `/worker/tasks/:taskId` — Work Order Specifications & GPS Directions
- `/worker/tasks/:taskId/progress` — Work In-Progress Logging & Blocker Reporting
- `/worker/tasks/:taskId/evidence` — Photographic Repair Evidence Submission
- `/worker/notifications` — Dispatch Orders & Officer Revision Notes
- `/worker/profile` — Field Specialist Credentials & Equipment Manifest

### 5. Platform Administrator Governance
- `/admin/dashboard` — Platform Oversight & System Health
- `/admin/users` — User Directory & Staff Account Vetting
- `/admin/users/:userId` — Account Details & Access Permissions
- `/admin/users/new` — Official Staff Account Provisioning
- `/admin/roles` — Role-Based Access Control (RBAC) Permission Matrix
- `/admin/activity` — 24-Hour Municipal Load & Telemetry
- `/admin/audit-logs` — Tamper-Evident Immutable Audit Ledger
- `/admin/settings` — AI Confidence, SLA Windows, & GIS Bounds
- `/admin/notifications` — Security Feeds & System Warnings
- `/admin/profile` — Super Administrator Security Profile

---

## ⚡ Interactive Persona Role Switcher (Simulator)

For seamless capstone presentations and grading evaluations, the application includes a **docked interactive simulator bar** in the bottom-right corner:
- **Citizen** (`Alex Morgan`)
- **Municipal Officer** (`Elena Vance`)
- **Field Worker** (`Marcus Chen`)
- **System Admin** (`Priya Sharma`)
- **Reset Demo Data** button to quickly restore baseline sample complaints and assignments.

---

## 🔄 Strict Status Transition State Machine

As required by municipal governance standards, complaints follow an enforced transition model:

```
[SUBMITTED] 
    │
    ▼ (Officer Review)
[UNDER_REVIEW]
    │
    ▼ (Officer Assigns Field Worker)
[ASSIGNED]
    │
    ▼ (Worker Commences Work)
[IN_PROGRESS]
    │
    ▼ (Worker Submits Photo Evidence)
[RESOLUTION_SUBMITTED]
    │
    ├──► (Officer Approves Verification) ──► [RESOLVED]
    └──► (Officer Demands Corrections)  ──► [REWORK_REQUESTED]
```

> **Strict Rule Enforced**: Field workers **cannot** mark a ticket as resolved. They submit photo proof which transitions the ticket to `RESOLUTION_SUBMITTED`. Only an authorized municipal officer can inspect side-by-side evidence and transition the status to `RESOLVED`.

---

## 🚀 Running the Project

### Prerequisites
- Node.js (v18+ recommended)
- Windows PowerShell or Command Prompt

### Start Development Server
```bash
npm run dev
```
Open [http://localhost:5173](http://localhost:5173) in your browser.

### Build Production Bundle
```bash
npm run build
```
The optimized bundle will be compiled into `dist/`.

---

## 🔌 Future Backend Architecture (Java Spring Boot)

The current mock services (`complaintService.js`, `authService.js`, `userService.js`) are decoupled behind a unified JavaScript service layer. When implementing the Java Spring Boot backend:
1. Replace LocalStorage operations with `axios` / `fetch` calls to `/api/v1/...` REST endpoints.
2. Maintain the same data schemas and status enums (`COMPLAINT_STATUS`).
3. Spring Security will validate JWT tokens and enforce authorities (`ROLE_CITIZEN`, `ROLE_OFFICER`, `ROLE_WORKER`, `ROLE_ADMIN`).
4. Google Gemini API calls will be brokered through Spring Boot backend microservices with secured API keys.
