import React, { useState, useEffect, useCallback } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useApp } from '../../context/AppContext';
import { workerService } from '../../services/workerService.js';
import { StatusBadge } from '../../components/common/StatusBadge';
import { PriorityBadge } from '../../components/common/PriorityBadge';
import { Breadcrumb } from '../../components/common/Breadcrumb';
import { COMPLAINT_STATUS } from '../../constants/statusConstants';

export const TaskProgressPage = () => {
  const { taskId } = useParams();
  const { refreshComplaints, showToast, currentUser } = useApp();

  const [task, setTask] = useState(null);
  const [loading, setLoading] = useState(true);
  const [errorState, setErrorState] = useState(null); // 'NOT_FOUND' | 'FORBIDDEN' | 'UNAUTHORIZED' | 'ERROR'
  const [errorMessage, setErrorMessage] = useState('');

  const [progressPercent, setProgressPercent] = useState(50);
  const [progressNote, setProgressNote] = useState('');
  const [blockerReason, setBlockerReason] = useState('Traffic Congestion / Police Escort Required');
  const [showBlockerForm, setShowBlockerForm] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const [actionError, setActionError] = useState(null);
  const [actionSuccess, setActionSuccess] = useState(null);

  const fetchTask = useCallback(async () => {
    if (!taskId || !String(taskId).trim()) {
      setErrorState('NOT_FOUND');
      setLoading(false);
      return;
    }

    setLoading(true);
    setErrorState(null);
    setErrorMessage('');

    try {
      const data = await workerService.getTaskDetail(taskId);
      if (!data) {
        setErrorState('NOT_FOUND');
      } else {
        setTask(data);
        if (data.progressPercent) {
          setProgressPercent(data.progressPercent);
        }
      }
    } catch (err) {
      console.error('Failed to load task for progress tracking:', err);
      if (err.status === 404) {
        setErrorState('NOT_FOUND');
      } else if (err.status === 403) {
        setErrorState('FORBIDDEN');
      } else if (err.status === 401) {
        setErrorState('UNAUTHORIZED');
      } else {
        setErrorState('ERROR');
        setErrorMessage(err.message || 'Unable to load task specification from server.');
      }
      setTask(null);
    } finally {
      setLoading(false);
    }
  }, [taskId]);

  useEffect(() => {
    fetchTask();
  }, [fetchTask]);

  // 1. Transition to IN_PROGRESS
  const handleStartWork = async () => {
    setActionLoading(true);
    setActionError(null);
    setActionSuccess(null);
    try {
      const updated = await workerService.startWork(
        task.id || task.referenceId,
        `Technician ${currentUser?.name || 'Marcus Chen'} arrived on site and initiated work perimeter.`
      );
      setTask(updated);
      setActionSuccess('Work order marked IN_PROGRESS on backend. Timer initiated.');
      showToast('Work started! Status transitioned to IN_PROGRESS.', 'success');
      refreshComplaints().catch(() => {});
    } catch (err) {
      console.error('Failed to start work:', err);
      const msg = err.data?.message || err.message || 'Failed to update work order status.';
      setActionError(msg);
      showToast(msg, 'error');
    } finally {
      setActionLoading(false);
    }
  };

  // 2. Save On-Site Progress Update
  const handleSaveProgress = async (e) => {
    e.preventDefault();
    if (!progressNote.trim()) {
      setActionError('Please enter a short description of the work completed so far.');
      return;
    }
    setActionLoading(true);
    setActionError(null);
    setActionSuccess(null);
    try {
      const noteContent = `Progress (${progressPercent}%): ${progressNote.trim()}`;
      const updated = await workerService.addProgressNote(task.id || task.referenceId, noteContent);
      setTask(updated);
      setProgressNote('');
      setActionSuccess(`Progress recorded (${progressPercent}%) in municipal audit history.`);
      showToast(`Progress update recorded (${progressPercent}%)!`, 'success');
      refreshComplaints().catch(() => {});
    } catch (err) {
      console.error('Failed to record progress:', err);
      const msg = err.data?.message || err.message || 'Failed to record progress note.';
      setActionError(msg);
      showToast(msg, 'error');
    } finally {
      setActionLoading(false);
    }
  };

  // 3. Report On-Site Blocker
  const handleReportBlocker = async (e) => {
    e.preventDefault();
    setActionLoading(true);
    setActionError(null);
    setActionSuccess(null);
    try {
      const updated = await workerService.reportBlocker(task.id || task.referenceId, blockerReason);
      setTask(updated);
      setShowBlockerForm(false);
      setActionSuccess(`Operational blocker logged in database for District Operations review.`);
      showToast(`Blocker reported for #${task.referenceId || task.id}!`, 'error');
      refreshComplaints().catch(() => {});
    } catch (err) {
      console.error('Failed to report blocker:', err);
      const msg = err.data?.message || err.message || 'Failed to report field blocker.';
      setActionError(msg);
      showToast(msg, 'error');
    } finally {
      setActionLoading(false);
    }
  };

  // Loading View
  if (loading) {
    return (
      <div className="w-full max-w-4xl mx-auto flex flex-col gap-6">
        <Breadcrumb
          items={[
            { label: 'Field Ops', path: '/worker/dashboard', icon: 'engineering' },
            { label: 'Tasks', path: '/worker/tasks' },
            { label: `Loading #${taskId}...` }
          ]}
        />
        <div className="bg-surface-container-lowest rounded-2xl p-12 shadow-sm border border-outline-variant/30 text-center max-w-lg mx-auto space-y-4">
          <span className="material-symbols-outlined text-[42px] text-primary-container animate-spin">
            progress_activity
          </span>
          <h2 className="text-base font-bold text-on-surface">Connecting to Work Order #{taskId}</h2>
          <p className="text-xs text-on-surface-variant">Retrieving live state machine records from backend...</p>
        </div>
      </div>
    );
  }

  // 404 Not Found View
  if (errorState === 'NOT_FOUND') {
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

  // 403 Forbidden View
  if (errorState === 'FORBIDDEN') {
    return (
      <div className="w-full max-w-4xl mx-auto flex flex-col gap-6">
        <Breadcrumb
          items={[
            { label: 'Field Ops', path: '/worker/dashboard', icon: 'engineering' },
            { label: 'Tasks', path: '/worker/tasks' },
            { label: 'Access Restricted' }
          ]}
        />
        <div className="text-center py-16 bg-surface-container-lowest rounded-2xl p-8 max-w-lg mx-auto shadow-sm border border-outline-variant/30 space-y-4">
          <div className="w-16 h-16 rounded-2xl bg-amber-500/10 text-amber-700 flex items-center justify-center mx-auto">
            <span className="material-symbols-outlined text-[36px]">lock</span>
          </div>
          <h2 className="text-xl font-bold text-on-surface">Work Order Restricted</h2>
          <p className="text-xs text-on-surface-variant max-w-md mx-auto leading-relaxed">
            Task #{taskId} is not assigned to your crew. In accordance with municipal field protocols, only assigned technicians may update work progress.
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

  // 401 Unauthorized View
  if (errorState === 'UNAUTHORIZED') {
    return (
      <div className="w-full max-w-4xl mx-auto flex flex-col gap-6">
        <Breadcrumb
          items={[
            { label: 'Field Ops', path: '/worker/dashboard', icon: 'engineering' },
            { label: 'Tasks', path: '/worker/tasks' },
            { label: 'Authentication Required' }
          ]}
        />
        <div className="text-center py-16 bg-surface-container-lowest rounded-2xl p-8 max-w-lg mx-auto shadow-sm border border-outline-variant/30 space-y-4">
          <div className="w-16 h-16 rounded-2xl bg-error/10 text-error flex items-center justify-center mx-auto">
            <span className="material-symbols-outlined text-[36px]">security</span>
          </div>
          <h2 className="text-xl font-bold text-on-surface">Authentication Required</h2>
          <p className="text-xs text-on-surface-variant max-w-md mx-auto leading-relaxed">
            You must be signed in with field technician permissions (ROLE_WORKER) to update progress.
          </p>
          <Link
            to="/login"
            className="inline-block px-5 py-2.5 bg-primary text-white text-xs font-semibold rounded-xl hover:bg-primary-container shadow-sm transition-colors"
          >
            Sign In to Field Portal
          </Link>
        </div>
      </div>
    );
  }

  if (!task) return null;

  return (
    <div className="w-full max-w-4xl mx-auto flex flex-col gap-6">
      <Breadcrumb
        items={[
          { label: 'Field Ops', path: '/worker/dashboard', icon: 'engineering' },
          { label: 'Tasks', path: '/worker/tasks' },
          { label: `Progress #${task.referenceId || task.id}` }
        ]}
      />

      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="font-code text-xs font-bold bg-surface-container text-on-surface px-2 py-0.5 rounded">
              #{task.referenceId || task.id}
            </span>
            <StatusBadge status={task.status} size="sm" />
            <PriorityBadge priority={task.priority} />
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/10 text-emerald-700 border border-emerald-500/20">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-600 animate-pulse"></span>
              Live Backend
            </span>
          </div>
          <h1 className="font-headline-lg text-2xl sm:text-3xl font-extrabold text-on-surface tracking-tight">
            Field Progress & Incident Log
          </h1>
          <p className="text-body-md text-sm text-on-surface-variant mt-1">
            {task.title} • {task.location?.address || task.address}
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Link
            to={`/worker/tasks/${task.id || task.referenceId}`}
            className="px-3.5 py-2 rounded-xl bg-surface-container hover:bg-surface-container-high text-xs font-semibold text-on-surface border border-outline-variant/30 flex items-center gap-1"
          >
            <span className="material-symbols-outlined text-[16px]">description</span>
            <span>Task Spec</span>
          </Link>
          <Link
            to={`/worker/tasks/${task.id || task.referenceId}/evidence`}
            className="px-4 py-2 rounded-xl bg-secondary hover:bg-secondary-container text-white text-xs font-semibold shadow transition-colors flex items-center gap-1.5 shrink-0"
          >
            <span className="material-symbols-outlined text-[16px]">fact_check</span>
            <span>Submit Repair Evidence</span>
          </Link>
        </div>
      </div>

      {/* Notification Banners */}
      {actionSuccess && (
        <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-800 text-xs flex items-center gap-2">
          <span className="material-symbols-outlined text-emerald-600 text-[18px]">check_circle</span>
          <span>{actionSuccess}</span>
        </div>
      )}

      {actionError && (
        <div className="p-4 rounded-xl bg-error-container/20 border border-error/30 text-on-error-container text-xs flex items-center gap-2">
          <span className="material-symbols-outlined text-error text-[18px]">error</span>
          <span>{actionError}</span>
        </div>
      )}

      {/* Start Work Banner if ASSIGNED or REWORK_REQUESTED */}
      {(task.status === COMPLAINT_STATUS.ASSIGNED || task.status === 'REWORK_REQUESTED') && (
        <div className="p-5 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <span className="material-symbols-outlined text-amber-700 text-[28px]">pending</span>
            <div>
              <h4 className="font-bold text-sm text-amber-900">
                {task.status === 'REWORK_REQUESTED' ? 'Rework Requested (Awaiting Crew Re-arrival)' : 'Work Order Assigned (Awaiting On-Site Arrival)'}
              </h4>
              <p className="text-xs text-amber-800">
                Click to confirm physical presence on site and transition ticket to IN_PROGRESS.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={handleStartWork}
            disabled={actionLoading}
            className="px-5 py-2.5 bg-amber-600 hover:bg-amber-700 text-white rounded-xl text-xs font-semibold shadow transition-colors shrink-0 flex items-center gap-1.5"
          >
            {actionLoading ? (
              <>
                <span className="material-symbols-outlined text-[16px] animate-spin">progress_activity</span>
                <span>Starting Work...</span>
              </>
            ) : (
              <>
                <span className="material-symbols-outlined text-[16px]">play_arrow</span>
                <span>Start Work on Site</span>
              </>
            )}
          </button>
        </div>
      )}

      {/* Progress Update Form */}
      <div className="bg-surface-container-lowest rounded-2xl p-6 sm:p-8 shadow-sm border border-outline-variant/30 space-y-6">
        <div className="flex items-center justify-between border-b border-outline-variant/20 pb-3">
          <h3 className="font-title text-base font-bold text-on-surface">Update Repair Progress</h3>
          <span className="text-xs font-semibold text-tertiary">
            Current Status: <span className="text-primary font-bold">{task.status}</span>
          </span>
        </div>

        <form onSubmit={handleSaveProgress} className="space-y-5">
          {/* Slider */}
          <div className="space-y-2">
            <div className="flex justify-between text-xs">
              <span className="font-semibold text-on-surface">Target Completion Milestone</span>
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
              disabled={actionLoading}
              className="px-6 py-2.5 bg-primary-container hover:bg-primary text-white text-xs font-semibold rounded-xl shadow transition-all flex items-center gap-1.5"
            >
              {actionLoading ? 'Recording...' : 'Record Progress Update'}
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
                disabled={actionLoading}
                className="px-4 py-1.5 bg-error text-white rounded-lg text-xs font-semibold hover:bg-red-700"
              >
                {actionLoading ? 'Logging...' : 'Log Blocker to Command'}
              </button>
            </div>
          </form>
        )}
      </div>

      {/* Existing Notes Log Timeline */}
      <div className="bg-surface-container-lowest rounded-2xl p-6 shadow-sm border border-outline-variant/30 space-y-3">
        <h4 className="font-title text-sm font-bold text-on-surface">Existing Site Notes Timeline</h4>
        <div className="space-y-2">
          {task.progressNotes && task.progressNotes.length > 0 ? (
            task.progressNotes.map((pn, i) => (
              <div key={pn.id || i} className="p-3 rounded-xl bg-surface-container-low text-xs space-y-0.5">
                <div className="flex justify-between text-tertiary">
                  <span className="font-semibold text-on-surface">{pn.author}</span>
                  <span className="font-code text-[11px]">
                    {pn.timestamp ? new Date(pn.timestamp).toLocaleString() : ''}
                  </span>
                </div>
                <p className="text-on-surface-variant">{pn.note}</p>
              </div>
            ))
          ) : (
            <p className="text-xs text-tertiary italic">No notes logged in audit history yet.</p>
          )}
        </div>
      </div>
    </div>
  );
};

export default TaskProgressPage;
