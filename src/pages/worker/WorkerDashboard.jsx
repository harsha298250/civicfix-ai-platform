import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useApp } from '../../context/AppContext';
import { StatusBadge } from '../../components/common/StatusBadge';
import { PriorityBadge } from '../../components/common/PriorityBadge';
import { COMPLAINT_STATUS } from '../../constants/statusConstants';

export const WorkerDashboard = () => {
  const { complaints, currentUser } = useApp();
  const navigate = useNavigate();

  // Tasks assigned to this crew
  const myTasks = complaints.filter(
    c => c.assignedWorker?.id === currentUser.id || c.status === COMPLAINT_STATUS.ASSIGNED || c.status === COMPLAINT_STATUS.IN_PROGRESS
  );

  const activeTask = myTasks.find(c => c.status === COMPLAINT_STATUS.IN_PROGRESS) || myTasks[0] || null;

  const inProgressCount = myTasks.filter(c => c.status === COMPLAINT_STATUS.IN_PROGRESS).length;
  const submittedCount = complaints.filter(c => c.status === COMPLAINT_STATUS.RESOLUTION_SUBMITTED).length;
  const completedCount = complaints.filter(c => c.status === COMPLAINT_STATUS.RESOLVED).length;

  return (
    <div className="w-full flex flex-col gap-6">
      {/* Active Crew Informational Banner matching Stitch Design */}
      <div className="bg-surface-container-lowest rounded-2xl shadow-sm border border-outline-variant/30 p-5 space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-3 bg-surface-container-low px-4 py-3 rounded-xl">
          <div className="flex flex-wrap items-center gap-4 text-xs">
            <div className="flex items-center gap-1.5 text-primary-container font-bold">
              <span className="w-2 h-2 rounded-full bg-primary animate-pulse" />
              <span>Active Field Dispatch Session</span>
            </div>
            <span className="text-gray-300">•</span>
            <div className="flex items-center gap-1">
              <span className="text-tertiary">Crew Lead:</span>
              <strong className="text-on-surface">{currentUser.name}</strong>
              <span className="font-code text-[11px] bg-surface-container-highest px-1.5 rounded">#FW-882</span>
            </div>
            <span className="text-gray-300">•</span>
            <div className="flex items-center gap-1 text-tertiary">
              <span>Unit:</span>
              <span className="text-on-surface font-semibold">{currentUser.department}</span>
            </div>
            <span className="text-gray-300">•</span>
            <div className="flex items-center gap-1 text-tertiary">
              <span>Rig:</span>
              <span className="text-primary-container font-semibold font-code">Van #14 (Roller T-12 hitched)</span>
            </div>
          </div>

          <div className="flex items-center gap-1.5 text-xs font-mono text-primary font-semibold">
            <span className="material-symbols-outlined text-[16px]">sensors</span>
            <span>Device Location Services Active</span>
          </div>
        </div>
      </div>

      {/* Top 4 KPI Metric Cards matching Stitch */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-surface-container-lowest p-5 rounded-2xl shadow-sm border border-outline-variant/30 flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-tertiary uppercase tracking-wider">Assigned to Me</span>
            <span className="material-symbols-outlined text-primary-container text-[20px]">assignment</span>
          </div>
          <div className="my-2">
            <span className="font-display text-3xl font-extrabold text-on-surface">{myTasks.length}</span>
          </div>
          <span className="text-[11px] text-secondary font-semibold">Scheduled in District 4</span>
        </div>

        <div className="bg-surface-container-lowest p-5 rounded-2xl shadow-sm border border-outline-variant/30 flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-tertiary uppercase tracking-wider">In Progress</span>
            <span className="material-symbols-outlined text-amber-600 text-[20px]">construction</span>
          </div>
          <div className="my-2">
            <span className="font-display text-3xl font-extrabold text-amber-700">{inProgressCount}</span>
          </div>
          <span className="text-[11px] text-amber-600 font-semibold">Active work on site</span>
        </div>

        <div className="bg-surface-container-lowest p-5 rounded-2xl shadow-sm border border-outline-variant/30 flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-tertiary uppercase tracking-wider">Submitted for Review</span>
            <span className="material-symbols-outlined text-secondary text-[20px]">fact_check</span>
          </div>
          <div className="my-2">
            <span className="font-display text-3xl font-extrabold text-secondary">{submittedCount}</span>
          </div>
          <span className="text-[11px] text-secondary font-semibold">Awaiting officer verification</span>
        </div>

        <div className="bg-surface-container-lowest p-5 rounded-2xl shadow-sm border border-outline-variant/30 flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-tertiary uppercase tracking-wider">Completed Verified</span>
            <span className="material-symbols-outlined text-emerald-600 text-[20px]">task_alt</span>
          </div>
          <div className="my-2">
            <span className="font-display text-3xl font-extrabold text-emerald-700">{completedCount}</span>
          </div>
          <span className="text-[11px] text-emerald-600 font-semibold">100% Quality pass</span>
        </div>
      </div>

      {/* Featured Active Task Card (Direct Workflow Launchpad) */}
      {activeTask ? (
        <section className="bg-surface-container-lowest rounded-2xl p-6 shadow-sm border border-primary-container/40 space-y-4 relative overflow-hidden">
          <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
            <div className="space-y-1.5">
              <div className="flex items-center gap-2">
                <span className="px-2.5 py-0.5 rounded-full bg-primary-container text-white text-[11px] font-bold uppercase tracking-wider">
                  CURRENT ACTIVE DISPATCH
                </span>
                <span className="font-code text-xs font-bold bg-surface-container px-2 py-0.5 rounded text-on-surface">
                  #{activeTask.id}
                </span>
                <StatusBadge status={activeTask.status} size="sm" />
                <PriorityBadge priority={activeTask.priority} />
              </div>

              <h2 className="font-headline-sm text-xl font-bold text-on-surface">
                {activeTask.title}
              </h2>

              <p className="text-xs text-on-surface-variant flex items-center gap-1">
                <span className="material-symbols-outlined text-[15px] text-tertiary">location_on</span>
                <span>{activeTask.location?.address}</span>
                <span>•</span>
                <span className="text-tertiary font-code">
                  Coords: {activeTask.location?.coordinates?.lat}° N, {activeTask.location?.coordinates?.lng}° E
                </span>
              </p>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              <Link
                to={`/worker/tasks/${activeTask.id}`}
                className="px-3.5 py-2 rounded-xl border border-outline-variant/40 hover:bg-surface-container text-xs font-semibold text-on-surface"
              >
                Inspect Task Spec
              </Link>
            </div>
          </div>

          {/* Progress Bar & Notes */}
          <div className="p-4 rounded-xl bg-surface-container-low border border-outline-variant/30 space-y-2">
            <div className="flex items-center justify-between text-xs">
              <span className="font-semibold text-on-surface">Current Repair Progress</span>
              <span className="font-code text-primary-container font-bold text-sm">
                {activeTask.progressPercent || 0}%
              </span>
            </div>
            <div className="w-full bg-surface-container-high rounded-full h-2.5 overflow-hidden">
              <div
                className="bg-primary-container h-full rounded-full transition-all duration-500"
                style={{ width: `${activeTask.progressPercent || 0}%` }}
              />
            </div>
            <p className="text-xs text-on-surface-variant italic">
              Latest update: {activeTask.progressNotes && activeTask.progressNotes.length > 0
                ? activeTask.progressNotes[activeTask.progressNotes.length - 1].note
                : 'Technician on-site.'}
            </p>
          </div>

          {/* Direct Workflow Buttons matching User Prompt Steps #8 and #9 */}
          <div className="flex flex-wrap items-center gap-3 pt-2">
            <Link
              to={`/worker/tasks/${activeTask.id}/progress`}
              className="px-4 py-2.5 rounded-xl bg-primary-container hover:bg-primary text-white text-xs font-semibold shadow transition-colors flex items-center gap-1.5"
            >
              <span className="material-symbols-outlined text-[16px]">pending_actions</span>
              <span>Update Progress / Report Blocker</span>
            </Link>

            <Link
              to={`/worker/tasks/${activeTask.id}/evidence`}
              className="px-4 py-2.5 rounded-xl bg-secondary hover:bg-secondary-container text-white text-xs font-semibold shadow transition-colors flex items-center gap-1.5"
            >
              <span className="material-symbols-outlined text-[16px]">fact_check</span>
              <span>Submit Repair Evidence for Review</span>
            </Link>

            <Link
              to={`/worker/tasks/${activeTask.id}`}
              className="px-4 py-2.5 rounded-xl bg-surface-container hover:bg-surface-container-high text-on-surface text-xs font-semibold transition-colors flex items-center gap-1.5"
            >
              <span className="material-symbols-outlined text-[16px]">location_on</span>
              <span>Task Location & Route</span>
            </Link>
          </div>
        </section>
      ) : (
        <section className="bg-surface-container-lowest rounded-2xl p-8 shadow-sm border border-outline-variant/30 text-center space-y-3">
          <span className="material-symbols-outlined text-[40px] text-tertiary">assignment_turned_in</span>
          <h2 className="text-base font-bold text-on-surface">No Active Work Orders</h2>
          <p className="text-xs text-on-surface-variant max-w-sm mx-auto leading-relaxed">
            You currently have no tasks in progress. View the assigned tasks queue to inspect new work orders.
          </p>
          <Link
            to="/worker/tasks"
            className="inline-block px-4 py-2 bg-primary-container text-white text-xs font-semibold rounded-xl hover:bg-primary transition-colors"
          >
            View Assigned Tasks
          </Link>
        </section>
      )}

      {/* Assigned Tasks Table */}
      <section className="bg-surface-container-lowest rounded-2xl p-6 shadow-sm border border-outline-variant/30 space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="font-title text-base font-bold text-on-surface">All Assigned Tasks ({myTasks.length})</h3>
          <Link to="/worker/tasks" className="text-xs font-semibold text-primary-container hover:underline">
            View All
          </Link>
        </div>

        <div className="space-y-3">
          {myTasks.map(t => (
            <div
              key={t.id}
              className="p-4 rounded-xl border border-outline-variant/40 hover:border-primary-container/40 bg-surface-container-lowest transition-all flex flex-col md:flex-row md:items-center justify-between gap-4"
            >
              <div className="space-y-1 min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-code text-xs font-bold bg-surface-container text-on-surface px-2.5 py-0.5 rounded">
                    #{t.id}
                  </span>
                  <StatusBadge status={t.status} size="sm" />
                  <PriorityBadge priority={t.priority} />
                </div>
                <h4 className="font-title text-sm font-bold text-on-surface truncate">{t.title}</h4>
                <p className="text-xs text-on-surface-variant flex items-center gap-1">
                  <span className="material-symbols-outlined text-[14px] text-tertiary">location_on</span>
                  <span>{t.location?.address}</span>
                </p>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                <Link
                  to={`/worker/tasks/${t.id}/progress`}
                  className="px-3 py-1.5 rounded-lg bg-surface-container hover:bg-surface-container-high text-xs font-semibold text-on-surface"
                >
                  Update Progress
                </Link>
                <Link
                  to={`/worker/tasks/${t.id}/evidence`}
                  className="px-3 py-1.5 rounded-lg bg-primary-container text-white text-xs font-semibold hover:bg-primary"
                >
                  Submit Proof
                </Link>
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
};
