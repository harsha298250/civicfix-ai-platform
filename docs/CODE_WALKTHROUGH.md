# CivicFix: Comprehensive Code Walkthrough & Viva Defense Guide

> **Target Audience**: Students, evaluators, and developers defending this project in an academic or technical viva.  
> **Approach**: Written in plain, simple English. Every claim is cross-referenced with exact class names, methods, and database tables. Where a theoretical capability is not backed by actual code in this repository, it is explicitly flagged with **`[UNVERIFIED]`**.

---

## Part 1: Ten Core Execution Flows

---

### Flow 1: Login, Sessions, CSRF, and Logout

#### 3-to-5 Line Summary
When a user logs in, the server checks if their account is locked, finds their email/phone in PostgreSQL, and verifies the BCrypt password hash. If valid, Spring Security generates a secure, stateful HTTP session identified by a cookie named `CIVICFIX_SESSION` marked `HttpOnly` and `SameSite=Lax`. A readable cookie `XSRF-TOKEN` is sent to the browser, which the frontend must return in the `X-XSRF-TOKEN` header on every data modification request. During logout, the server invalidates the session in memory and clears the authentication context.

#### Exact Files and Methods Involved
- **`AuthController.java`**:
  - `login(@Valid @RequestBody LoginRequest request, HttpServletRequest httpRequest)`: Entry point for user authentication.
  - `logout(HttpServletRequest httpRequest, HttpServletResponse httpResponse)`: Invalidates session and clears Spring Security context.
  - `getCurrentUser(@AuthenticationPrincipal UserPrincipal principal)`: Returns currently authenticated profile.
- **`AuthService.java`**:
  - `authenticate(String identifier, String password, String ipAddress)`: Coordinates lockout checks, password hash verification, and audit logging.
- **`LoginLockoutService.java`**:
  - `checkLockout(String identifier, String ipAddress)`: Checks IP and per-account Bucket4j buckets before authentication.
  - `recordFailedAttempt(String identifier, String ipAddress)`: Consumes tokens on bad passwords.
  - `resetLockout(String identifier, String ipAddress)`: Resets failed attempts upon successful login.
- **`SecurityConfig.java`**:
  - Configures `CookieCsrfTokenRepository.withHttpOnlyFalse()` and specifies role-based URL authorization.

#### What Could Go Wrong / What This Does NOT Protect Against
1. **Per-Account Lockout Denial of Service**: The per-account lockout bucket is keyed directly by the user-supplied email or phone number across all IP addresses. An attacker can intentionally lock out any victim across the platform simply by submitting 20 bad passwords for that victim's email.
2. **In-Memory Session Volatility**: Sessions are stored in the JVM application memory. If the backend server restarts, all logged-in users are immediately logged out and forced to re-authenticate.
3. **Plaintext HTTP Interception**: If the system is deployed without TLS/HTTPS termination, session cookies can be intercepted over unencrypted Wi-Fi networks.
4. **XSS Compromise of CSRF**: Because `XSRF-TOKEN` has `HttpOnly=false` (so JavaScript can read it and attach the header), any Cross-Site Scripting (XSS) vulnerability would allow a malicious script to read the CSRF token.

---

### Flow 2: Creating a Complaint (Validation, Photos, Triage, Duplicates, SLA)

#### 3-to-5 Line Summary
A citizen submits a defect title, description, category, and coordinates via JSON or multipart form data. The server decodes uploaded photos to verify format magic bytes and strips EXIF GPS data from JPEG/PNG images before saving to disk. Next, the deterministic triage engine analyzes the text against English and Tamil keyword lexicons to suggest category and priority. The duplicate engine scans existing tickets within 150 meters for similar text. Finally, an SLA resolution target deadline is calculated and the complaint is saved with initial status `SUBMITTED`.

#### Exact Files and Methods Involved
- **`ComplaintController.java`**:
  - `createComplaint(...)` and `createComplaintMultipart(...)`: Receives HTTP POST request.
- **`ComplaintService.java`**:
  - `createComplaint(CreateComplaintRequest req, List<MultipartFile> files, UserPrincipal principal, String ipAddress)`: Orchestrates intake, storage, triage, SLA, and audit logs.
- **`LocalStorageService.java`**:
  - `storeFile(MultipartFile file, String subDirectory)`: Verifies size, extension, MIME type, magic bytes, strips EXIF metadata for JPEG/PNG, and writes UUID-named file to disk.
- **`AiTriageService.java`**:
  - `triageComplaint(Complaint complaint)`: Coordinates keyword triage and candidate duplicate search.
- **`DeterministicTriageEngine.java`**:
  - `evaluate(String title, String description, String citizenCategory, String citizenPriority)`: Scores text tokens with 2x title weighting and 3x phrase weighting.
- **`DuplicateDetectionEngine.java`**:
  - `findCandidates(...)`: Queries nearby complaints within 150m and runs Jaccard token similarity.
