# CivicFix AI — Spring Boot 3.3 Backend

This is the backend service for CivicFix AI, built with Java 21, Spring Boot 3.3.4, Spring Data JPA, Hibernate, PostgreSQL, and Spring Security.

---

## 1. Architecture Overview

- **Runtime & Framework:** Java 21 LTS, Spring Boot 3.3.4
- **Persistence:** Spring Data JPA with Hibernate, PostgreSQL JDBC Driver
- **Database Migrations:** Flyway 10.x (`src/main/resources/db/migration/`)
- **Security:** Spring Security with BCrypt password hashing (cost 10), stateful server-managed sessions (`CIVICFIX_SESSION`), Cookie CSRF token repository (`XSRF-TOKEN`), and strict CORS filter
- **Validation:** Bean Validation (`jakarta.validation.*`)
- **Observability:** Spring Boot Actuator (`/api/health`, `/actuator/health`)

### Package Structure
```text
com.civicfix
├── CivicFixApplication.java
├── audit/                  # Security and business audit logging
│   ├── AuditLog.java
│   ├── AuditLogRepository.java
│   └── AuditService.java
├── auth/                   # Registration, login, session, user info
│   ├── AuthController.java
│   ├── AuthService.java
│   └── dto/
├── common/                 # Uniform API envelope & exception handling
│   ├── ApiResponse.java
│   ├── PagedResponse.java
│   └── exception/
├── complaint/              # Complaint reporting, workflow, history, evidence
│   ├── Complaint.java
│   ├── ComplaintController.java
│   ├── ComplaintPriority.java
│   ├── ComplaintRepository.java
│   ├── ComplaintService.java
│   ├── ComplaintStatus.java
│   ├── ComplaintStatusHistory.java
│   ├── ResolutionEvidence.java
│   └── dto/
├── config/                 # Security, session, CORS, CSRF configuration
│   └── SecurityConfig.java
├── health/                 # Healthcheck endpoint (/api/health)
│   └── HealthController.java
├── security/               # Custom UserDetailsService, Principal, EntryPoints
│   ├── CustomUserDetailsService.java
│   ├── RestAccessDeniedHandler.java
│   ├── RestAuthenticationEntryPoint.java
│   └── UserPrincipal.java
└── user/                   # User, Role, RoleName domain model
    ├── Role.java
    ├── RoleName.java
    ├── RoleRepository.java
    ├── User.java
    └── UserRepository.java
```

---

## 2. Prerequisites & Environment Setup

- **Java JDK:** Java 21 LTS (verified with Eclipse Adoptium Temurin 21.0.12)
- **Maven:** Apache Maven 3.9+ (or use local path)
- **Docker & Docker Compose:** Docker Desktop with Compose v2+
- **PostgreSQL:** Version 16.4 Alpine (managed via Docker Compose)

---

## 3. PostgreSQL Database Setup

1. Start PostgreSQL using Docker Compose from the project root:
   ```powershell
   docker compose up -d postgres
   ```
2. Verify container health:
   ```powershell
   docker compose ps
   ```
   *Note: Host port `5433` is mapped to container port `5432` to avoid conflicts if a local Windows PostgreSQL server occupies port 5432.*

---

## 4. Building and Running the Backend

### Configure Environment
Copy `.env.example` to `.env` or set environment variables:
```powershell
$env:DB_HOST="localhost"
$env:DB_PORT="5433"
$env:DB_NAME="civicfix_db"
$env:DB_USER="civicfix_user"
$env:DB_PASSWORD="change_me_in_local_env_only"
```

### Build with Maven
```powershell
mvn clean package -DskipTests=false
```

### Run Application
```powershell
mvn spring-boot:run
```
Alternatively, run the packaged JAR:
```powershell
java -jar target/civicfix-backend-1.0.0.jar
```

The application will start on `http://localhost:8080`.

---

## 5. Database Schema & Flyway Migrations

Migrations are automatically executed by Flyway at application startup:

- **`V1__initial_schema.sql`:**
  - Creates tables: `users`, `roles`, `user_roles`, `complaints`, `complaint_status_history`, `resolution_evidence`, `audit_logs`
  - Creates indexes on foreign keys, email, phone, status, and assigned personnel.
- **`V2__seed_roles_and_dev_users.sql`:**
  - Seeds roles: `CITIZEN`, `OFFICER`, `WORKER`, `ADMIN`.
  - Seeds development demo accounts (BCrypt hashed, cost 10).

---

## 6. Authentication & Roles

| Role | Access Scope |
| :--- | :--- |
| `CITIZEN` | Register public account, file complaints, view owned complaints, cancel own submitted complaints. |
| `OFFICER` | Review all complaints, assign to workers, reject/escalate, verify and resolve/rework completed tasks. |
| `WORKER` | View assigned complaints, start work (`IN_PROGRESS`), submit resolution evidence (`COMPLETED`). |
| `ADMIN` | Full administrative visibility, user and role auditing, system configuration. |

### Session & CSRF
- **Session:** Server-managed HTTP cookie `CIVICFIX_SESSION` (HttpOnly, SameSite=Lax).
- **CSRF:** Token repository cookie `XSRF-TOKEN` (readable by frontend client; header `X-XSRF-TOKEN` must accompany mutating requests `POST`, `PUT`, `DELETE`).

---

## 7. Automated Testing

Run all backend integration and unit tests:
```powershell
mvn test
```

### Test Suite Includes:
1. `CivicFixApplicationTests`: Application context bootstrap and Flyway migration verification.
2. `PasswordHashingTest`: BCrypt encoder strength and salt generation verification.
3. `AuthControllerIntegrationTest`: User registration, duplicate email rejection, role-escalation defense, credential validation, session invalidation on logout.
4. `ComplaintAuthorizationIntegrationTest`: Anonymous rejection (401), cross-citizen isolation (403), officer assignment, worker status transitions, invalid status transition rejection (400/403).

---

## 8. Known Limitations & Next Steps

- **Real-Time WebSockets:** Documented in `docs/BACKEND_API.md` for Sprint 3 implementation (Spring STOMP over SockJS).
- **Binary File Storage:** File metadata and URLs are supported in `resolution_evidence`. Multipart S3/Local disk file upload pipeline planned for Sprint 3.
