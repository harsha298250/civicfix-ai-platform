import React, { useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';

/**
 * CivicFix AI — Citizen Data Privacy Policy Page
 * Outlines resident privacy rights, data isolation, complaint ownership, and storage disclosures.
 * Complies with CivicFix AI Master Prompt Phase 4 specifications (20 structured sections).
 */
export const PrivacyPolicyPage = () => {
  const navigate = useNavigate();

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, []);

  const sections = [
    { id: 'sec-1', title: '1. Title, Version & Effective Dates' },
    { id: 'sec-2', title: '2. Operator & Data Controller Information' },
    { id: 'sec-3', title: '3. Information Collected During Registration' },
    { id: 'sec-4', title: '4. Complaint Details, Photos, GPS & History' },
    { id: 'sec-5', title: '5. Information Collected Automatically' },
    { id: 'sec-6', title: '6. Purpose & Lawful Basis for Processing' },
    { id: 'sec-7', title: '7. Complaint Ownership & Access Controls' },
    { id: 'sec-8', title: '8. How Data is Used for Operations' },
    { id: 'sec-9', title: '9. AI Processing, Computer Vision & Human Review' },
    { id: 'sec-10', title: '10. Data Sharing & Recipient Categories' },
    { id: 'sec-11', title: '11. Third-Party Service Providers (Maps, Storage)' },
    { id: 'sec-12', title: '12. Storage Locations & Retention Schedules' },
    { id: 'sec-13', title: '13. Security Safeguards & Known Limitations' },
    { id: 'sec-14', title: '14. Cookies, LocalStorage & Prototype Disclosures' },
    { id: 'sec-15', title: '15. Citizen Data Rights & Access Requests' },
    { id: 'sec-16', title: '16. Account Deletion & Anonymization' },
    { id: 'sec-17', title: '17. Children’s Privacy & Age Policy' },
    { id: 'sec-18', title: '18. Incident Notification & Breach Protocols' },
    { id: 'sec-19', title: '19. Amendments to Privacy Policy' },
    { id: 'sec-20', title: '20. Privacy Grievance Officer & Contact' }
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

          <div className="flex items-center gap-3">
            <Link
              to="/register"
              className="px-3.5 py-1.5 bg-primary-container hover:bg-primary text-white text-xs font-semibold rounded-xl shadow-xs transition-all"
            >
              Return to Registration
            </Link>
            <Link
              to="/legal/terms"
              className="px-3.5 py-1.5 bg-surface-container-low hover:bg-surface-container text-primary-container text-xs font-semibold rounded-xl border border-outline-variant/40 transition-colors"
            >
              Terms of Service
            </Link>
          </div>
        </div>

        {/* Title & Metadata Banner */}
        <div className="bg-surface-container-lowest rounded-2xl p-6 sm:p-8 shadow-sm border border-outline-variant/30 mb-8 space-y-4">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/10 text-emerald-800 text-xs font-semibold">
            <span className="material-symbols-outlined text-[16px]">shield_person</span>
            <span>Citizen Data Privacy & Isolation Assurance</span>
          </div>
          <h1 className="font-display text-2xl sm:text-4xl font-extrabold text-on-surface tracking-tight">
            Citizen Data Privacy Policy
          </h1>
          <p className="text-on-surface-variant text-sm max-w-3xl leading-relaxed">
            This Privacy Policy articulates how CivicFix AI collects, isolates, handles, and safeguards citizen personal information and civic issue reports. We operate under a strict privacy-first principle: <strong>citizens can never browse or inspect complaints submitted by other citizens.</strong>
          </p>

          <div className="flex flex-wrap items-center gap-4 pt-2 text-xs text-tertiary border-t border-outline-variant/30">
            <span><strong>Document Version:</strong> 2.0-PROTOTYPE</span>
            <span>•</span>
            <span><strong>Effective Date:</strong> October 20, 2026</span>
            <span>•</span>
            <span><strong>Demonstration Jurisdiction:</strong> Tamil Nadu, India</span>
            <span>•</span>
            <span className="text-emerald-700 font-semibold">Aadhaar-Free Architecture: No biometric or real Aadhaar numbers collected</span>
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
                1. Title, Version & Effective Dates
              </h2>
              <p>
                This document is the <strong>CivicFix AI Citizen Data Privacy Policy (Version 2.0-PROTOTYPE)</strong>, effective as of <strong>October 20, 2026</strong>.
              </p>
            </section>

            {/* Section 2 */}
            <section id="sec-2" className="scroll-mt-24 space-y-3">
              <h2 className="font-title text-lg font-bold text-on-surface border-b border-outline-variant/30 pb-2">
                2. Operator & Data Controller Information
              </h2>
              <p>
                The prototype service is maintained by the project development and engineering group:
              </p>
              <div className="bg-surface-container-low p-4 rounded-xl text-xs font-mono space-y-1">
                <p><strong>Operator:</strong> [CIVICFIX_OPERATOR_LEGAL_ENTITY]</p>
                <p><strong>Point of Contact:</strong> privacy@civicfix.prototype</p>
                <p><strong>Primary Demonstration Region:</strong> Tamil Nadu Municipal Wards, India</p>
              </div>
            </section>

            {/* Section 3 */}
            <section id="sec-3" className="scroll-mt-24 space-y-3">
              <h2 className="font-title text-lg font-bold text-on-surface border-b border-outline-variant/30 pb-2">
                3. Information Collected During Registration
              </h2>
              <p>
                During onboarding, CivicFix collects only the minimum necessary contact and jurisdictional data:
              </p>
              <ul className="list-disc pl-5 space-y-1 text-xs">
                <li><strong>Full Legal Name:</strong> Used for account identity and resident attribution.</li>
                <li><strong>Normalized Mobile Phone or Email:</strong> Standard 10-digit Indian phone (+91) or email address used strictly for dispatch notices and one-time verification passkeys (OTP).</li>
                <li><strong>Primary Municipal Ward:</strong> Used to localize default dispatch jurisdictions.</li>
                <li><strong>Password Hash Verifier:</strong> Encrypted authorization token.</li>
              </ul>
              <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-xs text-emerald-900">
                <strong>Aadhaar Transparency Notice:</strong> CivicFix AI does NOT collect, store, or process 12-digit Aadhaar numbers or biometric telemetry. Reporting civic issues is never conditioned upon Aadhaar verification.
              </div>
            </section>

            {/* Section 4 */}
            <section id="sec-4" className="scroll-mt-24 space-y-3">
              <h2 className="font-title text-lg font-bold text-on-surface border-b border-outline-variant/30 pb-2">
                4. Complaint Details, Photos, GPS & History
              </h2>
              <p>
                When you report an incident, we record: (a) issue title and description; (b) defect category (roads, water, lighting, waste, parks); (c) photographic evidence of the public defect; (d) physical street address and GPS coordinates; and (e) submission timestamp and status lifecycle events.
              </p>
            </section>

            {/* Section 5 */}
            <section id="sec-5" className="scroll-mt-24 space-y-3">
              <h2 className="font-title text-lg font-bold text-on-surface border-b border-outline-variant/30 pb-2">
                5. Information Collected Automatically
              </h2>
              <p>
                In the current client-side prototype, the platform records local authentication attempt counters (to enforce 15-minute brute-force lockout protection) and browser session tokens in the browser's persistent storage. No third-party commercial marketing cookies or invasive telemetry trackers are utilized.
              </p>
            </section>

            {/* Section 6 */}
            <section id="sec-6" className="scroll-mt-24 space-y-3">
              <h2 className="font-title text-lg font-bold text-on-surface border-b border-outline-variant/30 pb-2">
                6. Purpose & Lawful Basis for Processing
              </h2>
              <p>
                Resident information is processed based on: (1) <strong>User Consent</strong> provided during registration; and (2) <strong>Legitimate Public Interest</strong> in the identification, dispatch, and physical remediation of municipal infrastructure hazards.
              </p>
            </section>

            {/* Section 7 */}
            <section id="sec-7" className="scroll-mt-24 space-y-3">
              <h2 className="font-title text-lg font-bold text-on-surface border-b border-outline-variant/30 pb-2">
                7. Complaint Ownership & Access Controls (Data Isolation)
              </h2>
              <p>
                <strong>Privacy by Design:</strong> CivicFix enforces strict citizen data isolation. Every complaint record is bound to the submitting citizen's permanent ID (`citizen.id`).
              </p>
              <ul className="list-disc pl-5 space-y-1 text-xs">
                <li>Citizens can view, search, and track <strong>only</strong> their own filed reports.</li>
                <li>Directly attempting to open another citizen's complaint ticket ID via URL parameter returns a privacy-preserving Access Restricted response.</li>
                <li>Complaint maps and cross-resident browsing are entirely disabled in the citizen portal to prevent neighborhood profiling or surveillance.</li>
              </ul>
            </section>

            {/* Section 8 */}
            <section id="sec-8" className="scroll-mt-24 space-y-3">
              <h2 className="font-title text-lg font-bold text-on-surface border-b border-outline-variant/30 pb-2">
                8. How Data is Used for Operations
              </h2>
              <p>
                Submitted reports are routed to: (a) <strong>Municipal Officers</strong> for review, departmental routing, and evidence verification; and (b) <strong>Assigned Field Crews</strong> to view work location, defect description, and repair evidence requirements.
              </p>
            </section>

            {/* Section 9 */}
            <section id="sec-9" className="scroll-mt-24 space-y-3">
              <h2 className="font-title text-lg font-bold text-on-surface border-b border-outline-variant/30 pb-2">
                9. AI Processing, Computer Vision & Human Review
              </h2>
              <p>
                CivicFix utilizes vision and language models to analyze uploaded photos, predict defect categories, compute duplicate similarity scores, and suggest hazard levels (P1 to P4). <strong>AI suggestions are non-binding. Municipal officers review recommendations before work orders are finalized.</strong>
              </p>
            </section>

            {/* Section 10 */}
            <section id="sec-10" className="scroll-mt-24 space-y-3">
              <h2 className="font-title text-lg font-bold text-on-surface border-b border-outline-variant/30 pb-2">
                10. Data Sharing & Recipient Categories
              </h2>
              <p>
                Citizen data is never sold, leased, or monetized for commercial advertising. Data is shared exclusively with authorized municipal public works personnel and dispatched contractors directly involved in repair operations.
              </p>
            </section>

            {/* Section 11 */}
            <section id="sec-11" className="scroll-mt-24 space-y-3">
              <h2 className="font-title text-lg font-bold text-on-surface border-b border-outline-variant/30 pb-2">
                11. Third-Party Service Providers (Maps, Storage)
              </h2>
              <p>
                The platform utilizes: (a) <strong>OpenStreetMap & Leaflet</strong> for tile rendering and geographic coordinates; and (b) standard web infrastructure for client-side execution.
              </p>
            </section>

            {/* Section 12 */}
            <section id="sec-12" className="scroll-mt-24 space-y-3">
              <h2 className="font-title text-lg font-bold text-on-surface border-b border-outline-variant/30 pb-2">
                12. Storage Locations & Retention Schedules
              </h2>
              <p>
                In the current demonstration prototype, user and complaint records are stored in browser localStorage. In the planned Spring Boot and MySQL production architecture, records will be persisted in regional data centers within India in compliance with the Digital Personal Data Protection Act (DPDPA).
              </p>
            </section>

            {/* Section 13 */}
            <section id="sec-13" className="scroll-mt-24 space-y-3">
              <h2 className="font-title text-lg font-bold text-on-surface border-b border-outline-variant/30 pb-2">
                13. Security Safeguards & Known Limitations
              </h2>
              <p>
                The client platform implements: (1) cryptographic random OTP generation via `window.crypto.getRandomValues`; (2) 15-minute brute-force lockout after 5 failed authentication attempts; and (3) role-based client routing guards.
              </p>
              <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-900">
                <strong>Prototype Disclosure:</strong> Client-side storage and filtering represent engineering demonstration controls. Full production security requires the planned Java Spring Boot REST backend with BCrypt password hashing and HttpOnly session cookies.
              </div>
            </section>

            {/* Section 14 */}
            <section id="sec-14" className="scroll-mt-24 space-y-3">
              <h2 className="font-title text-lg font-bold text-on-surface border-b border-outline-variant/30 pb-2">
                14. Cookies, LocalStorage & Prototype Disclosures
              </h2>
              <p>
                The prototype uses browser `localStorage` keys: `civicfix_users_v1`, `civicfix_complaints_v2`, `civicfix_notifs_v1`, and `civicfix_auth_attempts_v1`. You may clear your browser cache at any time to purge local demo session state.
              </p>
            </section>

            {/* Section 15 */}
            <section id="sec-15" className="scroll-mt-24 space-y-3">
              <h2 className="font-title text-lg font-bold text-on-surface border-b border-outline-variant/30 pb-2">
                15. Citizen Data Rights & Access Requests
              </h2>
              <p>
                Residents have the right to: (a) view their personal profile; (b) review historical complaints reported under their identity; (c) rectify outdated mobile or ward preferences; and (d) request deletion of personal accounts.
              </p>
            </section>

            {/* Section 16 */}
            <section id="sec-16" className="scroll-mt-24 space-y-3">
              <h2 className="font-title text-lg font-bold text-on-surface border-b border-outline-variant/30 pb-2">
                16. Account Deletion & Anonymization
              </h2>
              <p>
                Upon resident account deletion, personal identity markers (phone, email, name) are permanently disassociated. Anonymized defect records (defect type, road name, date resolved) may be retained in municipal ledgers for civic auditing.
              </p>
            </section>

            {/* Section 17 */}
            <section id="sec-17" className="scroll-mt-24 space-y-3">
              <h2 className="font-title text-lg font-bold text-on-surface border-b border-outline-variant/30 pb-2">
                17. Children’s Privacy & Age Policy
              </h2>
              <p>
                CivicFix AI is designed for adult residents (18+). The platform does not intentionally collect personally identifiable information from children under 18 years of age without parental guidance.
              </p>
            </section>

            {/* Section 18 */}
            <section id="sec-18" className="scroll-mt-24 space-y-3">
              <h2 className="font-title text-lg font-bold text-on-surface border-b border-outline-variant/30 pb-2">
                18. Incident Notification & Breach Protocols
              </h2>
              <p>
                In the event of a verified security incident affecting citizen contact information, registered users will be notified via email/SMS alongside guidance on protective measures.
              </p>
            </section>

            {/* Section 19 */}
            <section id="sec-19" className="scroll-mt-24 space-y-3">
              <h2 className="font-title text-lg font-bold text-on-surface border-b border-outline-variant/30 pb-2">
                19. Amendments to Privacy Policy
              </h2>
              <p>
                We may revise this Citizen Data Privacy Policy to incorporate new statutory mandates or infrastructure upgrades. The revised document will be published with an updated version number.
              </p>
            </section>

            {/* Section 20 */}
            <section id="sec-20" className="scroll-mt-24 space-y-3">
              <h2 className="font-title text-lg font-bold text-on-surface border-b border-outline-variant/30 pb-2">
                20. Privacy Grievance Officer & Contact
              </h2>
              <p>
                For questions regarding personal data privacy, data correction, or grievance redressal, contact:
              </p>
              <div className="bg-surface-container-low p-4 rounded-xl space-y-1.5 text-xs font-mono">
                <p><strong>Privacy Officer:</strong> [GRIEVANCE_OFFICER_NAME]</p>
                <p><strong>Designation:</strong> Data Protection & Resident Grievance Officer</p>
                <p><strong>Email:</strong> privacy-grievance@civicfix.prototype</p>
                <p><strong>Location:</strong> Chennai, Tamil Nadu, India</p>
              </div>
            </section>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PrivacyPolicyPage;
