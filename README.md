# CivicFix AI — Municipal Infrastructure Platform

[![CI](https://github.com/<your-username>/civicfix-ai-platform/actions/workflows/ci.yml/badge.svg)](https://github.com/<your-username>/civicfix-ai-platform/actions/workflows/ci.yml)

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

## ⚡ Interactive Persona Role Switcher (Simulator — Development Only)

For rapid local testing, capstone presentations, and evaluation in development environments, the application includes an optional **docked interactive simulator bar** in the bottom-right corner:
- **Citizen** (`Alex Morgan`)
- **Municipal Officer** (`Elena Vance`)
- **Field Worker** (`Marcus Chen`)
- **System Admin** (`Priya Sharma`)

> **Security & Production Notice**: This switcher is strictly **development-only**. It is disabled by default and will only render when `VITE_DEMO_MODE=true` in your environment. In production builds and deployments, `VITE_DEMO_MODE` must remain unset or set to `false`. Both the UI component and underlying `switchRole` methods are blocked when demo mode is off.

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

### 1. One-Command Full-Stack Docker Run (Recommended)

Run the entire application (PostgreSQL 16, Spring Boot 3.3 Backend, Nginx + React SPA) with a single command:

```bash
docker compose up --build
```

#### Application URLs
- **Web Application Portal:** [http://localhost](http://localhost) (Port 80)
- **Backend Actuator Health:** [http://localhost/actuator/health](http://localhost/actuator/health) or [http://localhost:8080/actuator/health](http://localhost:8080/actuator/health)
- **PostgreSQL Database:** `127.0.0.1:5433` (`civicfix_db`, user: `civicfix_user`)

#### Pre-Seeded Demonstration Accounts (All Passwords: `Demo<Role>2026!`)
| Role | Email | Password |
|---|---|---|
| **Citizen** | `alex.morgan@civicfix.local` | `DemoCitizen2026!` |
| **Municipal Officer** | `elena.vance@metro.gov` | `DemoOfficer2026!` |
| **Field Technician** | `marcus.chen@metro.gov` | `DemoWorker2026!` |
| **Supervisor** | `sarah.jenkins@metro.gov` | `DemoSupervisor2026!` |
| **Administrator** | `priya.sharma@metro.gov` | `DemoAdmin2026!` |

#### Stopping the Stack
To stop the running containers while preserving database records and uploads:
```bash
docker compose down
```

#### Resetting the Stack (Clean Slate)
To completely stop containers and remove all persistent database records and uploaded media:
```bash
docker compose down -v
```

---

### ⚠️ Never deploy with these defaults

> [!WARNING]
> The default configuration in `docker-compose.yml` (`SPRING_PROFILES_ACTIVE=dev`, `ALLOW_SEED_ACCOUNTS=true`, `POSTGRES_PASSWORD=civicfix_dev_password_only`) is intended **strictly for local development, testing, and academic demonstration**.
>
> **NEVER deploy to a production environment with these defaults!**
>
> 1. **Default Demonstration Accounts (`ALLOW_SEED_ACCOUNTS=true`)**:
>    The pre-seeded accounts (`alex.morgan@civicfix.local`, `elena.vance@metro.gov`, `marcus.chen@metro.gov`, `sarah.jenkins@metro.gov`, `priya.sharma@metro.gov`) have widely documented default credentials. In production, configure `ALLOW_SEED_ACCOUNTS=false` and `SPRING_PROFILES_ACTIVE=prod`. When disabled in production, the backend's `ProductionSafetyGuard` disables these seed accounts at startup.
> 2. **Insecure Database Password (`POSTGRES_PASSWORD`)**:
>    The default PostgreSQL password `civicfix_dev_password_only` is public. In production profile (`SPRING_PROFILES_ACTIVE=prod`), `ProductionSafetyGuard` validates database credentials at boot and **refuses to start** if the database password is empty, blank, or matches `civicfix_dev_password_only`. Always supply a cryptographically strong, unique `DB_PASSWORD` / `POSTGRES_PASSWORD` via environment variables or secrets manager.
> 3. **Production Profile Activation (`SPRING_PROFILES_ACTIVE=prod`)**:
>    Always run production instances with `SPRING_PROFILES_ACTIVE=prod`. This activates production safety guards, disables Swagger/development tooling, enforces trusted proxy headers (`TRUSTED_PROXY_ENABLED=true`), and activates secure cookie attributes (`SameSite=Strict`, `Secure=true`).

---

### 2. Local Development Workflow (Without Dockerizing App)

If developing locally with hot-reloading:

#### Step 1: Start PostgreSQL Container
```bash
docker compose -f docker-compose.dev.yml up -d
```

#### Step 2: Start Spring Boot Backend
```bash
cd backend
./mvnw spring-boot:run
```
Backend runs on [http://localhost:8080](http://localhost:8080).

#### Step 3: Start Vite Frontend Dev Server
```bash
npm install
npm run dev
```
Frontend runs on [http://localhost:5173](http://localhost:5173) with automatic proxying to the backend.

---

## 📱 Progressive Web App (PWA) & Offline Capabilities

CivicFix AI is fully installable as an app across desktop (Chrome, Edge) and mobile (Android, iOS) via `vite-plugin-pwa` and Service Worker precaching.

### Key Architecture & Governance Standards
- **Web App Manifest**: Configured with name `CivicFix`, standalone display, theme color `#137A70`, and background color `#f8f9ff`, paired with 192x192, 512x512, and maskable SVG/PNG icons.
- **Local Asset & Font Bundling**: All typography (`Material Symbols Outlined`, `Inter`, `JetBrains Mono`, `Noto Sans Tamil`) is bundled locally as variable `.woff2` files under `/fonts/`. No external Google CDN dependencies are loaded, ensuring the UI shell renders instantly without network round-trips.
- **Strict `NetworkOnly` API Policy**: Dynamic municipal endpoints (`/api/**`) use Workbox `NetworkOnly` and are **never cached**. Stale complaint statuses, forged telemetry, or unauthorized local offline ticket creation are strictly prevented for municipal audit integrity.
- **Offline Guard Screen**: In offline / airplane mode, the app presents a friendly offline screen informing residents to re-establish connectivity. Navigation requests are excluded from intercepting backend API routes via `navigateFallbackDenylist: [/^\/api\//]`.
- **In-App Install Prompt**: An "Install App" button appears strictly when the browser dispatches a valid `beforeinstallprompt` event (available in desktop headers and citizen portal layout).
- **Service Worker Updates**: When a new municipal software version is deployed, an automatic "Update Available" snackbar prompts residents and staff to reload to activate the latest service worker.

> **Production Security Requirement**: Modern browsers restrict Service Worker registration and PWA installation to **secure contexts (HTTPS)**. In production deployments, TLS/HTTPS termination is mandatory (e.g., via Let's Encrypt / reverse proxy).

---

## 🧪 Running the Tests

Ensure tests pass locally before pushing changes to GitHub.

### 1. Frontend Test Suite & Production Build

The frontend test suite runs on Node.js 20+ with built-in test runner:

```bash
# Install frontend dependencies
npm ci

# Run all 169 unit, integration & PWA tests
npm.cmd test

# Verify production build & Service Worker compilation
npm.cmd run build
```

### 2. Backend Test Suite

The backend integration tests connect to PostgreSQL on port 5433 (default local test container) or port 5432:

```bash
# Ensure local development database container is running
docker compose -f docker-compose.dev.yml up -d

# Run all JUnit 5 tests via Maven wrapper
cd backend
./mvnw test

# Or on Windows PowerShell:
.\mvnw.cmd test
```
*(Test reports are generated in `backend/target/surefire-reports/`)*

---

## 🔮 Future Roadmap

- **Email Verification**: Future work: email verification via a mail provider (e.g., SMTP/SendGrid/SES) for delivery of cryptographically signed verification links or codes.
- **Bi-directional SMS**: Integration with municipal SMS gateway for emergency defect notifications.