- **`SlaService.java`**:
  - `computeSlaDueAt(String category, ComplaintPriority priority, OffsetDateTime fromTime)`: Looks up `sla_policies` table to calculate deadline.

#### What Could Go Wrong / What This Does NOT Protect Against
1. **Garbage Photo Uploads**: The file check verifies image magic bytes and re-encodes pixels, but there is no computer vision model checking what is actually in the picture. A user can upload a picture of a pet or coffee cup and the system will accept it.
2. **Unvalidated Ward String**: The municipal ward is stored as a raw text string. The system does not verify whether the coordinates actually fall inside that ward's geographic boundaries.
3. **Advisory-Only Duplicate Detection**: Flagging a ticket as a duplicate is purely advisory. The system does not block citizens from submitting duplicate complaints.
4. **Lexicon Misses on Typos**: If a user submits typos or slang not in the keyword dictionaries, the triage engine fails to match and defaults to `MEDIUM` priority.

---

### Flow 3: The Status State Machine (Who Can Move What)

#### 3-to-5 Line Summary
The lifecycle of every civic complaint is strictly governed by role checks and state preconditions in the service layer. Citizens create complaints (`SUBMITTED`), confirm repairs (`RESOLVED`), reject repairs (`REWORK_REQUESTED`), or reopen cases (`REOPENED`). Field workers start work (`IN_PROGRESS`) and submit repair evidence (`RESOLUTION_SUBMITTED`). Municipal officers review evidence and approve it (`PENDING_CITIZEN_CONFIRMATION`) or demand fixes (`REWORK_REQUESTED`). Direct transition to `RESOLVED` by an officer or worker is strictly forbidden by code.

#### Exact Files and Methods Involved
- **`ComplaintService.java`**:
  - `updateStatus(String idOrRef, UpdateStatusRequest req, UserPrincipal principal, String ipAddress)`: Central switch statement enforcing allowed status transitions and role authorities.
  - `assignComplaint(...)`: Transitions `SUBMITTED` or `REWORK_REQUESTED` to `ASSIGNED` (Officer/Admin only).
  - `verifyResolution(...)`: Transitions `RESOLUTION_SUBMITTED` to `PENDING_CITIZEN_CONFIRMATION` or `REWORK_REQUESTED` (Officer/Admin only).
  - `confirmResolution(...)`: Transitions `PENDING_CITIZEN_CONFIRMATION` to `RESOLVED` (Owning Citizen only).
  - `rejectResolution(...)`: Transitions `PENDING_CITIZEN_CONFIRMATION` to `REWORK_REQUESTED` (Owning Citizen only).
- **`Complaint.java`**:
  - `addStatusHistory(...)`: Records every state movement in the immutable `complaint_status_history` ledger.

#### Transition Matrix & Allowed Roles
| From Status | To Status | Allowed Role | Mandatory Requirements |
|---|---|---|---|
| `[START]` | `SUBMITTED` | Citizen / Staff | Valid intake request |
| `SUBMITTED` | `ASSIGNED` | Officer / Admin | Assigned field worker ID |
| `SUBMITTED` | `REJECTED` | Officer / Admin | Formal rejection note |
| `ASSIGNED` | `IN_PROGRESS` | Assigned Worker / Staff | Must be assigned technician |
| `ASSIGNED` | `ASSIGNED` | Supervisor / Admin | Worker reassignment |
| `IN_PROGRESS` | `RESOLUTION_SUBMITTED` | Assigned Worker / Staff | Photo evidence + repair notes |
| `RESOLUTION_SUBMITTED` | `PENDING_CITIZEN_CONFIRMATION` | Officer / Admin | If GPS is out-of-range, requires 10–500 char officer acknowledgement |
| `RESOLUTION_SUBMITTED` | `REWORK_REQUESTED` | Officer / Admin | Meaningful rework note |
| `REWORK_REQUESTED` | `IN_PROGRESS` | Assigned Worker / Staff | Resuming work order |
| `PENDING_CITIZEN_CONFIRMATION` | `RESOLVED` | Owning Citizen / Scheduler | Citizen confirmation OR 7-day auto-confirm scheduler |
| `PENDING_CITIZEN_CONFIRMATION` | `REWORK_REQUESTED` | Owning Citizen | Mandatory 10–500 char rejection reason (`reopen_count++`) |
| `RESOLVED` | `REOPENED` | Owning Citizen | Within 30-day dispute window; 10–500 char dispute explanation |

#### What Could Go Wrong / What This Does NOT Protect Against
1. **Officer Inability to Force Resolve**: If a citizen refuses to confirm and turns off their phone, the officer cannot unilaterally mark the ticket `RESOLVED` immediately; the platform must wait for the 7-day auto-confirm scheduler to expire.
2. **Worker Inactivity in `IN_PROGRESS`**: The state machine allows a worker to move a ticket to `IN_PROGRESS`, but cannot physically verify that the worker is on-site until evidence is uploaded.

---

### Flow 4: Evidence Submission and the GPS Distance Check

