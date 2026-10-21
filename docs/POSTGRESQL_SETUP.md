# CivicFix AI — PostgreSQL Database Setup Guide

This document specifies the PostgreSQL configuration, operational procedures, backup/restore workflows, and persistence guarantees for CivicFix AI.

---

## 1. Specification

- **Engine:** PostgreSQL 16.4 Alpine (`postgres:16.4-alpine`)
- **Database Name:** `civicfix_db`
- **Container Name:** `civicfix_postgres`
- **Volume Name:** `civicfix_postgres_data` (Named Docker Volume for persistent storage)
- **Container Internal Port:** `5432`
- **Host Port Mapping:** `127.0.0.1:5433 -> 5432`

> [!NOTE]
> **Host Port Conflict Resolution:**
> During Sprint 2 environment inspection, host port `5432` was found occupied by an existing local Windows PostgreSQL service (`PID 7652`). To avoid port collision and preserve existing system services, the Docker Compose configuration maps the container to loopback port `127.0.0.1:5433`.
> If port 5432 is free on your system, you may configure `POSTGRES_PORT=5432` in your local `.env`.

---

## 2. Configuration & Credentials

A template [`.env.example`](file:///c:/Users/harsh/Downloads/stitch_civicfix_ai_platform_design/.env.example) is provided in the repository root:

```env
POSTGRES_DB=civicfix_db
POSTGRES_USER=civicfix_user
POSTGRES_PASSWORD=replace_with_secure_password_in_env
POSTGRES_PORT=5433
```

To configure:
```powershell
Copy-Item .env.example .env
# Edit .env with your local credentials. The .env file is excluded by .gitignore.
```

---

## 3. Operations

### Start PostgreSQL
```powershell
docker compose up -d postgres
```

### Check Container Status & Health
```powershell
docker compose ps
```
The status should display `Up (healthy)`.

### Inspect Logs
```powershell
docker compose logs -f postgres
```

### Stop Database Safely (Preserving Data)
```powershell
docker compose stop postgres
```
or
```powershell
docker compose down
```

> [!CAUTION]
> **NEVER run `docker compose down -v`**.
> The `-v` flag deletes named Docker volumes, destroying persistent database records and migration history.

---

## 4. Health Check Verification

The Docker Compose configuration includes an integrated healthcheck:
```yaml
healthcheck:
  test: ["CMD-SHELL", "pg_isready -U $$POSTGRES_USER -d $$POSTGRES_DB"]
  interval: 10s
  timeout: 5s
  retries: 5
  start_period: 10s
```

Verify directly via Docker exec:
```powershell
docker exec civicfix_postgres pg_isready -U civicfix_user -d civicfix_db
# Output: /var/run/postgresql:5432 - accepting connections
```

---

## 5. Persistence Across Restarts

The database uses the named Docker volume `civicfix_postgres_data`. When the container is stopped or recreated:
```powershell
docker compose down
docker compose up -d postgres
```
Data in `/var/lib/postgresql/data` remains intact, including user accounts, complaints, and Flyway migration state (`flyway_schema_history`).

---

## 6. Backup & Restore Procedures

### Create a Database Backup (Dump)
```powershell
docker exec -t civicfix_postgres pg_dump -U civicfix_user -d civicfix_db -F c -b -v -f /tmp/backup.dump
docker cp civicfix_postgres:/tmp/backup.dump ./civicfix_db_backup.dump
```

### Restore Database from Backup
```powershell
docker cp ./civicfix_db_backup.dump civicfix_postgres:/tmp/backup.dump
docker exec -t civicfix_postgres pg_restore -U civicfix_user -d civicfix_db -v -c /tmp/backup.dump
```
