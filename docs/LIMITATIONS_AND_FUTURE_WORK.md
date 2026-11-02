# CivicFix Limitations & Future Roadmap

> **Document Status**: Active Reference  
> **Audience**: Engineering Team, Academic Evaluators, Municipal Stakeholders  
> **Purpose**: Provides an uncompromising, technically rigorous accounting of the architectural boundaries, security trade-offs, and functional limitations in the current CivicFix implementation, followed by actionable roadmaps for future enhancements.

---

## 1. Architectural & Spatial Limitations

### 1.1 Lack of Ward Polygon Geofencing (GeoJSON Boundaries)
* **Current Implementation**: The `ward` column in the `complaints` table is stored as an unvalidated freeform text string (e.g., `"Ward 150"` or `"Indiranagar"`). It is populated either via client-side geocoding approximations or user input.
* **Limitation**: The database lacks actual PostGIS polygon geometries (`GEOMETRY(Polygon, 4326)`) representing municipal boundaries. There is no automated spatial intersection (`ST_Contains` / `ST_Intersects`) to guarantee that a complaint's latitude and longitude fall strictly within the declared ward.
* **Impact**: A citizen can submit coordinates located in Ward 12 but manually type or assign it to Ward 150, skewing municipal ward metrics and trust analytics.
* **Future Work**: Import official municipal ward shapefiles/GeoJSON polygons into a dedicated `wards` spatial table, and compute ward assignments server-side using PostGIS point-in-polygon queries during intake.

### 1.2 Absence of Spatial Hotspot Clustering (DBSCAN / PostGIS)
* **Current Implementation**: The platform relies on a B-Tree composite index on `(latitude, longitude)` (`idx_complaints_lat_lng`) for bounding box lookups (`findPublicMapBySpatialBounds`). Duplicate detection computes pairwise Haversine distances on candidates that share the same category within 100 meters.
* **Limitation**: There is no server-side density-based clustering (such as PostGIS `ST_ClusterDBSCAN` or `ST_ClusterKMeans`). Hotspot identification is purely visual on the frontend Leaflet map via marker clusters.
* **Impact**: Municipal administrators cannot automatically detect systemic regional infrastructure failures (e.g., water pipe bursts impacting an entire neighborhood) through algorithmic spatial clustering.
* **Future Work**: Implement a scheduled background job using PostGIS spatial clustering to group defect clusters and automatically generate higher-level infrastructure work orders.

### 1.3 Client-Reported GPS Spoofability
* **Current Implementation**: When a field worker submits repair evidence, the client device provides `deviceLatitude`, `deviceLongitude`, and `deviceAccuracy` in the multipart request payload. The server calculates the Haversine distance against the complaint's coordinates.
* **Limitation**: The server cannot cryptographically verify hardware GPS authenticity. A technician running a modified mobile browser, automated script, or rooted device with GPS mock location enabled can easily send fake coordinates matching the complaint location.
* **Impact**: While the 100-meter verification rule prevents careless mistakes, it cannot defend against deliberate, bad-faith location fraud.
* **Future Work**: Integrate hardware-attested location checks (e.g., Google Play Integrity API or Apple DeviceCheck on mobile apps) and cross-reference cellular tower or Wi-Fi BSSID signals.

---

## 2. Security & Operational Limitations

### 2.1 In-Memory Rate Limiting (Single-Instance Bound)
* **Current Implementation**: `RateLimiterService` uses Bucket4j with an in-memory `ConcurrentHashMap<String, Bucket>`.
* **Limitation**: Rate limiting state is bound to the JVM heap of a single process. If the backend restarts, all rate-limiting counters reset immediately. Furthermore, if the backend is scaled horizontally across multiple container instances behind a load balancer, each node maintains its own independent buckets.
* **Impact**: An attacker can cycle requests across multiple backend pods to bypass the 5 requests / 15 minutes throttling window.
* **Future Work**: Migrate Bucket4j's state backend to a distributed Redis cluster using `bucket4j-redis` or Spring Data Redis.

### 2.2 Per-Account Login Lockout Vulnerability (Denial-of-Service Risk)
* **Current Implementation**: `LoginLockoutService` tracks failed login attempts across two tiers:
  1. *IP + Identifier*: 5 failed attempts per 15 minutes.
  2. *Per-Account*: 20 failed attempts per 1 hour across all IP addresses, keyed strictly by the user-supplied email or phone number.
* **Limitation & Abuse Vector**:
  > [!CAUTION]
  > Because the per-account bucket is keyed exclusively by the targeted user identifier without requiring proof of authentication, an attacker can intentionally lock out any legitimate municipal officer, worker, or citizen across the platform by executing 20 failed login requests targeting the victim's email.
* **Future Work**: Implement CAPTCHA challenges (e.g., Cloudflare Turnstile or reCAPTCHA v3) after 3 failed attempts instead of blanket account lockouts, and alert users via out-of-band security notifications rather than locking their access.

### 2.3 WebP EXIF Sanitization Gap
* **Current Implementation**: `LocalStorageService` decodes JPEG and PNG uploads via `ImageIO.read()` and re-encodes them via `ImageIO.write()`, reliably stripping all EXIF and GPS tags. However, for WebP images, the service verifies the RIFF/WEBP magic bytes and writes the binary stream directly to disk without re-encoding.
* **Limitation**: Any EXIF chunks present within uploaded WebP images are preserved on disk.
* **Future Work**: Incorporate a dedicated WebP sanitization library (such as `TwelveMonkeys ImageIO WebP` plugin or native `libwebp` bindings) to decode and strip metadata chunks from WebP images before persisting.