#### 3-to-5 Line Summary
When a field worker finishes repairs, they submit one or more photos, work notes, and the latitude/longitude reported by their device. The server computes the distance between the worker's device coordinates and the original complaint coordinates using the spherical Haversine formula. If the worker is within 100 meters, it is flagged `WITHIN_RANGE`; if farther, it is flagged `OUT_OF_RANGE`. If GPS is omitted, the worker must submit an explanatory note of at least 10 characters. Later, an officer cannot approve an out-of-range ticket without entering an explicit acknowledgement note.

#### Exact Files and Methods Involved
- **`ComplaintController.java`**:
  - `submitEvidence(...)`: Receives multipart files, notes, coordinates, and accuracy.
- **`ComplaintService.java`**:
  - `submitEvidence(String idOrRef, List<MultipartFile> files, String notes, BigDecimal latitude, BigDecimal longitude, BigDecimal accuracy, Boolean deviceReported, String locationNote, UserPrincipal principal, String ipAddress)`: Computes Haversine distance and enforces the 100-meter rule.
  - `verifyResolution(...)`: Lines 579–588 inspect `latestEv.getLocationCheck()` and require a 10–500 character `locationAcknowledgement` if not `WITHIN_RANGE`.
- **`GeoUtils.java`**:
  - `haversineDistance(double lat1, double lon1, double lat2, double lon2)`: Calculates great-circle distance in meters.
- **`LocationCheck.java`**:
  - Enum values: `WITHIN_RANGE`, `OUT_OF_RANGE`, `LOW_ACCURACY`, `NOT_PROVIDED`, `NOT_CHECKABLE`.

#### What Could Go Wrong / What This Does NOT Protect Against
1. **Client-Side GPS Spoofing**: The server relies entirely on the numbers sent in the HTTP request payload. A dishonest worker using a rooted phone, mock location app, or script can send the exact coordinates of the defect while sitting at home.
2. **WebP EXIF Metadata Leak**: EXIF GPS tags are stripped from JPEG and PNG files by re-encoding them through `ImageIO`. For WebP uploads, `LocalStorageService` only checks magic bytes and saves the file directly; EXIF metadata in WebP files is not stripped.
3. **Subjective Officer Overrides**: If a worker submits out-of-range evidence with an explanation, the officer can bypass the distance check simply by typing any 10-character string into the acknowledgement box.

---

### Flow 5: Citizen Confirm/Reject, Reopen, and Auto-Confirm

#### 3-to-5 Line Summary
Once evidence is approved by an officer, the ticket enters `PENDING_CITIZEN_CONFIRMATION` awaiting the reporting citizen's approval. The citizen can confirm the repair (transitioning it to `RESOLVED`) or reject it with a 10-to-500 character reason (transitioning it back to `REWORK_REQUESTED` and incrementing `reopen_count`). If the citizen takes no action within 7 days, a background scheduler automatically marks the complaint `RESOLVED` with `auto_confirmed = true`. If a resolved issue fails within 30 days, the citizen can reopen the ticket.

#### Exact Files and Methods Involved
- **`ComplaintController.java`**:
  - `confirmResolution(...)`: Calls service to confirm repair.
  - `rejectResolution(...)`: Calls service to reject repair with feedback.
- **`ComplaintService.java`**:
  - `confirmResolution(...)`: Enforces citizen ownership and optimistic locking version check, sets status to `RESOLVED`, and records `confirmedAt`.
  - `rejectResolution(...)`: Enforces citizen ownership, requires 10–500 char explanation, increments `reopen_count`, and sets status to `REWORK_REQUESTED`.
  - `updateStatus(...)` (case `REOPENED`): Validates 30-day dispute window and sets status to `REOPENED`.
- **`AutoConfirmScheduler.java`**:
  - `checkAndAutoConfirmComplaints()`: Periodic cron job running every 5 minutes (`300000ms`), selecting complaints pending confirmation older than 7 days.
- **`AutoConfirmService.java`**:
  - `autoConfirmComplaint(UUID complaintId, OffsetDateTime now)`: Executes state transition to `RESOLVED` in an isolated database transaction.

#### What Could Go Wrong / What This Does NOT Protect Against
1. **Silent Auto-Confirmation**: Because the system has no outbound email or SMS gateway, a citizen who does not actively open the web app will never know confirmation was requested, and their issue will auto-resolve after 7 days without their knowledge.
2. **Malicious Citizen Rejection**: A citizen can reject a perfectly completed repair out of personal grievance, forcing the field crew back into `REWORK_REQUESTED`.
3. **Expired Dispute Window**: If a road repair fails on day 31, the 30-day reopen window blocks the citizen from reopening the ticket, forcing them to file a brand-new complaint.

---

### Flow 6: SLA Escalation Job and Supervisor Reassignment

#### 3-to-5 Line Summary
A background scheduler runs every 5 minutes scanning for complaints whose deadline (`sla_due_at`) has passed, are not in a terminal state, and have not yet been escalated. For each overdue complaint, it sets `escalated_at = NOW()` and writes an audit ledger entry, making the ticket visible on the Supervisor Escalation Desk. A municipal supervisor can then review the ticket, inspect notes, and reassign the stalled work order to a different field technician.

