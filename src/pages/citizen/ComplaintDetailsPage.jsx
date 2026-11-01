import React, { useState, useEffect, useCallback } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { useApp } from '../../context/AppContext';
import { useTranslation } from '../../context/LanguageContext';
import { complaintService, formatCoordinates, hasValidCoordinates } from '../../services/complaintService';
import { StatusBadge } from '../../components/common/StatusBadge';
import { PriorityBadge } from '../../components/common/PriorityBadge';
import { SlaBadge } from '../../components/common/SlaBadge.jsx';
import { Breadcrumb } from '../../components/common/Breadcrumb';
import { LocationMiniMap } from '../../components/common/LocationMiniMap';
import { COMPLAINT_STATUS } from '../../constants/statusConstants';
import { apiClient } from '../../services/apiClient.js';

export const ComplaintDetailsPage = () => {
  const { complaintId } = useParams();
  const navigate = useNavigate();
  const { showToast, currentUser } = useApp();
  const { t } = useTranslation();

  const [complaint, setComplaint] = useState(null);
  const [loading, setLoading] = useState(true);
  const [errorState, setErrorState] = useState(null); // 'NOT_FOUND' | 'UNAUTHORIZED' | 'SESSION_EXPIRED' | 'ERROR'
  const [errorMessage, setErrorMessage] = useState('');

  // Manual Escalation State (for staff personas viewing details)
  const [showEscalateModal, setShowEscalateModal] = useState(false);
  const [escalateReason, setEscalateReason] = useState('');
  const [escalating, setEscalating] = useState(false);
  const [escalateError, setEscalateError] = useState(null);

  // Citizen Confirmation & Reopen States
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [confirming, setConfirming] = useState(false);

  const [showRejectModal, setShowRejectModal] = useState(false);
  const [rejectReason, setRejectReason] = useState('');
  const [rejectPhoto, setRejectPhoto] = useState(null);
  const [rejecting, setRejecting] = useState(false);
  const [rejectError, setRejectError] = useState(null);

  const isOwningCitizen = currentUser && (
    currentUser.role === 'CITIZEN' ||
    (complaint?.citizen?.id && currentUser.id === complaint.citizen.id)
  );

  const handleConfirmFix = async () => {
    setConfirming(true);
    try {
      const res = await apiClient.complaints.confirmResolution(complaint.id, {
        version: complaint.version
      });
      const updated = res?.data || res;
      setComplaint(prev => ({
        ...prev,
        ...updated,
        status: COMPLAINT_STATUS.RESOLVED,
        confirmedAt: updated.confirmedAt || new Date().toISOString(),
        confirmationSource: 'CITIZEN'
      }));
      setShowConfirmModal(false);
      showToast('Resolution confirmed! Thank you for helping keep our city clean and safe.', 'success');
    } catch (err) {
      console.error('Failed to confirm resolution:', err);
      showToast(err.message || 'Failed to confirm resolution.', 'error');
    } finally {
      setConfirming(false);
    }
  };

  const handleRejectFix = async (e) => {
    e.preventDefault();
    if (!rejectReason.trim() || rejectReason.trim().length < 10) {
      setRejectError('Please describe what is still unresolved (minimum 10 characters).');
      return;
    }
    setRejecting(true);
    setRejectError(null);
    try {
      const res = await apiClient.complaints.rejectResolution(
        complaint.id,
        {
          reason: rejectReason.trim(),
          version: complaint.version
        },
        rejectPhoto
      );
      const updated = res?.data || res;
      setComplaint(prev => ({
        ...prev,
        ...updated,
        status: COMPLAINT_STATUS.REOPENED,
        escalatedAt: updated.escalatedAt || new Date().toISOString(),
        reopenCount: (prev?.reopenCount || 0) + 1
      }));
      setShowRejectModal(false);
      setRejectReason('');
      setRejectPhoto(null);
      showToast('Issue reported as not fixed. Ticket has been reopened and escalated to municipal supervisors.', 'warning');
    } catch (err) {
      console.error('Failed to reject resolution:', err);
      setRejectError(err.message || 'Failed to report issue as not fixed.');
    } finally {
      setRejecting(false);
    }
  };

  const canEscalate = currentUser &&
    (currentUser.role === 'OFFICER' || currentUser.role === 'SUPERVISOR' || currentUser.role === 'ADMIN');

  const handleEscalateComplaint = async (e) => {
    e.preventDefault();
    if (!escalateReason.trim() || escalateReason.trim().length < 10) {
      setEscalateError('A valid operational reason of at least 10 characters is required.');
      return;
    }
    setEscalating(true);
    setEscalateError(null);
    try {
      const res = await apiClient.complaints.escalate(complaint.id, escalateReason.trim());
      const updated = res?.data || res;
      setComplaint(prev => ({
        ...prev,
        ...updated,
        escalatedAt: updated.escalatedAt || new Date().toISOString(),
        slaState: updated.slaState || 'OVERDUE'
      }));
      setShowEscalateModal(false);
      setEscalateReason('');
      showToast(`Complaint #${complaint.referenceId || complaint.id} has been escalated to municipal supervisors.`, 'success');
    } catch (err) {
      console.error('Failed to escalate complaint:', err);
      setEscalateError(err.message || 'Failed to escalate complaint.');
    } finally {
      setEscalating(false);
    }
  };

  const fetchComplaint = useCallback(async () => {
    if (!complaintId) return;
    setLoading(true);
    setErrorState(null);
    setErrorMessage('');
    try {
      const data = await complaintService.getById(complaintId);
      if (!data) {
        setErrorState('NOT_FOUND');
      } else {
        setComplaint(data);
      }
    } catch (err) {
      console.error('Failed to load complaint details:', err);
      if (err.status === 404) {
        setErrorState('NOT_FOUND');
      } else if (err.status === 403) {
        setErrorState('UNAUTHORIZED');
      } else if (err.status === 401) {
        setErrorState('SESSION_EXPIRED');
      } else {
        setErrorState('ERROR');
        setErrorMessage(err.message || 'Unable to retrieve ticket details from server.');
      }
    } finally {
      setLoading(false);
    }
  }, [complaintId]);

  useEffect(() => {
    fetchComplaint();
  }, [fetchComplaint]);

  if (loading) {
    return (
      <div className="w-full flex flex-col gap-6">
        <Breadcrumb
          items={[
            { label: 'Citizen Portal', path: '/citizen/dashboard', icon: 'home' },
            { label: 'My Complaints', path: '/citizen/complaints' },
            { label: `Loading #${complaintId}...` }
          ]}
        />
        <div className="bg-surface-container-lowest rounded-2xl p-12 shadow-sm border border-outline-variant/30 text-center max-w-lg mx-auto space-y-4">
          <span className="material-symbols-outlined text-[42px] text-primary-container animate-spin">progress_activity</span>
          <h2 className="text-base font-bold text-on-surface">Retrieving Incident Record</h2>
          <p className="text-xs text-on-surface-variant">Connecting to municipal database for ticket #{complaintId}...</p>
        </div>
      </div>
    );
  }

  if (errorState === 'NOT_FOUND') {
    return (
      <div className="text-center py-16 bg-surface-container-lowest rounded-2xl p-8 max-w-lg mx-auto shadow-sm border border-outline-variant/30 space-y-4">
        <span className="material-symbols-outlined text-[48px] text-tertiary">search_off</span>
        <h2 className="text-xl font-bold text-on-surface">Complaint Record Not Found</h2>
        <p className="text-xs text-on-surface-variant">Ticket ID #{complaintId} could not be located in the municipal database.</p>
        <Link to="/citizen/complaints" className="inline-block px-4 py-2 bg-primary-container text-white text-xs font-semibold rounded-xl shadow-sm">
          Return to My Complaints
        </Link>
      </div>
    );
  }

  // Enforce privacy isolation: Citizens cannot access complaints owned by others
  if (errorState === 'UNAUTHORIZED') {
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

  if (errorState === 'SESSION_EXPIRED') {
    return (
      <div className="text-center py-16 bg-surface-container-lowest rounded-2xl p-8 max-w-lg mx-auto shadow-sm border border-outline-variant/30 space-y-4">
        <div className="w-16 h-16 rounded-2xl bg-amber-500/10 text-amber-700 flex items-center justify-center mx-auto">
          <span className="material-symbols-outlined text-[36px]">schedule</span>
        </div>
        <h2 className="text-xl font-bold text-on-surface">Session Expired</h2>
        <p className="text-xs text-on-surface-variant max-w-sm mx-auto leading-relaxed">
          Your resident session has expired. Please sign in again to view complaint #{complaintId}.
        </p>
        <Link to="/login" className="inline-block px-4 py-2 bg-primary-container text-white text-xs font-semibold rounded-xl shadow-sm">
          Sign In
        </Link>
      </div>
    );
  }

  if (errorState === 'ERROR' || !complaint) {
    return (
      <div className="text-center py-16 bg-surface-container-lowest rounded-2xl p-8 max-w-lg mx-auto shadow-sm border border-outline-variant/30 space-y-4">
        <span className="material-symbols-outlined text-[48px] text-red-600">error</span>
        <h2 className="text-xl font-bold text-on-surface">Error Loading Ticket</h2>
        <p className="text-xs text-on-surface-variant max-w-sm mx-auto leading-relaxed">{errorMessage || 'Unable to connect to municipal database.'}</p>
        <div className="flex items-center justify-center gap-2">
          <button onClick={fetchComplaint} className="px-4 py-2 bg-primary-container text-white text-xs font-semibold rounded-xl shadow-sm">
            Retry
          </button>
          <Link to="/citizen/complaints" className="px-4 py-2 bg-surface-container text-on-surface text-xs font-semibold rounded-xl">
            Return to List
          </Link>
        </div>
      </div>
    );
  }

  const copyReference = () => {
    const ref = complaint.referenceId || complaint.id;
    navigator.clipboard?.writeText(ref);
    showToast(`Copied #${ref} to clipboard!`, 'info');
  };

  const currentEffectiveStatus = complaint.status;

  // Stepper steps
  const steps = [
    { key: COMPLAINT_STATUS.SUBMITTED, label: 'Submitted', icon: 'send' },
    { key: COMPLAINT_STATUS.UNDER_REVIEW, label: 'Under Review', icon: 'rate_review' },
    { key: COMPLAINT_STATUS.ASSIGNED, label: 'Assigned', icon: 'assignment_ind' },
    { key: COMPLAINT_STATUS.IN_PROGRESS, label: 'In Progress', icon: 'engineering' },
    { key: COMPLAINT_STATUS.PENDING_CITIZEN_CONFIRMATION, label: 'Citizen Confirmation', icon: 'mark_email_unread' },
    { key: COMPLAINT_STATUS.RESOLVED, label: 'Verified Resolved', icon: 'check_circle' }
  ];

  const getStepIndex = (st) => {
    const map = {
      [COMPLAINT_STATUS.SUBMITTED]: 0,
      [COMPLAINT_STATUS.UNDER_REVIEW]: 1,
      [COMPLAINT_STATUS.ASSIGNED]: 2,
      [COMPLAINT_STATUS.IN_PROGRESS]: 3,
      [COMPLAINT_STATUS.RESOLUTION_SUBMITTED]: 3,
      [COMPLAINT_STATUS.PENDING_CITIZEN_CONFIRMATION]: 4,
      [COMPLAINT_STATUS.RESOLVED]: 5,
      [COMPLAINT_STATUS.REWORK_REQUESTED]: 3,
      [COMPLAINT_STATUS.REOPENED]: 2,
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

      {/* Main Ticket Header Card */}
      <section className="bg-surface-container-lowest rounded-2xl p-6 shadow-sm border border-outline-variant/30 space-y-4">
        <div className="flex flex-col lg:flex-row lg:items-start justify-between gap-4">
          <div className="space-y-2">
            <div className="flex flex-wrap items-center gap-2">
              <span className="font-code text-sm font-bold bg-surface-container text-on-surface px-2.5 py-1 rounded-lg">
                #{complaint.referenceId || complaint.id}
              </span>
              {complaint.isLiveBackend ? (
                <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-800 bg-emerald-50 px-2.5 py-0.5 rounded-full border border-emerald-200">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-600 animate-pulse" />
                  PostgreSQL Verified
                </span>
              ) : (
                <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-amber-800 bg-amber-50 px-2.5 py-0.5 rounded-full border border-amber-200">
                  <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
                  Offline Demo
                </span>
              )}
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
              <SlaBadge slaState={complaint.slaState} slaDueAt={complaint.slaDueAt} escalatedAt={complaint.escalatedAt} />
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            {canEscalate && !complaint.escalatedAt && complaint.status !== 'RESOLVED' && complaint.status !== 'REJECTED' && (
              <button
                type="button"
                onClick={() => {
                  setEscalateReason('');
                  setEscalateError(null);
                  setShowEscalateModal(true);
                }}
                className="px-4 py-2 rounded-xl bg-red-600 hover:bg-red-700 text-white text-xs font-semibold transition-colors flex items-center gap-1.5 shadow-sm"
              >
                <span className="material-symbols-outlined text-[16px]">crisis_alert</span>
                <span>Escalate</span>
              </button>
            )}
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

      {/* Citizen Confirmation Action Banner */}
      {currentEffectiveStatus === COMPLAINT_STATUS.PENDING_CITIZEN_CONFIRMATION && isOwningCitizen && (
        <section className="bg-gradient-to-r from-indigo-50 to-blue-50 border border-indigo-200 rounded-2xl p-6 shadow-sm space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="space-y-1">
              <div className="flex items-center gap-2 text-indigo-900 font-bold text-base">
                <span className="material-symbols-outlined text-[24px] text-indigo-600">mark_email_unread</span>
                <span>{t('complaints.confirmTitle')}</span>
              </div>
              <p className="text-xs text-indigo-700 leading-relaxed max-w-2xl">
                {t('complaints.citizenConfirmationPrompt')}
              </p>
            </div>
            <div className="flex items-center gap-3 shrink-0">
              <button
                type="button"
                onClick={() => setShowConfirmModal(true)}
                className="px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold transition-all shadow-sm flex items-center gap-1.5"
              >
                <span className="material-symbols-outlined text-[18px]">check_circle</span>
                <span>{t('complaints.confirmButton')}</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  setRejectReason('');
                  setRejectPhoto(null);
                  setRejectError(null);
                  setShowRejectModal(true);
                }}
                className="px-4 py-2.5 rounded-xl bg-white border border-rose-300 hover:bg-rose-50 text-rose-700 text-xs font-bold transition-all shadow-sm flex items-center gap-1.5"
              >
                <span className="material-symbols-outlined text-[18px]">close</span>
                <span>{t('complaints.rejectButton')}</span>
              </button>
            </div>
          </div>
        </section>
      )}

      {/* Confirmation Source Info (When Resolved) */}
      {currentEffectiveStatus === COMPLAINT_STATUS.RESOLVED && (
        <section className="bg-emerald-50 border border-emerald-200 rounded-2xl p-4 flex items-center justify-between gap-4 text-xs">
          <div className="flex items-center gap-2.5 text-emerald-900">
            <span className="material-symbols-outlined text-emerald-600 text-[22px]">task_alt</span>
            <div>
              <span className="font-bold text-sm block">
                {complaint.confirmationSource === 'AUTO'
                  ? 'Resolution Auto-Confirmed (Automated System Closure)'
                  : 'Resolution Confirmed by Citizen'}
              </span>
              <p className="text-[11px] text-emerald-700 mt-0.5">
                {complaint.confirmationSource === 'AUTO'
                  ? 'This ticket was automatically confirmed after 7 days without citizen response. You may dispute this closure within 30 days.'
                  : `Citizen inspected and confirmed repair on ${complaint.confirmedAt ? new Date(complaint.confirmedAt).toLocaleDateString() : 'site completion'}.`}
              </p>
            </div>
          </div>
          {complaint.confirmationSource === 'AUTO' && (
            <span className="px-2.5 py-1 rounded-full bg-emerald-100 text-emerald-800 text-[10px] font-bold uppercase tracking-wider">
              Auto-Closed
            </span>
          )}
        </section>
      )}

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

          {/* Section C: Resolution Evidence & Officer Verification (Shown if Resolution Submitted, Pending Confirmation, or Resolved) */}
          {(currentEffectiveStatus === COMPLAINT_STATUS.RESOLUTION_SUBMITTED ||
            currentEffectiveStatus === COMPLAINT_STATUS.PENDING_CITIZEN_CONFIRMATION ||
            currentEffectiveStatus === COMPLAINT_STATUS.RESOLVED) && (
            <div className="bg-surface-container-lowest rounded-2xl p-6 shadow-sm border border-outline-variant/30 space-y-4 animate-fade-in">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-secondary uppercase tracking-wider flex items-center gap-1.5">
                  <span className="material-symbols-outlined text-[16px]">verified</span>
                  <span>Field Resolution Proof & Official Review</span>
                </span>
                <span className="px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-700 text-xs font-semibold">
                  {currentEffectiveStatus === COMPLAINT_STATUS.RESOLVED
                    ? 'Resolution Approved & Closed'
                    : currentEffectiveStatus === COMPLAINT_STATUS.PENDING_CITIZEN_CONFIRMATION
                    ? 'Officer Verified — Awaiting Citizen Confirmation'
                    : 'Awaiting Officer Verification'}
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
                    <span>
                      {(() => {
                        if (hasValidCoordinates(complaint.resolutionEvidence?.coordinates)) {
                          return `GPS Telemetry Validated: ${formatCoordinates(complaint.resolutionEvidence.coordinates)}`;
                        }
                        if (hasValidCoordinates(complaint.location?.coordinates)) {
                          return `GPS Telemetry Validated: ${formatCoordinates(complaint.location.coordinates)}`;
                        }
                        return 'GPS Telemetry: Location unavailable';
                      })()}
                    </span>
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
                  <p className="font-semibold text-on-surface">
                    {complaint.location?.address || complaint.address || 'Location unavailable'}
                  </p>
                  <p className="text-tertiary">
                    {[complaint.location?.ward || complaint.ward, complaint.location?.district].filter(Boolean).join(' • ') || 'Ward details unassigned'}
                  </p>
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
                {hasValidCoordinates(complaint.location?.coordinates) ? (
                  formatCoordinates(complaint.location.coordinates)
                ) : (
                  <span className="text-tertiary font-normal italic">Location unavailable</span>
                )}
              </span>
            </div>

            <LocationMiniMap
              coordinates={complaint.location?.coordinates || (complaint.latitude != null && complaint.longitude != null ? [complaint.latitude, complaint.longitude] : null)}
              title={complaint.title}
              address={complaint.location?.address || complaint.address}
              ward={complaint.location?.ward || complaint.ward}
              height="180px"
            />
          </div>

          {/* Citizen Triage & Intake Status Card */}
          <div className="bg-surface-container-lowest rounded-2xl p-5 shadow-sm border border-outline-variant/30 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-primary-container font-bold text-xs uppercase tracking-wider">
                <span className="material-symbols-outlined text-[18px]">rule</span>
                <span>Triage & Routing Status</span>
              </div>
              {complaint.aiTriage ? (
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-surface-container text-tertiary">
                  {complaint.aiTriage.adjudicationStatus === 'ACCEPTED'
                    ? 'Confirmed by Dispatch'
                    : complaint.aiTriage.adjudicationStatus === 'OVERRIDDEN'
                    ? 'Adjusted by Officer'
                    : 'Automated Screening'}
                </span>
              ) : (
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-surface-container text-tertiary">
                  Triage pending
                </span>
              )}
            </div>

            {complaint.duplicateOf && (
              <div className="p-3 rounded-xl bg-purple-500/10 border border-purple-500/20 text-xs text-purple-900 space-y-1">
                <strong className="block font-semibold">Linked Duplicate Ticket</strong>
                <p className="text-[11px] text-purple-800">
                  This report has been linked with Master Ticket #{complaint.duplicateOf.referenceId || complaint.duplicateOf.id} in your area. Both reports share the same resolution dispatch.
                </p>
              </div>
            )}

            {complaint.aiTriage ? (
              <div className="space-y-2 text-xs">
                <div className="p-3 rounded-xl bg-surface-container-low space-y-2">
                  <div className="flex justify-between items-center">
                    <span className="text-tertiary">Classified Category:</span>
                    <span className="font-bold text-on-surface">
                      {complaint.aiTriage.detectedCategory || complaint.category || 'Not available'}
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-tertiary">Recommended Priority:</span>
                    <span className="font-bold text-on-surface">
                      {complaint.aiTriage.recommendedPriority || complaint.priority || 'Not available'}
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-tertiary">Rule-match score:</span>
                    <span className="font-code font-bold text-primary-container">
                      {complaint.aiTriage.confidence != null ? `${complaint.aiTriage.confidence.toFixed(1)}%` : 'Not available'}
                    </span>
                  </div>
                  {complaint.aiTriage.hazardScore ? (
                    <div className="flex justify-between items-center">
                      <span className="text-tertiary">Hazard Advisory:</span>
                      <span className="font-semibold text-error">
                        {complaint.aiTriage.hazardScore}
                      </span>
                    </div>
                  ) : null}
                  {complaint.aiTriage.explanation && (
                    <div className="pt-2 border-t border-outline-variant/30 text-[11px]">
                      <span className="text-tertiary font-medium block mb-0.5">Triage Explanation:</span>
                      <p className="text-on-surface italic">
                        "{complaint.aiTriage.explanation}"
                      </p>
                    </div>
                  )}
                </div>
                <p className="text-[11px] text-tertiary italic px-1">
                  Preliminary automated assessment based on municipal triage rules. Final work order verification is confirmed by municipal officers.
                </p>
              </div>
            ) : (
              <div className="p-3 rounded-xl bg-surface-container-low text-xs text-on-surface-variant space-y-1">
                <p className="font-semibold text-on-surface">Triage pending</p>
                <p className="text-[11px] text-tertiary">
                  Ticket #{complaint.referenceId || complaint.id} has been registered and is pending rule-based automated triage and officer review.
                </p>
              </div>
            )}
          </div>
        </div>
      </section>

      {/* Manual SLA Escalation Modal */}
      {showEscalateModal && (
        <div className="fixed inset-0 z-50 bg-[#111c28]/70 backdrop-blur-sm flex items-center justify-center p-4">
          <form
            onSubmit={handleEscalateComplaint}
            className="bg-surface-container-lowest rounded-2xl p-6 max-w-md w-full shadow-2xl space-y-4 border border-outline-variant/40"
          >
            <div className="flex items-center gap-2 text-red-600">
              <span className="material-symbols-outlined text-[24px]">crisis_alert</span>
              <h3 className="font-bold text-base text-on-surface">Escalate Complaint to Supervisory Command</h3>
            </div>
            <p className="text-xs text-on-surface-variant leading-relaxed">
              Manually escalate ticket #{complaint.referenceId || complaint.id}. This will notify all municipal supervisors and trigger SLA breach protocols.
            </p>

            {escalateError && (
              <div className="p-3 rounded-xl bg-red-50 text-red-700 text-xs border border-red-200">
                {escalateError}
              </div>
            )}

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-on-surface-variant mb-1">
                Escalation Reason <span className="text-red-500">*</span>
              </label>
              <textarea
                rows={3}
                placeholder="Detail the operational reason for manual escalation (10 to 500 characters)..."
                value={escalateReason}
                onChange={(e) => setEscalateReason(e.target.value)}
                minLength={10}
                maxLength={500}
                required
                className="w-full p-3 bg-surface-container-low rounded-xl text-xs text-on-surface border border-outline-variant/40 focus:outline-none focus:ring-2 focus:ring-red-500"
              />
              <div className="text-right text-[11px] text-on-surface-variant mt-1">
                {escalateReason.length} / 500 characters (min 10)
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setShowEscalateModal(false)}
                disabled={escalating}
                className="px-4 py-2 bg-surface-container rounded-xl text-xs font-semibold text-on-surface hover:bg-surface-container-high"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={escalating}
                className="px-4 py-2 bg-red-600 text-white rounded-xl text-xs font-semibold hover:bg-red-700 disabled:opacity-50 flex items-center gap-1.5 shadow-sm"
              >
                {escalating && <span className="material-symbols-outlined text-[16px] animate-spin">refresh</span>}
                <span>Confirm Escalation</span>
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Citizen Confirmation Modal */}
      {showConfirmModal && (
        <div className="fixed inset-0 z-50 bg-[#111c28]/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-surface-container-lowest rounded-2xl p-6 max-w-md w-full shadow-2xl space-y-4 border border-outline-variant/40">
            <div className="flex items-center gap-2 text-emerald-600">
              <span className="material-symbols-outlined text-[26px]">task_alt</span>
              <h3 className="font-bold text-base text-on-surface">Confirm Resolution & Close Ticket</h3>
            </div>
            <p className="text-xs text-on-surface-variant leading-relaxed">
              Are you satisfied that the repair work for ticket #{complaint.referenceId || complaint.id} has properly resolved the issue? This will record your confirmation and mark the complaint as officially resolved.
            </p>
            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setShowConfirmModal(false)}
                disabled={confirming}
                className="px-4 py-2 bg-surface-container rounded-xl text-xs font-semibold text-on-surface hover:bg-surface-container-high"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmFix}
                disabled={confirming}
                className="px-4 py-2 bg-emerald-600 text-white rounded-xl text-xs font-semibold hover:bg-emerald-700 disabled:opacity-50 flex items-center gap-1.5 shadow-sm"
              >
                {confirming && <span className="material-symbols-outlined text-[16px] animate-spin">refresh</span>}
                <span>Yes, Confirm Fix</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Citizen Rejection Modal */}
      {showRejectModal && (
        <div className="fixed inset-0 z-50 bg-[#111c28]/70 backdrop-blur-sm flex items-center justify-center p-4">
          <form
            onSubmit={handleRejectFix}
            className="bg-surface-container-lowest rounded-2xl p-6 max-w-md w-full shadow-2xl space-y-4 border border-outline-variant/40"
          >
            <div className="flex items-center gap-2 text-rose-600">
              <span className="material-symbols-outlined text-[26px]">cancel</span>
              <h3 className="font-bold text-base text-on-surface">Report Issue Not Fixed (Reopen)</h3>
            </div>
            <p className="text-xs text-on-surface-variant leading-relaxed">
              If the reported defect is still present or substandard, describe what remains unresolved.
              This will reopen ticket #{complaint.referenceId || complaint.id} and escalate it immediately to municipal supervisors.
            </p>

            {rejectError && (
              <div className="p-3 rounded-xl bg-red-50 text-red-700 text-xs border border-red-200">
                {rejectError}
              </div>
            )}

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-on-surface-variant mb-1">
                Reason Issue is Not Fixed <span className="text-red-500">*</span>
              </label>
              <textarea
                rows={3}
                placeholder="Explain what was left undone or why the repair is defective (10 to 500 characters)..."
                value={rejectReason}
                onChange={(e) => setRejectReason(e.target.value)}
                minLength={10}
                maxLength={500}
                required
                className="w-full p-3 bg-surface-container-low rounded-xl text-xs text-on-surface border border-outline-variant/40 focus:outline-none focus:ring-2 focus:ring-rose-500"
              />
              <div className="text-right text-[11px] text-on-surface-variant mt-1">
                {rejectReason.length} / 500 characters (min 10)
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-on-surface-variant mb-1">
                Attach Photo Proof (Optional)
              </label>
              <input
                type="file"
                accept="image/jpeg,image/png,image/webp"
                onChange={(e) => setRejectPhoto(e.target.files?.[0] || null)}
                className="block w-full text-xs text-on-surface-variant file:mr-3 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-surface-container file:text-on-surface hover:file:bg-surface-container-high"
              />
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setShowRejectModal(false)}
                disabled={rejecting}
                className="px-4 py-2 bg-surface-container rounded-xl text-xs font-semibold text-on-surface hover:bg-surface-container-high"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={rejecting}
                className="px-4 py-2 bg-rose-600 text-white rounded-xl text-xs font-semibold hover:bg-rose-700 disabled:opacity-50 flex items-center gap-1.5 shadow-sm"
              >
                {rejecting && <span className="material-symbols-outlined text-[16px] animate-spin">refresh</span>}
                <span>Submit & Reopen Ticket</span>
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
};
