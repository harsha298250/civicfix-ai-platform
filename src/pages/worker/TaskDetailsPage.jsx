import React, { useState, useEffect, useCallback } from 'react';
import { useParams, Link } from 'react-router-dom';
import { workerService } from '../../services/workerService.js';
import { StatusBadge } from '../../components/common/StatusBadge';
import { PriorityBadge } from '../../components/common/PriorityBadge';
import { Breadcrumb } from '../../components/common/Breadcrumb';

export const TaskDetailsPage = () => {
  const { taskId } = useParams();

  const [task, setTask] = useState(null);
  const [loading, setLoading] = useState(true);
  const [errorState, setErrorState] = useState(null); // 'NOT_FOUND' | 'FORBIDDEN' | 'UNAUTHORIZED' | 'ERROR'
  const [errorMessage, setErrorMessage] = useState('');

  const fetchTaskDetail = useCallback(async () => {
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
      }
    } catch (err) {
      console.error('Failed to load worker task detail:', err);
      if (err.status === 404) {
        setErrorState('NOT_FOUND');
      } else if (err.status === 403) {
        setErrorState('FORBIDDEN');
      } else if (err.status === 401) {
        setErrorState('UNAUTHORIZED');
      } else {
        setErrorState('ERROR');
        setErrorMessage(err.message || 'Unable to retrieve work order specification from server.');
      }
      setTask(null);
    } finally {
      setLoading(false);
    }
  }, [taskId]);

  useEffect(() => {
    fetchTaskDetail();
  }, [fetchTaskDetail]);

  const [startingWork, setStartingWork] = useState(false);
  const handleStartWork = async () => {
    if (!task) return;
    setStartingWork(true);
    try {
      const updated = await workerService.startWork(task.id || task.referenceId);
      setTask(updated);
    } catch (err) {
      console.error('Failed to start work:', err);
      alert(err.data?.message || err.message || 'Failed to start work on site.');
    } finally {
      setStartingWork(false);
    }
  };

  // Loading State
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
          <h2 className="text-base font-bold text-on-surface">Retrieving Work Order Specification</h2>
          <p className="text-xs text-on-surface-variant">Connecting to municipal database for task #{taskId}...</p>
        </div>
      </div>
    );
  }

  // 404 Not Found State
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
            Task ID #{taskId} could not be located in assigned work orders. Please verify the ticket reference number.
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

  // 403 Forbidden State (Strict Ownership Enforcement)
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
            Task #{taskId} is not assigned to your crew or requires supervisor clearance. In accordance with municipal field protocols, technicians may only access repair orders assigned to their crew.
          </p>
          <Link
            to="/worker/tasks"
            className="inline-block px-5 py-2.5 bg-primary-container text-white text-xs font-semibold rounded-xl hover:bg-primary shadow-sm transition-colors"
          >
            Return to My Work Orders
          </Link>
        </div>
      </div>
    );
  }

  // 401 Unauthorized State
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
          <h2 className="text-xl font-bold text-on-surface">Session Expired or Unauthorized</h2>
          <p className="text-xs text-on-surface-variant max-w-md mx-auto leading-relaxed">
            You must be signed in with field worker permissions (ROLE_WORKER) to view work order specifications.
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

  // General Error State
  if (errorState === 'ERROR') {
    return (
      <div className="w-full max-w-4xl mx-auto flex flex-col gap-6">
        <Breadcrumb
          items={[
            { label: 'Field Ops', path: '/worker/dashboard', icon: 'engineering' },
            { label: 'Tasks', path: '/worker/tasks' },
            { label: 'Error' }
          ]}
        />
        <div className="p-6 bg-amber-500/10 border border-amber-500/30 rounded-2xl flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <span className="material-symbols-outlined text-amber-600 text-[28px]">warning</span>
            <div>
              <h3 className="font-bold text-sm text-on-surface">Unable to Load Work Order Specification</h3>
              <p className="text-xs text-on-surface-variant mt-0.5">{errorMessage}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={fetchTaskDetail}
              className="px-4 py-2 rounded-xl bg-primary-container text-white text-xs font-semibold hover:bg-primary transition-colors shrink-0"
            >
              Retry
            </button>
            <Link
              to="/worker/tasks"
              className="px-4 py-2 rounded-xl bg-surface-container text-on-surface text-xs font-semibold hover:bg-surface-container-high transition-colors shrink-0"
            >
              Back to Queue
            </Link>
          </div>
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
          { label: `Specification #${task.referenceId || task.id}` }
        ]}
      />

      <div className="bg-surface-container-lowest rounded-2xl p-6 sm:p-8 shadow-sm border border-outline-variant/30 space-y-6">
        {/* Header Section */}
        <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
          <div>
            <div className="flex flex-wrap items-center gap-2 mb-1">
              <span className="font-code text-xs font-bold bg-surface-container text-on-surface px-2.5 py-0.5 rounded">
                #{task.referenceId || task.id}
              </span>
              <StatusBadge status={task.status} size="sm" />
              <PriorityBadge priority={task.priority} />
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/10 text-emerald-700 border border-emerald-500/20">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-600 animate-pulse"></span>
                Live Backend
              </span>
            </div>
            <h1 className="font-headline-lg text-2xl font-bold text-on-surface mt-1">{task.title}</h1>
            <p className="text-xs text-on-surface-variant flex items-center gap-1 mt-1">
              <span className="material-symbols-outlined text-[15px] text-tertiary">location_on</span>
              <span>{task.location?.address || task.address}</span>
              {task.ward && <span>• {task.ward}</span>}
              <span>•</span>
              <span className="text-primary-container font-semibold">{task.category}</span>
            </p>
          </div>

          <div className="flex flex-wrap gap-2 shrink-0">
            {(task.status === 'ASSIGNED' || task.status === 'REWORK_REQUESTED') && (
              <button
                type="button"
                onClick={handleStartWork}
                disabled={startingWork}
                className="px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white text-xs font-semibold rounded-xl shadow transition-colors flex items-center gap-1.5"
              >
                {startingWork ? (
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
            )}
            <Link
              to={`/worker/tasks/${task.id || task.referenceId}/progress`}
              className="px-4 py-2 bg-surface-container hover:bg-surface-container-high text-on-surface text-xs font-semibold rounded-xl border border-outline-variant/30 transition-colors"
            >
              Update Progress
            </Link>
            <Link
              to={`/worker/tasks/${task.id || task.referenceId}/evidence`}
              className="px-4 py-2 bg-primary-container text-white text-xs font-semibold rounded-xl hover:bg-primary shadow transition-colors"
            >
              Submit Evidence
            </Link>
          </div>
        </div>

        {/* Dispatch & Crew Metadata */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 p-4 rounded-xl bg-surface-container-low text-xs border border-outline-variant/20">
          <div>
            <span className="text-tertiary block font-semibold">Assigned Technician</span>
            <span className="font-bold text-on-surface">{task.assignedWorker?.name || 'Assigned Crew'}</span>
            <span className="text-[11px] text-on-surface-variant block">{task.assignedWorker?.department || 'Field Ops'}</span>
          </div>
          <div>
            <span className="text-tertiary block font-semibold">Dispatching Officer</span>
            <span className="font-bold text-on-surface">{task.assignedOfficer?.name || 'Municipal Command'}</span>
            <span className="text-[11px] text-on-surface-variant block">{task.assignedOfficer?.email || 'Central Operations'}</span>
          </div>
          <div>
            <span className="text-tertiary block font-semibold">Target Completion SLA</span>
            <span className="font-bold text-secondary">{task.assignedWorker?.estimatedCompletion || '48 Hours'}</span>
            <span className="text-[11px] text-tertiary block">
              Reported: {new Date(task.createdAt).toLocaleDateString()}
            </span>
          </div>
        </div>

        {/* Narrative & Description */}
        <div className="space-y-2 text-xs">
          <span className="font-bold text-tertiary uppercase tracking-wider block">Task Specification & Hazard Context</span>
          <p className="text-on-surface text-sm leading-relaxed bg-surface-container-low p-4 rounded-xl border border-outline-variant/30 whitespace-pre-line">
            {task.description || 'No additional narrative provided in intake specification.'}
          </p>
        </div>

        {/* Equipment & Safety Protocols */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
          <div className="p-4 rounded-xl bg-surface-container-low space-y-2 border border-outline-variant/30">
            <span className="font-bold text-on-surface flex items-center gap-1.5">
              <span className="material-symbols-outlined text-primary text-[18px]">build</span>
              <span>Required Equipment Rig</span>
            </span>
            <ul className="list-disc list-inside space-y-1 text-on-surface-variant">
              <li>Service Rig with Roller Hitch & Compactor</li>
              <li>Cold-Mix / Hot-Mix Bitumen Asphalt Compound</li>
              <li>Compaction Vibratory Plate Tamper</li>
              <li>Traffic Safety Cones (Min. 8 units) & Perimeter Tape</li>
            </ul>
          </div>

          <div className="p-4 rounded-xl bg-surface-container-low space-y-2 border border-outline-variant/30">
            <span className="font-bold text-on-surface flex items-center gap-1.5">
              <span className="material-symbols-outlined text-secondary text-[18px]">shield</span>
              <span>OSHA & Safety Protocols</span>
            </span>
            <ul className="list-disc list-inside space-y-1 text-on-surface-variant">
              <li>Class 3 High-Visibility Reflective Vest & Hardhat</li>
              <li>Active Hazard Flashers on Service Vehicle</li>
              <li>Verify underground conduits & gas lines prior to tamper use</li>
              <li>Capture GPS Before & After photographic evidence</li>
            </ul>
          </div>
        </div>

        {/* Media / Citizen Intake Photos */}
        {task.photos && task.photos.length > 0 && (
          <div className="space-y-2 text-xs">
            <span className="font-bold text-tertiary uppercase tracking-wider block">Intake Reference Media</span>
            <div className="grid grid-cols-2 gap-3">
              {task.photos.map((p, i) => (
                <div key={i} className="rounded-xl overflow-hidden aspect-video bg-surface-container border border-outline-variant/40">
                  <img src={p} alt="Defect" className="w-full h-full object-cover" />
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Immutable Audit & Dispatch History Timeline */}
        <div className="space-y-3 pt-2">
          <span className="font-bold text-tertiary uppercase tracking-wider text-xs block">
            Dispatch & Status Progress History
          </span>
          <div className="space-y-2">
            {task.progressNotes && task.progressNotes.length > 0 ? (
              task.progressNotes.map((pn, i) => (
                <div
                  key={pn.id || i}
                  className="p-3.5 rounded-xl bg-surface-container-low text-xs border border-outline-variant/20 flex flex-col gap-1"
                >
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-on-surface">{pn.author}</span>
                    <span className="font-code text-[11px] text-tertiary">
                      {pn.timestamp ? new Date(pn.timestamp).toLocaleString() : ''}
                    </span>
                  </div>
                  <p className="text-on-surface-variant">{pn.note}</p>
                </div>
              ))
            ) : (
              <p className="text-xs text-tertiary italic">
                Initial work order logged in database. Status: {task.status}.
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default TaskDetailsPage;
