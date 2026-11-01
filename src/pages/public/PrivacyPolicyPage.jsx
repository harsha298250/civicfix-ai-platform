import React, { useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';

/**
 * CivicFix — Citizen Data Privacy Policy Page
 * Outlines resident privacy rights, role-based access boundaries, server-side data persistence,
 * image EXIF stripping, public map coordinate rounding, and capstone demonstration disclosures.
 */
export const PrivacyPolicyPage = () => {
  const navigate = useNavigate();

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, []);

  const sections = [
    { id: 'sec-1', title: '1. Title, Version & Capstone Project Scope' },
    { id: 'sec-2', title: '2. Project Operator & Research Context' },
    { id: 'sec-3', title: '3. Information Collected During Registration' },
    { id: 'sec-4', title: '4. Complaint Details, Photos, GPS & Lifecycle' },
    { id: 'sec-5', title: '5. Information Collected Automatically (Server Logs)' },
    { id: 'sec-6', title: '6. Purpose & Lawful Basis for Processing' },
    { id: 'sec-7', title: '7. Complaint Ownership & Citizen Data Isolation' },
    { id: 'sec-8', title: '8. Role-Based Access Controls & Visibility Boundaries' },
    { id: 'sec-9', title: '9. Rule-Based Triage, Duplicate Screening & Human Review' },
    { id: 'sec-10', title: '10. Public Transparency Map & Coordinate Rounding' },
    { id: 'sec-11', title: '11. Media Uploads & Server-Side EXIF Metadata Stripping' },
    { id: 'sec-12', title: '12. Storage Infrastructure & Data Retention Policy' },
    { id: 'sec-13', title: '13. Security Safeguards & Rate Limiting Controls' },
    { id: 'sec-14', title: '14. Cookies, Session State & Local Preferences' },
    { id: 'sec-15', title: '15. Citizen Data Rights & Access Requests' },
    { id: 'sec-16', title: '16. Account Deactivation & Ledger Retention' },
    { id: 'sec-17', title: '17. Children’s Privacy Policy' },
    { id: 'sec-18', title: '18. Security Incident Notification Protocols' },
    { id: 'sec-19', title: '19. Amendments to Privacy Policy' },
    { id: 'sec-20', title: '20. Privacy Inquiries & Project Contact' }
  ];

  const scrollTo = (id) => {
    const el = document.getElementById(id);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  return (
    <div className="min-h-screen bg-surface font-sans text-on-surface py-8">
      <div className="max-w-6xl mx-auto px-4 sm:px-6">
        {/* Navigation Bar / Return Header */}
        <div className="flex items-center justify-between pb-6 mb-8 border-b border-outline-variant/40">
          <div className="flex items-center gap-3">
            <button
              onClick={() => navigate(-1)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-surface-container hover:bg-surface-container-high text-xs font-semibold text-on-surface transition-colors"
            >
              <span className="material-symbols-outlined text-[16px]">arrow_back</span>
              <span>Back</span>
            </button>
            <span className="text-tertiary text-xs">/</span>
            <span className="text-xs font-semibold text-primary-container">Resident Privacy Protections</span>
          </div>

          <div className="flex items-center gap-2">
            <Link
              to="/legal/terms"
              className="px-3.5 py-1.5 bg-surface-container-low hover:bg-surface-container text-primary-container text-xs font-semibold rounded-xl border border-outline-variant/40 transition-colors"
            >
              Terms of Service
            </Link>
          </div>
        </div>

        {/* Academic Capstone Project Notice Banner */}
        <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 sm:p-5 mb-6 text-xs text-amber-900 flex items-start gap-3 shadow-xs">
          <span className="material-symbols-outlined text-amber-600 text-xl shrink-0 mt-0.5">school</span>
          <div className="space-y-1">
            <p className="font-bold text-amber-950 uppercase tracking-wide">
              Academic Capstone Project & Engineering Demonstration
            </p>
            <p className="leading-relaxed">
              CivicFix is an academic engineering capstone demonstration platform developed to evaluate rule-based keyword triage, geospatial duplicate detection, and photographic resolution verification for municipal public works. <strong>CivicFix is not an official government service</strong> of the Greater Chennai Corporation, the Government of Tamil Nadu, or the Government of India, and possesses no constitutional or administrative executive authority.
            </p>
          </div>
        </div>

        {/* Title & Metadata Banner */}
        <div className="bg-surface-container-lowest rounded-2xl p-6 sm:p-8 shadow-sm border border-outline-variant/30 mb-8 space-y-4">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 text-primary-container text-xs font-semibold">
            <span className="material-symbols-outlined text-[16px]">shield_person</span>
            <span>Citizen Data Privacy & Isolation Assurance</span>
          </div>
          <h1 className="font-display text-2xl sm:text-4xl font-extrabold text-on-surface tracking-tight">
            Citizen Data Privacy Policy
          </h1>
          <p className="text-on-surface-variant text-sm max-w-3xl leading-relaxed">
            This policy discloses how resident information is collected, processed, and safeguarded across the CivicFix platform. The architecture is engineered around the principle of strict role-based data isolation, cryptographic credential security, and server-side privacy preservation.
          </p>

          <div className="flex flex-wrap items-center gap-4 pt-2 text-xs text-tertiary border-t border-outline-variant/30">
            <span><strong>Document Version:</strong> 3.0-CAPSTONE</span>
            <span>•</span>
            <span><strong>Effective Date:</strong> November 1, 2026</span>
            <span>•</span>
            <span><strong>Backend Architecture:</strong> Spring Boot & PostgreSQL</span>
            <span>•</span>
            <span><strong>Jurisdiction Focus:</strong> Greater Chennai Corporation (GCC), Tamil Nadu</span>
          </div>
        </div>

        {/* Grid Layout: Table of Contents + Policy Content */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          {/* Table of Contents Sticky Sidebar */}
          <aside className="lg:col-span-4 sticky top-24 bg-surface-container-lowest rounded-2xl p-5 shadow-sm border border-outline-variant/30 space-y-3">
            <h3 className="font-title text-xs font-bold uppercase tracking-wider text-on-surface flex items-center gap-1.5">
              <span className="material-symbols-outlined text-[16px] text-primary-container">format_list_bulleted</span>
              <span>Table of Contents</span>
            </h3>
            <nav className="space-y-1 max-h-[70vh] overflow-y-auto pr-1 text-xs">
              {sections.map((s) => (
                <button
                  key={s.id}
                  onClick={() => scrollTo(s.id)}
                  className="w-full text-left px-2.5 py-1.5 rounded-lg text-on-surface-variant hover:text-primary hover:bg-surface-container-low transition-colors truncate block"
                >
                  {s.title}
                </button>
              ))}
            </nav>
          </aside>

          {/* Detailed Policy Content */}
          <div className="lg:col-span-8 bg-surface-container-lowest rounded-2xl p-6 sm:p-10 shadow-sm border border-outline-variant/30 space-y-10 text-sm leading-relaxed text-on-surface">
            {/* Section 1 */}
            <section id="sec-1" className="scroll-mt-24 space-y-3">
              <h2 className="font-title text-lg font-bold text-on-surface border-b border-outline-variant/30 pb-2">
                1. Title, Version & Capstone Project Scope
              </h2>
              <p>
                This document is the <strong>CivicFix Citizen Data Privacy Policy (Version 3.0-CAPSTONE)</strong>, effective as of <strong>November 1, 2026</strong>.
              </p>
              <p>
                CivicFix is designed and maintained exclusively as an academic research and engineering capstone project. It serves as a proof-of-concept system demonstrating rule-assisted incident classification, duplicate detection, and photo evidence verification. It is neither commissioned nor operated by any municipal corporation or government entity.
              </p>
            </section>

            {/* Section 2 */}
            <section id="sec-2" className="scroll-mt-24 space-y-3">
              <h2 className="font-title text-lg font-bold text-on-surface border-b border-outline-variant/30 pb-2">
                2. Project Operator & Research Context
              </h2>
              <p>
                The platform is maintained by the project research and engineering group:
              </p>
              <div className="bg-surface-container-low p-4 rounded-xl text-xs font-mono space-y-1">
                <p><strong>Project:</strong> CivicFix Engineering Capstone</p>
                <p><strong>Primary Demonstration Focus:</strong> Greater Chennai Corporation Wards, Tamil Nadu, India</p>
                <p><strong>Technical Stack:</strong> Java 21 / Spring Boot 3.3 REST Backend & PostgreSQL 16 (PostGIS)</p>
                <p><strong>Research Inquiries:</strong> research@civicfix.prototype</p>
              </div>
            </section>

            {/* Section 3 */}
            <section id="sec-3" className="scroll-mt-24 space-y-3">
              <h2 className="font-title text-lg font-bold text-on-surface border-b border-outline-variant/30 pb-2">
                3. Information Collected During Registration
              </h2>
              <p>
                During account onboarding, CivicFix collects only the minimum necessary contact and jurisdictional data:
              </p>
              <ul className="list-disc pl-5 space-y-1.5 text-xs">
                <li><strong>Full Name:</strong> Used for account identification and report attribution within municipal officer workflows.</li>
                <li><strong>Normalized Email or Indian Mobile Phone (+91):</strong> Used as the unique login account identifier and for service-related transactional notices.</li>
                <li><strong>Municipal Ward / Jurisdiction:</strong> Used to associate citizen profiles with relevant local administrative sectors.</li>
                <li><strong>Password Verifier:</strong> Stored on the server exclusively as a salted cryptographic hash generated via BCrypt (work factor 10). Plaintext passwords are never stored, logged, or accessible to system administrators.</li>
              </ul>
              <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-xs text-emerald-900">
                <strong>Aadhaar Transparency Notice:</strong> CivicFix does NOT collect, store, or process 12-digit Aadhaar numbers, biometric telemetry, or government identity cards. Reporting community hazards is never conditioned upon Aadhaar verification.
              </div>
            </section>

            {/* Section 4 */}
            <section id="sec-4" className="scroll-mt-24 space-y-3">
              <h2 className="font-title text-lg font-bold text-on-surface border-b border-outline-variant/30 pb-2">
                4. Complaint Details, Photos, GPS & Lifecycle
              </h2>
              <p>
                When submitting a civic complaint, the following records are generated and stored in PostgreSQL:
              </p>
              <ul className="list-disc pl-5 space-y-1 text-xs">
                <li><strong>Issue Metadata:</strong> Title, defect category (Roads, Water & Sewerage, Street Lighting, Garbage, Drainage, Public Transport, Parks), and written description.</li>
                <li><strong>Geographic Location:</strong> Street landmark/address, GPS latitude and longitude, and assigned municipal ward ID (determined via PostGIS boundary polygons or manual entry).</li>
                <li><strong>Intake Photographs:</strong> Photographic proof captured on-site, stored on the server filesystem.</li>
                <li><strong>Lifecycle Status Trail:</strong> Chronological status transitions, timestamps, assignment records, and confirmation notes recorded in an immutable status history table.</li>
              </ul>
            </section>

            {/* Section 5 */}
            <section id="sec-5" className="scroll-mt-24 space-y-3">
              <h2 className="font-title text-lg font-bold text-on-surface border-b border-outline-variant/30 pb-2">
                5. Information Collected Automatically (Server Logs)
              </h2>
              <p>
                When communicating with the Spring Boot backend, the server automatically records operational telemetry in PostgreSQL:
              </p>
              <ul className="list-disc pl-5 space-y-1 text-xs">
                <li><strong>System Audit Trail:</strong> Administrative, dispatch, and lifecycle mutations are logged with the actor ID, actor role, action name, target entity, timestamp, remote IP address, and execution status.</li>
                <li><strong>Rate Limiting Counters:</strong> Server-side in-memory token buckets (Bucket4j) track recent authentication attempts and submission frequencies by client IP address and account identifier to prevent automated brute-force attacks and denial-of-service abuse.</li>
              </ul>
            </section>

            {/* Section 6 */}
            <section id="sec-6" className="scroll-mt-24 space-y-3">
              <h2 className="font-title text-lg font-bold text-on-surface border-b border-outline-variant/30 pb-2">
                6. Purpose & Lawful Basis for Processing
              </h2>
              <p>
                Resident data is processed based on: (1) <strong>User Consent</strong> provided when registering an account and filing an issue; and (2) <strong>Legitimate Public Interest</strong> in detecting, prioritizing, dispatching, and verifying physical repairs for municipal hazards.
              </p>
            </section>

            {/* Section 7 */}
            <section id="sec-7" className="scroll-mt-24 space-y-3">
              <h2 className="font-title text-lg font-bold text-on-surface border-b border-outline-variant/30 pb-2">
                7. Complaint Ownership & Citizen Data Isolation
              </h2>
              <p>
                <strong>Privacy by Design:</strong> CivicFix enforces strict citizen data isolation at both the API gateway and database query layers:
              </p>
              <ul className="list-disc pl-5 space-y-1.5 text-xs">
                <li>Every complaint record is permanently bound to the submitting resident's internal UUID (<code className="font-mono text-primary-container">complaints.citizen_id</code>).</li>
                <li>Citizens can view, search, and track <strong>only</strong> their own filed reports. Database queries for citizen lists filter strictly by the authenticated session ID.</li>
                <li>Directly attempting to query or inspect another resident's complaint ID returns an immediate <code className="font-mono">403 Forbidden</code> access-denied error.</li>
                <li>Complaint maps and cross-resident browsing are entirely disabled in the citizen dashboard to prevent neighborhood profiling, snooping, or surveillance.</li>
              </ul>
            </section>

            {/* Section 8 */}
            <section id="sec-8" className="scroll-mt-24 space-y-3">
              <h2 className="font-title text-lg font-bold text-on-surface border-b border-outline-variant/30 pb-2">
                8. Role-Based Access Controls & Visibility Boundaries
              </h2>
              <p>
                Information visibility is governed strictly by authenticated platform persona roles enforced by Spring Security:
              </p>
              <div className="overflow-x-auto pt-1">
                <table className="w-full text-left text-xs border border-outline-variant/30 rounded-xl overflow-hidden">
                  <thead className="bg-surface-container text-on-surface-variant font-semibold">
                    <tr>
                      <th className="p-3">Role</th>
                      <th className="p-3">Data Visibility Scope</th>
                      <th className="p-3">Restrictions & Safeguards</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-outline-variant/20 bg-surface-container-lowest">
                    <tr>
                      <td className="p-3 font-semibold text-blue-700">CITIZEN</td>
                      <td className="p-3">Own submitted tickets, resolution timeline, and photo evidence.</td>
                      <td className="p-3">Zero visibility into reports submitted by other citizens.</td>
                    </tr>
                    <tr>
                      <td className="p-3 font-semibold text-teal-700">OFFICER</td>
                      <td className="p-3">All public complaints within assigned municipal wards, triage results, and crew evidence.</td>
                      <td className="p-3">Cannot access root administrative settings or user password hashes.</td>
                    </tr>
                    <tr>
                      <td className="p-3 font-semibold text-amber-700">WORKER</td>
                      <td className="p-3">Assigned work orders: defect title, description, category, location coordinates, and intake photos.</td>
                      <td className="p-3">
                        <strong>Field worker UI does not display citizen phone numbers or email addresses.</strong> Worker GPS location is sampled <em>only once</em> upon resolution evidence submission.
                      </td>
                    </tr>
                    <tr>
                      <td className="p-3 font-semibold text-purple-700">SUPERVISOR</td>
                      <td className="p-3">Department-wide queue, SLA countdowns, and escalation telemetry.</td>
                      <td className="p-3">Operational oversight; no direct access to modify system security policies.</td>
                    </tr>
                    <tr>
                      <td className="p-3 font-semibold text-red-700">ADMIN</td>
                      <td className="p-3">User account statuses, immutable system audit logs, and SLA policy matrices.</td>
                      <td className="p-3">Plaintext passwords are inaccessible (stored as irreversible BCrypt hashes).</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </section>

            {/* Section 9 */}
            <section id="sec-9" className="scroll-mt-24 space-y-3">
              <h2 className="font-title text-lg font-bold text-on-surface border-b border-outline-variant/30 pb-2">
                9. Rule-Based Triage, Duplicate Screening & Human Review
              </h2>
              <p>
                CivicFix utilizes deterministic keyword classifiers and spatial distance screening on uploaded defect descriptions and location coordinates:
              </p>
              <ul className="list-disc pl-5 space-y-1 text-xs">
                <li><strong>Advisory Suggestions:</strong> Rule-based triage suggests defect categories, priority estimates, hazard tags, and spatial duplicate clustering suggestions based on text keywords and geographic proximity.</li>
                <li><strong>Mandatory Human Oversight:</strong> Rule-based inferences are strictly non-binding and advisory. Municipal officers review triage recommendations before work orders are assigned to field crews.</li>
                <li><strong>No Photo Analysis or Biometrics:</strong> The triage engine operates strictly on text and coordinates. It does not perform computer vision, photo analysis, or biometric facial recognition.</li>
              </ul>
            </section>

            {/* Section 10 */}
            <section id="sec-10" className="scroll-mt-24 space-y-3">
              <h2 className="font-title text-lg font-bold text-on-surface border-b border-outline-variant/30 pb-2">
                10. Public Transparency Map & Coordinate Rounding
              </h2>
              <p>
                To support civic transparency without compromising resident safety, the public map endpoint (<code className="font-mono text-xs">/api/complaints/public/map</code>) applies strict differential privacy protections:
              </p>
              <ul className="list-disc pl-5 space-y-1.5 text-xs">
                <li><strong>Coordinate Fuzzing & Rounding:</strong> Latitude and longitude coordinates are rounded to at most 3 decimal places (~110 meters precision), preventing reverse-identification of individual residential doorways.</li>
                <li><strong>Identity Stripping:</strong> Citizen names, phone numbers, email addresses, detailed free-text descriptions, and exact house numbers are completely excluded from public payloads.</li>
                <li><strong>Internal ID Masking:</strong> Internal complaint UUIDs and reference IDs are replaced with anonymized sequential indices on the public map feed.</li>
              </ul>
            </section>

            {/* Section 11 */}
            <section id="sec-11" className="scroll-mt-24 space-y-3">
              <h2 className="font-title text-lg font-bold text-on-surface border-b border-outline-variant/30 pb-2">
                11. Media Uploads & Server-Side EXIF Metadata Stripping
              </h2>
              <p>
                Photographic evidence submitted by citizens and field crews is processed through a defense-in-depth media pipeline on the server:
              </p>
              <ul className="list-disc pl-5 space-y-1.5 text-xs">
                <li><strong>Automatic EXIF Stripping:</strong> Uploaded JPEG and PNG images are decoded into raw pixel rasters and re-encoded using server-side graphics processing (<code className="font-mono">javax.imageio.ImageIO</code>). This process completely strips all embedded EXIF metadata, camera serial numbers, device model tags, and embedded device GPS coordinates before writing the image to disk.</li>
                <li><strong>Magic Byte Validation:</strong> The server inspects file magic bytes (JPEG <code className="font-mono">FF D8 FF</code>, PNG <code className="font-mono">89 50 4E 47</code>, WebP <code className="font-mono">RIFF...WEBP</code>) to ensure non-image payloads and executable scripts disguised as photos are rejected.</li>
                <li><strong>Unguessable Storage Paths:</strong> Stored photos are saved in secure server directories with random UUID filenames, preventing directory traversal and enumeration attacks.</li>
              </ul>
            </section>

            {/* Section 12 */}
            <section id="sec-12" className="scroll-mt-24 space-y-3">
              <h2 className="font-title text-lg font-bold text-on-surface border-b border-outline-variant/30 pb-2">
                12. Storage Infrastructure & Data Retention Policy
              </h2>
              <p>
                <strong>Storage Architecture:</strong> All relational platform data (accounts, complaints, status histories, audit logs, SLA rules) is persisted in a PostgreSQL 16 database. Media binaries are stored in designated server filesystem upload directories (<code className="font-mono">uploads/complaints/</code> and <code className="font-mono">uploads/evidence/</code>).
              </p>
              <div className="p-3 bg-surface-container-low border border-outline-variant/30 rounded-xl text-xs space-y-1">
                <p><strong>Retention Policy:</strong> Data retention policy to be defined by the operating municipality.</p>
                <p className="text-on-surface-variant">
                  In the current capstone implementation, records persist in the PostgreSQL database for the duration of the demonstration and civic auditing lifecycle. The platform does not currently execute automated scheduled purging of historical defect records.
                </p>
              </div>
            </section>

            {/* Section 13 */}
            <section id="sec-13" className="scroll-mt-24 space-y-3">
              <h2 className="font-title text-lg font-bold text-on-surface border-b border-outline-variant/30 pb-2">
                13. Security Safeguards & Rate Limiting Controls
              </h2>
              <p>
                The platform implements industry-standard technical safeguards:
              </p>
              <ul className="list-disc pl-5 space-y-1 text-xs">
                <li><strong>Server-Side Brute-Force Lockout:</strong> Enforced via server-side services (<code className="font-mono">LoginLockoutService</code>). Accounts are locked after repeated failed authentication attempts, with rate limits applied per IP address and per account identifier.</li>
                <li><strong>Token Bucket Rate Limiting:</strong> Enforced via Bucket4j interceptors across all public authentication, registration, complaint creation, and media upload endpoints.</li>
                <li><strong>Zero Plaintext Passwords:</strong> Passwords are hashed using BCrypt before database persistence.</li>
                <li><strong>Role-Based Security Guards:</strong> Spring Security method security annotations (<code className="font-mono">@PreAuthorize</code>) protect administrative, officer triage, and evidence signoff operations.</li>
              </ul>
            </section>

            {/* Section 14 */}
            <section id="sec-14" className="scroll-mt-24 space-y-3">
              <h2 className="font-title text-lg font-bold text-on-surface border-b border-outline-variant/30 pb-2">
                14. Cookies, Session State & Local Preferences
              </h2>
              <p>
                CivicFix uses only functional, non-advertising cookies and browser storage keys:
              </p>
              <ul className="list-disc pl-5 space-y-1.5 text-xs">
                <li><code className="font-mono font-bold">CIVICFIX_SESSION</code> (Cookie): An encrypted, HTTP-only session cookie issued by Spring Boot to maintain authenticated user sessions. Cannot be read by client-side JavaScript.</li>
                <li><code className="font-mono font-bold">XSRF-TOKEN</code> (Cookie): A cookie providing Cross-Site Request Forgery (CSRF) protection; echoed by the SPA in the <code className="font-mono">X-XSRF-TOKEN</code> header on state-modifying requests.</li>
                <li><code className="font-mono font-bold">civicfix_language</code> (Browser LocalStorage): Stores client language preference (<code className="font-mono">en</code> for English, <code className="font-mono">ta</code> for Tamil).</li>
              </ul>
              <p className="text-xs text-on-surface-variant">
                The platform contains zero third-party commercial marketing cookies, advertising pixels, or analytics trackers.
              </p>
            </section>

            {/* Section 15 */}
            <section id="sec-15" className="scroll-mt-24 space-y-3">
              <h2 className="font-title text-lg font-bold text-on-surface border-b border-outline-variant/30 pb-2">
                15. Citizen Data Rights & Access Requests
              </h2>
              <p>
                Registered residents maintain rights regarding their personal information:
              </p>
              <ul className="list-disc pl-5 space-y-1 text-xs">
                <li><strong>Right to Access:</strong> View all filed complaints, uploaded photographs, and status progress notes through the authenticated citizen portal.</li>
                <li><strong>Right to Rectification:</strong> Request correction of inaccurate contact or ward profile information.</li>
                <li><strong>Right to Confirmation:</strong> Accept or reject field repair resolutions within the citizen confirmation window, submitting feedback if rework is required.</li>
              </ul>
            </section>

            {/* Section 16 */}
            <section id="sec-16" className="scroll-mt-24 space-y-3">
              <h2 className="font-title text-lg font-bold text-on-surface border-b border-outline-variant/30 pb-2">
                16. Account Deactivation & Ledger Retention
              </h2>
              <p>
                If a citizen account is deactivated, direct authentication is revoked. In accordance with municipal accountability standards, defect reports (defect type, road name, resolution evidence, and officer approval audit trail) may remain preserved in municipal ledgers for public works accountability and financial verification.
              </p>
            </section>

            {/* Section 17 */}
            <section id="sec-17" className="scroll-mt-24 space-y-3">
              <h2 className="font-title text-lg font-bold text-on-surface border-b border-outline-variant/30 pb-2">
                17. Children’s Privacy Policy
              </h2>
              <p>
                CivicFix is intended for adult residents (aged 18 and older). The platform does not knowingly collect personally identifiable information from minors. If personal data of a minor is identified as improperly submitted, it will be promptly removed upon notification.
              </p>
            </section>

            {/* Section 18 */}
            <section id="sec-18" className="scroll-mt-24 space-y-3">
              <h2 className="font-title text-lg font-bold text-on-surface border-b border-outline-variant/30 pb-2">
                18. Security Incident Notification Protocols
              </h2>
              <p>
                In the event of a verified security incident resulting in unauthorized access to personal contact details, registered users will be notified via email or registered phone alongside remediation recommendations.
              </p>
            </section>

            {/* Section 19 */}
            <section id="sec-19" className="scroll-mt-24 space-y-3">
              <h2 className="font-title text-lg font-bold text-on-surface border-b border-outline-variant/30 pb-2">
                19. Amendments to Privacy Policy
              </h2>
              <p>
                This privacy policy may be updated as system capabilities evolve. Revisions will be published on this page with an updated version number and effective timestamp.
              </p>
            </section>

            {/* Section 20 */}
            <section id="sec-20" className="scroll-mt-24 space-y-3">
              <h2 className="font-title text-lg font-bold text-on-surface border-b border-outline-variant/30 pb-2">
                20. Privacy Inquiries & Project Contact
              </h2>
              <p>
                For questions regarding personal data privacy, system research, or data protection practices:
              </p>
              <div className="bg-surface-container-low p-4 rounded-xl space-y-1.5 text-xs font-mono">
                <p><strong>Project:</strong> CivicFix Engineering Capstone</p>
                <p><strong>Focus Region:</strong> Chennai, Tamil Nadu, India</p>
                <p><strong>Email:</strong> privacy@civicfix.prototype</p>
              </div>
            </section>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PrivacyPolicyPage;