#### Exact Files and Methods Involved
- **`SlaEscalationScheduler.java`**:
  - `checkAndEscalateOverdueComplaints()`: Runs every 5 minutes; queries overdue IDs in batches of 50.
- **`ComplaintRepository.java`**:
  - `findOverdueComplaintIdsForEscalation(...)`: Finds complaints where `slaDueAt < NOW() AND escalatedAt IS NULL` and status is not terminal.
  - `markEscalated(UUID id, OffsetDateTime now)`: Atomic conditional query: `UPDATE complaints SET escalated_at = :now WHERE id = :id AND escalated_at IS NULL`.
- **`SlaEscalationService.java`**:
  - `escalateComplaint(UUID complaintId, OffsetDateTime now)`: Executes single escalation in a new transaction (`Propagation.REQUIRES_NEW`).
- **`SupervisorController.java` & `SupervisorService.java`**:
  - `getEscalations(...)`: Lists escalated and overdue tickets.
  - `reassignComplaint(UUID id, ReassignTaskRequest req, UserPrincipal principal)`: Updates assigned worker and records history.

#### What Could Go Wrong / What This Does NOT Protect Against
1. **Reassignment Without Worker Availability Checks**: The supervisor can reassign a ticket to any user with the `WORKER` role, even if that worker already has 50 active tasks or is marked inactive.
2. **No Physical Enforcement**: Escalating a ticket merely changes a database timestamp and shows a red badge in the UI; it does not automatically dispatch workers or resolve real-world delays.
3. **Server Crash During Batch**: If the server crashes mid-batch, complaints already marked with `escalated_at != null` remain escalated, while uncommitted ones will be picked up on the next run 5 minutes later without duplicate alerts.

---

### Flow 7: Rate Limiting and Login Lockout

#### 3-to-5 Line Summary
Every incoming HTTP request to sensitive endpoints passes through a Bucket4j token bucket interceptor. Public registration is throttled to 5 requests per 15 minutes per IP address. Login authentication checks two tiers: 5 attempts per 15 minutes per IP + identifier pair, and 20 attempts per 1 hour per user account across all IPs. If an account exceeds failed attempts, requests are rejected with HTTP 429 and a `Retry-After` header.

#### Exact Files and Methods Involved
- **`RateLimitInterceptor.java`**:
  - `preHandle(...)`: Intercepts `/api/auth/register` and public endpoints; extracts client IP via `ClientIpResolver`.
- **`RateLimiterService.java`**:
  - `resolveBucket(String key, long capacity, Duration duration)`: Retrieves or creates in-memory `Bucket` in a `ConcurrentHashMap`.
  - `tryConsume(...)`: Consumes 1 token; returns remaining capacity.
- **`LoginLockoutService.java`**:
  - `checkLockout(String identifier, String ipAddress)`: Checks both IP and per-account buckets before authenticating.
  - `recordFailedAttempt(...)`: Deducts tokens when bad credentials are submitted.
- **`ClientIpResolver.java`**:
  - Resolves client IP address, safely ignoring spoofed `X-Forwarded-For` headers unless `TRUSTED_PROXY_ENABLED=true`.

#### What Could Go Wrong / What This Does NOT Protect Against
1. **In-Memory Volatility**: Token buckets are stored in a Java `ConcurrentHashMap`. Restarting the backend server instantly erases all rate-limiting and lockout memory.
2. **Distributed Bypass**: Because state is kept in JVM heap rather than Redis, deploying multiple backend containers behind a load balancer allows attackers to cycle requests across containers to bypass limits.
3. **Victim Account Denial of Service**: Keying the 20-attempt limit purely on the user's email allows an attacker to lock out any victim user across the entire platform.

---

### Flow 8: Public Map Privacy (Rounding and Hidden Fields)

#### 3-to-5 Line Summary
Unauthenticated visitors can view public defect maps without exposing citizen identities or exact residential locations. The public map endpoint rounds all latitude and longitude coordinates to 3 decimal places (approximately 110 meters of spatial resolution). The response DTO strips citizen names, email addresses, phone numbers, written defect descriptions, internal officer notes, database UUIDs, and tracking reference numbers, replacing them with a synthetic sequential integer ID (`1, 2, ...`).

#### Exact Files and Methods Involved
- **`ComplaintController.java`**:
  - `getPublicMapComplaints(...)`: Public endpoint accepting bounding box coordinates, category, and status filters.
- **`ComplaintService.java`**:
  - `getPublicMapComplaints(...)`: Fetches coordinates within spatial bounds and maps entities to sanitized public DTOs.
- **`PublicMapComplaintResponse.java`**:
  - `fromEntity(Complaint c, int index)`: Performs coordinate truncation via `BigDecimal.setScale(3, RoundingMode.HALF_UP)` and maps only safe fields (`id`, `category`, `status`, `priority`, `ward`, `createdAt`, `latitude`, `longitude`).