---

## 3. Functional & Communications Limitations

### 3.1 Lack of Outbound Email and SMS Gateways
* **Current Implementation**: The notification subsystem writes in-app notification records directly to the `notifications` PostgreSQL table. Users view them by polling or fetching `/api/notifications`.
* **Limitation**: The system has no outbound delivery mechanism. There is no integration with SMTP servers, SendGrid, Amazon SES, or Twilio SMS gateways.
* **Impact**: If a citizen closes the web app, they do not receive push alerts, SMS messages, or emails when an officer requests confirmation or when a complaint is resolved.
* **Future Work**: Introduce an asynchronous notification listener (Spring `@Async` or Kafka/RabbitMQ consumer) integrated with Spring Mail (`JavaMailSender`) and SMS webhooks.

### 3.2 Absence of Automated Self-Service Password Reset
* **Current Implementation**: The frontend includes a Forgot Password screen (`ForgotPassword.jsx`), but this screen is purely a demonstration interface. The backend does not expose endpoints to generate cryptographically random, time-bounded password reset tokens or send verification links.
* **Limitation**: Users who forget their passwords cannot reset them independently and must rely on database administrators or staff intervention.
* **Future Work**: Implement a secure password reset workflow: generate a SHA-256 hashed one-time token with a 15-minute expiration, email the secure link, and validate token submission against a dedicated `password_reset_tokens` table.

### 3.3 No Dedicated Public Transparency KPI Portal
* **Current Implementation**: The public API exposes sanitized map markers (`/api/complaints/public/map`) and an aggregate trust score (`/api/complaints/public/trust`).
* **Limitation**: There is no comprehensive, public-facing transparency dashboard displaying department-level budget expenditures, ward-by-ward SLA compliance breakdowns, contractor performance rankings, or historical resolution trends.
* **Future Work**: Construct an unauthenticated `/public/transparency` portal with interactive charts displaying real-time SLA metrics, average time to repair (MTTR), and contractor scorecard ratings.

---

## 4. AI & Internationalization Limitations

### 4.1 Deterministic Triage Engine & Optional Vision Layer Boundaries
* **Current Implementation**: The primary triage pipeline uses `DeterministicTriageEngine`, an explainable, token-matching rule engine with a bilingual lexicon (English and Tamil). In addition, an optional multimodal vision layer (`TriageProvider` backed by Google Gemini or xAI Grok) is available behind `AI_VISION_ENABLED=false` and explicit citizen consent (`vision_consent`).
* **Limitations**:
  1. *Default Text-Only Modality*: With vision disabled (default), the engine analyzes only the title and description without inspecting uploaded photos.
  2. *Lexical Rigidity*: When relying purely on the deterministic engine, slang, typographical errors, or phrasing not present in the static lexicon default to `MEDIUM` priority and fallback categories.
  3. *External Model Latency & Rate Limits*: When the optional vision layer is active, visual analysis executes asynchronously against external cloud APIs with daily quota caps (default 200/day) and per-user throttling (10/min), and is skipped for WebP formats to protect resident privacy.
  4. *Human-in-the-Loop Requirement*: Model-assisted visual classifications are strictly advisory suggestions with disagreement detection (`disagreement` flag). Final dispatch decisions remain strictly with the human municipal officer.
* **Future Work**: Train on-premise lightweight civic vision models (e.g., edge-deployed YOLOv8 or MobileNet-v4 fine-tuned on Indian municipal hazards) to eliminate external API costs, cloud latency, and third-party transmission risks.

### 4.2 Priority Recall Bias & Synthetic Test Set Caveats
* **Current Implementation**: Evaluation against 100 synthetic cases in [`docs/evaluation/results.md`](file:///c:/Users/harsh/Downloads/stitch_civicfix_ai_platform_design/docs/evaluation/results.md) revealed:
  * `CRITICAL` recall is `92.00%`.
  * `HIGH` recall is `38.46%`.
  * `LOW` recall is `0.00%` (all minor issues default to `MEDIUM`).
  * Duplicate detection evaluated on only `10 true duplicate pairs`.
* **Limitation**:
  1. *Internal Bias*: The test dataset was hand-crafted by the engineering team rather than collected from live, uncontrolled citizen submissions.
  2. *Statistical Uncertainty*: The small duplicate sample (n = 10) yields wide 95% Wilson confidence intervals ([39.68%, 89.22%] recall).
* **Future Work**: Partner with an active municipal corporation to capture a 5,000+ anonymized real-world complaint dataset for retraining and independent external validation.

### 4.3 Partial Tamil Localization
* **Current Implementation**: Citizen-facing workflows (Dashboard, Defect Filing, Complaint Tracking, Notifications, Authentication) are translated into Tamil via `src/locales/ta.json`.
* **Limitation**: Staff and administrative portals (Municipal Officer triage, Worker task management, Supervisor escalation desk, Admin console, Legal terms) remain strictly in English.
* **Future Work**: Expand localization strings across all staff portals and support additional regional languages (e.g., Kannada, Hindi, Telugu).

