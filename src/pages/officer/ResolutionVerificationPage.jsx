import React, { useState, useEffect, useCallback } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { useApp } from '../../context/AppContext';
import { officerService } from '../../services/officerService';
import { StatusBadge } from '../../components/common/StatusBadge';
import { Breadcrumb } from '../../components/common/Breadcrumb';
import { COMPLAINT_STATUS } from '../../constants/statusConstants';

export const ResolutionVerificationPage = () => {
  const { complaintId } = useParams();
  const navigate = useNavigate();
  const { refreshComplaints, showToast, currentUser } = useApp();

  const [complaint, setComplaint] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [actionError, setActionError] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  const [approvalNotes, setApprovalNotes] = useState('On-site compaction verified via dual-angle photo proof. Cast-iron seal conforms to municipal standards.');
  const [locationAcknowledgement, setLocationAcknowledgement] = useState('');
  const [reworkNotes, setReworkNotes] = useState('');
  const [showReworkModal, setShowReworkModal] = useState(false);
  const [approvedState, setApprovedState] = useState(false);

  const [activeCitizenPhotoIdx, setActiveCitizenPhotoIdx] = useState(0);
  const [activeAfterPhotoIdx, setActiveAfterPhotoIdx] = useState(0);

  const fetchDetail = useCallback(async () => {
    if (!complaintId) return;
    setLoading(true);
    setError(null);
    try {
      const data = await officerService.getVerificationDetail(complaintId);
      setComplaint(data);
      setApprovedState(data.status === COMPLAINT_STATUS.RESOLVED);
    } catch (err) {
      console.error('Failed to load verification record:', err);
      setError(err.message || `Complaint record #${complaintId} could not be located in the verification queue.`);
    } finally {
      setLoading(false);
    }
  }, [complaintId]);

  useEffect(() => {
    fetchDetail();
  }, [fetchDetail]);

  const citizenPhotos = complaint?.photos || [];
  const evidencePhotos = complaint?.resolutionEvidence?.photos || [];
  const beforePhoto = citizenPhotos[activeCitizenPhotoIdx] || null;
  const afterPhoto = evidencePhotos[activeAfterPhotoIdx] || null;

  // Retrieve device reported coordinates and location verification check
  const deviceCoords = complaint?.resolutionEvidence?.coordinates ||
    (complaint?.resolutionEvidence?.latitude != null && complaint?.resolutionEvidence?.longitude != null
      ? { lat: Number(complaint.resolutionEvidence.latitude), lng: Number(complaint.resolutionEvidence.longitude) }
      : null);

  const locationCheck = complaint?.resolutionEvidence?.locationCheck || 'NOT_CHECKABLE';
  const distanceMeters = complaint?.resolutionEvidence?.distanceMeters;
  const accuracyMeters = complaint?.resolutionEvidence?.accuracyMeters;
  const workerLocationNote = complaint?.resolutionEvidence?.locationNote;
  const isFlaggedLocation = locationCheck !== 'WITHIN_RANGE';

  const handleApprove = async () => {
    if (!complaint) return;
    setActionError(null);

    if (isFlaggedLocation) {
      const ack = locationAcknowledgement.trim();
      if (!ack || ack.length < 10 || ack.length > 500) {
        setActionError(`Resolution evidence location check is ${locationCheck}. An approval acknowledgement between 10 and 500 characters is required.`);
        return;
      }
    }

    setSubmitting(true);
    try {
      const updated = await officerService.verifyResolution(
        complaint.referenceId || complaint.id,
        'APPROVE',
        approvalNotes,
        locationAcknowledgement.trim()
      );
      setComplaint(updated);
      setApprovedState(true);
      await refreshComplaints();
      showToast(`Ticket #${complaint.referenceId || complaint.id} successfully verified & transitioned to PENDING_CITIZEN_CONFIRMATION!`, 'success');
    } catch (err) {
      console.error('Approval failed:', err);
      setActionError(err.message || 'Approval action rejected by server.');
      showToast(err.message || 'Approval failed.', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const handleRequestRework = async () => {
    if (!reworkNotes.trim()) {
      setActionError('A meaningful reason is required when requesting rework.');
      return;
    }
    if (!complaint) return;
    setActionError(null);
    setSubmitting(true);
    try {
      const updated = await officerService.verifyResolution(
        complaint.referenceId || complaint.id,
        'REQUEST_REWORK',
        reworkNotes
      );
      setComplaint(updated);
      await refreshComplaints();
      setShowReworkModal(false);
      showToast(`Rework order returned to crew for Ticket #${complaint.referenceId || complaint.id}`, 'info');
      navigate('/officer/verifications');
    } catch (err) {
      console.error('Rework request failed:', err);
      setActionError(err.message || 'Failed to request rework on server.');
      showToast(err.message || 'Action failed.', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="w-full flex flex-col gap-6">
        <Breadcrumb
          items={[
            { label: 'Operations Command', path: '/officer/dashboard', icon: 'account_balance' },
            { label: 'Verification Queue', path: '/officer/verifications' },
            { label: `Loading #${complaintId}...` }
          ]}
        />
        <div className="text-center py-20 bg-surface-container-lowest rounded-2xl p-8 max-w-lg mx-auto shadow-sm border border-outline-variant/30 space-y-4">
          <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto" />
          <h2 className="text-lg font-bold text-on-surface">Retrieving Repair Evidence...</h2>
          <p className="text-xs text-on-surface-variant">
            Fetching ticket #{complaintId} and field crew photographic proofs from the secure database.
          </p>
        </div>
      </div>
    );
  }

  if (error || !complaint) {
    return (
      <div className="w-full flex flex-col gap-6">
        <Breadcrumb
          items={[
            { label: 'Operations Command', path: '/officer/dashboard', icon: 'account_balance' },
            { label: 'Verification Queue', path: '/officer/verifications' },
            { label: 'Record Not Found' }
          ]}
        />
        <div className="text-center py-16 bg-surface-container-lowest rounded-2xl p-8 max-w-lg mx-auto shadow-sm border border-outline-variant/30 space-y-4">
          <span className="material-symbols-outlined text-[48px] text-tertiary">search_off</span>
          <h2 className="text-xl font-bold text-on-surface">Verification Record Not Found</h2>
          <p className="text-xs text-on-surface-variant leading-relaxed">
            {error || `Complaint ticket #${complaintId} could not be located in the verification queue.`}
          </p>
          <div className="flex items-center justify-center gap-3 pt-2">
            <button
              type="button"
              onClick={fetchDetail}
              className="px-4 py-2 bg-secondary text-white text-xs font-semibold rounded-xl hover:bg-secondary-container transition-colors shadow-sm"
            >
              Retry
            </button>
            <Link
              to="/officer/verifications"
              className="px-4 py-2 bg-surface-container text-on-surface text-xs font-semibold rounded-xl hover:bg-surface-container-high border border-outline-variant/40 transition-colors"
            >
              Return to Verification Queue
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full flex flex-col gap-6">
      <Breadcrumb
        items={[
          { label: 'Operations Command', path: '/officer/dashboard', icon: 'account_balance' },
          { label: 'Verification Queue', path: '/officer/verifications' },
          { label: `Verify #${complaint.referenceId || complaint.id}` }
        ]}
      />

      {/* Header Bar matching Stitch Design */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 pb-2 border-b border-outline-variant/30">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="font-code text-xs font-bold text-primary">Case #{complaint.referenceId || complaint.id}</span>
            <span className="text-gray-300">•</span>
            <StatusBadge status={complaint.status} size="sm" />
            <span className="px-2.5 py-0.5 rounded-full bg-secondary-fixed text-on-secondary-fixed text-xs font-semibold flex items-center gap-1">
              <span className="material-symbols-outlined text-[14px]">psychology</span>
              <span>Dual Review Mode</span>
            </span>
          </div>
          <h1 className="font-headline-lg text-2xl sm:text-3xl font-extrabold text-on-surface tracking-tight">
            Resolution Verification & Sign-Off
          </h1>
          <p className="text-body-md text-sm text-on-surface-variant mt-1">
            Compare resident intake photo against crew completion evidence, inspect device metadata, and officially certify closure.
          </p>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <Link
            to="/officer/verifications"
            className="px-4 py-2 rounded-xl border border-outline-variant/40 hover:bg-surface-container text-on-surface text-xs font-semibold transition-colors"
          >
            Back to Verification Queue
          </Link>
        </div>
      </div>

      {/* Action Error Banner */}
      {actionError && (
        <div className="p-4 rounded-2xl bg-error-container/20 border border-error/30 text-on-surface flex items-start gap-3 animate-fade-in">
          <span className="material-symbols-outlined text-error text-[20px] shrink-0 mt-0.5">error</span>
          <div className="text-xs">
            <strong className="font-bold text-error">Decision Rejected: </strong>
            <span>{actionError}</span>
          </div>
        </div>
      )}

      {/* Approved Confirmation Certificate Banner */}
      {approvedState && (
        <div className="p-6 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 flex flex-col sm:flex-row sm:items-center justify-between gap-4 animate-fade-in">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-full bg-emerald-600 text-white flex items-center justify-center shrink-0 shadow-md">
              <span className="material-symbols-outlined text-[24px]">verified</span>
            </div>
            <div>
              <h3 className="font-title text-base font-bold text-emerald-950">
                Official Municipal Resolution Approval Recorded
              </h3>
              <p className="text-xs text-emerald-900 mt-0.5">
                Ticket #{complaint.referenceId || complaint.id} is officially classified as <strong>RESOLVED</strong>. Citizen notified & public audit record updated.
              </p>
            </div>
          </div>
          <Link
            to="/officer/verifications"
            className="px-4 py-2 bg-emerald-700 hover:bg-emerald-800 text-white rounded-xl text-xs font-semibold shadow transition-colors shrink-0"
          >
            Return to Verification Queue
          </Link>
        </div>
      )}

      {/* Side-by-Side Photographic Inspection Matrix */}
      <div className="bg-surface-container-lowest rounded-2xl p-6 shadow-sm border border-outline-variant/30 space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <h2 className="font-title text-base font-bold text-on-surface">
            Photographic Evidence Audit (Before vs. After)
          </h2>
          <span className="text-xs text-tertiary flex items-center gap-1">
            <span className="material-symbols-outlined text-[14px]">sensors</span>
            <span>Device Telemetry: {deviceCoords ? `${deviceCoords.lat.toFixed(4)}°, ${deviceCoords.lng.toFixed(4)}° (Unverified)` : 'No device GPS metadata'}</span>
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Before: Citizen Intake */}
          <div className="space-y-2">
            <div className="flex items-center justify-between text-xs">
              <span className="font-bold text-on-surface uppercase tracking-wider flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-error" />
                <span>1. Citizen Intake (Before Repair)</span>
              </span>
              <span className="text-tertiary font-code">
                {new Date(complaint.createdAt).toLocaleDateString()}
              </span>
            </div>
            {beforePhoto ? (
              <div className="relative rounded-2xl overflow-hidden aspect-[4/3] bg-surface-container border border-outline-variant/40 shadow-inner">
                <img src={beforePhoto} alt="Before repair defect" className="w-full h-full object-cover" />
                <div className="absolute bottom-3 left-3 bg-[#111c28]/80 backdrop-blur-md text-white text-[10px] px-3 py-1 rounded-full">
                  Original Reported Defect {citizenPhotos.length > 1 && `(${activeCitizenPhotoIdx + 1}/${citizenPhotos.length})`}
                </div>
              </div>
            ) : (
              <div className="relative rounded-2xl overflow-hidden aspect-[4/3] bg-surface-container-low border border-dashed border-outline-variant flex flex-col items-center justify-center p-6 text-center text-tertiary">
                <span className="material-symbols-outlined text-[40px] text-slate-400 mb-2">no_photography</span>
                <p className="text-xs font-semibold text-on-surface">No Intake Photograph Attached</p>
                <p className="text-[11px] text-tertiary mt-0.5">Report submitted by resident without photographic attachment.</p>
              </div>
            )}

            {citizenPhotos.length > 1 && (
              <div className="flex items-center gap-1.5 pt-1 overflow-x-auto">
                {citizenPhotos.map((url, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => setActiveCitizenPhotoIdx(idx)}
                    className={`relative rounded-lg overflow-hidden border-2 w-14 h-10 shrink-0 transition-all ${
                      activeCitizenPhotoIdx === idx
                        ? 'border-error ring-1 ring-error/40 scale-105'
                        : 'border-outline-variant/40 opacity-70 hover:opacity-100'
                    }`}
                  >
                    <img src={url} alt={`Citizen photo ${idx + 1}`} className="w-full h-full object-cover" />
                  </button>
                ))}
              </div>
            )}

            <p className="text-xs text-on-surface-variant italic">
              "{complaint.description}"
            </p>
          </div>

          {/* After: Field Crew Proof */}
          <div className="space-y-2">
            <div className="flex items-center justify-between text-xs">
              <span className="font-bold text-emerald-700 uppercase tracking-wider flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-emerald-500" />
                <span>2. Field Crew Proof ({evidencePhotos.length} {evidencePhotos.length === 1 ? 'Photo' : 'Photos'})</span>
              </span>
              <span className="text-tertiary font-code">
                {complaint.resolutionEvidence?.submittedDate ? new Date(complaint.resolutionEvidence.submittedDate).toLocaleDateString() : 'Pending'}
              </span>
            </div>
            {afterPhoto ? (
              <div className="relative rounded-2xl overflow-hidden aspect-[4/3] bg-surface-container border border-outline-variant/40 shadow-inner">
                <img src={afterPhoto} alt="After repair proof" className="w-full h-full object-cover" />
                <div className="absolute bottom-3 left-3 bg-emerald-950/85 backdrop-blur-md text-emerald-200 text-[10px] px-3 py-1 rounded-full flex items-center gap-1 shadow-sm">
                  <span className="material-symbols-outlined text-[12px]">check</span>
                  <span>Submitted Work Proof #{activeAfterPhotoIdx + 1} of {evidencePhotos.length}</span>
                </div>
              </div>
            ) : (
              <div className="relative rounded-2xl overflow-hidden aspect-[4/3] bg-surface-container-low border border-dashed border-outline-variant flex flex-col items-center justify-center p-6 text-center text-tertiary">
                <span className="material-symbols-outlined text-[40px] text-slate-400 mb-2">pending_actions</span>
                <p className="text-xs font-semibold text-on-surface">Awaiting Completion Evidence</p>
                <p className="text-[11px] text-tertiary mt-0.5">No resolution photographs uploaded by field crew yet.</p>
              </div>
            )}

            {/* Interactive Thumbnail Gallery for all field crew evidence photos */}
            {evidencePhotos.length > 1 && (
              <div className="flex items-center gap-2 pt-1.5 overflow-x-auto pb-1">
                <span className="text-[10px] font-bold text-tertiary uppercase tracking-wider shrink-0">
                  Switch Proof Photo:
                </span>
                {evidencePhotos.map((url, idx) => {
                  const isActive = activeAfterPhotoIdx === idx;
                  const isCameraPhoto = url.includes('evidence_camera') || url.startsWith('data:');
                  return (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => setActiveAfterPhotoIdx(idx)}
                      className={`relative rounded-xl overflow-hidden border-2 w-20 h-14 shrink-0 transition-all flex flex-col ${
                        isActive
                          ? 'border-emerald-600 ring-2 ring-emerald-500/40 scale-105 shadow-md'
                          : 'border-outline-variant/40 opacity-70 hover:opacity-100 hover:border-emerald-400'
                      }`}
                    >
                      <img src={url} alt={`Evidence photo ${idx + 1}`} className="w-full h-full object-cover" />
                      <div className="absolute bottom-0 inset-x-0 bg-black/75 backdrop-blur-xs text-white text-[9px] font-semibold px-1 py-0.5 text-center flex items-center justify-center gap-0.5">
                        <span className="material-symbols-outlined text-[10px]">
                          {isCameraPhoto ? 'photo_camera' : 'image'}
                        </span>
                        <span>#{idx + 1} {isCameraPhoto ? 'Camera' : 'Proof'}</span>
                      </div>
                    </button>
                  );
                })}
              </div>
            )}

            <div className="p-3 bg-surface-container-low rounded-xl border border-outline-variant/30 space-y-1">
              <span className="text-[10px] font-bold text-tertiary uppercase tracking-wider block">Technician Completion Notes:</span>
              <p className="text-xs text-on-surface-variant">
                {complaint.resolutionEvidence?.notes || 'No completion notes recorded.'}
              </p>
            </div>
          </div>
        </div>

        {/* Work Order Telemetry Strip */}
        <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 bg-surface-container-low p-4 rounded-xl text-xs border border-outline-variant/30">
          <div>
            <span className="text-tertiary block text-[10px] uppercase">Assigned Crew</span>
            <span className="font-bold text-on-surface">{complaint.assignedWorker?.name || complaint.resolutionEvidence?.workerName || 'Marcus Chen'}</span>
          </div>
          <div>
            <span className="text-tertiary block text-[10px] uppercase">Status</span>
            <span className="font-bold text-primary-container">{complaint.status}</span>
          </div>
          <div>
            <span className="text-tertiary block text-[10px] uppercase">Evidence Location Check</span>
            <span className="font-medium text-on-surface flex items-center gap-1.5 mt-0.5">
              {locationCheck === 'WITHIN_RANGE' && (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-300">
                  <span className="material-symbols-outlined text-[13px]">check_circle</span>
                  <span>WITHIN RANGE ({distanceMeters != null ? `${distanceMeters}m` : 'Verified'})</span>
                </span>
              )}
              {locationCheck === 'OUT_OF_RANGE' && (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-bold bg-rose-100 text-rose-800 border border-rose-300">
                  <span className="material-symbols-outlined text-[13px]">warning</span>
                  <span>OUT OF RANGE ({distanceMeters != null ? `${distanceMeters}m` : 'Flagged'})</span>
                </span>
              )}
              {locationCheck === 'LOW_ACCURACY' && (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-bold bg-amber-100 text-amber-800 border border-amber-300">
                  <span className="material-symbols-outlined text-[13px]">gps_not_fixed</span>
                  <span>LOW ACCURACY (±{accuracyMeters != null ? `${accuracyMeters}m` : 'Low precision'})</span>
                </span>
              )}
              {locationCheck === 'NOT_PROVIDED' && (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-bold bg-slate-100 text-slate-800 border border-slate-300">
                  <span className="material-symbols-outlined text-[13px]">location_off</span>
                  <span>NOT PROVIDED</span>
                </span>
              )}
              {locationCheck === 'NOT_CHECKABLE' && (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-bold bg-slate-100 text-slate-700 border border-slate-300">
                  <span className="material-symbols-outlined text-[13px]">help_outline</span>
                  <span>NOT CHECKABLE</span>
                </span>
              )}
            </span>
          </div>
          <div>
            <span className="text-tertiary block text-[10px] uppercase">Inspecting Officer</span>
            <span className="font-bold text-on-surface">{currentUser?.name || 'Elena Vance'}</span>
          </div>
        </div>

        {/* Location Verification Audit Panel */}
        <div className="p-4 rounded-xl bg-surface-container-low border border-outline-variant/30 space-y-2 text-xs">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <span className="material-symbols-outlined text-primary text-[18px]">share_location</span>
              <strong className="font-semibold text-on-surface">Repair Proximity Verification</strong>
            </div>
            <div className="flex items-center gap-2 text-[11px]">
              {deviceCoords && (
                <span className="font-mono text-tertiary">
                  Captured: {deviceCoords.lat.toFixed(4)}° N, {deviceCoords.lng.toFixed(4)}° E {accuracyMeters != null ? `(±${accuracyMeters}m)` : ''}
                </span>
              )}
            </div>
          </div>

          <p className="text-[11px] text-on-surface-variant italic leading-relaxed">
            Location is reported by the worker's device and can be inaccurate; it supports, but does not replace, your review.
          </p>

          {workerLocationNote && (
            <div className="p-2.5 rounded-lg bg-surface-container-lowest border border-outline-variant/20 space-y-1">
              <span className="text-[10px] uppercase font-bold text-tertiary block">Field Worker Location Note:</span>
              <p className="text-xs text-on-surface font-medium">"{workerLocationNote}"</p>
            </div>
          )}
        </div>
      </div>

      {/* Adjudication Decision Panel */}
      {!approvedState && (
        <div className="bg-surface-container-lowest rounded-2xl p-6 shadow-sm border border-outline-variant/30 space-y-4">
          <h3 className="font-title text-base font-bold text-on-surface">Officer Adjudication & Action</h3>
          <p className="text-xs text-on-surface-variant">
            By approving, you officially verify this infrastructure repair and transition ticket status to PENDING_CITIZEN_CONFIRMATION for resident closure.
          </p>

          {isFlaggedLocation && (
            <div className="space-y-1.5 p-3.5 rounded-xl bg-amber-500/10 border border-amber-500/25">
              <label className="block text-xs font-semibold text-amber-900 flex items-center gap-1.5">
                <span className="material-symbols-outlined text-[16px] text-amber-700">fact_check</span>
                <span>Location Discrepancy Acknowledgement * (Mandatory 10–500 chars)</span>
              </label>
              <p className="text-[11px] text-amber-800 leading-relaxed">
                The evidence location check is <strong>{locationCheck}</strong> {distanceMeters != null ? `(${distanceMeters}m away)` : ''}. You must review the worker's note and acknowledge why this resolution is accepted despite the location flag.
              </p>
              <textarea
                rows={2}
                required
                value={locationAcknowledgement}
                onChange={(e) => setLocationAcknowledgement(e.target.value)}
                placeholder="State your review basis (e.g. verified landmark in photo matches complaint context; worker note explains pump station location)..."
                disabled={submitting}
                className="w-full px-3 py-2 bg-surface-container-lowest rounded-lg text-xs text-on-surface border border-outline-variant/40 focus:border-primary-container focus:outline-none disabled:opacity-50"
              />
              <span className="text-[10px] text-tertiary block text-right">
                {locationAcknowledgement.trim().length}/10 characters minimum (max 500)
              </span>
            </div>
          )}

          <div className="space-y-1">
            <label className="block text-xs font-semibold text-on-surface">Officer Inspection Notes (Recorded in Public Ledger)</label>
            <textarea
              rows={2}
              value={approvalNotes}
              onChange={(e) => setApprovalNotes(e.target.value)}
              disabled={submitting}
              className="w-full px-3.5 py-2.5 bg-surface-container-low rounded-xl text-xs text-on-surface border border-outline-variant/30 focus:border-primary-container focus:outline-none disabled:opacity-50"
            />
          </div>

          <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setShowReworkModal(true)}
                disabled={submitting}
                className="px-4 py-2.5 rounded-xl bg-amber-500/10 hover:bg-amber-500/20 text-amber-800 text-xs font-semibold transition-colors flex items-center gap-1.5 disabled:opacity-50"
              >
                <span className="material-symbols-outlined text-[16px]">replay</span>
                <span>Request Corrections / Rework</span>
              </button>
            </div>

            <button
              type="button"
              onClick={handleApprove}
              disabled={submitting}
              className="px-6 py-2.5 rounded-xl bg-primary-container hover:bg-primary text-white text-xs font-semibold shadow-md transition-all flex items-center gap-2 disabled:opacity-50"
            >
              <span className={`material-symbols-outlined text-[18px] ${submitting ? 'animate-spin' : ''}`}>
                {submitting ? 'hourglass_empty' : 'verified'}
              </span>
              <span>{submitting ? 'Submitting Verification...' : 'Approve Resolution & Officially Close Case'}</span>
            </button>
          </div>
        </div>
      )}

      {/* Complaint Status History and Audit Trail */}
      {complaint.progressNotes && complaint.progressNotes.length > 0 && (
        <div className="bg-surface-container-lowest rounded-2xl p-6 shadow-sm border border-outline-variant/30 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-title text-base font-bold text-on-surface flex items-center gap-2">
              <span className="material-symbols-outlined text-primary text-[20px]">history</span>
              <span>Workflow Status History & Audit Trail</span>
            </h3>
            <span className="text-xs text-tertiary">
              {complaint.progressNotes.length} {complaint.progressNotes.length === 1 ? 'Record' : 'Records'}
            </span>
          </div>

          <div className="divide-y divide-outline-variant/20">
            {complaint.progressNotes.map((entry, idx) => (
              <div key={entry.id || idx} className="py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs">
                <div className="space-y-0.5">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-on-surface">{entry.author || 'Municipal Dispatch'}</span>
                    {entry.status && (
                      <span className="px-2 py-0.5 rounded bg-surface-container text-on-surface font-code text-[10px]">
                        {entry.status}
                      </span>
                    )}
                  </div>
                  <p className="text-on-surface-variant">{entry.note}</p>
                </div>
                <span className="text-tertiary shrink-0 font-code text-[11px]">
                  {entry.timestamp ? new Date(entry.timestamp).toLocaleString() : ''}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Rework Modal */}
      {showReworkModal && (
        <div className="fixed inset-0 z-50 bg-[#111c28]/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-surface-container-lowest rounded-2xl p-6 max-w-md w-full shadow-2xl space-y-4 border border-outline-variant/40">
            <div className="flex items-center gap-2 text-amber-600">
              <span className="material-symbols-outlined text-[24px]">replay</span>
              <h3 className="font-bold text-base text-on-surface">Return to Crew for Rework</h3>
            </div>
            <p className="text-xs text-on-surface-variant">
              Specify the defects in the repair (e.g. edge grading, debris cleanup, surface leveling) so technician {complaint.assignedWorker?.name || 'assigned crew'} can remediate.
            </p>
            <textarea
              rows={3}
              placeholder="e.g. Asphalt edge not flush with curb; please re-compact and re-seal..."
              value={reworkNotes}
              onChange={(e) => setReworkNotes(e.target.value)}
              disabled={submitting}
              className="w-full p-3 bg-surface-container-low rounded-xl text-xs text-on-surface border border-outline-variant/40 focus:outline-none disabled:opacity-50"
            />
            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => {
                  setShowReworkModal(false);
                  setActionError(null);
                }}
                disabled={submitting}
                className="px-4 py-2 bg-surface-container rounded-xl text-xs font-semibold text-on-surface hover:bg-surface-container-high transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleRequestRework}
                disabled={submitting}
                className="px-4 py-2 bg-amber-600 text-white rounded-xl text-xs font-semibold hover:bg-amber-700 transition-colors flex items-center gap-1.5 disabled:opacity-50"
              >
                <span className={`material-symbols-outlined text-[16px] ${submitting ? 'animate-spin' : ''}`}>
                  {submitting ? 'hourglass_empty' : 'send'}
                </span>
                <span>{submitting ? 'Returning...' : 'Send Rework Request'}</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