#### What Could Go Wrong / What This Does NOT Protect Against
1. **Sparse Location De-Anonymization**: In low-density rural areas or isolated streets where only one house exists within 110 meters, rounding coordinates does not prevent neighbors from inferring who filed the complaint.
2. **Visible Categories**: Although descriptions are stripped, category names (such as `WATER_SEWERAGE` or `GARBAGE`) remain public, which may reveal private household disputes or sensitive localized conditions.
3. **No Geographic Boundary Enforcement**: Coordinates can be queried across arbitrary bounding boxes without verifying if they belong to official municipality borders.

---

### Flow 9: Notifications (After-Commit Events)

#### 3-to-5 Line Summary
When significant complaint actions occur (ticket filed, worker assigned, evidence submitted, rework requested, resolved), domain events are published via Spring's `ApplicationEventPublisher`. A transactional event listener listens for these events strictly *after* the initiating database transaction successfully commits. The notification service then creates and persists in-app notification records for the intended recipients inside an independent database transaction.

#### Exact Files and Methods Involved
- **`ComplaintService.java`**:
  - Injects `ApplicationEventPublisher` and invokes `eventPublisher.publishEvent(new ComplaintEvent(this, ...))` after successful transitions.
- **`ComplaintEvent.java` & `ComplaintEventType.java`**:
  - Domain event carrying event type, complaint entity, actor, and timestamp.
- **`NotificationEventListener.java`**:
  - `onComplaintEvent(ComplaintEvent event)`: Annotated with `@TransactionalEventListener(phase = TransactionPhase.AFTER_COMMIT)`. Ensures notifications are never generated if the transaction rolls back.
- **`NotificationService.java`**:
  - `handleComplaintEvent(ComplaintEvent event)`: Runs under `@Transactional(propagation = Propagation.REQUIRES_NEW)` to persist notifications with 30-second deduplication.
- **`NotificationController.java`**:
  - Exposes REST endpoints (`/api/notifications`, `/unread-count`, `/read`, `/read-all`) for users to fetch in-app alerts.

#### What Could Go Wrong / What This Does NOT Protect Against
1. **In-App Only (Zero Outbound Delivery)**: Notifications are saved as rows in PostgreSQL. There is no email, SMS, or mobile push notification service. If a user does not log into the website, they will never see their alerts.
2. **Post-Commit Delivery Failure**: Because the listener executes *after* the main transaction has committed, if the database fails while inserting the notification row, the complaint transition remains saved but the notification is permanently lost.
3. **Polling Overhead**: The frontend must poll the server periodically or fetch unread counts on navigation, which increases API request volume.

---

### Flow 10: Production Safety Guard and Seed Accounts

#### 3-to-5 Line Summary
To prevent deploying development credentials into production, a startup runner component activates exclusively under Spring's `prod` profile. When the backend boots, it checks the database password: if it is blank or matches the default development string (`civicfix_dev_password_only`), it immediately aborts application startup with an exception. Next, it automatically deactivates the four default demonstration user accounts unless an explicit configuration flag `ALLOW_SEED_ACCOUNTS=true` is set.

#### Exact Files and Methods Involved
- **`ProductionSafetyGuard.java`**:
  - Annotated with `@Component` and `@Profile("prod")`.
  - `run(ApplicationArguments args)`: Executes validation at application startup.
  - `validateDatabasePassword()`: Throws `IllegalStateException` if password is empty or equals `civicfix_dev_password_only`.
  - `enforceSeedAccountPolicy()`: Deactivates seed UUIDs (`Alex Morgan`, `Elena Vance`, `Marcus Chen`, `Priya Sharma`) by updating `is_active = false` in `UserRepository`.
- **`UserRepository.java`**:
  - `deactivateUsersByIds(List<UUID> ids)`: Bulk-updates `is_active = false` for the demo account UUIDs.

#### What Could Go Wrong / What This Does NOT Protect Against
1. **Inactive in Non-Prod Profiles**: If someone accidentally deploys the application with `SPRING_PROFILES_ACTIVE=dev` in a live environment, this safety guard never runs, leaving default accounts and passwords active.
2. **Weak Non-Default Passwords**: The validator only checks for the exact default string `civicfix_dev_password_only`. It does not check password entropy; setting the password to `123456` will pass the check.
3. **Explicit Override Risk**: If an administrator sets `ALLOW_SEED_ACCOUNTS=true` in production environment variables, the known seed accounts remain active with well-documented demo passwords.

---

## Part 2: Design Decisions and Why

### 1. Stateful Sessions Instead of Stateless JWT
* **Decision**: We chose standard Spring Security HTTP sessions (`CIVICFIX_SESSION` cookie) instead of JSON Web Tokens (JWT).
* **Why**:
  - *Immediate Revocation*: In a civic platform with role-based governance, an administrator must be able to immediately deactivate a rogue staff account. With stateless JWTs, a revoked user remains valid until the token expires unless a complex distributed token blacklist is built.
  - *No Refresh Token Dance*: Avoids storing access tokens in browser `localStorage` where they are vulnerable to cross-site scripting (XSS) theft.
  - *Simplicity & Security*: Combined with `HttpOnly` and `SameSite=Lax` cookie flags plus Spring's `CookieCsrfTokenRepository`, sessions provide robust defense with minimal moving parts.

