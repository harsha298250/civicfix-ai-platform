import React, { useState, useEffect, useCallback } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { useApp } from '../../context/AppContext';
import { officerService, VERIFIED_FIELD_WORKERS } from '../../services/officerService.js';
import { apiClient } from '../../services/apiClient.js';
import { StatusBadge } from '../../components/common/StatusBadge';
import { PriorityBadge } from '../../components/common/PriorityBadge';
import { SlaBadge } from '../../components/common/SlaBadge.jsx';
import { Breadcrumb } from '../../components/common/Breadcrumb';
import { LocationMiniMap } from '../../components/common/LocationMiniMap';
import { hasValidCoordinates, formatCoordinates } from '../../services/complaintService';
import { COMPLAINT_STATUS } from '../../constants/statusConstants';

const CATEGORY_CHOICES = [
  { value: 'ROADS', label: 'Roads & Potholes' },
  { value: 'WATER_SEWERAGE', label: 'Water & Sanitation / Sewerage' },
  { value: 'STREET_LIGHT', label: 'Streetlights & Electrical' },
  { value: 'GARBAGE', label: 'Solid Waste & Illegal Dumping' },
  { value: 'DRAINAGE', label: 'Drainage & Flooding' },
  { value: 'PUBLIC_TRANSPORT', label: 'Signals & Public Transport' },
  { value: 'PARKS', label: 'Public Parks & Tree Hazards' },
  { value: 'GENERAL_MAINTENANCE', label: 'General Civic Maintenance' }
];

const PRIORITY_CHOICES = [
  { value: 'LOW', label: 'LOW — Routine Attention' },
  { value: 'MEDIUM', label: 'MEDIUM — Standard 48h SLA' },
  { value: 'HIGH', label: 'HIGH — Elevated Public Risk' },
  { value: 'CRITICAL', label: 'CRITICAL — Immediate Public Hazard' }
];

const getAdjudicationBadge = (status) => {
  switch (status) {
    case 'ACCEPTED':
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-500/10 text-emerald-700 border border-emerald-500/20">
          <span className="material-symbols-outlined text-[14px]">check_circle</span>
          Accepted by Officer
        </span>
      );
    case 'OVERRIDDEN':
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-blue-500/10 text-blue-700 border border-blue-500/20">
          <span className="material-symbols-outlined text-[14px]">tune</span>
          Overridden by Officer
        </span>
      );
    case 'DISMISSED':
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-gray-500/10 text-gray-700 border border-gray-500/20">
          <span className="material-symbols-outlined text-[14px]">block</span>
          AI Advice Dismissed
        </span>
      );
    case 'PENDING':
    default:
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-amber-500/10 text-amber-700 border border-amber-500/20">
          <span className="material-symbols-outlined text-[14px]">pending</span>
          Pending Officer Review
        </span>
      );
  }
};

