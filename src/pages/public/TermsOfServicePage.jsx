import React, { useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';

/**
 * CivicFix AI — Official Terms of Service Page
 * Outlines rights, citizen responsibilities, AI triage limitations, and service guidelines.
 * Complies with CivicFix AI Master Prompt Phase 4 specifications (20 structured sections).
 */
export const TermsOfServicePage = () => {
  const navigate = useNavigate();

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, []);

  const sections = [
    { id: 'sec-1', title: '1. Title, Version & Effective Dates' },
    { id: 'sec-2', title: '2. About CivicFix AI & Purpose' },
    { id: 'sec-3', title: '3. Eligibility & Account Registration' },
    { id: 'sec-4', title: '4. Accurate Information & Account Security' },
    { id: 'sec-5', title: '5. Citizen Responsibilities' },
    { id: 'sec-6', title: '6. Permitted & Prohibited Use' },
    { id: 'sec-7', title: '7. Submitting Reports, Photos & Location Data' },
    { id: 'sec-8', title: '8. False, Malicious, Abusive & Duplicate Reports' },
    { id: 'sec-9', title: '9. Complaint Review, Prioritization & Assignment' },
    { id: 'sec-10', title: '10. Repair Evidence & Resolution Verification' },
    { id: 'sec-11', title: '11. Notifications & Service Communications' },
    { id: 'sec-12', title: '12. Availability, Maintenance & Service Limitations' },
    { id: 'sec-13', title: '13. AI-Assisted Analysis & Decision-Support Limits' },
    { id: 'sec-14', title: '14. User-Generated Content & Processing License' },
    { id: 'sec-15', title: '15. Privacy & Data Handling' },
    { id: 'sec-16', title: '16. Third-Party Services & Map Providers' },
    { id: 'sec-17', title: '17. Account Suspension & Termination' },
    { id: 'sec-18', title: '18. Disclaimers & Limitations of Liability' },
    { id: 'sec-19', title: '19. Modifications to These Terms' },
    { id: 'sec-20', title: '20. Grievance Redressal & Contact' }
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
            <span className="text-xs font-semibold text-primary-container">Legal Documentation</span>
          </div>

          <div className="flex items-center gap-3">
            <Link
              to="/register"
              className="px-3.5 py-1.5 bg-primary-container hover:bg-primary text-white text-xs font-semibold rounded-xl shadow-xs transition-all"
            >
              Return to Registration
            </Link>
            <Link
              to="/legal/privacy"
              className="px-3.5 py-1.5 bg-surface-container-low hover:bg-surface-container text-primary-container text-xs font-semibold rounded-xl border border-outline-variant/40 transition-colors"
            >
              Privacy Policy
            </Link>
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
            These Terms of Service govern resident access and use of the CivicFix AI civic defect reporting prototype platform in the Tamil Nadu demonstration jurisdiction. Please review these terms carefully before creating an account or filing civic issue reports.
          </p>

          <div className="flex flex-wrap items-center gap-4 pt-2 text-xs text-tertiary border-t border-outline-variant/30">
            <span><strong>Document Version:</strong> 2.0-PROTOTYPE</span>
            <span>•</span>
            <span><strong>Effective Date:</strong> October 20, 2026</span>
            <span>•</span>
            <span><strong>Last Updated:</strong> October 20, 2026</span>
            <span>•</span>
            <span className="text-amber-800 font-medium">Notice: Prototype policies subject to municipal legal review</span>
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
                This agreement constitutes the <strong>CivicFix AI Resident Terms of Service (Version 2.0-PROTOTYPE)</strong>. This document took effect on <strong>October 20, 2026</strong>. Continued utilization of the service represents binding agreement to these terms.
              </p>
            </section>

            {/* Section 2 */}
            <section id="sec-2" className="scroll-mt-24 space-y-3">
              <h2 className="font-title text-lg font-bold text-on-surface border-b border-outline-variant/30 pb-2">
                2. About CivicFix AI & Purpose
              </h2>
              <p>
                CivicFix AI is an autonomous civic defect intake, AI triage, dispatch coordination, and photographic resolution verification platform. The demonstration instance serves civic administrative sectors across urban jurisdictions in Tamil Nadu (including Chennai, Coimbatore, Madurai, and Tiruchirappalli).
              </p>
              <div className="p-3.5 bg-blue-50 border border-blue-200 rounded-xl text-xs text-blue-900">
                <strong>Operational Transparency:</strong> CivicFix AI operates as an engineering prototype demonstrating AI triage and field verification workflows. Unless explicitly certified through a formal memorandum of understanding (MoU), CivicFix AI does not claim official municipal ownership or constitutional executive authority.
              </div>
            </section>

            {/* Section 3 */}
            <section id="sec-3" className="scroll-mt-24 space-y-3">
              <h2 className="font-title text-lg font-bold text-on-surface border-b border-outline-variant/30 pb-2">
                3. Eligibility & Account Registration
              </h2>
              <p>
                To create a Citizen account, you must be a resident individual at least 18 years of age (or possess verifiable parental/guardian consent where local law permits civic hazard reporting by minors). You must provide a valid legal name and an authentic Indian mobile phone number (+91) or electronic mail address capable of receiving one-time verification passkeys (OTP).
              </p>
            </section>

            {/* Section 4 */}
            <section id="sec-4" className="scroll-mt-24 space-y-3">
              <h2 className="font-title text-lg font-bold text-on-surface border-b border-outline-variant/30 pb-2">
                4. Accurate Information & Account Security
              </h2>
              <p>
                You represent and warrant that contact details and municipal ward declarations submitted during account onboarding are accurate. You are solely responsible for maintaining the confidentiality of your authentication credentials and preventing unauthorized access to your mobile verification tokens.
              </p>
            </section>

            {/* Section 5 */}
            <section id="sec-5" className="scroll-mt-24 space-y-3">
              <h2 className="font-title text-lg font-bold text-on-surface border-b border-outline-variant/30 pb-2">
                5. Citizen Responsibilities
              </h2>
              <p>
                Residents agree to utilize CivicFix AI in good faith to facilitate the prompt detection and remediation of physical community hazards (such as road surface cavities, broken streetlights, storm drain breaches, and water distribution failures).
              </p>
            </section>

            {/* Section 6 */}
            <section id="sec-6" className="scroll-mt-24 space-y-3">
              <h2 className="font-title text-lg font-bold text-on-surface border-b border-outline-variant/30 pb-2">
                6. Permitted & Prohibited Use
              </h2>
              <p>
                You may not: (a) submit automated, scripted, or robotic complaint payloads; (b) reverse engineer, decompile, or scrape the platform; (c) attempt to bypass role-based access controls to access Officer, Field Worker, or Administrator interfaces; or (d) upload non-civic media, commercial promotions, or defamatory materials.
              </p>
            </section>

            {/* Section 7 */}
            <section id="sec-7" className="scroll-mt-24 space-y-3">
              <h2 className="font-title text-lg font-bold text-on-surface border-b border-outline-variant/30 pb-2">
                7. Submitting Reports, Photos & Location Data
              </h2>
              <p>
                When submitting an issue, you provide photographic evidence, physical street descriptions, and geographic coordinates (latitude and longitude). You warrant that uploaded imagery captures actual physical infrastructure located in public view and does not infringe upon third-party privacy.
              </p>
            </section>

            {/* Section 8 */}
            <section id="sec-8" className="scroll-mt-24 space-y-3">
              <h2 className="font-title text-lg font-bold text-on-surface border-b border-outline-variant/30 pb-2">
                8. False, Malicious, Abusive & Duplicate Reports
              </h2>
              <p>
                Submitting fabricated hazard reports, malicious hoaxes, or repetitive spam submissions undermines emergency dispatch resources. CivicFix AI utilizes heuristic rate limits and duplicate clustering. Accounts associated with persistent bad-faith filings will be placed under administrative restriction.
              </p>
            </section>

            {/* Section 9 */}
            <section id="sec-9" className="scroll-mt-24 space-y-3">
              <h2 className="font-title text-lg font-bold text-on-surface border-b border-outline-variant/30 pb-2">
                9. Complaint Review, Prioritization & Assignment
              </h2>
              <p>
                Municipal work-order prioritization (Critical, High, Medium, Low) is dynamically computed based on defect severity, pedestrian traffic density, and life-safety risks. Submission of a complaint does not guarantee instant dispatch or an immediate physical repair.
              </p>
            </section>

            {/* Section 10 */}
            <section id="sec-10" className="scroll-mt-24 space-y-3">
              <h2 className="font-title text-lg font-bold text-on-surface border-b border-outline-variant/30 pb-2">
                10. Repair Evidence & Resolution Verification
              </h2>
              <p>
                Under CivicFix operational policy, field crews upload on-site photographic evidence and compaction/repair notes upon work completion. <strong>A complaint cannot transition to Resolved status until an authorized Municipal Officer validates the photographic evidence against GPS telemetry.</strong>
              </p>
            </section>

            {/* Section 11 */}
            <section id="sec-11" className="scroll-mt-24 space-y-3">
              <h2 className="font-title text-lg font-bold text-on-surface border-b border-outline-variant/30 pb-2">
                11. Notifications & Service Communications
              </h2>
              <p>
                By enrolling, you consent to receive non-marketing transactional notifications regarding complaint review updates, crew assignments, and resolution milestones via SMS or email.
              </p>
            </section>

            {/* Section 12 */}
            <section id="sec-12" className="scroll-mt-24 space-y-3">
              <h2 className="font-title text-lg font-bold text-on-surface border-b border-outline-variant/30 pb-2">
                12. Availability, Maintenance & Service Limitations
              </h2>
              <p>
                While the platform targets 24/7 availability, services may occasionally experience scheduled maintenance windows or degraded operation due to telecom outages or infrastructure downtime.
              </p>
            </section>

            {/* Section 13 */}
            <section id="sec-13" className="scroll-mt-24 space-y-3">
              <h2 className="font-title text-lg font-bold text-on-surface border-b border-outline-variant/30 pb-2">
                13. AI-Assisted Analysis & Decision-Support Limits
              </h2>
              <p>
                CivicFix AI employs multi-modal vision and natural language models to assist in defect categorization and duplicate detection. <strong>AI predictions are advisory decision-support tools only and do not represent final statutory government decisions.</strong>
              </p>
            </section>

            {/* Section 14 */}
            <section id="sec-14" className="scroll-mt-24 space-y-3">
              <h2 className="font-title text-lg font-bold text-on-surface border-b border-outline-variant/30 pb-2">
                14. User-Generated Content & Processing License
              </h2>
              <p>
                You retain ownership of photos and textual descriptions submitted to the platform. By submitting, you grant the platform operator a non-exclusive, royalty-free license to store, process, display, and transmit the evidence for public works triage and resolution verification.
              </p>
            </section>

            {/* Section 15 */}
            <section id="sec-15" className="scroll-mt-24 space-y-3">
              <h2 className="font-title text-lg font-bold text-on-surface border-b border-outline-variant/30 pb-2">
                15. Privacy & Data Handling
              </h2>
              <p>
                Your personal contact details and individual complaint histories are handled under our dedicated{' '}
                <Link to="/legal/privacy" className="text-primary-container font-semibold hover:underline">
                  Citizen Data Privacy Policy
                </Link>
                . CivicFix enforces strict citizen data isolation, ensuring residents cannot browse or access complaints filed by other citizens.
              </p>
            </section>

            {/* Section 16 */}
            <section id="sec-16" className="scroll-mt-24 space-y-3">
              <h2 className="font-title text-lg font-bold text-on-surface border-b border-outline-variant/30 pb-2">
                16. Third-Party Services & Map Providers
              </h2>
              <p>
                Geographic visualization and address geocoding are powered by OpenStreetMap contributors and public GIS infrastructure. Map data is provided "as-is" without warranty of positional perfection.
              </p>
            </section>

            {/* Section 17 */}
            <section id="sec-17" className="scroll-mt-24 space-y-3">
              <h2 className="font-title text-lg font-bold text-on-surface border-b border-outline-variant/30 pb-2">
                17. Account Suspension & Termination
              </h2>
              <p>
                The platform administration reserves the right to suspend or restrict accounts that violate permitted use rules, submit abusive content, or engage in malicious security testing against unauthorized API endpoints.
              </p>
            </section>

            {/* Section 18 */}
            <section id="sec-18" className="scroll-mt-24 space-y-3">
              <h2 className="font-title text-lg font-bold text-on-surface border-b border-outline-variant/30 pb-2">
                18. Disclaimers & Limitations of Liability
              </h2>
              <p>
                The platform is provided on an "as is" and "as available" basis. To the maximum extent permitted under applicable law, the operator disclaims liability for indirect, incidental, or consequential damages resulting from repair delays or municipal triage outcomes.
              </p>
            </section>

            {/* Section 19 */}
            <section id="sec-19" className="scroll-mt-24 space-y-3">
              <h2 className="font-title text-lg font-bold text-on-surface border-b border-outline-variant/30 pb-2">
                19. Modifications to These Terms
              </h2>
              <p>
                We reserve the right to amend these Terms of Service. Notice of substantive revisions will be posted within this portal alongside an updated effective date.
              </p>
            </section>

            {/* Section 20 */}
            <section id="sec-20" className="scroll-mt-24 space-y-3">
              <h2 className="font-title text-lg font-bold text-on-surface border-b border-outline-variant/30 pb-2">
                20. Grievance Redressal & Contact
              </h2>
              <p>
                For questions, feedback, or grievance escalation regarding platform terms, please reach out through the official contact channel:
              </p>
              <div className="bg-surface-container-low p-4 rounded-xl space-y-1.5 text-xs font-mono">
                <p><strong>Entity:</strong> [CIVICFIX_OPERATOR_LEGAL_ENTITY]</p>
                <p><strong>Grievance Officer:</strong> [GRIEVANCE_OFFICER_NAME]</p>
                <p><strong>Email:</strong> legal-grievance@civicfix.prototype</p>
                <p><strong>Jurisdiction:</strong> Chennai, Tamil Nadu, India</p>
              </div>
            </section>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TermsOfServicePage;