### 2. PostgreSQL Relational Database
* **Decision**: We chose PostgreSQL 16 over MongoDB or DynamoDB.
* **Why**:
  - *ACID Transactional Integrity*: Civic complaint workflows require strict transactional guarantees. When evidence is approved, updating complaint status, adding status history, incrementing counters, and writing audit logs must succeed or fail together.
  - *Relational Foreign Keys & Cascades*: Cleanly enforce relational integrity across users, roles, complaints, photos, evidence, and audit logs.
  - *Native Spatial Indexing*: PostgreSQL provides composite B-Tree indexing on `(latitude, longitude)` and allows seamless future upgrades to full PostGIS geometry without changing database engines.

### 3. Modular Monolith Instead of Microservices
* **Decision**: We structured the backend as a single, modular Spring Boot application rather than breaking it into 5 separate microservices (Auth Service, Complaint Service, Notification Service, GIS Service, Analytics Service).
* **Why**:
  - *Single Deployment Unit*: Municipal IT departments frequently lack large DevOps teams to manage Kubernetes clusters, service meshes, distributed tracing, and API gateways. A single JAR running in Docker is simple and reliable to deploy.
  - *Zero Network Failure Modes*: Transitions, triage, and audit logging happen via in-memory Java method calls within single database transactions, eliminating distributed 2-phase commit problems and network timeouts.
  - *Resource Efficiency*: A single JVM application runs smoothly within 512MB–1GB RAM, whereas running multiple Spring Boot microservices would consume several gigabytes of server memory.

### 4. Rule-Based Deterministic Triage Instead of a Trained Neural Network
* **Decision**: We implemented `DeterministicTriageEngine` using token-set scoring and curated bilingual lexicons rather than deploying an opaque Large Language Model (LLM) or deep neural network.
* **Why**:
  - *100% Explainability*: Municipal governments cannot tell citizens an issue was deprioritized because "the neural network said so." Our engine emits human-readable explanations (e.g., `Matched keywords: [pothole, crater] in ROADS; hazard token: [cave-in] triggered CRITICAL`).
  - *Zero GPU & Minimal Carbon Footprint*: Runs in sub-millisecond CPU time with zero GPU dependencies and zero external API fees.
  - *Auditable & Controllable*: City council officers can add new municipal keywords or adjust hazard multipliers directly in code or configuration without needing thousands of labelled training samples and expensive retraining pipelines.

### 5. Flyway Forward-Only Database Migrations
* **Decision**: Schema changes are managed strictly through versioned SQL scripts (`V1__initial_schema.sql` through `V11__...`).
* **Why**:
  - *Reproducibility*: Any developer, test runner, or CI container can spin up an identical database schema from scratch by running the application.
  - *Auditability*: Schema changes are committed to Git alongside application code, making database evolution fully traceable.
  - *Safety*: Forward-only migrations prevent accidental data loss caused by reckless automated rollbacks in production environments.

### 6. In-Memory Rate Limiting
* **Decision**: Used Bucket4j with an in-memory `ConcurrentHashMap` rather than requiring a distributed Redis server.
* **Why**:
  - *Zero Additional Infrastructure*: Avoids introducing Redis as a mandatory dependency for local evaluation, academic defense, and single-container deployments.
  - *Sub-Millisecond Execution*: In-memory token deduction has virtually zero latency overhead compared to remote network calls to Redis.
  - *Academic Honesty*: While ideal for single-instance setups, its limitation across multi-node clusters is openly acknowledged in our documentation.

---

## Part 3: 30 Likely Viva Questions and Honest Answers

#### Q1: Where is the AI in this project?
**Answer**: There is no machine learning model or neural network. What we call the "AI Triage" is `DeterministicTriageEngine.java`, a rule-based algorithm that parses complaint text, matches words against curated English and Tamil keyword dictionaries, applies weights (2x for titles, 3x for phrases), and suggests a category and priority.

#### Q2: What does your system predict, and what does it NOT predict?
**Answer**: It suggests an advisory category and priority level based strictly on the words in the title and description. It does **not** analyze photos, does not inspect road images for potholes, does not predict when infrastructure will break down, and does not forecast future municipal failures.

#### Q3: Can a field worker fake their GPS location when submitting evidence?
**Answer**: Yes. The backend receives latitude and longitude sent by the mobile browser or client app. While `ComplaintService.java` calculates the Haversine distance and flags coordinates farther than 100 meters as `OUT_OF_RANGE`, a worker with a mock GPS app or customized script can send fake coordinates. The server cannot cryptographically verify hardware GPS authenticity.

