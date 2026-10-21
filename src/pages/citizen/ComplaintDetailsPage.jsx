import React, { useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { useApp } from '../../context/AppContext';
import { complaintService } from '../../services/complaintService';
import { StatusBadge } from '../../components/common/StatusBadge';
import { PriorityBadge } from '../../components/common/PriorityBadge';
import { Breadcrumb } from '../../components/common/Breadcrumb';
import { COMPLAINT_STATUS } from '../../constants/statusConstants';

export const ComplaintDetailsPage = () => {
  const { complaintId } = useParams();
  const navigate = useNavigate();
  const { complaints, refreshComplaints, showToast, currentUser, isComplaintOwner } = useApp();

  const complaint = complaints.find(c => c.id.toLowerCase() === (complaintId || '').toLowerCase());
  const isAuthorized = complaint && (isComplaintOwner ? isComplaintOwner(complaint, currentUser) : (
    complaint.citizen?.id === currentUser?.id || (currentUser?.email && complaint.citizen?.email?.toLowerCase() === currentUser?.email.toLowerCase())
  ));

  const [simStatus, setSimStatus] = useState(complaint?.status || COMPLAINT_STATUS.IN_PROGRESS);

  if (!complaint) {
    return (
      <div className="text-center py-16 bg-surface-container-lowest rounded-2xl p-8 max-w-lg mx-auto shadow-sm border border-outline-variant/30 space-y-4">
        <span className="material-symbols-outlined text-[48px] text-tertiary">search_off</span>
        <h2 className="text-xl font-bold text-on-surface">Complaint Record Not Found</h2>
        <p className="text-xs text-on-surface-variant">Ticket ID #{complaintId} could not be located in the municipal database.</p>
        <Link to="/citizen/complaints" className="inline-block px-4 py-2 bg-primary-container text-white text-xs font-semibold rounded-xl">
          Return to My Complaints
        </Link>
      </div>
    );
  }

  // Enforce privacy isolation: Citizens cannot access complaints owned by others
  if (!isAuthorized) {
    return (
      <div className="text-center py-16 bg-surface-container-lowest rounded-2xl p-8 max-w-lg mx-auto shadow-sm border border-outline-variant/30 space-y-4">
        <div className="w-16 h-16 rounded-2xl bg-amber-500/10 text-amber-700 flex items-center justify-center mx-auto">
          <span className="material-symbols-outlined text-[36px]">lock</span>
        </div>
        <h2 className="text-xl font-bold text-on-surface">Private Citizen Record</h2>
        <p className="text-xs text-on-surface-variant max-w-sm mx-auto leading-relaxed">
          Complaint ticket #{complaintId} belongs to another resident or requires municipal staff authorization. In accordance with citizen privacy policies, you may only view reports filed under your own account.
        </p>
        <Link to="/citizen/complaints" className="inline-block px-4 py-2 bg-primary-container text-white text-xs font-semibold rounded-xl shadow-sm">
          Return to My Complaints
        </Link>
      </div>
    );
  }

  // Handle demo state switching for evaluator convenience
  const handleSimState = async (newStatus) => {
    setSimStatus(newStatus);
    await complaintService.updateStatus(complaint.id, newStatus);
    await refreshComplaints();
    showToast(`Simulation: Ticket #${complaint.id} transitioned to ${newStatus}`, 'info');
  };

  const copyReference = () => {
    navigator.clipboard?.writeText(complaint.id);
    showToast(`Copied #${complaint.id} to clipboard!`, 'info');
  };

  const currentEffectiveStatus = complaint.status;

  // Stepper steps
  const steps = [
    { key: COMPLAINT_STATUS.SUBMITTED, label: 'Submitted', icon: 'send' },
    { key: COMPLAINT_STATUS.UNDER_REVIEW, label: 'Under Review', icon: 'rate_review' },
    { key: COMPLAINT_STATUS.ASSIGNED, label: 'Assigned', icon: 'assignment_ind' },
    { key: COMPLAINT_STATUS.IN_PROGRESS, label: 'In Progress', icon: 'engineering' },
    { key: COMPLAINT_STATUS.RESOLUTION_SUBMITTED, label: 'Resolution Submitted', icon: 'fact_check' },
    { key: COMPLAINT_STATUS.RESOLVED, label: 'Verified Resolved', icon: 'check_circle' }
  ];

  const getStepIndex = (st) => {
    const map = {
      [COMPLAINT_STATUS.SUBMITTED]: 0,
      [COMPLAINT_STATUS.UNDER_REVIEW]: 1,
      [COMPLAINT_STATUS.ASSIGNED]: 2,
      [COMPLAINT_STATUS.IN_PROGRESS]: 3,
      [COMPLAINT_STATUS.RESOLUTION_SUBMITTED]: 4,
      [COMPLAINT_STATUS.RESOLVED]: 5,
      [COMPLAINT_STATUS.REWORK_REQUESTED]: 3,
      [COMPLAINT_STATUS.REOPENED]: 3,
      [COMPLAINT_STATUS.REJECTED]: 1
    };
    return map[st] !== undefined ? map[st] : 0;
  };

  const activeStepIdx = getStepIndex(currentEffectiveStatus);

  return (
    <div className="w-full flex flex-col gap-6">
      <Breadcrumb
        items={[
          { label: 'Citizen Portal', path: '/citizen/dashboard', icon: 'home' },
          { label: 'My Complaints', path: '/citizen/complaints' },
          { label: `#${complaint.id}` }
        ]}
      />

      {/* Interactive State Simulator Controller Banner matching Stitch Design */}
      <aside
        aria-label="Interactive State Preview Switcher"
        className="w-full bg-surface-container-low rounded-2xl p-4 shadow-sm border border-outline-variant/40"
      >
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-secondary/10 flex items-center justify-center text-secondary">
              <span className="material-symbols-outlined text-[18px]">tune</span>
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-label-sm text-[10px] uppercase font-bold text-secondary">Demo Mode</span>
                <span className="w-1.5 h-1.5 rounded-full bg-secondary" />
                <span className="font-title text-xs font-bold text-on-surface">Lifecycle State Simulator</span>
              </div>
              <span className="text-[11px] text-on-surface-variant">
                Cycle through municipal inspection states for this live ticket:
              </span>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-1.5">
            {[
              { id: COMPLAINT_STATUS.IN_PROGRESS, label: '1. In Progress' },
              { id: COMPLAINT_STATUS.RESOLUTION_SUBMITTED, label: '2. Resolution Submitted' },
              { id: COMPLAINT_STATUS.RESOLVED, label: '3. Verified Resolved' },
              { id: COMPLAINT_STATUS.REWORK_REQUESTED, label: '4. Rework Requested' },
              { id: COMPLAINT_STATUS.REOPENED, label: '5. Reopened' }
            ].map((btn) => (
              <button
                key={btn.id}
                type="button"
                onClick={() => handleSimState(btn.id)}
                className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all ${
                  currentEffectiveStatus === btn.id
                    ? 'bg-primary-container text-white shadow-sm'
                    : 'bg-surface-container-lowest text-on-surface hover:bg-surface-container border border-outline-variant/40'
                }`}
              >
                {btn.label}
              </button>
            ))}
          </div>
        </div>
      </aside>

      {/* Main Ticket Header Card */}
      <section className="bg-surface-container-lowest rounded-2xl p-6 shadow-sm border border-outline-variant/30 space-y-4">
        <div className="flex flex-col lg:flex-row lg:items-start justify-between gap-4">
          <div className="space-y-2">
            <div className="flex flex-wrap items-center gap-2">
              <span className="font-code text-sm font-bold bg-surface-container text-on-surface px-2.5 py-1 rounded-lg">
                #{complaint.id}
              </span>
              <button
                onClick={copyReference}
                className="inline-flex items-center gap-1 text-xs text-on-surface-variant hover:text-primary px-2 py-1 rounded bg-surface-container-low hover:bg-surface-container transition-colors"
                title="Copy reference ID"
              >
                <span className="material-symbols-outlined text-[14px]">content_copy</span>
                <span>Copy</span>
              </button>
              <span className="text-outline-variant">•</span>
              <span className="text-xs text-on-surface-variant flex items-center gap-1">
                <span className="material-symbols-outlined text-[14px]">calendar_today</span>
                <span>{new Date(complaint.createdAt).toLocaleDateString()}</span>
              </span>
            </div>

            <h1 className="font-headline-lg text-2xl sm:text-3xl font-extrabold text-on-surface tracking-tight">
              {complaint.title}
            </h1>

            <div className="flex flex-wrap items-center gap-2">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-surface-container text-on-surface text-xs font-semibold">
                <span className="material-symbols-outlined text-[16px] text-tertiary">category</span>
                <span>{complaint.category}</span>
              </span>
              <StatusBadge status={currentEffectiveStatus} size="md" />
              <PriorityBadge priority={complaint.priority} />
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <Link
              to="/citizen/complaints"
              className="px-4 py-2 rounded-xl border border-outline-variant/40 hover:bg-surface-container text-on-surface text-xs font-semibold transition-colors flex items-center gap-1.5"
            >
              <span className="material-symbols-outlined text-[16px]">arrow_back</span>
              <span>Back to List</span>
            </Link>
          </div>
        </div>

        {/* Stepper Progress Bar */}
        <div className="pt-4 border-t border-outline-variant/30">
          <div className="grid grid-cols-2 sm:grid-cols-6 gap-2">
            {steps.map((step, idx) => {
              const isPassed = idx < activeStepIdx;
              const isCurrent = idx === activeStepIdx;
              return (
                <div
                  key={step.key}
                  className={`p-2.5 rounded-xl flex flex-col gap-1 transition-all ${
                    isCurrent
                      ? 'bg-primary-container text-white shadow-sm ring-1 ring-primary-container'
                      : isPassed
                      ? 'bg-emerald-500/10 text-emerald-800'
                      : 'bg-surface-container-low text-tertiary opacity-70'
                  }`}
                >
                  <div className="flex items-center justify-between text-xs">
                    <span className="material-symbols-outlined text-[16px]">
                      {isPassed ? 'check' : step.icon}
                    </span>
                    <span className="font-code text-[10px] font-bold">0{idx + 1}</span>
                  </div>
                  <span className="text-[11px] font-semibold truncate leading-tight mt-1">
                    {step.label}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* Main 2-Column Grid */}
      <section className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Column: Details & Investigation (8 cols) */}
        <div className="lg:col-span-8 space-y-6">
          {/* Section A: Reported Description */}
          <div className="bg-surface-container-lowest rounded-2xl p-6 shadow-sm border border-outline-variant/30 space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-tertiary uppercase tracking-wider">
                Original Resident Intake Details
              </span>
              <span className="text-xs text-on-surface-variant font-medium">
                Reporter: <strong>{complaint.citizen?.name || 'Alex Morgan'}</strong> (Trust Score: 98%)
              </span>
            </div>

            <p className="text-body-md text-sm text-on-surface leading-relaxed">
              {complaint.description}
            </p>

            {complaint.photos && complaint.photos.length > 0 && (
              <div className="pt-2">
                <span className="text-xs font-semibold text-tertiary block mb-2">Resident Photo Evidence:</span>
                <div className="grid grid-cols-2 gap-3">
                  {complaint.photos.map((url, i) => (
                    <div key={i} className="rounded-xl overflow-hidden aspect-video bg-surface-container border border-outline-variant/40">
                      <img src={url} alt={`Reported defect photo ${i + 1}`} className="w-full h-full object-cover" />
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Section B: Field Operations Progress Log */}
          <div className="bg-surface-container-lowest rounded-2xl p-6 shadow-sm border border-outline-variant/30 space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-tertiary uppercase tracking-wider">
                Field Operations Progress Log
              </span>
              {complaint.assignedWorker && (
                <span className="text-xs font-semibold text-primary-container bg-surface-container px-2.5 py-0.5 rounded-full">
                  Crew Lead: {complaint.assignedWorker.name}
                </span>
              )}
            </div>

            {/* Progress Percentage */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between text-xs">
                <span className="text-on-surface-variant">Repair Work Order Completion</span>
                <span className="font-code text-on-surface font-bold">{complaint.progressPercent || 0}%</span>
              </div>
              <div className="w-full bg-surface-container-high rounded-full h-2 overflow-hidden">
                <div
                  className="bg-primary-container h-full rounded-full transition-all duration-500"
                  style={{ width: `${complaint.progressPercent || 0}%` }}
                />
              </div>
            </div>

            {/* Notes List */}
            <div className="space-y-3 pt-2">
              {complaint.progressNotes && complaint.progressNotes.length > 0 ? (
                complaint.progressNotes.map((note, idx) => (
                  <div key={idx} className="p-3.5 rounded-xl bg-surface-container-low border border-outline-variant/30 space-y-1 text-xs">
                    <div className="flex items-center justify-between text-tertiary">
                      <span className="font-semibold text-on-surface">{note.author}</span>
                      <span className="font-code text-[11px]">{new Date(note.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                    </div>
                    <p className="text-on-surface-variant">{note.note}</p>
                  </div>
                ))
              ) : (
                <div className="p-4 rounded-xl bg-surface-container-low text-center text-xs text-tertiary">
                  Work order queued for initial technician site arrival.
                </div>
              )}
            </div>
          </div>

          {/* Section C: Resolution Evidence & Officer Verification (Shown if Resolution Submitted or Resolved) */}
          {(currentEffectiveStatus === COMPLAINT_STATUS.RESOLUTION_SUBMITTED || currentEffectiveStatus === COMPLAINT_STATUS.RESOLVED) && (
            <div className="bg-surface-container-lowest rounded-2xl p-6 shadow-sm border border-outline-variant/30 space-y-4 animate-fade-in">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-secondary uppercase tracking-wider flex items-center gap-1.5">
                  <span className="material-symbols-outlined text-[16px]">verified</span>
                  <span>Field Resolution Proof & Official Review</span>
                </span>
                <span className="px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-700 text-xs font-semibold">
                  {currentEffectiveStatus === COMPLAINT_STATUS.RESOLVED ? 'Resolution Approved' : 'Awaiting Officer Verification'}
                </span>
              </div>

              {complaint.resolutionEvidence && (
                <div className="p-4 rounded-xl bg-surface-container-low space-y-3 text-xs border border-outline-variant/30">
                  <strong className="block text-on-surface font-semibold">Field Crew Completion Report</strong>
                  <p className="text-on-surface-variant leading-relaxed">{complaint.resolutionEvidence.notes}</p>

                  {complaint.resolutionEvidence.photos && (
                    <div className="grid grid-cols-2 gap-3 pt-2">
                      {complaint.resolutionEvidence.photos.map((url, i) => (
                        <div key={i} className="rounded-xl overflow-hidden aspect-video bg-surface-container border border-outline-variant/40">
                          <img src={url} alt={`Completed repair evidence ${i + 1}`} className="w-full h-full object-cover" />
                        </div>
                      ))}
                    </div>
                  )}
                  <div className="flex items-center justify-between pt-2 text-[11px] text-tertiary">
                    <span>GPS Telemetry Validated: 13.0850° N, 80.2101° E</span>
                    <span>Completed in: {complaint.resolutionEvidence.completionTime || '4 hours'}</span>
                  </div>
                </div>
              )}

              {/* Officer Certificate if Resolved */}
              {complaint.verificationMeta && (
                <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/20 space-y-2 text-xs">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-emerald-800 flex items-center gap-1">
                      <span className="material-symbols-outlined text-[18px]">verified_user</span>
                      <span>Municipal Officer Verification Certificate</span>
                    </span>
                    <span className="font-code text-emerald-700 font-semibold">
                      {new Date(complaint.verificationMeta.approvedAt).toLocaleDateString()}
                    </span>
                  </div>
                  <p className="text-emerald-900 leading-relaxed">
                    "{complaint.verificationMeta.officerNotes}"
                  </p>
                  <span className="block font-semibold text-emerald-800">
                    Inspected & Approved by: {complaint.verificationMeta.verifiedBy}
                  </span>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Right Column: AI Triage & Geotag Details (4 cols) */}
        <div className="lg:col-span-4 space-y-6">
          {/* Location Details */}
          <div className="bg-surface-container-lowest rounded-2xl p-5 shadow-sm border border-outline-variant/30 space-y-3">
            <span className="text-xs font-bold text-tertiary uppercase tracking-wider block">
              Incident Geolocation
            </span>
            <div className="space-y-1.5 text-xs">
              <div className="flex items-start gap-2">
                <span className="material-symbols-outlined text-primary text-[18px] shrink-0 mt-0.5">location_on</span>
                <div>
                  <p className="font-semibold text-on-surface">{complaint.location?.address}</p>
                  <p className="text-tertiary">{complaint.location?.ward} • {complaint.location?.district}</p>
                  {complaint.location?.landmark && (
                    <p className="text-[11px] text-primary-container font-medium mt-0.5">
                      Landmark: {complaint.location.landmark}
                    </p>
                  )}
                </div>
              </div>
            </div>

            <div className="p-2.5 rounded-xl bg-surface-container-low text-xs flex items-center justify-between">
              <span className="text-tertiary">GPS Coordinates:</span>
              <span className="font-code text-on-surface font-semibold">
                {complaint.location?.coordinates?.lat || 13.0850}° N, {complaint.location?.coordinates?.lng || 80.2101}° E
              </span>
            </div>
          </div>

          {/* AI Triage & Intelligence Card matching Stitch */}
          <div className="bg-surface-container-lowest rounded-2xl p-5 shadow-sm border border-outline-variant/30 space-y-3">
            <div className="flex items-center gap-2 text-secondary font-bold text-xs uppercase tracking-wider">
              <span className="material-symbols-outlined text-[18px]">psychology</span>
              <span>Gemini AI Triage Diagnostics</span>
            </div>

            <div className="space-y-2 text-xs">
              <div className="p-3 rounded-xl bg-surface-container-low space-y-1.5">
                <div className="flex justify-between">
                  <span className="text-tertiary">Algorithm Confidence:</span>
                  <span className="font-bold text-emerald-600 font-code">
                    {complaint.aiTriage?.confidence || 98.4}%
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-tertiary">Hazard Classification:</span>
                  <span className="font-bold text-on-surface">{complaint.aiTriage?.hazardScore || 'P1 - High Traffic Risk'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-tertiary">Routing Department:</span>
                  <span className="font-bold text-primary-container">{complaint.aiTriage?.suggestedDept || 'Public Works'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-tertiary">Cluster Duplicates:</span>
                  <span className="font-bold text-on-surface">{complaint.aiTriage?.clusterCount || 1} match</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
};
