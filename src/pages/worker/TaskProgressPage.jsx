import React, { useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { useApp } from '../../context/AppContext';
import { complaintService } from '../../services/complaintService';
import { StatusBadge } from '../../components/common/StatusBadge';
import { PriorityBadge } from '../../components/common/PriorityBadge';
import { Breadcrumb } from '../../components/common/Breadcrumb';
import { COMPLAINT_STATUS } from '../../constants/statusConstants';

export const TaskProgressPage = () => {
  const { taskId } = useParams();
  const navigate = useNavigate();
  const { complaints, refreshComplaints, addAuditLog, showToast, currentUser } = useApp();

  const task = complaints.find(c => c.id.toLowerCase() === (taskId || '').toLowerCase());

  const [progressPercent, setProgressPercent] = useState(task?.progressPercent || 50);
  const [progressNote, setProgressNote] = useState('');
  const [blockerReason, setBlockerReason] = useState('Traffic Congestion / Police Escort Required');
  const [showBlockerForm, setShowBlockerForm] = useState(false);
  const [saving, setSaving] = useState(false);

  if (!task) {
    return (
      <div className="w-full max-w-4xl mx-auto flex flex-col gap-6">
        <Breadcrumb
          items={[
            { label: 'Field Ops', path: '/worker/dashboard', icon: 'engineering' },
            { label: 'Tasks', path: '/worker/tasks' },
            { label: 'Task Not Found' }
          ]}
        />
        <div className="text-center py-16 bg-surface-container-lowest rounded-2xl p-8 max-w-lg mx-auto shadow-sm border border-outline-variant/30 space-y-4">
          <span className="material-symbols-outlined text-[48px] text-tertiary">search_off</span>
          <h2 className="text-xl font-bold text-on-surface">Work Order Not Found</h2>
          <p className="text-xs text-on-surface-variant leading-relaxed">
            Task ID #{taskId} could not be located in assigned work orders.
          </p>
          <Link
            to="/worker/tasks"
            className="inline-block px-5 py-2.5 bg-primary-container text-white text-xs font-semibold rounded-xl hover:bg-primary shadow-sm transition-colors"
          >
            Return to Work Queue
          </Link>
        </div>
      </div>
    );
  }

  const handleStartWork = async () => {
    try {
      await complaintService.updateStatus(task.id, COMPLAINT_STATUS.IN_PROGRESS, {
        progressPercent: 10,
        progressNote: `Technician ${currentUser.name} arrived on site and initiated work perimeter.`,
        author: currentUser.name
      });
      addAuditLog('START_WORK', `Task #${task.id}`, `Technician arrived on-site.`);
      await refreshComplaints();
      showToast('Work started! Status transitioned to IN_PROGRESS.', 'success');
    } catch (err) {
      console.error(err);
      showToast('Failed to start work.', 'error');
    }
  };

  const handleSaveProgress = async (e) => {
    e.preventDefault();
    if (!progressNote.trim()) {
      alert('Please enter a short description of the work completed so far.');
      return;
    }
    setSaving(true);
    try {
      await complaintService.submitProgress(task.id, progressPercent, progressNote, currentUser.name);
      addAuditLog('PROGRESS_UPDATE', `Task #${task.id}`, `Progress updated to ${progressPercent}%: ${progressNote}`);
      await refreshComplaints();
      showToast(`Progress saved (${progressPercent}%)!`, 'success');
      setProgressNote('');
    } catch (err) {
      console.error(err);
      showToast('Failed to update progress.', 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleReportBlocker = async (e) => {
    e.preventDefault();
    try {
      await complaintService.reportBlocker(task.id, blockerReason, currentUser.name);
      addAuditLog('REPORT_BLOCKER', `Task #${task.id}`, `Field blocker reported: ${blockerReason}`);
      await refreshComplaints();
      setShowBlockerForm(false);
      showToast(`Blocker reported to Central Operations for #${task.id}!`, 'error');
    } catch (err) {
      console.error(err);
      showToast('Failed to report blocker.', 'error');
    }
  };

  return (
    <div className="w-full max-w-4xl mx-auto flex flex-col gap-6">
      <Breadcrumb
        items={[
          { label: 'Field Ops', path: '/worker/dashboard', icon: 'engineering' },
          { label: 'Tasks', path: '/worker/tasks' },
          { label: `Progress #${task.id}` }
        ]}
      />

      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="font-code text-xs font-bold bg-surface-container text-on-surface px-2 py-0.5 rounded">
              #{task.id}
            </span>
            <StatusBadge status={task.status} size="sm" />
            <PriorityBadge priority={task.priority} />
          </div>
          <h1 className="font-headline-lg text-2xl sm:text-3xl font-extrabold text-on-surface tracking-tight">
            Field Progress & Incident Log
          </h1>
          <p className="text-body-md text-sm text-on-surface-variant mt-1">
            {task.title} • {task.location?.address}
          </p>
        </div>

        <Link
          to={`/worker/tasks/${task.id}/evidence`}
          className="px-4 py-2 rounded-xl bg-secondary hover:bg-secondary-container text-white text-xs font-semibold shadow transition-colors flex items-center gap-1.5 shrink-0"
        >
          <span className="material-symbols-outlined text-[16px]">fact_check</span>
          <span>Submit Repair Evidence</span>
        </Link>
      </div>

      {/* Start Work Banner if ASSIGNED */}
      {task.status === COMPLAINT_STATUS.ASSIGNED && (
        <div className="p-5 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <span className="material-symbols-outlined text-amber-700 text-[28px]">pending</span>
            <div>
              <h4 className="font-bold text-sm text-amber-900">Task Currently Assigned (Awaiting On-Site Arrival)</h4>
              <p className="text-xs text-amber-800">Click to confirm physical arrival and initiate time tracking.</p>
            </div>
          </div>
          <button
            type="button"
            onClick={handleStartWork}
            className="px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-xl text-xs font-semibold shadow transition-colors shrink-0"
          >
            Start Work on Site
          </button>
        </div>
      )}

      {/* Progress Update Form */}
      <div className="bg-surface-container-lowest rounded-2xl p-6 sm:p-8 shadow-sm border border-outline-variant/30 space-y-6">
        <h3 className="font-title text-base font-bold text-on-surface">Update Repair Progress</h3>

        <form onSubmit={handleSaveProgress} className="space-y-5">
          {/* Slider */}
          <div className="space-y-2">
            <div className="flex justify-between text-xs">
              <span className="font-semibold text-on-surface">Completion Percentage</span>
              <span className="font-code text-primary-container font-bold text-base">{progressPercent}%</span>
            </div>
            <input
              type="range"
              min="0"
              max="100"
              step="5"
              value={progressPercent}
              onChange={(e) => setProgressPercent(Number(e.target.value))}
              className="w-full accent-primary-container h-2 bg-surface-container-low rounded-lg cursor-pointer"
            />
            <div className="flex justify-between text-[10px] text-tertiary">
              <span>0% (Arrival)</span>
              <span>25% (Excavation)</span>
              <span>50% (Base Fill)</span>
              <span>75% (Compaction)</span>
              <span>100% (Finished)</span>
            </div>
          </div>

          {/* Note Input */}
          <div className="space-y-1">
            <label className="block text-xs font-semibold text-on-surface">
              On-Site Operational Note *
            </label>
            <textarea
              rows={3}
              required
              placeholder="e.g. Sub-base aggregate compacted with roller rig T-12. Surface dry..."
              value={progressNote}
              onChange={(e) => setProgressNote(e.target.value)}
              className="w-full p-3 bg-surface-container-low rounded-xl text-xs text-on-surface border border-transparent focus:border-primary-container focus:outline-none"
            />
          </div>

          <div className="flex items-center justify-between pt-2">
            <button
              type="button"
              onClick={() => setShowBlockerForm(!showBlockerForm)}
              className="px-4 py-2 bg-error-container hover:bg-red-200 text-on-error-container text-xs font-semibold rounded-xl transition-colors flex items-center gap-1.5"
            >
              <span className="material-symbols-outlined text-[16px]">report_problem</span>
              <span>Report On-Site Blocker</span>
            </button>

            <button
              type="submit"
              disabled={saving}
              className="px-6 py-2.5 bg-primary-container hover:bg-primary text-white text-xs font-semibold rounded-xl shadow transition-all flex items-center gap-1.5"
            >
              {saving ? 'Saving...' : 'Record Progress Update'}
            </button>
          </div>
        </form>

        {/* Blocker Form Drawer */}
        {showBlockerForm && (
          <form onSubmit={handleReportBlocker} className="p-4 rounded-xl bg-error-container/20 border border-error/30 space-y-3 animate-fade-in text-xs">
            <div className="flex items-center gap-2 text-error font-bold">
              <span className="material-symbols-outlined text-[18px]">warning</span>
              <span>Report Active Blocker to District Command</span>
            </div>
            <select
              value={blockerReason}
              onChange={(e) => setBlockerReason(e.target.value)}
              className="w-full p-2.5 bg-surface-container-lowest rounded-xl text-xs text-on-surface border border-outline-variant/40"
            >
              <option value="Traffic Congestion / Police Escort Required">Traffic Congestion / Police Escort Required</option>
              <option value="Missing Raw Asphalt / Cement Emulsion Delivery">Missing Raw Asphalt / Cement Emulsion Delivery</option>
              <option value="Inclement Weather / Severe Waterlogging">Inclement Weather / Severe Waterlogging</option>
              <option value="Underground Gas / Water Conduit Conflict">Underground Gas / Water Conduit Conflict</option>
              <option value="Hostile Obstacle / Road Block">Hostile Obstacle / Road Block</option>
            </select>
            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setShowBlockerForm(false)}
                className="px-3 py-1.5 bg-surface-container rounded-lg text-xs font-semibold text-on-surface"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-4 py-1.5 bg-error text-white rounded-lg text-xs font-semibold hover:bg-red-700"
              >
                Log Blocker
              </button>
            </div>
          </form>
        )}
      </div>

      {/* Existing Notes Log */}
      <div className="bg-surface-container-lowest rounded-2xl p-6 shadow-sm border border-outline-variant/30 space-y-3">
        <h4 className="font-title text-sm font-bold text-on-surface">Existing Site Notes Timeline</h4>
        <div className="space-y-2">
          {task.progressNotes && task.progressNotes.length > 0 ? (
            task.progressNotes.map((pn, i) => (
              <div key={i} className="p-3 rounded-xl bg-surface-container-low text-xs space-y-0.5">
                <div className="flex justify-between text-tertiary">
                  <span className="font-semibold text-on-surface">{pn.author}</span>
                  <span className="font-code text-[11px]">{new Date(pn.timestamp).toLocaleTimeString()}</span>
                </div>
                <p className="text-on-surface-variant">{pn.note}</p>
              </div>
            ))
          ) : (
            <p className="text-xs text-tertiary">No notes logged yet.</p>
          )}
        </div>
      </div>
    </div>
  );
};