export const ComplaintReviewPage = () => {
  const { complaintId } = useParams();
  const navigate = useNavigate();
  const { showToast, currentUser, refreshComplaints } = useApp();

  const [complaint, setComplaint] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isNotFound, setIsNotFound] = useState(false);
  const [isUnauthorized, setIsUnauthorized] = useState(false);

  // Assignment form state
  const [selectedWorkerId, setSelectedWorkerId] = useState('00000000-0000-0000-0000-000000000003'); // Marcus Chen
  const [dispatchNotes, setDispatchNotes] = useState('Immediate hydraulic roller compaction required due to transit bus lane traffic.');
  const [slaWindow, setSlaWindow] = useState('48 Hours');
  const [assigning, setAssigning] = useState(false);
  const [isReassigning, setIsReassigning] = useState(false);
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [rejectReason, setRejectReason] = useState('');
  const [rejecting, setRejecting] = useState(false);

  // Phase 4: AI Triage & Duplicate State
  const [duplicateCandidates, setDuplicateCandidates] = useState([]);
  const [loadingDuplicates, setLoadingDuplicates] = useState(false);
  const [adjudicating, setAdjudicating] = useState(false);
  const [linkingCandidateId, setLinkingCandidateId] = useState(null);
  const [conflictError, setConflictError] = useState(false);

  // Phase 4 Modals
  const [showOverrideModal, setShowOverrideModal] = useState(false);
  const [overrideCategory, setOverrideCategory] = useState('ROADS');
  const [overridePriority, setOverridePriority] = useState('MEDIUM');
  const [overrideNotes, setOverrideNotes] = useState('');

  const [showDismissModal, setShowDismissModal] = useState(false);
  const [dismissNotes, setDismissNotes] = useState('');

  const [showLinkConfirmModal, setShowLinkConfirmModal] = useState(false);
  const [candidateToLink, setCandidateToLink] = useState(null);

  // Manual Escalation State
  const [showEscalateModal, setShowEscalateModal] = useState(false);
  const [escalateReason, setEscalateReason] = useState('');
  const [escalating, setEscalating] = useState(false);
  const [escalateError, setEscalateError] = useState(null);

  const loadDuplicates = async (cid) => {
    if (!cid) return;
    setLoadingDuplicates(true);
    try {
      const list = await officerService.getDuplicateCandidates(cid);
      setDuplicateCandidates(Array.isArray(list) ? list : []);
    } catch (err) {
      console.warn('Failed to load duplicate candidates:', err);
      setDuplicateCandidates([]);
    } finally {
      setLoadingDuplicates(false);
    }
  };

  const fetchComplaintDetail = useCallback(async () => {
    if (!complaintId) {
      setIsNotFound(true);
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    setIsNotFound(false);
    setIsUnauthorized(false);
    setConflictError(false);

    try {
      const data = await officerService.getComplaintDetail(complaintId);
      setComplaint(data);
      if (data) {
        loadDuplicates(data.backendId || data.id);
        setOverrideCategory(data.aiTriage?.detectedCategory || data.category || 'ROADS');
        setOverridePriority(data.aiTriage?.recommendedPriority || data.priority || 'MEDIUM');
      }
    } catch (err) {
      console.error('Failed to load complaint review detail:', err);
      if (err.status === 404 || (err.message && err.message.toLowerCase().includes('not found'))) {
        setIsNotFound(true);
      } else if (err.status === 401 || err.status === 403) {
        setIsUnauthorized(true);
      } else {
        setError(err.message || 'Failed to load complaint details from municipal server.');
      }
    } finally {
      setLoading(false);
    }
  }, [complaintId]);

  useEffect(() => {
    fetchComplaintDetail();
  }, [fetchComplaintDetail]);

  const handleAcceptAiTriage = async () => {
    if (!complaint) return;
    setAdjudicating(true);
    setConflictError(false);
    try {
      const updated = await officerService.adjudicateAiTriage(complaint.backendId || complaint.id, {
        action: 'ACCEPT',
        version: complaint.version
      });
      setComplaint(updated);
      showToast('AI Triage recommendation accepted successfully.', 'success');
      if (refreshComplaints) refreshComplaints();
    } catch (err) {
      console.error('Accept AI Triage failed:', err);
      if (err.status === 409 || String(err.message).includes('409') || String(err.message).toLowerCase().includes('conflict')) {
        setConflictError(true);
        showToast('Conflict: This complaint was modified by another user. Please reload.', 'error');
      } else if (err.status === 401 || err.status === 403) {
        showToast('Authorization denied. Officer privileges required.', 'error');
      } else {
        showToast(err.message || 'Failed to accept AI recommendation.', 'error');
      }
    } finally {
      setAdjudicating(false);
    }
  };

  const handleOverrideAiTriage = async (e) => {
    e?.preventDefault();
    if (!complaint) return;
    setAdjudicating(true);
    setConflictError(false);
    try {
      const updated = await officerService.adjudicateAiTriage(complaint.backendId || complaint.id, {
        action: 'OVERRIDE',
        category: overrideCategory,
        priority: overridePriority,
        notes: overrideNotes || 'Officer override of AI recommendation.',
        version: complaint.version
      });
      setComplaint(updated);
      setShowOverrideModal(false);
      showToast('AI recommendation overridden with officer selections.', 'success');
      if (refreshComplaints) refreshComplaints();
    } catch (err) {
      console.error('Override AI Triage failed:', err);
      if (err.status === 409 || String(err.message).includes('409') || String(err.message).toLowerCase().includes('conflict')) {
        setConflictError(true);
        showToast('Conflict: This complaint was modified by another user. Please reload.', 'error');
      } else if (err.status === 401 || err.status === 403) {
        showToast('Authorization denied. Officer privileges required.', 'error');
      } else {
        showToast(err.message || 'Failed to override AI recommendation.', 'error');
      }
    } finally {
      setAdjudicating(false);
    }
  };

  const handleDismissAiTriage = async (e) => {
    e?.preventDefault();
    if (!complaint) return;
    setAdjudicating(true);
    setConflictError(false);
    try {
      const updated = await officerService.adjudicateAiTriage(complaint.backendId || complaint.id, {
        action: 'DISMISS',
        notes: dismissNotes || 'AI triage advice dismissed by reviewing officer.',
        version: complaint.version
      });
      setComplaint(updated);
      setShowDismissModal(false);
      showToast('AI triage advice dismissed.', 'info');
      if (refreshComplaints) refreshComplaints();
    } catch (err) {
      console.error('Dismiss AI advice failed:', err);
      if (err.status === 409 || String(err.message).includes('409') || String(err.message).toLowerCase().includes('conflict')) {
        setConflictError(true);
        showToast('Conflict: This complaint was modified by another user. Please reload.', 'error');
      } else if (err.status === 401 || err.status === 403) {
        showToast('Authorization denied. Officer privileges required.', 'error');
      } else {
        showToast(err.message || 'Failed to dismiss AI advice.', 'error');
      }
    } finally {
      setAdjudicating(false);
    }
  };

  const handleLinkDuplicate = async () => {
    if (!complaint || !candidateToLink) return;
    setLinkingCandidateId(candidateToLink.id);
    setConflictError(false);
    try {
      const updated = await officerService.linkDuplicateComplaint(complaint.backendId || complaint.id, {
        parentComplaintId: candidateToLink.id,
        reason: `Linked as duplicate of #${candidateToLink.referenceId || candidateToLink.id} by reviewing officer.`,
        version: complaint.version
      });
      setComplaint(updated);
      setShowLinkConfirmModal(false);
      setCandidateToLink(null);
      showToast(`Complaint linked as duplicate of #${candidateToLink.referenceId || candidateToLink.id}.`, 'success');
      if (refreshComplaints) refreshComplaints();
    } catch (err) {
      console.error('Link duplicate failed:', err);
      if (err.status === 409 || String(err.message).includes('409') || String(err.message).toLowerCase().includes('conflict')) {
        setConflictError(true);
        showToast('Conflict: This complaint was modified by another user. Please reload.', 'error');
      } else if (err.status === 401 || err.status === 403) {
        showToast('Authorization denied. Officer privileges required.', 'error');
      } else {
        showToast(err.message || 'Failed to link duplicate complaint.', 'error');
      }
    } finally {
      setLinkingCandidateId(null);
    }
  };

  const handleAssignWorker = async (e) => {
    e.preventDefault();
    if (!complaint) return;
    setAssigning(true);
    try {
      const fullNotes = `${dispatchNotes} (Target SLA: ${slaWindow})`;
      const updated = await officerService.assignWorker(complaint.id, selectedWorkerId, fullNotes);
      setComplaint(updated);
      setIsReassigning(false);

      if (refreshComplaints) {
        refreshComplaints();
      }
      showToast(
        `Work order issued! Ticket #${complaint.referenceId || complaint.id} assigned to ${updated.assignedWorker?.name || 'field technician'}.`,
        'success'
      );
    } catch (err) {
      console.error('Worker assignment failed:', err);
      showToast(err.message || 'Worker assignment failed on backend.', 'error');
    } finally {
      setAssigning(false);
    }
  };

  const handleRejectComplaint = async () => {
    if (!rejectReason.trim()) {
      showToast('Please state a reason for rejecting this intake.', 'error');
      return;
    }
    setRejecting(true);
    try {
      await officerService.rejectComplaint(complaint.id, rejectReason);
      if (refreshComplaints) {
        refreshComplaints();
      }
      setShowRejectModal(false);
      showToast(`Complaint #${complaint.referenceId || complaint.id} marked as Rejected.`, 'info');
      navigate('/officer/complaints');
    } catch (err) {
      console.error('Failed to reject complaint:', err);
      showToast(err.message || 'Failed to reject complaint on backend.', 'error');
    } finally {
      setRejecting(false);
    }
  };

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

  if (loading) {
    return (
      <div className="w-full flex flex-col gap-6">
        <Breadcrumb
          items={[
            { label: 'Operations Command', path: '/officer/dashboard', icon: 'account_balance' },
            { label: 'Complaint Queue', path: '/officer/complaints' },
            { label: 'Loading Ticket...' }
          ]}
        />
        <div className="bg-surface-container-lowest rounded-2xl p-8 border border-outline-variant/30 animate-pulse space-y-6">
          <div className="h-6 w-1/3 bg-surface-container rounded"></div>
          <div className="h-4 w-1/2 bg-surface-container rounded"></div>
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            <div className="lg:col-span-7 h-64 bg-surface-container rounded-2xl"></div>
            <div className="lg:col-span-5 h-64 bg-surface-container rounded-2xl"></div>
          </div>
        </div>
      </div>
    );
  }

  if (isUnauthorized) {
    return (
      <div className="w-full flex flex-col gap-6">
        <Breadcrumb
          items={[
            { label: 'Operations Command', path: '/officer/dashboard', icon: 'account_balance' },
            { label: 'Complaint Queue', path: '/officer/complaints' },
            { label: 'Access Denied' }
          ]}
        />
        <div className="text-center py-16 bg-surface-container-lowest rounded-2xl p-8 max-w-lg mx-auto shadow-sm border border-outline-variant/30 space-y-4">
          <span className="material-symbols-outlined text-[48px] text-error">lock</span>
          <h2 className="text-xl font-bold text-on-surface">Officer Authorization Required</h2>
          <p className="text-xs text-on-surface-variant leading-relaxed">
            You must be authenticated with municipal officer credentials (ROLE_OFFICER) to review complaints and dispatch field personnel.
          </p>
          <Link
            to="/login"
            className="inline-block px-5 py-2.5 bg-primary text-white text-xs font-semibold rounded-xl hover:bg-primary-container shadow-sm transition-colors"
          >
            Sign In with Officer Account
          </Link>
        </div>
      </div>
    );
  }

  if (isNotFound || !complaint) {
    return (
      <div className="w-full flex flex-col gap-6">
        <Breadcrumb
          items={[
            { label: 'Operations Command', path: '/officer/dashboard', icon: 'account_balance' },
            { label: 'Complaint Queue', path: '/officer/complaints' },
            { label: 'Ticket Not Found' }
          ]}
        />
        <div className="text-center py-16 bg-surface-container-lowest rounded-2xl p-8 max-w-lg mx-auto shadow-sm border border-outline-variant/30 space-y-4">
          <span className="material-symbols-outlined text-[48px] text-tertiary">search_off</span>
          <h2 className="text-xl font-bold text-on-surface">Complaint Record Not Found</h2>
          <p className="text-xs text-on-surface-variant leading-relaxed">
            Ticket ID #{complaintId} could not be located in the PostgreSQL database.
          </p>
          <Link
            to="/officer/complaints"
            className="inline-block px-5 py-2.5 bg-primary-container text-white text-xs font-semibold rounded-xl hover:bg-primary shadow-sm transition-colors"
          >
            Return to Complaint Queue
          </Link>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="w-full flex flex-col gap-6">
        <Breadcrumb
          items={[
            { label: 'Operations Command', path: '/officer/dashboard', icon: 'account_balance' },
            { label: 'Complaint Queue', path: '/officer/complaints' },
            { label: 'Error' }
          ]}
        />
        <div className="text-center py-16 bg-surface-container-lowest rounded-2xl p-8 max-w-lg mx-auto shadow-sm border border-outline-variant/30 space-y-4">
          <span className="material-symbols-outlined text-[48px] text-amber-600">warning</span>
          <h2 className="text-xl font-bold text-on-surface">Server Communication Error</h2>
          <p className="text-xs text-on-surface-variant leading-relaxed">{error}</p>
          <button
            type="button"
            onClick={fetchComplaintDetail}
            className="inline-block px-5 py-2.5 bg-primary-container text-white text-xs font-semibold rounded-xl hover:bg-primary shadow-sm transition-colors"
          >
            Retry Connection
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full flex flex-col gap-6">
      <Breadcrumb
        items={[
          { label: 'Operations Command', path: '/officer/dashboard', icon: 'account_balance' },
          { label: 'Complaint Queue', path: '/officer/complaints' },
          { label: `Review #${complaint.referenceId || complaint.id}` }
        ]}
      />

      {/* Header Bar matching Stitch Design */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 pb-2 border-b border-outline-variant/30">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="font-code text-xs font-bold bg-surface-container text-on-surface px-2.5 py-0.5 rounded">
              #{complaint.referenceId || complaint.id}
            </span>
            <StatusBadge status={complaint.status} size="sm" />
            <PriorityBadge priority={complaint.priority} />
            <SlaBadge slaState={complaint.slaState} slaDueAt={complaint.slaDueAt} escalatedAt={complaint.escalatedAt} />
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-500/10 text-emerald-700">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-600"></span>
              PostgreSQL Verified
            </span>
            <span className="text-xs text-on-surface-variant font-code">
              Intake Time: {new Date(complaint.createdAt).toLocaleDateString()}
            </span>
          </div>
          <h1 className="font-headline-lg text-2xl sm:text-3xl font-extrabold text-on-surface tracking-tight">
            Review Civic Complaint — {complaint.title}
          </h1>
          <p className="text-body-md text-sm text-on-surface-variant mt-1">
            Assess submitted report, evaluate triage rule-match score, confirm priority, and dispatch verified field personnel.
          </p>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          {!complaint.escalatedAt && complaint.status !== 'RESOLVED' && complaint.status !== 'REJECTED' && (
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
          <button
            type="button"
            onClick={() => setShowRejectModal(true)}
            className="px-4 py-2 rounded-xl bg-error-container hover:bg-red-200 text-on-error-container text-xs font-semibold transition-colors flex items-center gap-1.5"
          >
            <span className="material-symbols-outlined text-[16px]">cancel</span>
            <span>Reject / Clarify</span>
          </button>
          <Link
            to="/officer/complaints"
            className="px-4 py-2 rounded-xl border border-outline-variant/40 hover:bg-surface-container text-on-surface text-xs font-semibold transition-colors"
          >
            Back to Queue
          </Link>
        </div>
      </div>

      {/* HTTP 409 Concurrent Conflict Banner */}
      {conflictError && (
        <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-xs text-amber-900 flex items-center justify-between shadow-sm">
          <div className="flex items-center gap-3">
            <span className="material-symbols-outlined text-[24px] text-amber-600">sync_problem</span>
            <div>
              <strong className="block font-bold text-amber-950 text-sm">Concurrent Update Conflict (HTTP 409)</strong>
              <span>This complaint was updated by another officer or background process. Please reload to review the latest changes before submitting.</span>
            </div>
          </div>
          <button
            type="button"
            onClick={fetchComplaintDetail}
            className="px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white font-semibold rounded-xl shrink-0 flex items-center gap-1.5 shadow-sm transition-colors"
          >
            <span className="material-symbols-outlined text-[16px]">refresh</span>
            <span>Reload Latest Ticket</span>
          </button>
        </div>
      )}

      {/* Linked Duplicate Parent Banner */}
      {complaint.duplicateOf && (
        <div className="p-4 rounded-2xl bg-purple-500/10 border border-purple-500/30 text-xs text-purple-900 flex items-center gap-3 shadow-sm">
          <span className="material-symbols-outlined text-[24px] text-purple-600">content_copy</span>
          <div>
            <span className="font-bold block uppercase tracking-wider text-[10px] text-purple-700">Linked Duplicate Ticket</span>
            <span>
              This complaint is linked as a duplicate of Master Ticket{' '}
              <strong className="font-code font-bold">#{complaint.duplicateOf.referenceId || complaint.duplicateOf.id}</strong>
              {complaint.duplicateOf.title ? ` (${complaint.duplicateOf.title})` : ''}.
            </span>
          </div>
        </div>
      )}

      {/* Main Review Grid: Left Investigation (7 cols) + Right Worker Assignment (5 cols) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Column: Complaint Details & AI Diagnostics (7 cols) */}
        <div className="lg:col-span-7 space-y-6">
          {/* Section A: Reported Issue Overview Card matching Stitch */}
          <section className="bg-surface-container-lowest rounded-2xl p-6 shadow-sm border border-outline-variant/30 space-y-4">
            <div className="flex items-start justify-between pb-3 border-b border-outline-variant/30">
              <div>
                <span className="px-2.5 py-0.5 rounded-full bg-primary/10 text-primary-container text-xs font-semibold">
                  {complaint.category}
                </span>
                <h2 className="font-headline-sm text-lg font-bold text-on-surface mt-2">{complaint.title}</h2>
                <p className="text-xs text-on-surface-variant flex items-center gap-1 mt-1">
                  <span className="material-symbols-outlined text-[15px] text-tertiary">location_on</span>
                  <span>{complaint.location?.address || complaint.address}</span>
                  {complaint.ward && (
                    <span className="text-tertiary font-code ml-1">({complaint.ward})</span>
                  )}
                </p>
              </div>

              <div className="bg-surface-container-low p-2.5 rounded-xl text-right text-xs">
                <span className="font-semibold text-on-surface block">
                  {complaint.citizen?.name || 'Verified Citizen'}
                </span>
                <span className="text-[10px] text-emerald-600 font-bold">
                  Trust Score: {complaint.citizen?.trustScore || 98}% (Verified)
                </span>
              </div>
            </div>

            <div className="space-y-1">
              <span className="text-xs font-bold text-tertiary uppercase tracking-wider block">
                Reported Citizen Description
              </span>
              <p className="text-body-md text-sm text-on-surface leading-relaxed">
                {complaint.description}
              </p>
            </div>

            {/* Photos */}
            {complaint.photos && complaint.photos.length > 0 && (
              <div className="pt-2">
                <span className="text-xs font-bold text-tertiary uppercase tracking-wider block mb-2">
                  Citizen Media Evidence
                </span>
                <div className="grid grid-cols-2 gap-3">
                  {complaint.photos.map((p, idx) => (
                    <div key={idx} className="rounded-xl overflow-hidden aspect-video bg-surface-container border border-outline-variant/40">
                      <img src={p} alt={`Defect proof ${idx + 1}`} className="w-full h-full object-cover" />
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Geographic Verification Mini-Map */}
            <div className="pt-3 border-t border-outline-variant/30 space-y-2">
              <div className="flex items-center justify-between text-xs">
                <span className="font-bold text-tertiary uppercase tracking-wider">
                  Location & Map Verification
                </span>
                <span className="font-code text-tertiary">
                  {hasValidCoordinates(complaint.location?.coordinates || (complaint.latitude != null && complaint.longitude != null ? [complaint.latitude, complaint.longitude] : null))
                    ? formatCoordinates(complaint.location?.coordinates || [complaint.latitude, complaint.longitude])
                    : 'GPS Unavailable'}
                </span>
              </div>
              <LocationMiniMap
                coordinates={complaint.location?.coordinates || (complaint.latitude != null && complaint.longitude != null ? [complaint.latitude, complaint.longitude] : null)}
                title={complaint.title}
                address={complaint.location?.address || complaint.address}
                ward={complaint.location?.ward || complaint.ward}
                height="190px"
              />
            </div>
          </section>

          {/* Section B: Automated AI Triage & Advisory Card */}
          <section className="bg-surface-container-lowest rounded-2xl p-6 shadow-sm border border-outline-variant/30 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-outline-variant/30">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-primary-container text-white flex items-center justify-center">
                  <span className="material-symbols-outlined text-[18px]">psychology</span>
                </div>
                <div>
                  <h3 className="font-title text-sm font-bold text-on-surface">Automated Triage & Assessment</h3>
                  <span className="text-[10px] text-tertiary font-semibold">Rule-Based Deterministic Engine</span>
                </div>
              </div>
              <div className="flex items-center gap-2 flex-wrap">
                {complaint.aiTriage ? getAdjudicationBadge(complaint.aiTriage.adjudicationStatus) : (
                  <span className="text-[10px] bg-surface-container text-tertiary font-bold px-2 py-0.5 rounded-full">
                    AI triage pending
                  </span>
                )}
                <span className="font-code text-xs text-primary-container font-bold bg-primary/10 px-2.5 py-0.5 rounded-full border border-primary/20">
                  Rule-match score: {complaint.aiTriage?.confidence != null ? `${complaint.aiTriage.confidence.toFixed(1)}%` : 'Not available'}
                </span>
              </div>
            </div>

            {complaint.aiTriage ? (
              <div className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                  <div className="p-3 rounded-xl bg-surface-container-low space-y-1">
                    <span className="text-tertiary block text-[10px] uppercase font-bold tracking-wider">Detected Category</span>
                    <span className="font-bold text-on-surface text-sm">
                      {complaint.aiTriage.detectedCategory || complaint.category || 'Not available'}
                    </span>
                  </div>
                  <div className="p-3 rounded-xl bg-surface-container-low space-y-1">
                    <span className="text-tertiary block text-[10px] uppercase font-bold tracking-wider">Recommended Priority</span>
                    <div className="flex items-center gap-2 mt-0.5">
                      <PriorityBadge priority={complaint.aiTriage.recommendedPriority || complaint.priority} />
                      <span className="text-[11px] text-tertiary font-medium">
                        ({complaint.aiTriage.recommendedPriority || complaint.priority || 'Not available'})
                      </span>
                    </div>
                  </div>
                </div>

                {/* Heuristic match score note */}
                <div className="p-2.5 rounded-xl bg-surface-container-low/60 text-[11px] text-on-surface-variant flex items-center gap-2 border border-outline-variant/20">
                  <span className="material-symbols-outlined text-[16px] text-tertiary shrink-0">info</span>
                  <span>
                    <strong>Rule-match score:</strong> {complaint.aiTriage.confidence != null ? `${complaint.aiTriage.confidence.toFixed(1)}% match` : 'Not available'} based on deterministic keyword and domain lexicon analysis (not a trained probabilistic black-box model).
                  </span>
                </div>

                {/* Hazard Score Alert Banner (if present) */}
                {complaint.aiTriage.hazardScore && (
                  <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/30 text-xs text-red-900 flex items-start gap-2.5">
                    <span className="material-symbols-outlined text-[18px] text-error shrink-0 mt-0.5">crisis_alert</span>
                    <div>
                      <strong className="block font-bold text-red-800 uppercase tracking-wider text-[10px]">
                        Hazard Classification & Safety Warning
                      </strong>
                      <span className="font-semibold">{complaint.aiTriage.hazardScore}</span>
                    </div>
                  </div>
                )}

                {/* Backend Generated Explanation */}
                {complaint.aiTriage.explanation && (
                  <div className="p-3.5 rounded-xl bg-surface-container-low border border-outline-variant/30 space-y-1 text-xs">
                    <span className="text-tertiary block text-[10px] uppercase font-bold tracking-wider">
                      Triage Engine Explanation & Rationale
                    </span>
                    <p className="text-on-surface italic leading-relaxed">
                      "{complaint.aiTriage.explanation}"
                    </p>
                  </div>
                )}

                {/* Officer Adjudication Controls */}
                <div className="pt-2 border-t border-outline-variant/30 flex flex-wrap items-center gap-2">
                  <button
                    type="button"
                    disabled={adjudicating}
                    onClick={handleAcceptAiTriage}
                    className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white rounded-xl text-xs font-semibold flex items-center gap-1.5 shadow-sm transition-all"
                  >
                    {adjudicating ? (
                      <span className="material-symbols-outlined text-[16px] animate-spin">refresh</span>
                    ) : (
                      <span className="material-symbols-outlined text-[16px]">check</span>
                    )}
                    <span>Accept Recommendation</span>
                  </button>

                  <button
                    type="button"
                    disabled={adjudicating}
                    onClick={() => {
                      setOverrideCategory(complaint.aiTriage?.detectedCategory || complaint.category || 'ROADS');
                      setOverridePriority(complaint.aiTriage?.recommendedPriority || complaint.priority || 'MEDIUM');
                      setShowOverrideModal(true);
                    }}
                    className="px-3.5 py-2 bg-primary-container hover:bg-primary disabled:opacity-50 text-white rounded-xl text-xs font-semibold flex items-center gap-1.5 shadow-sm transition-all"
                  >
                    <span className="material-symbols-outlined text-[16px]">tune</span>
                    <span>Override Recommendation</span>
                  </button>

                  <button
                    type="button"
                    disabled={adjudicating}
                    onClick={() => setShowDismissModal(true)}
                    className="px-3.5 py-2 bg-surface-container hover:bg-surface-container-high disabled:opacity-50 text-on-surface rounded-xl text-xs font-semibold flex items-center gap-1.5 border border-outline-variant/40 transition-all"
                  >
                    <span className="material-symbols-outlined text-[16px]">close</span>
                    <span>Dismiss AI Advice</span>
                  </button>
                </div>
              </div>
            ) : (
              <div className="p-4 rounded-xl bg-surface-container-low text-center text-xs text-on-surface-variant space-y-1">
                <span className="material-symbols-outlined text-[24px] text-tertiary">hourglass_empty</span>
                <p className="font-semibold text-on-surface">AI triage pending</p>
                <p>This complaint has not been processed through automated triage or triage is pending. Proceed with manual officer dispatch.</p>
              </div>
            )}
          </section>

          {/* Section C: Spatial & Textual Duplicate Review */}
          <section className="bg-surface-container-lowest rounded-2xl p-6 shadow-sm border border-outline-variant/30 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-outline-variant/30">
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-[20px] text-primary-container">filter_none</span>
                <div>
                  <h3 className="font-title text-sm font-bold text-on-surface">Duplicate Candidate Screening</h3>
                  <span className="text-[10px] text-tertiary font-semibold">Spatial Proximity & Keyword Similarity</span>
                </div>
              </div>
              <span className="text-xs font-code font-bold px-2.5 py-0.5 rounded bg-surface-container text-on-surface">
                {duplicateCandidates.length} Detected
              </span>
            </div>

            {loadingDuplicates ? (
              <div className="p-6 text-center text-xs text-tertiary space-y-2">
                <span className="material-symbols-outlined text-[24px] animate-spin text-primary-container">sync</span>
                <p>Scanning municipal grid for nearby duplicates...</p>
              </div>
            ) : duplicateCandidates.length > 0 ? (
              <div className="space-y-3">
                {duplicateCandidates.map((candidate) => (
                  <div
                    key={candidate.id}
                    className="p-3.5 rounded-xl bg-surface-container-low border border-outline-variant/30 space-y-2 text-xs"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-code font-bold text-on-surface bg-surface-container px-2 py-0.5 rounded text-[11px]">
                            #{candidate.referenceId || String(candidate.id).slice(0, 8)}
                          </span>
                          <span className="font-bold text-on-surface">{candidate.title}</span>
                          <span className="px-2 py-0.5 rounded-full bg-surface-container text-tertiary text-[10px] font-semibold">
                            {candidate.category}
                          </span>
                        </div>
                        <p className="text-[11px] text-on-surface-variant mt-1">
                          {candidate.explanation || 'High spatial proximity and lexical similarity detected.'}
                        </p>
                      </div>

                      <div className="text-right shrink-0">
                        <span className="font-code font-bold text-primary-container block text-[11px]">
                          {Math.round((candidate.similarityScore || 0) * 100)}% Match
                        </span>
                        <span className="text-[10px] text-tertiary block">
                          {candidate.distanceMeters != null ? `${Math.round(candidate.distanceMeters)}m away` : 'Distance N/A'}
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center justify-between pt-2 border-t border-outline-variant/20">
                      <span className="text-[10px] text-tertiary">
                        Reported: {candidate.createdAt ? new Date(candidate.createdAt).toLocaleDateString() : 'Recent'}
                      </span>
                      <button
                        type="button"
                        disabled={linkingCandidateId === candidate.id}
                        onClick={() => {
                          setCandidateToLink(candidate);
                          setShowLinkConfirmModal(true);
                        }}
                        className="px-3 py-1 bg-surface-container hover:bg-primary-container hover:text-white text-on-surface rounded-lg text-xs font-semibold border border-outline-variant/40 transition-colors flex items-center gap-1"
                      >
                        {linkingCandidateId === candidate.id ? (
                          <span className="material-symbols-outlined text-[14px] animate-spin">refresh</span>
                        ) : (
                          <span className="material-symbols-outlined text-[14px]">link</span>
                        )}
                        <span>Link as Duplicate</span>
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="p-4 rounded-xl bg-surface-container-low text-center text-xs text-on-surface-variant flex items-center justify-center gap-2">
                <span className="material-symbols-outlined text-[18px] text-emerald-600">verified</span>
                <span>No spatial or textual duplicates detected within screening radius (Direct Dispatch Eligible).</span>
              </div>
            )}
          </section>

          {/* Section C: Immutable Audit History / Progress Notes */}
          {complaint.progressNotes && complaint.progressNotes.length > 0 && (
            <section className="bg-surface-container-lowest rounded-2xl p-6 shadow-sm border border-outline-variant/30 space-y-4">
              <div className="flex items-center justify-between pb-2 border-b border-outline-variant/30">
                <div className="flex items-center gap-2">
                  <span className="material-symbols-outlined text-[18px] text-primary">history</span>
                  <h3 className="font-title text-sm font-bold text-on-surface">Audit & Status History</h3>
                </div>
                <span className="text-[10px] font-mono text-tertiary">PostgreSQL Recorded</span>
              </div>
              <div className="space-y-3">
                {complaint.progressNotes.map((note, idx) => (
                  <div key={idx} className="p-3 rounded-xl bg-surface-container-low text-xs space-y-1 border-l-2 border-primary">
                    <div className="flex items-center justify-between text-[11px] text-tertiary">
                      <span className="font-bold text-on-surface">{note.author || 'Municipal Dispatch'}</span>
                      <span>{note.timestamp ? new Date(note.timestamp).toLocaleString() : 'Recorded'}</span>
                    </div>
                    <p className="text-on-surface">{note.note}</p>
                    {note.status && (
                      <span className="inline-block text-[10px] font-bold px-1.5 py-0.5 rounded bg-surface-container text-tertiary">
                        State: {note.status}
                      </span>
                    )}
                  </div>
                ))}
              </div>
            </section>
          )}
        </div>

        {/* Right Column: Worker Assignment & Dispatch Engine (5 cols) */}
        <div className="lg:col-span-5 bg-surface-container-lowest rounded-2xl p-6 shadow-sm border border-outline-variant/30 space-y-5">
          <div className="flex items-center justify-between pb-2 border-b border-outline-variant/30">
            <div>
              <h3 className="font-title text-base font-bold text-on-surface">
                {complaint.assignedWorker && !isReassigning ? 'Dispatched Field Personnel' : 'Worker Assignment & Dispatch'}
              </h3>
              <p className="text-xs text-on-surface-variant">
                {complaint.assignedWorker && !isReassigning
                  ? 'Field work order active and monitored in municipal ledger'
                  : 'Allocate rapid field crew and set SLA resolution deadline'}
              </p>
            </div>
            <span className="material-symbols-outlined text-primary-container text-[24px]">
              {complaint.assignedWorker && !isReassigning ? 'badge' : 'send_and_archive'}
            </span>
          </div>

          {complaint.assignedWorker && !isReassigning ? (
            /* Already Assigned Summary Card */
            <div className="space-y-4">
              <div className="p-4 rounded-xl bg-surface-container-low border border-primary-container/30 space-y-3">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-primary-container text-white flex items-center justify-center font-bold text-sm">
                      {(complaint.assignedWorker?.name || 'Worker').split(' ').filter(Boolean).map(n => n[0]).join('')}
                    </div>
                    <div>
                      <h4 className="font-bold text-sm text-on-surface">{complaint.assignedWorker?.name || 'Assigned Field Crew'}</h4>
                      <p className="text-xs text-tertiary">{complaint.assignedWorker?.unit || 'Rapid Response Maintenance'}</p>
                    </div>
                  </div>
                  <span className="px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 text-[10px] font-bold uppercase tracking-wider">
                    Crew Assigned
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-2 pt-2 border-t border-outline-variant/30 text-xs">
                  <div>
                    <span className="text-tertiary block text-[10px] uppercase">Current State</span>
                    <div className="mt-0.5">
                      <StatusBadge status={complaint.status} size="sm" />
                    </div>
                  </div>
                  <div>
                    <span className="text-tertiary block text-[10px] uppercase">Target Completion</span>
                    <span className="font-semibold text-on-surface">
                      {complaint.assignedWorker.estimatedCompletion || 'Within 48 Hours'}
                    </span>
                  </div>
                </div>

                {complaint.progressNotes && complaint.progressNotes.length > 0 && (
                  <div className="pt-2 border-t border-outline-variant/30">
                    <span className="text-tertiary block text-[10px] uppercase mb-1">Latest Field Crew Update:</span>
                    <p className="text-xs text-on-surface bg-surface-container p-2 rounded-lg italic">
                      "{complaint.progressNotes[complaint.progressNotes.length - 1].note}"
                    </p>
                  </div>
                )}
              </div>

              {/* Resolution Evidence Location Summary */}
              {complaint.resolutionEvidence && (
                <div className="p-3.5 rounded-xl bg-surface-container-low border border-outline-variant/30 space-y-2 text-xs">
                  <div className="flex items-center justify-between flex-wrap gap-2">
                    <span className="font-bold text-on-surface flex items-center gap-1.5">
                      <span className="material-symbols-outlined text-[16px] text-primary">pin_drop</span>
                      <span>Evidence Location Check:</span>
                    </span>
                    {complaint.resolutionEvidence.locationCheck === 'WITHIN_RANGE' && (
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-300 flex items-center gap-1">
                        <span className="material-symbols-outlined text-[12px]">check_circle</span>
                        WITHIN RANGE ({complaint.resolutionEvidence.distanceMeters != null ? `${complaint.resolutionEvidence.distanceMeters}m` : 'Verified'})
                      </span>
                    )}
                    {complaint.resolutionEvidence.locationCheck === 'OUT_OF_RANGE' && (
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-rose-100 text-rose-800 border border-rose-300 flex items-center gap-1">
                        <span className="material-symbols-outlined text-[12px]">warning</span>
                        OUT OF RANGE ({complaint.resolutionEvidence.distanceMeters != null ? `${complaint.resolutionEvidence.distanceMeters}m` : 'Flagged'})
                      </span>
                    )}
                    {complaint.resolutionEvidence.locationCheck === 'LOW_ACCURACY' && (
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-100 text-amber-800 border border-amber-300 flex items-center gap-1">
                        <span className="material-symbols-outlined text-[12px]">gps_not_fixed</span>
                        LOW ACCURACY (±{complaint.resolutionEvidence.accuracyMeters != null ? `${complaint.resolutionEvidence.accuracyMeters}m` : 'Low precision'})
                      </span>
                    )}
                    {complaint.resolutionEvidence.locationCheck === 'NOT_PROVIDED' && (
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-100 text-slate-800 border border-slate-300 flex items-center gap-1">
                        <span className="material-symbols-outlined text-[12px]">location_off</span>
                        NOT PROVIDED
                      </span>
                    )}
                    {(!complaint.resolutionEvidence.locationCheck || complaint.resolutionEvidence.locationCheck === 'NOT_CHECKABLE') && (
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-100 text-slate-700 border border-slate-300 flex items-center gap-1">
                        <span className="material-symbols-outlined text-[12px]">help_outline</span>
                        NOT CHECKABLE
                      </span>
                    )}
                  </div>
                  <p className="text-[10px] text-on-surface-variant italic">
                    Location is reported by the worker's device and can be inaccurate; it supports, but does not replace, your review.
                  </p>
                  {complaint.resolutionEvidence.locationNote && (
                    <div className="p-2 rounded bg-surface-container-lowest border border-outline-variant/20">
                      <span className="text-[10px] font-bold text-tertiary block">Worker Note:</span>
                      <p className="text-xs text-on-surface">"{complaint.resolutionEvidence.locationNote}"</p>
                    </div>
                  )}
                </div>
              )}

              {/* Resolution Ready CTA */}
              {complaint.status === COMPLAINT_STATUS.RESOLUTION_SUBMITTED && (
                <div className="p-4 rounded-xl bg-secondary/10 border border-secondary/30 space-y-2">
                  <div className="flex items-center gap-2 text-secondary font-bold text-xs">
                    <span className="material-symbols-outlined text-[18px]">verified</span>
                    <span>Repair Completed & Evidence Ready For Audit</span>
                  </div>
                  <p className="text-xs text-on-surface-variant">
                    Technician has submitted photo proof. Proceed to verification to sign off on closure.
                  </p>
                  <Link
                    to={`/officer/verifications/${complaint.id}`}
                    className="w-full py-2.5 bg-secondary hover:bg-secondary-container text-white text-xs font-semibold rounded-xl transition-colors flex items-center justify-center gap-1.5 shadow-sm mt-1"
                  >
                    <span>Audit Evidence & Certify Resolution</span>
                    <span className="material-symbols-outlined text-[16px]">arrow_forward</span>
                  </Link>
                </div>
              )}

              {/* Awaiting Citizen Confirmation Notice */}
              {complaint.status === COMPLAINT_STATUS.PENDING_CITIZEN_CONFIRMATION && (
                <div className="p-4 rounded-xl bg-indigo-50 border border-indigo-200 text-indigo-900 space-y-2 text-xs">
                  <div className="flex items-center gap-2 font-bold">
                    <span className="material-symbols-outlined text-[18px] text-indigo-600">mark_email_unread</span>
                    <span>Awaiting Resident Confirmation</span>
                  </div>
                  <p className="text-[11px] text-indigo-800">
                    Resolution proof has been verified. The ticket is currently awaiting resident site confirmation or automated closure after 7 days.
                  </p>
                </div>
              )}

              {/* Reopened Alert */}
              {complaint.status === COMPLAINT_STATUS.REOPENED && (
                <div className="p-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-900 space-y-2 text-xs">
                  <div className="flex items-center gap-2 font-bold">
                    <span className="material-symbols-outlined text-[18px] text-rose-600">crisis_alert</span>
                    <span>Fix Rejected by Citizen & Escalated</span>
                  </div>
                  <p className="text-[11px] text-rose-800">
                    The citizen reported that the problem was not fixed. The complaint has been escalated and requires reassigning a rapid maintenance crew.
                  </p>
                </div>
              )}

              {/* Action Buttons: Reassign */}
              <div className="pt-2">
                <button
                  type="button"
                  onClick={() => setIsReassigning(true)}
                  className="w-full py-2.5 bg-surface-container hover:bg-surface-container-high text-on-surface text-xs font-semibold rounded-xl border border-outline-variant/40 transition-colors flex items-center justify-center gap-2"
                >
                  <span className="material-symbols-outlined text-[16px]">swap_horiz</span>
                  <span>Reassign Work Order to Different Crew</span>
                </button>
              </div>
            </div>
          ) : (
            /* Assignment / Reassignment Form */
            <form onSubmit={handleAssignWorker} className="space-y-4">
              {isReassigning && (
                <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-900 flex items-center justify-between">
                  <span>Reassigning from <strong>{complaint.assignedWorker?.name || 'Current Crew'}</strong></span>
                  <button
                    type="button"
                    onClick={() => setIsReassigning(false)}
                    className="text-amber-800 font-bold underline text-xs"
                  >
                    Cancel
                  </button>
                </div>
              )}

              {/* Field Crew Selector */}
              <div className="space-y-2">
                <label className="block text-xs font-semibold text-on-surface">
                  Select Rapid Maintenance Crew *
                </label>
                <div className="space-y-2">
                  {VERIFIED_FIELD_WORKERS.map((worker) => (
                    <label
                      key={worker.id}
                      className={`block p-3.5 rounded-xl border cursor-pointer transition-all ${
                        selectedWorkerId === worker.id
                          ? 'border-primary-container bg-surface-container-low ring-1 ring-primary-container shadow-sm'
                          : 'border-outline-variant/40 hover:bg-surface-container-low/40'
                      }`}
                    >
                      <div className="flex items-start gap-2.5">
                        <input
                          type="radio"
                          name="workerRadio"
                          value={worker.id}
                          checked={selectedWorkerId === worker.id}
                          onChange={() => setSelectedWorkerId(worker.id)}
                          className="mt-1 text-primary-container accent-primary-container"
                        />
                        <div className="flex-1 min-w-0 text-xs">
                          <div className="flex justify-between items-center">
                            <span className="font-bold text-on-surface">{worker.name}</span>
                            <span className="text-[10px] text-emerald-600 font-semibold">{worker.status}</span>
                          </div>
                          <p className="text-tertiary mt-0.5">{worker.unit || worker.department}</p>
                          <p className="text-[11px] text-on-surface-variant font-code mt-0.5">{worker.rig || 'Mobile Response Van'}</p>
                        </div>
                      </div>
                    </label>
                  ))}
                </div>
              </div>

              {/* Target SLA Window */}
              <div className="space-y-1">
                <label className="block text-xs font-semibold text-on-surface">
                  Target Resolution SLA Window
                </label>
                <select
                  value={slaWindow}
                  onChange={(e) => setSlaWindow(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-surface-container-low rounded-xl text-xs text-on-surface border border-transparent focus:border-primary-container font-semibold"
                >
                  <option value="24 Hours">24 Hours (Urgent Hazard P1)</option>
                  <option value="48 Hours">48 Hours (Standard Defect P2)</option>
                  <option value="72 Hours">72 Hours (Routine Maintenance P3)</option>
                </select>
              </div>

              {/* Dispatch Instructions */}
              <div className="space-y-1">
                <label className="block text-xs font-semibold text-on-surface">
                  Instructions for Crew Lead
                </label>
                <textarea
                  rows={3}
                  value={dispatchNotes}
                  onChange={(e) => setDispatchNotes(e.target.value)}
                  placeholder="Specific directions, safety perimeter requirements, equipment..."
                  className="w-full px-3.5 py-2.5 bg-surface-container-low rounded-xl text-xs text-on-surface placeholder:text-outline border border-transparent focus:border-primary-container focus:outline-none"
                />
              </div>

              <div className="flex items-center gap-2 mt-4">
                {isReassigning && (
                  <button
                    type="button"
                    onClick={() => setIsReassigning(false)}
                    className="w-1/3 py-3 bg-surface-container hover:bg-surface-container-high text-on-surface font-semibold text-xs rounded-xl transition-all"
                  >
                    Cancel
                  </button>
                )}
                <button
                  type="submit"
                  disabled={assigning}
                  className={`py-3 bg-primary-container hover:bg-primary text-white font-semibold text-xs rounded-xl shadow-md transition-all flex items-center justify-center gap-2 ${
                    isReassigning ? 'w-2/3' : 'w-full'
                  }`}
                >
                  {assigning ? (
                    <>
                      <span className="material-symbols-outlined text-[18px] animate-spin">refresh</span>
                      <span>Issuing Work Order...</span>
                    </>
                  ) : (
                    <>
                      <span className="material-symbols-outlined text-[18px]">send</span>
                      <span>{isReassigning ? 'Confirm Reassignment' : 'Confirm Assignment & Deploy Crew'}</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          )}
        </div>
      </div>

      {/* Reject Modal */}
      {showRejectModal && (
        <div className="fixed inset-0 z-50 bg-[#111c28]/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-surface-container-lowest rounded-2xl p-6 max-w-md w-full shadow-2xl space-y-4 border border-outline-variant/40">
            <div className="flex items-center gap-2 text-error">
              <span className="material-symbols-outlined text-[24px]">warning</span>
              <h3 className="font-bold text-base text-on-surface">Reject Complaint Intake</h3>
            </div>
            <p className="text-xs text-on-surface-variant leading-relaxed">
              State a clear reason for turning down ticket #{complaint.referenceId || complaint.id}. This note will be recorded in the public ledger and sent to the reporter.
            </p>
            <textarea
              rows={3}
              placeholder="e.g. Outside municipal jurisdiction, private property road, or duplicate..."
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
              className="w-full p-3 bg-surface-container-low rounded-xl text-xs text-on-surface border border-outline-variant/40 focus:outline-none"
            />
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
                type="button"
                onClick={handleRejectComplaint}
                disabled={rejecting}
                className="px-4 py-2 bg-error text-white rounded-xl text-xs font-semibold hover:bg-red-700 disabled:opacity-50 flex items-center gap-1.5"
              >
                {rejecting && <span className="material-symbols-outlined text-[16px] animate-spin">refresh</span>}
                <span>Confirm Rejection</span>
              </button>
            </div>
          </div>
        </div>
      )}

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
      {/* Phase 4: Override AI Recommendation Modal */}
      {showOverrideModal && (
        <div className="fixed inset-0 z-50 bg-[#111c28]/70 backdrop-blur-sm flex items-center justify-center p-4">
          <form
            onSubmit={handleOverrideAiTriage}
            className="bg-surface-container-lowest rounded-2xl p-6 max-w-lg w-full shadow-2xl space-y-4 border border-outline-variant/40"
          >
            <div className="flex items-center gap-2 text-primary-container">
              <span className="material-symbols-outlined text-[24px]">tune</span>
              <h3 className="font-bold text-base text-on-surface">Override AI Triage Recommendation</h3>
            </div>
            <p className="text-xs text-on-surface-variant leading-relaxed">
              Manually set the operational category and priority for Ticket #{complaint.referenceId || complaint.id}. The officer decision and reasoning will be recorded in the audit history.
            </p>

            <div className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-on-surface mb-1">
                  Validated Municipal Category *
                </label>
                <select
                  value={overrideCategory}
                  onChange={(e) => setOverrideCategory(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-surface-container-low rounded-xl text-xs text-on-surface border border-outline-variant/40 focus:border-primary-container font-semibold"
                >
                  {CATEGORY_CHOICES.map((c) => (
                    <option key={c.value} value={c.value}>
                      {c.label}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-on-surface mb-1">
                  Validated Priority Level *
                </label>
                <select
                  value={overridePriority}
                  onChange={(e) => setOverridePriority(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-surface-container-low rounded-xl text-xs text-on-surface border border-outline-variant/40 focus:border-primary-container font-semibold"
                >
                  {PRIORITY_CHOICES.map((p) => (
                    <option key={p.value} value={p.value}>
                      {p.label}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-on-surface mb-1">
                  Reason for Override
                </label>
                <textarea
                  rows={3}
                  value={overrideNotes}
                  onChange={(e) => setOverrideNotes(e.target.value)}
                  placeholder="e.g. Field inspection reveals structural sewer line collapse rather than surface runoff..."
                  className="w-full p-3 bg-surface-container-low rounded-xl text-xs text-on-surface border border-outline-variant/40 focus:outline-none"
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-outline-variant/30">
              <button
                type="button"
                onClick={() => setShowOverrideModal(false)}
                disabled={adjudicating}
                className="px-4 py-2 bg-surface-container rounded-xl text-xs font-semibold text-on-surface hover:bg-surface-container-high"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={adjudicating}
                className="px-4 py-2 bg-primary-container text-white rounded-xl text-xs font-semibold hover:bg-primary disabled:opacity-50 flex items-center gap-1.5 shadow-sm"
              >
                {adjudicating && <span className="material-symbols-outlined text-[16px] animate-spin">refresh</span>}
                <span>Confirm Override</span>
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Phase 4: Dismiss AI Advice Modal */}
      {showDismissModal && (
        <div className="fixed inset-0 z-50 bg-[#111c28]/70 backdrop-blur-sm flex items-center justify-center p-4">
          <form
            onSubmit={handleDismissAiTriage}
            className="bg-surface-container-lowest rounded-2xl p-6 max-w-md w-full shadow-2xl space-y-4 border border-outline-variant/40"
          >
            <div className="flex items-center gap-2 text-tertiary">
              <span className="material-symbols-outlined text-[24px]">block</span>
              <h3 className="font-bold text-base text-on-surface">Dismiss AI Triage Advice</h3>
            </div>
            <p className="text-xs text-on-surface-variant leading-relaxed">
              Dismiss automated triage advice for Ticket #{complaint.referenceId || complaint.id}. The complaint will be processed manually without automated recommendations.
            </p>

            <div>
              <label className="block text-xs font-semibold text-on-surface mb-1">
                Reason for Dismissal
              </label>
              <textarea
                rows={3}
                value={dismissNotes}
                onChange={(e) => setDismissNotes(e.target.value)}
                placeholder="e.g. Heuristic keywords misclassified noise complaint as road defect..."
                className="w-full p-3 bg-surface-container-low rounded-xl text-xs text-on-surface border border-outline-variant/40 focus:outline-none"
              />
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-outline-variant/30">
              <button
                type="button"
                onClick={() => setShowDismissModal(false)}
                disabled={adjudicating}
                className="px-4 py-2 bg-surface-container rounded-xl text-xs font-semibold text-on-surface hover:bg-surface-container-high"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={adjudicating}
                className="px-4 py-2 bg-tertiary text-white rounded-xl text-xs font-semibold hover:bg-gray-700 disabled:opacity-50 flex items-center gap-1.5 shadow-sm"
              >
                {adjudicating && <span className="material-symbols-outlined text-[16px] animate-spin">refresh</span>}
                <span>Confirm Dismissal</span>
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Phase 4: Confirm Link Duplicate Modal */}
      {showLinkConfirmModal && candidateToLink && (
        <div className="fixed inset-0 z-50 bg-[#111c28]/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-surface-container-lowest rounded-2xl p-6 max-w-md w-full shadow-2xl space-y-4 border border-outline-variant/40">
            <div className="flex items-center gap-2 text-primary-container">
              <span className="material-symbols-outlined text-[24px]">link</span>
              <h3 className="font-bold text-base text-on-surface">Confirm Duplicate Ticket Link</h3>
            </div>
            <p className="text-xs text-on-surface-variant leading-relaxed">
              You are about to link Ticket <strong className="text-on-surface">#{complaint.referenceId || complaint.id}</strong> as a duplicate of Master Ticket:
            </p>

            <div className="p-3.5 rounded-xl bg-surface-container-low border border-outline-variant/30 space-y-1 text-xs">
              <div className="flex items-center justify-between">
                <span className="font-code font-bold text-on-surface">
                  #{candidateToLink.referenceId || String(candidateToLink.id).slice(0, 8)}
                </span>
                <span className="font-code text-primary-container font-semibold">
                  {Math.round((candidateToLink.similarityScore || 0) * 100)}% Match
                </span>
              </div>
              <p className="font-semibold text-on-surface">{candidateToLink.title}</p>
              <p className="text-[11px] text-tertiary">
                {candidateToLink.category} • {candidateToLink.distanceMeters != null ? `${Math.round(candidateToLink.distanceMeters)}m away` : 'Distance N/A'}
              </p>
            </div>

            <p className="text-[11px] text-tertiary">
              Linking will associate this complaint with the master work order to prevent redundant dispatch.
            </p>

            <div className="flex justify-end gap-2 pt-2 border-t border-outline-variant/30">
              <button
                type="button"
                onClick={() => {
                  setShowLinkConfirmModal(false);
                  setCandidateToLink(null);
                }}
                disabled={linkingCandidateId !== null}
                className="px-4 py-2 bg-surface-container rounded-xl text-xs font-semibold text-on-surface hover:bg-surface-container-high"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleLinkDuplicate}
                disabled={linkingCandidateId !== null}
                className="px-4 py-2 bg-primary-container text-white rounded-xl text-xs font-semibold hover:bg-primary disabled:opacity-50 flex items-center gap-1.5 shadow-sm"
              >
                {linkingCandidateId !== null && (
                  <span className="material-symbols-outlined text-[16px] animate-spin">refresh</span>
                )}
                <span>Confirm & Link Duplicate</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ComplaintReviewPage;
