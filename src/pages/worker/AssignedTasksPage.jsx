import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { useApp } from '../../context/AppContext';
import { StatusBadge } from '../../components/common/StatusBadge';
import { PriorityBadge } from '../../components/common/PriorityBadge';
import { Breadcrumb } from '../../components/common/Breadcrumb';

export const AssignedTasksPage = () => {
  const { complaints, currentUser } = useApp();
  const [filter, setFilter] = useState('ALL');

  const myTasks = complaints.filter(
    c => c.assignedWorker?.id === currentUser.id || c.assignedWorker?.name === currentUser.name || c.status === 'ASSIGNED' || c.status === 'IN_PROGRESS'
  );

  const filtered = myTasks.filter(t => {
    if (filter === 'ALL') return true;
    return t.status === filter;
  });

  return (
    <div className="w-full flex flex-col gap-6">
      <Breadcrumb
        items={[
          { label: 'Field Ops', path: '/worker/dashboard', icon: 'engineering' },
          { label: 'Assigned Work Orders' }
        ]}
      />

      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="font-headline-lg text-2xl sm:text-3xl font-extrabold text-on-surface tracking-tight">
            Assigned Work Orders & Dispatches
          </h1>
          <p className="text-body-md text-sm text-on-surface-variant mt-1">
            Real-time queue of field repair orders assigned to {currentUser.name} ({currentUser.department}).
          </p>
        </div>

        <div className="flex items-center gap-1.5 bg-surface-container-low p-1 rounded-xl text-xs">
          {['ALL', 'ASSIGNED', 'IN_PROGRESS', 'RESOLUTION_SUBMITTED'].map(tab => (
            <button
              key={tab}
              onClick={() => setFilter(tab)}
              className={`px-3 py-1.5 rounded-lg font-semibold transition-all ${
                filter === tab
                  ? 'bg-primary-container text-white shadow-sm'
                  : 'text-tertiary hover:text-on-surface'
              }`}
            >
              {tab === 'ALL' ? 'All Tasks' : tab.replace('_', ' ')}
            </button>
          ))}
        </div>
      </div>

      <div className="space-y-3">
        {filtered.map(t => (
          <div
            key={t.id}
            className="bg-surface-container-lowest p-5 rounded-2xl shadow-sm border border-outline-variant/30 hover:border-primary-container/40 transition-all flex flex-col md:flex-row md:items-center justify-between gap-4"
          >
            <div className="space-y-1.5 min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <span className="font-code text-xs font-bold bg-surface-container text-on-surface px-2.5 py-0.5 rounded">
                  #{t.id}
                </span>
                <StatusBadge status={t.status} size="sm" />
                <PriorityBadge priority={t.priority} />
                <span className="text-[11px] text-tertiary font-code">
                  Target: {t.assignedWorker?.estimatedCompletion || '48h'}
                </span>
              </div>

              <h3 className="font-title text-base font-bold text-on-surface">
                {t.title}
              </h3>

              <div className="flex items-center gap-2 text-xs text-on-surface-variant">
                <span className="material-symbols-outlined text-[14px] text-tertiary">location_on</span>
                <span>{t.location?.address}</span>
                <span>•</span>
                <span className="text-primary-container font-semibold">{t.category}</span>
              </div>

              {t.progressPercent > 0 && (
                <div className="pt-1 flex items-center gap-2">
                  <div className="w-24 bg-surface-container-high rounded-full h-1.5 overflow-hidden">
                    <div className="bg-primary-container h-full rounded-full" style={{ width: `${t.progressPercent}%` }} />
                  </div>
                  <span className="text-[10px] text-tertiary font-code">{t.progressPercent}% completed</span>
                </div>
              )}
            </div>

            <div className="flex items-center gap-2 shrink-0">
              <Link
                to={`/worker/tasks/${t.id}/progress`}
                className="px-3.5 py-2 rounded-xl bg-surface-container hover:bg-surface-container-high text-xs font-semibold text-on-surface"
              >
                Progress Update
              </Link>
              <Link
                to={`/worker/tasks/${t.id}/evidence`}
                className="px-3.5 py-2 rounded-xl bg-primary-container hover:bg-primary text-white text-xs font-semibold shadow"
              >
                Submit Proof
              </Link>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
