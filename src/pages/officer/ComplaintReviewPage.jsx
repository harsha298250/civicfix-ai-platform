import React, { useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { useApp } from '../../context/AppContext';
import { complaintService } from '../../services/complaintService';
import { userService } from '../../services/userService';
import { StatusBadge } from '../../components/common/StatusBadge';
import { PriorityBadge } from '../../components/common/PriorityBadge';
import { Breadcrumb } from '../../components/common/Breadcrumb';
import { COMPLAINT_STATUS } from '../../constants/statusConstants';

export const ComplaintReviewPage = () => {
  const { complaintId } = useParams();
  const navigate = useNavigate();
  const { complaints, refreshComplaints, addAuditLog, showToast, currentUser } = useApp();

  const complaint = complaints.find(c => c.id.toLowerCase() === (complaintId || '').toLowerCase()) || complaints[0];

  const [selectedWorkerId, setSelectedWorkerId] = useState('usr-003'); // Marcus Chen default
  const [dispatchNotes, setDispatchNotes] = useState('Immediate hydraulic roller compaction required due to transit bus lane traffic.');
  const [slaWindow, setSlaWindow] = useState('48 Hours');
  const [assigning, setAssigning] = useState(false);
  const [isReassigning, setIsReassigning] = useState(false);
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [rejectReason, setRejectReason] = useState('');

  if (!complaint) {
    return (
      <div className="text-center py-12">
        <p>Complaint not found.</p>
        <Link to="/officer/complaints" className="text-primary underline">Return to Queue</Link>
      </div>
    );
  }

  const handleAssignWorker = async (e) => {
    e.preventDefault();
    setAssigning(true);
    try {
      const workers = await userService.getFieldWorkers();
      const worker = workers.find(w => w.id === selectedWorkerId) || {
        id: 'usr-003',
        name: 'Marcus Chen',
        department: 'SDOT Rapid Asphalt Maintenance'
      };

      await complaintService.assignWorker(complaint.id, worker, `${dispatchNotes} (Target SLA: ${slaWindow})`);
      addAuditLog('DISPATCH_WORKER', `Ticket #${complaint.id}`, `Dispatched crew ${worker.name} with ${slaWindow} target SLA.`);
      await refreshComplaints();
      showToast(`Work order issued! Ticket #${complaint.id} assigned to ${worker.name}.`, 'success');
      navigate('/officer/assignments');
    } catch (err) {
      console.error(err);
      showToast('Assignment failed.', 'error');
    } finally {
      setAssigning(false);
    }
  };

  const handleRejectComplaint = async () => {
    if (!rejectReason.trim()) {
      alert('Please state a reason for rejecting this intake.');
      return;
    }
    await complaintService.updateStatus(complaint.id, COMPLAINT_STATUS.REJECTED, {
      progressNote: `Intake rejected by Officer ${currentUser.name}: ${rejectReason}`
    });
    addAuditLog('REJECT_COMPLAINT', `Ticket #${complaint.id}`, `Rejected intake: ${rejectReason}`);
    await refreshComplaints();
    setShowRejectModal(false);
    showToast(`Complaint #${complaint.id} marked as Rejected.`, 'info');
    navigate('/officer/complaints');
  };

  return (
    <div className="w-full flex flex-col gap-6">
      <Breadcrumb
        items={[
          { label: 'Operations Command', path: '/officer/dashboard', icon: 'account_balance' },
          { label: 'Complaint Queue', path: '/officer/complaints' },
          { label: `Review #${complaint.id}` }
        ]}
      />

      {/* Header Bar matching Stitch Design */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 pb-2 border-b border-outline-variant/30">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="font-code text-xs font-bold bg-surface-container text-on-surface px-2.5 py-0.5 rounded">
              #{complaint.id}
            </span>
            <StatusBadge status={complaint.status} size="sm" />
            <PriorityBadge priority={complaint.priority} />
            <span className="text-xs text-on-surface-variant font-code">
              Intake Time: {new Date(complaint.createdAt).toLocaleDateString()}
            </span>
          </div>
          <h1 className="font-headline-lg text-2xl sm:text-3xl font-extrabold text-on-surface tracking-tight">
            Review Civic Complaint — {complaint.title}
          </h1>
          <p className="text-body-md text-sm text-on-surface-variant mt-1">
            Assess submitted report, evaluate AI triage confidence, confirm priority, and dispatch verified field personnel.
          </p>
        </div>

        <div className="flex items-center gap-2 shrink-0">
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
                  <span>{complaint.location?.address}</span>
                </p>
              </div>

              <div className="bg-surface-container-low p-2.5 rounded-xl text-right text-xs">
                <span className="font-semibold text-on-surface block">{complaint.citizen?.name || 'Alex Morgan'}</span>
                <span className="text-[10px] text-emerald-600 font-bold">Trust Score: 98% (Verified Citizen)</span>
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
          </section>

          {/* Section B: Gemini AI Autonomous Triage Card matching Stitch */}
          <section className="bg-surface-container-lowest rounded-2xl p-6 shadow-sm border border-outline-variant/30 space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-secondary text-white flex items-center justify-center">
                  <span className="material-symbols-outlined text-[18px]">psychology</span>
                </div>
                <div>
                  <h3 className="font-title text-sm font-bold text-on-surface">Gemini AI Model Assessment</h3>
                  <span className="text-[10px] text-secondary font-semibold">Autonomous Triage Engine v3.4</span>
                </div>
              </div>
              <span className="font-code text-xs text-emerald-600 font-bold bg-emerald-500/10 px-2 py-0.5 rounded">
                Confidence: {complaint.aiTriage?.confidence || 98.4}%
              </span>
            </div>

            <div className="grid grid-cols-2 gap-3 text-xs">
              <div className="p-3 rounded-xl bg-surface-container-low space-y-1">
                <span className="text-tertiary block text-[10px] uppercase">Detected Defect</span>
                <span className="font-bold text-on-surface">{complaint.aiTriage?.detectedIssue || complaint.title}</span>
              </div>
              <div className="p-3 rounded-xl bg-surface-container-low space-y-1">
                <span className="text-tertiary block text-[10px] uppercase">Hazard Rating</span>
                <span className="font-bold text-error">{complaint.aiTriage?.hazardScore || 'P1 - High Hazard'}</span>
              </div>
            </div>

            <div className="p-3 rounded-xl bg-surface-container-low flex items-center justify-between text-xs">
              <span className="text-tertiary">Duplicate Clustered Matches:</span>
              <span className="font-semibold text-emerald-600">No duplicates active (Direct Dispatch Eligible)</span>
            </div>
          </section>
        </div>

        {/* Right Column: Worker Assignment & Dispatch Engine (5 cols) */}
        <div className="lg:col-span-5 bg-surface-container-lowest rounded-2xl p-6 shadow-sm border border-outline-variant/30 space-y-5">
          <div className="flex items-center justify-between pb-2 border-b border-outline-variant/30">
            <div>
              <h3 className="font-title text-base font-bold text-on-surface">
                {complaint.assignedWorker && !isReassigning ? 'Dispatched Field Personnel' : 'Worker Assignment & Dispatch'}
              </h3>
              <p className="text-xs text-on-surface-variant">
                {complaint.assignedWorker && !isReassigning ? 'Field work order active and monitored in municipal ledger' : 'Allocate rapid field crew and set SLA resolution deadline'}
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
                      {complaint.assignedWorker.name.split(' ').map(n => n[0]).join('')}
                    </div>
                    <div>
                      <h4 className="font-bold text-sm text-on-surface">{complaint.assignedWorker.name}</h4>
                      <p className="text-xs text-tertiary">{complaint.assignedWorker.unit || 'Rapid Response Maintenance'}</p>
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
                  <span>Reassigning from <strong>{complaint.assignedWorker?.name}</strong></span>
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
                  {[
                    {
                      id: 'usr-003',
                      name: 'Marcus Chen',
                      unit: 'SDOT Rapid Asphalt Maintenance (Unit 4)',
                      rig: 'Van #14 (Hydraulic Roller Hitch T-12)',
                      status: 'Available · 1.2km away'
                    },
                    {
                      id: 'usr-004',
                      name: 'David Kalu',
                      unit: 'Water Supply & Sewerage Board',
                      rig: 'Compactor Rig 3',
                      status: 'Available · 3.4km away'
                    },
                    {
                      id: 'usr-007',
                      name: 'Suresh Kumar',
                      unit: 'High Voltage Grid Service',
                      rig: 'Aerial Lift Truck 9',
                      status: 'Available · 2.1km away'
                    }
                  ].map((worker) => (
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
                          <p className="text-tertiary mt-0.5">{worker.unit}</p>
                          <p className="text-[11px] text-on-surface-variant font-code mt-0.5">{worker.rig}</p>
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
              State a clear reason for turning down ticket #{complaint.id}. This note will be recorded in the public ledger and sent to the reporter.
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
                className="px-4 py-2 bg-surface-container rounded-xl text-xs font-semibold text-on-surface hover:bg-surface-container-high"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleRejectComplaint}
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
