import React, { useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';

/**
 * CivicFix — Resident Terms of Service Page
 * Outlines resident rights, code of conduct, workflow rules, rule-based triage disclaimers,
 * and academic capstone project disclosures.
 */
export const TermsOfServicePage = () => {
  const navigate = useNavigate();

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, []);

  const sections = [
    { id: 'sec-1', title: '1. Title, Version & Capstone Scope' },
    { id: 'sec-2', title: '2. About CivicFix & Academic Purpose' },
    { id: 'sec-3', title: '3. Eligibility & Account Registration' },
    { id: 'sec-4', title: '4. Account Credentials & Security' },
    { id: 'sec-5', title: '5. Resident Responsibilities' },
    { id: 'sec-6', title: '6. Permitted & Prohibited Conduct' },
    { id: 'sec-7', title: '7. Submitting Reports, Photos & Location Data' },
    { id: 'sec-8', title: '8. Abuse Prevention & Server-Side Rate Limiting' },
    { id: 'sec-9', title: '9. Complaint Review, Prioritization & Assignment' },
    { id: 'sec-10', title: '10. Repair Evidence, Citizen Confirmation & Resolution' },
    { id: 'sec-11', title: '11. Notifications & System Communications' },
    { id: 'sec-12', title: '12. Availability, Maintenance & Service Limitations' },
    { id: 'sec-13', title: '13. Rule-Based Advisory Triage & Decision-Support Limits' },
    { id: 'sec-14', title: '14. User-Submitted Content & Processing License' },
    { id: 'sec-15', title: '15. Privacy & Data Handling Reference' },
    { id: 'sec-16', title: '16. Third-Party Mapping & Geocoding Services' },
    { id: 'sec-17', title: '17. Account Suspension & Administrative Sanctions' },
    { id: 'sec-18', title: '18. Disclaimers & Limitations of Liability' },
    { id: 'sec-19', title: '19. Modifications to These Terms' },
    { id: 'sec-20', title: '20. Project Contact & Feedback' }
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
            <span className="text-xs font-semibold text-primary-container">Legal Terms & Usage Policies</span>
          </div>

          <div className="flex items-center gap-2">
            <Link
              to="/legal/privacy"
              className="px-3.5 py-1.5 bg-surface-container-low hover:bg-surface-container text-primary-container text-xs font-semibold rounded-xl border border-outline-variant/40 transition-colors"
            >
              Privacy Policy
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
              CivicFix is an academic engineering capstone demonstration platform developed to evaluate rule-based keyword triage, geospatial duplicate detection, and photographic resolution verification. <strong>CivicFix is not an official government platform</strong> of the Greater Chennai Corporation, Government of Tamil Nadu, or Government of India. It possesses no statutory authority to mandate repairs or execute municipal contracts.
            </p>
          </div>
        </div>

        {/* Title & Metadata Banner */}
        <div className="bg-surface-container-lowest rounded-2xl p-6 sm:p-8 shadow-sm border border-outline-variant/30 mb-8 space-y-4">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 text-primary-container text-xs font-semibold">
            <span className="material-symbols-outlined text-[16px]">gavel</span>
            <span>Civic Infrastructure Platform Agreement</span>
          </div>
          <h1 className="font-display text-2xl sm:text-4xl font-extrabold text-on-surface tracking-tight">
            Terms of Service
          </h1>
          <p className="text-on-surface-variant text-sm max-w-3xl leading-relaxed">
            These Terms of Service govern access to and use of the CivicFix civic issue intake, rule-assisted triage, and resolution verification system. Please review these terms carefully before creating an account or filing civic incident reports.
          </p>

          <div className="flex flex-wrap items-center gap-4 pt-2 text-xs text-tertiary border-t border-outline-variant/30">
            <span><strong>Document Version:</strong> 3.0-CAPSTONE</span>
            <span>•</span>
            <span><strong>Effective Date:</strong> November 1, 2026</span>
            <span>•</span>
            <span><strong>Backend Architecture:</strong> Java Spring Boot & PostgreSQL</span>
            <span>•</span>
            <span><strong>Focus Region:</strong> Chennai GCC, Tamil Nadu</span>
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
                1. Title, Version & Capstone Scope
              </h2>
              <p>
                This agreement constitutes the <strong>CivicFix Resident Terms of Service (Version 3.0-CAPSTONE)</strong>, effective as of <strong>November 1, 2026</strong>. Use of the platform constitutes acceptance of these terms.
              </p>
            </section>

            {/* Section 2 */}
            <section id="sec-2" className="scroll-mt-24 space-y-3">
              <h2 className="font-title text-lg font-bold text-on-surface border-b border-outline-variant/30 pb-2">
                2. About CivicFix & Academic Purpose
              </h2>
              <p>
                CivicFix is an explainable civic defect intake, rule-based triage, dispatch coordination, and photographic resolution verification platform. The demonstration instance serves civic administrative sectors across Chennai and municipal regions in Tamil Nadu.
              </p>
              <div className="p-3.5 bg-blue-50 border border-blue-200 rounded-xl text-xs text-blue-900">
                <strong>Operational Transparency:</strong> CivicFix operates as an engineering capstone project demonstrating rule-assisted triage and field verification workflows. CivicFix does not possess official municipal authority and does not replace official statutory emergency helplines (such as 1913 for Greater Chennai Corporation or 112 for national emergency services).
              </div>
            </section>

            {/* Section 3 */}
            <section id="sec-3" className="scroll-mt-24 space-y-3">
              <h2 className="font-title text-lg font-bold text-on-surface border-b border-outline-variant/30 pb-2">
                3. Eligibility & Account Registration
              </h2>
              <p>
                To create a Citizen account, you must be a resident individual at least 18 years of age. You must provide a valid full name and an authentic normalized Indian mobile phone number (+91) or electronic mail address alongside a secure password. Registration requests are validated and provisioned directly against the PostgreSQL database.
              </p>
            </section>

            {/* Section 4 */}
            <section id="sec-4" className="scroll-mt-24 space-y-3">
              <h2 className="font-title text-lg font-bold text-on-surface border-b border-outline-variant/30 pb-2">
                4. Account Credentials & Security
              </h2>
              <p>
                Passwords must contain at least 8 characters. Passwords are cryptographically salted and hashed on the server using BCrypt before storage. You are responsible for maintaining the confidentiality of your login credentials and preventing unauthorized access to your account session.
              </p>
            </section>

            {/* Section 5 */}
            <section id="sec-5" className="scroll-mt-24 space-y-3">
              <h2 className="font-title text-lg font-bold text-on-surface border-b border-outline-variant/30 pb-2">
                5. Resident Responsibilities
              </h2>
              <p>
                Residents agree to utilize CivicFix in good faith to facilitate the detection and remediation of physical community hazards (such as road potholes, broken streetlights, water supply leaks, overflowing garbage bins, and storm drainage breaches).
              </p>
            </section>

            {/* Section 6 */}
            <section id="sec-6" className="scroll-mt-24 space-y-3">
              <h2 className="font-title text-lg font-bold text-on-surface border-b border-outline-variant/30 pb-2">
                6. Permitted & Prohibited Conduct
              </h2>
              <p>
                You may not: (a) submit automated, scripted, or robotic complaint payloads; (b) reverse engineer, scrape, or probe platform APIs; (c) attempt to bypass role-based access controls to access Officer, Field Worker, Supervisor, or Administrator interfaces; or (d) upload non-civic media, commercial advertisements, or defamatory content.
              </p>
            </section>

            {/* Section 7 */}
            <section id="sec-7" className="scroll-mt-24 space-y-3">
              <h2 className="font-title text-lg font-bold text-on-surface border-b border-outline-variant/30 pb-2">
                7. Submitting Reports, Photos & Location Data
              </h2>
              <p>
                When submitting an issue, you provide photographic proof, physical street descriptions, and geographic coordinates (latitude and longitude). You warrant that uploaded imagery captures actual physical infrastructure located in public view and does not infringe upon private properties or individual privacy.
              </p>
            </section>

            {/* Section 8 */}
            <section id="sec-8" className="scroll-mt-24 space-y-3">
              <h2 className="font-title text-lg font-bold text-on-surface border-b border-outline-variant/30 pb-2">
                8. Abuse Prevention & Server-Side Rate Limiting
              </h2>
              <p>
                Submitting fabricated hazard reports, malicious hoaxes, or repetitive spam submissions undermines platform reliability. CivicFix enforces server-side rate limits (Bucket4j token bucket algorithm) across authentication, registration, complaint submission, and photo upload operations. Accounts associated with excessive failed login attempts are automatically locked to prevent brute-force attacks.
              </p>
            </section>

            {/* Section 9 */}
            <section id="sec-9" className="scroll-mt-24 space-y-3">
              <h2 className="font-title text-lg font-bold text-on-surface border-b border-outline-variant/30 pb-2">
                9. Complaint Review, Prioritization & Assignment
              </h2>
              <p>
                Municipal work-order prioritization (Critical, High, Medium, Low) is computed by deterministic keyword rules based on hazard severity and life-safety factors. Submission of a complaint does not guarantee immediate physical repair.
              </p>
            </section>

            {/* Section 10 */}
            <section id="sec-10" className="scroll-mt-24 space-y-3">
              <h2 className="font-title text-lg font-bold text-on-surface border-b border-outline-variant/30 pb-2">
                10. Repair Evidence, Citizen Confirmation & Resolution
              </h2>
              <p>
                Under CivicFix operational policy, field crews upload on-site photographic evidence and repair notes upon work completion. Work transitions through the verified lifecycle:
              </p>
              <div className="p-3 bg-surface-container-low border border-outline-variant/30 rounded-xl font-mono text-xs text-on-surface space-y-1">
                <p>SUBMITTED → UNDER_REVIEW → ASSIGNED → IN_PROGRESS → RESOLUTION_SUBMITTED → PENDING_CITIZEN_CONFIRMATION → RESOLVED</p>
              </div>
              <p className="text-xs">
                Once approved by an officer, tickets enter <strong>Pending Citizen Confirmation</strong>. The reporting citizen may confirm resolution or reject the resolution with mandatory feedback and proof, transitioning the ticket to <strong>Reopened</strong> for departmental re-investigation.
              </p>
            </section>

            {/* Section 11 */}
            <section id="sec-11" className="scroll-mt-24 space-y-3">
              <h2 className="font-title text-lg font-bold text-on-surface border-b border-outline-variant/30 pb-2">
                11. Notifications & System Communications
              </h2>
              <p>
                By enrolling, you consent to receive non-marketing transactional notifications regarding complaint review updates, crew assignments, and resolution milestones.
              </p>
            </section>

            {/* Section 12 */}
            <section id="sec-12" className="scroll-mt-24 space-y-3">
              <h2 className="font-title text-lg font-bold text-on-surface border-b border-outline-variant/30 pb-2">
                12. Availability, Maintenance & Service Limitations
              </h2>
              <p>
                As an engineering capstone platform, services may experience intermittent maintenance, database restarts, or updates without advance notice.
              </p>
            </section>

            {/* Section 13 */}
            <section id="sec-13" className="scroll-mt-24 space-y-3">
              <h2 className="font-title text-lg font-bold text-on-surface border-b border-outline-variant/30 pb-2">
                13. Rule-Based Advisory Triage & Decision-Support Limits
              </h2>
              <p>
                CivicFix employs deterministic keyword matching and geographic proximity rules to assist in defect categorization and duplicate detection. <strong>Rule suggestions are advisory decision-support recommendations only and do not represent final statutory government decisions.</strong>
              </p>
            </section>

            {/* Section 14 */}
            <section id="sec-14" className="scroll-mt-24 space-y-3">
              <h2 className="font-title text-lg font-bold text-on-surface border-b border-outline-variant/30 pb-2">
                14. User-Submitted Content & Processing License
              </h2>
              <p>
                You retain ownership of photos and textual descriptions submitted to the platform. By submitting, you grant the platform a non-exclusive, royalty-free license to store, process, display, and analyze the imagery for triage, evidence verification, and academic research purposes.
              </p>
            </section>

            {/* Section 15 */}
            <section id="sec-15" className="scroll-mt-24 space-y-3">
              <h2 className="font-title text-lg font-bold text-on-surface border-b border-outline-variant/30 pb-2">
                15. Privacy & Data Handling Reference
              </h2>
              <p>
                Personal contact details and individual complaint histories are handled under our{' '}
                <Link to="/legal/privacy" className="text-primary-container font-semibold hover:underline">
                  Citizen Data Privacy Policy
                </Link>
                . Data is persisted in PostgreSQL with strict role-based isolation, server-side EXIF metadata stripping, and public map coordinate rounding.
              </p>
            </section>

            {/* Section 16 */}
            <section id="sec-16" className="scroll-mt-24 space-y-3">
              <h2 className="font-title text-lg font-bold text-on-surface border-b border-outline-variant/30 pb-2">
                16. Third-Party Mapping & Geocoding Services
              </h2>
              <p>
                Geographic visualization and address geocoding are powered by OpenStreetMap contributors and Leaflet. Map data is provided "as-is" without warranty of positional perfection.
              </p>
            </section>

            {/* Section 17 */}
            <section id="sec-17" className="scroll-mt-24 space-y-3">
              <h2 className="font-title text-lg font-bold text-on-surface border-b border-outline-variant/30 pb-2">
                17. Account Suspension & Administrative Sanctions
              </h2>
              <p>
                Platform administrators reserve the right to suspend or restrict accounts that violate permitted conduct, submit abusive content, or attempt to tamper with security boundaries.
              </p>
            </section>

            {/* Section 18 */}
            <section id="sec-18" className="scroll-mt-24 space-y-3">
              <h2 className="font-title text-lg font-bold text-on-surface border-b border-outline-variant/30 pb-2">
                18. Disclaimers & Limitations of Liability
              </h2>
              <p>
                The platform is provided on an "as is" and "as available" basis for academic demonstration. The project disclaims liability for municipal repair outcomes, scheduling delays, or damages arising from reliance on demonstration platform telemetry.
              </p>
            </section>

            {/* Section 19 */}
            <section id="sec-19" className="scroll-mt-24 space-y-3">
              <h2 className="font-title text-lg font-bold text-on-surface border-b border-outline-variant/30 pb-2">
                19. Modifications to These Terms
              </h2>
              <p>
                We reserve the right to amend these Terms of Service as project development continues. Updates will be published on this page with a revised effective timestamp.
              </p>
            </section>

            {/* Section 20 */}
            <section id="sec-20" className="scroll-mt-24 space-y-3">
              <h2 className="font-title text-lg font-bold text-on-surface border-b border-outline-variant/30 pb-2">
                20. Project Contact & Feedback
              </h2>
              <p>
                For questions or feedback regarding platform terms and capstone research:
              </p>
              <div className="bg-surface-container-low p-4 rounded-xl space-y-1.5 text-xs font-mono">
                <p><strong>Project:</strong> CivicFix Engineering Capstone</p>
                <p><strong>Focus Region:</strong> Chennai, Tamil Nadu, India</p>
                <p><strong>Email:</strong> research@civicfix.prototype</p>
              </div>
            </section>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TermsOfServicePage;