#### Q4: What happens if the backend server restarts while the SLA escalation job is running?
**Answer**: Nothing is corrupted. The scheduler queries overdue complaints where `sla_due_at < NOW() AND escalated_at IS NULL` and processes them in batches of 50. Each escalation runs in its own transaction (`Propagation.REQUIRES_NEW`). Complaints committed before the restart stay escalated; uncommitted ones will simply be picked up by the scheduler on the next run 5 minutes after reboot.

#### Q5: How do you prevent duplicate escalations from firing on the same overdue complaint?
**Answer**: Two safeguards exist: first, the query explicitly filters for `escalated_at IS NULL`. Second, the update query in `ComplaintRepository.java` uses an atomic conditional update: `UPDATE complaints SET escalated_at = :now WHERE id = :id AND escalated_at IS NULL`. If another thread updated it a millisecond earlier, zero rows are affected.

#### Q6: Why did you build a modular monolith instead of microservices?
**Answer**: For a municipal platform, microservices add unnecessary complexity—distributed transactions, network latency, multiple container deployments, and service discovery. A modular monolith allows us to enforce strict database ACID transactions across complaints, evidence, and audit logs within a single lightweight deployment unit.

#### Q7: Why did you choose stateful sessions instead of JWT?
**Answer**: In municipal governance, administrators must be able to revoke a staff member's access immediately. Revoking a stateless JWT requires building a distributed token blacklist, which defeats the point of statelessness. Sessions stored on the server allow instant invalidation upon logout or administrative suspension.

#### Q8: What is the difference between `REWORK_REQUESTED` and `REOPENED`?
**Answer**: `REWORK_REQUESTED` is part of the active repair loop—an officer or citizen rejects unverified or unsatisfactory evidence, sending the task back to the worker to fix. `REOPENED` is a post-resolution dispute state: it can only be triggered by the reporting citizen within 30 days *after* a ticket has been formally marked `RESOLVED`.

#### Q9: Can an officer mark a complaint as `RESOLVED` directly?
**Answer**: No. In `ComplaintService.java` (line 595), attempting to mark a complaint `RESOLVED` directly throws a 403 `ForbiddenException`. Officers can only approve evidence, which moves the ticket to `PENDING_CITIZEN_CONFIRMATION`. Only the owning citizen (or the 7-day auto-confirm scheduler) can move it to `RESOLVED`.

#### Q10: What happens if a citizen uploads a WebP photo instead of a JPEG or PNG?
**Answer**: In `LocalStorageService.java`, JPEG and PNG images are decoded via `ImageIO.read()` and re-encoded via `ImageIO.write()`, which strips all camera EXIF and GPS tags. For WebP, `ImageIO` cannot easily re-encode without third-party plugins, so the server verifies magic bytes and saves the file directly. Therefore, **EXIF metadata is NOT stripped from WebP files**.

#### Q11: How does your system protect citizen privacy on the public map?
**Answer**: In `PublicMapComplaintResponse.java`, coordinates are rounded to 3 decimal places using `RoundingMode.HALF_UP`, giving approximately 110 meters of spatial ambiguity. Furthermore, citizen names, phone numbers, email addresses, written descriptions, officer notes, reference IDs, and database UUIDs are completely stripped from public responses.

#### Q12: Can an attacker lock out an innocent user with your login system?
**Answer**: Yes, this is a known vulnerability in our design. `LoginLockoutService.java` enforces a per-account limit of 20 failed attempts per hour keyed purely on the user-supplied identifier (email/phone). An attacker can intentionally lock out any victim across the platform by sending 20 wrong passwords for that victim's email address.

#### Q13: What happens if the database password is left as the default in production?
**Answer**: The `ProductionSafetyGuard` component runs on boot under the `prod` profile. If the database password equals the development default `civicfix_dev_password_only` or is empty, it throws an `IllegalStateException` and completely halts application startup.

#### Q14: How are notifications handled, and what happens if a database transaction rolls back?
**Answer**: Notifications use Spring's `@TransactionalEventListener` configured with `phase = TransactionPhase.AFTER_COMMIT`. If a complaint creation or status update transaction rolls back due to an error, the event listener is never invoked, preventing phantom notifications.

#### Q15: Does your system send SMS or emails?
**Answer**: No. All notifications are saved directly as records in the PostgreSQL `notifications` table and fetched by the frontend via REST polling. There is no integration with SMTP email servers or SMS gateways.

#### Q16: How do you prevent optimistic locking conflicts when two users edit a complaint at the same time?
**Answer**: The `complaints` table contains a `version` column managed by JPA's `@Version`. If an officer tries to verify a complaint while another staff member transitions it, Hibernate detects the mismatched version number and throws an `OptimisticLockException`, returning an HTTP 409 Conflict.

#### Q17: Why is rate limiting single-instance bound?
**Answer**: `RateLimiterService.java` stores Bucket4j token buckets in a Java `ConcurrentHashMap` in local RAM. If you deploy two backend containers behind a load balancer, each container has its own buckets, allowing a client to make double the allowed requests. To make it distributed, we would need to back Bucket4j with Redis.

