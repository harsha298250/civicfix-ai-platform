import React, { useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { useApp } from '../../context/AppContext';
import { complaintService } from '../../services/complaintService';
import { StatusBadge } from '../../components/common/StatusBadge';
import { Breadcrumb } from '../../components/common/Breadcrumb';
import { COMPLAINT_STATUS } from '../../constants/statusConstants';

export const ResolutionVerificationPage = () => {
  const { complaintId } = useParams();
  const navigate = useNavigate();
  const { complaints, refreshComplaints, addAuditLog, showToast, currentUser } = useApp();

  // Find ticket matching route parameter
  const complaint = complaints.find(c => c.id.toLowerCase() === (complaintId || '').toLowerCase());

  const [approvalNotes, setApprovalNotes] = useState('On-site compaction verified via dual-angle photo proof. Cast-iron seal conforms to municipal standards.');
  const [reworkNotes, setReworkNotes] = useState('');
  const [rejectNotes, setRejectNotes] = useState('');
  const [showReworkModal, setShowReworkModal] = useState(false);
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [approvedState, setApprovedState] = useState(complaint?.status === COMPLAINT_STATUS.RESOLVED);

  const citizenPhotos = complaint?.photos || [];
  const [activeCitizenPhotoIdx, setActiveCitizenPhotoIdx] = useState(0);

  const evidencePhotos = complaint?.resolutionEvidence?.photos || [];
  const [activeAfterPhotoIdx, setActiveAfterPhotoIdx] = useState(0);

  const beforePhoto = citizenPhotos[activeCitizenPhotoIdx] || null;
  const afterPhoto = evidencePhotos[activeAfterPhotoIdx] || null;

  if (!complaint) {
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
            Complaint ticket #{complaintId} could not be located in the verification queue.
          </p>
          <Link
            to="/officer/verifications"
            className="inline-block px-5 py-2.5 bg-primary-container text-white text-xs font-semibold rounded-xl hover:bg-primary shadow-sm transition-colors"
          >
            Return to Verification Queue
          </Link>
        </div>
      </div>
    );
  }

  const handleApprove = async () => {
    try {
      await complaintService.verifyResolution(complaint.id, 'APPROVE', approvalNotes, currentUser.name);
      addAuditLog('APPROVE_RESOLUTION', `Ticket #${complaint.id}`, `Officer approval sign-off: ${approvalNotes}`);
      await refreshComplaints();
      setApprovedState(true);
      showToast(`Ticket #${complaint.id} successfully verified & transitioned to RESOLVED!`, 'success');
    } catch (err) {
      console.error(err);
      showToast('Approval failed.', 'error');
    }
  };

  const handleRequestRework = async () => {
    if (!reworkNotes.trim()) {
      alert('Please specify the required corrections for the field crew.');
      return;
    }
    try {
      await complaintService.verifyResolution(complaint.id, 'REQUEST_REWORK', reworkNotes, currentUser.name);
      addAuditLog('REQUEST_REWORK', `Ticket #${complaint.id}`, `Officer requested rework: ${reworkNotes}`);
      await refreshComplaints();
      setShowReworkModal(false);
      showToast(`Rework order returned to crew for Ticket #${complaint.id}`, 'info');
      navigate('/officer/verifications');
    } catch (err) {
      console.error(err);
      showToast('Action failed.', 'error');
    }
  };

  const handleRejectResolution = async () => {
    if (!rejectNotes.trim()) {
      alert('Please specify the reason for rejecting this resolution evidence.');
      return;
    }
    try {
      await complaintService.verifyResolution(complaint.id, 'REJECT', rejectNotes, currentUser.name);
      addAuditLog('REJECT_RESOLUTION', `Ticket #${complaint.id}`, `Officer rejected resolution evidence: ${rejectNotes}`);
      await refreshComplaints();
      setShowRejectModal(false);
      showToast(`Resolution rejected for Ticket #${complaint.id}`, 'error');
      navigate('/officer/verifications');
    } catch (err) {
      console.error(err);
      showToast('Action failed.', 'error');
    }
  };

  return (
    <div className="w-full flex flex-col gap-6">
      <Breadcrumb
        items={[
          { label: 'Operations Command', path: '/officer/dashboard', icon: 'account_balance' },
          { label: 'Verification Queue', path: '/officer/verifications' },
          { label: `Verify #${complaint.id}` }
        ]}
      />

      {/* Header Bar matching Stitch Design */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 pb-2 border-b border-outline-variant/30">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="font-code text-xs font-bold text-primary">Case #{complaint.id}</span>
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
            Compare resident intake photo against crew completion evidence, validate telemetry, and officially certify closure.
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
                Ticket #{complaint.id} is officially classified as <strong>RESOLVED</strong>. Citizen notified & audit log recorded.
              </p>
            </div>
          </div>
          <Link
            to="/officer/verifications"
            className="px-4 py-2 bg-emerald-700 hover:bg-emerald-800 text-white rounded-xl text-xs font-semibold shadow transition-colors shrink-0"
          >
            Return to Next Queue Case
          </Link>
        </div>
      )}

      {/* Side-by-Side Photographic Inspection Matrix */}
      <div className="bg-surface-container-lowest rounded-2xl p-6 shadow-sm border border-outline-variant/30 space-y-6">
        <div className="flex items-center justify-between">
          <h2 className="font-title text-base font-bold text-on-surface">
            Photographic Evidence Audit (Before vs. After)
          </h2>
          <span className="text-xs text-tertiary">GPS RTK Coordinates Match: 99.8% precision</span>
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
                  <span>Verified Repair Completed — Proof #{activeAfterPhotoIdx + 1} of {evidencePhotos.length}</span>
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

            <p className="text-xs text-on-surface-variant">
              {complaint.resolutionEvidence?.notes || 'Base cleared, hot-mix asphalt filled and compacted using hydraulic roller rig.'}
            </p>
          </div>
        </div>

        {/* Work Order Telemetry Strip */}
        <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 bg-surface-container-low p-4 rounded-xl text-xs border border-outline-variant/30">
          <div>
            <span className="text-tertiary block text-[10px] uppercase">Assigned Crew</span>
            <span className="font-bold text-on-surface">{complaint.assignedWorker?.name || 'Marcus Chen'}</span>
          </div>
          <div>
            <span className="text-tertiary block text-[10px] uppercase">Turnaround Time</span>
            <span className="font-bold text-primary-container">{complaint.resolutionEvidence?.completionTime || '4h 12m'}</span>
          </div>
          <div>
            <span className="text-tertiary block text-[10px] uppercase">GPS Telemetry Check</span>
            <span className="font-bold text-emerald-600 flex items-center gap-1">
              <span className="material-symbols-outlined text-[14px]">check_circle</span>
              <span>Matched on-site ±1.4m</span>
            </span>
          </div>
          <div>
            <span className="text-tertiary block text-[10px] uppercase">Inspecting Officer</span>
            <span className="font-bold text-on-surface">{currentUser.name}</span>
          </div>
        </div>
      </div>

      {/* Adjudication Decision Panel */}
      {!approvedState && (
        <div className="bg-surface-container-lowest rounded-2xl p-6 shadow-sm border border-outline-variant/30 space-y-4">
          <h3 className="font-title text-base font-bold text-on-surface">Officer Adjudication & Action</h3>
          <p className="text-xs text-on-surface-variant">
            By approving, you officially verify this infrastructure repair and transition ticket status to RESOLVED in the municipal system.
          </p>

          <div className="space-y-1">
            <label className="block text-xs font-semibold text-on-surface">Officer Inspection Notes (Recorded in Public Ledger)</label>
            <textarea
              rows={2}
              value={approvalNotes}
              onChange={(e) => setApprovalNotes(e.target.value)}
              className="w-full px-3.5 py-2.5 bg-surface-container-low rounded-xl text-xs text-on-surface border border-transparent focus:border-primary-container focus:outline-none"
            />
          </div>

          <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setShowReworkModal(true)}
                className="px-4 py-2.5 rounded-xl bg-amber-500/10 hover:bg-amber-500/20 text-amber-800 text-xs font-semibold transition-colors flex items-center gap-1.5"
              >
                <span className="material-symbols-outlined text-[16px]">replay</span>
                <span>Request Corrections / Rework</span>
              </button>
              <button
                type="button"
                onClick={() => setShowRejectModal(true)}
                className="px-4 py-2.5 rounded-xl bg-error-container hover:bg-red-200 text-on-error-container text-xs font-semibold transition-colors flex items-center gap-1.5"
              >
                <span className="material-symbols-outlined text-[16px]">highlight_off</span>
                <span>Reject Resolution Proof</span>
              </button>
            </div>

            <button
              type="button"
              onClick={handleApprove}
              className="px-6 py-2.5 rounded-xl bg-primary-container hover:bg-primary text-white text-xs font-semibold shadow-md transition-all flex items-center gap-2"
            >
              <span className="material-symbols-outlined text-[18px]">verified</span>
              <span>Approve Resolution & Officially Close Case</span>
            </button>
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
              Specify the defects in the repair (e.g. edge grading, debris cleanup, surface leveling) so technician {complaint.assignedWorker?.name} can remediate.
            </p>
            <textarea
              rows={3}
              placeholder="e.g. Asphalt edge not flush with curb; please re-seal..."
              value={reworkNotes}
              onChange={(e) => setReworkNotes(e.target.value)}
              className="w-full p-3 bg-surface-container-low rounded-xl text-xs text-on-surface border border-outline-variant/40 focus:outline-none"
            />
            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setShowReworkModal(false)}
                className="px-4 py-2 bg-surface-container rounded-xl text-xs font-semibold text-on-surface"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleRequestRework}
                className="px-4 py-2 bg-amber-600 text-white rounded-xl text-xs font-semibold hover:bg-amber-700"
              >
                Send Rework Request
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Reject Modal */}
      {showRejectModal && (
        <div className="fixed inset-0 z-50 bg-[#111c28]/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-surface-container-lowest rounded-2xl p-6 max-w-md w-full shadow-2xl space-y-4 border border-outline-variant/40">
            <div className="flex items-center gap-2 text-error">
              <span className="material-symbols-outlined text-[24px]">highlight_off</span>
              <h3 className="font-bold text-base text-on-surface">Reject Resolution Evidence</h3>
            </div>
            <p className="text-xs text-on-surface-variant">
              Note: This rejects the submitted repair work, NOT the original complaint.
            </p>
            <textarea
              rows={3}
              placeholder="State reason for resolution rejection..."
              value={rejectNotes}
              onChange={(e) => setRejectNotes(e.target.value)}
              className="w-full p-3 bg-surface-container-low rounded-xl text-xs text-on-surface border border-outline-variant/40 focus:outline-none"
            />
            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setShowRejectModal(false)}
                className="px-4 py-2 bg-surface-container rounded-xl text-xs font-semibold text-on-surface"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleRejectResolution}
                className="px-4 py-2 bg-error text-white rounded-xl text-xs font-semibold hover:bg-red-700"
              >
                Confirm Rejection
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