#### Q18: What is your measured triage category accuracy, and what is the caveat?
**Answer**: Category accuracy is 87.00% (95% Wilson CI: [79.02%, 92.24%]) against our 100-sample test set. However, the caveat is that this test set is synthetic and was authored by the same developers who wrote the keyword rules; it has not been validated on real-world citizen data.

#### Q19: Why is recall for LOW priority complaints 0.00% in your evaluation report?
**Answer**: The deterministic engine contains emergency and hazard rules that escalate complaints to CRITICAL or HIGH, but lacks low-severity de-escalation heuristics. Consequently, all minor complaints default to MEDIUM priority, resulting in 0 out of 6 LOW complaints being identified.

#### Q20: How many duplicate pairs were tested in your duplicate detection benchmark?
**Answer**: Only 10 true duplicate pairs existed out of 4,950 total evaluated pairs in our 100-sample test set. Because the sample size is so small ($n=10$), the 95% confidence interval for duplicate recall is very wide ([39.68%, 89.22%]), indicating high statistical uncertainty.

#### Q21: What is the maximum file size for evidence photos?
**Answer**: Enforced in `LocalStorageService.java` as 10 Megabytes (`MAX_FILE_SIZE_BYTES = 10 * 1024 * 1024`). Uploads exceeding 10MB are rejected with an HTTP 400 `BadRequestException`.

#### Q22: What happens if a worker submits repair evidence with no GPS coordinates?
**Answer**: In `ComplaintService.java`, if latitude and longitude are null, the location status is marked `NOT_PROVIDED`. The service requires the worker to submit a `locationNote` of at least 10 characters explaining why GPS was missing, or the request is rejected with HTTP 400.

#### Q23: How does an officer approve evidence that was flagged as `OUT_OF_RANGE`?
**Answer**: In `ComplaintService.java`, if the latest evidence location check is anything other than `WITHIN_RANGE`, the officer must supply an approval acknowledgement (`locationAcknowledgement`) between 10 and 500 characters explaining why the out-of-range repair was accepted.

#### Q24: What database migrations exist in the project?
**Answer**: 11 Flyway SQL migrations:
- V1: Initial schema (users, roles, complaints, evidence, history, audit logs)
- V2: Seed default roles and development accounts
- V3: Complaint intake photos
- V4: Version column for optimistic locking
- V5: Composite spatial index on `(latitude, longitude)`
- V6: AI triage and duplicate tracking columns
- V7: Notifications table
- V8: Demo ticket flag (`is_demo`)
- V9: SLA policies table and `SUPERVISOR` role
- V10: Citizen confirmation lifecycle columns
- V11: Evidence GPS check fields

#### Q25: How does CSRF protection work with your frontend single-page application?
**Answer**: Spring Security's `CookieCsrfTokenRepository.withHttpOnlyFalse()` writes a token to an `XSRF-TOKEN` cookie readable by JavaScript. On mutation requests (`POST`, `PUT`, `DELETE`), the frontend Axios/fetch interceptor reads this cookie and passes it back in the `X-XSRF-TOKEN` HTTP header.

#### Q26: Does the system verify that a complaint's coordinates match its declared ward?
**Answer**: No. The `ward` column is a freeform text string. The database does not contain GeoJSON polygon boundaries, so it cannot perform PostGIS point-in-polygon checks to verify if coordinates fall inside the declared ward.

#### Q27: How does the auto-confirm scheduler work?
**Answer**: `AutoConfirmScheduler.java` runs every 5 minutes (`300000ms`). It looks for complaints in `PENDING_CITIZEN_CONFIRMATION` whose `pending_confirmation_at` timestamp is older than 7 days, and automatically updates their status to `RESOLVED` with `auto_confirmed = true`.

#### Q28: How does your password hashing work?
**Answer**: Passwords are hashed using Spring Security's `BCryptPasswordEncoder` with a cost factor (strength) of 10. Each hash includes a cryptographically secure random salt generated per user.

#### Q29: What happens if an officer tries to link a complaint as a duplicate of a ticket that is already a duplicate?
**Answer**: In `ComplaintService.java` (lines 1190–1204), chained duplicates are explicitly prohibited. If ticket B is a duplicate of A, linking ticket C to B throws an HTTP 400 error requiring the officer to link C directly to the root master ticket A. Circular duplicate loops are also detected and rejected.

#### Q30: How is Tamil language support implemented?
**Answer**: It is implemented across two tiers:
1. *Triage Engine*: `DeterministicTriageEngine.java` has a Tamil keyword lexicon (e.g., matching "குடிநீர்", "சாக்கடை", "குப்பை") to classify complaints written in Tamil.
2. *Frontend UI*: Citizen screens (Dashboard, Intake, Complaint Details, Notifications, Login, Register) use translations from `src/locales/ta.json`. However, municipal staff portals (Officer, Worker, Supervisor, Admin) are English-only.

