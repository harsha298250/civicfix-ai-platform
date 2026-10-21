import React from 'react';
import { Link } from 'react-router-dom';
import { useApp } from '../../context/AppContext';
import { Breadcrumb } from '../../components/common/Breadcrumb';

export const WorkerNotificationsPage = () => {
  const { notifications, markNotificationRead } = useApp();

  const workerNotifs = notifications.filter(n => n.role === 'WORKER' || n.role === 'ALL');

  return (
    <div className="w-full flex flex-col gap-6">
      <Breadcrumb
        items={[
          { label: 'Field Ops', path: '/worker/dashboard', icon: 'engineering' },
          { label: 'Worker Notifications' }
        ]}
      />

      <div>
        <h1 className="font-headline-lg text-2xl sm:text-3xl font-extrabold text-on-surface tracking-tight">
          Field Dispatch Alerts
        </h1>
        <p className="text-body-md text-sm text-on-surface-variant mt-1">
          Work order dispatches, priority escalations, and officer verification feedback.
        </p>
      </div>

      <div className="bg-surface-container-lowest rounded-2xl p-6 shadow-sm border border-outline-variant/30 space-y-3">
        {workerNotifs.map(n => (
          <div
            key={n.id}
            className={`p-4 rounded-xl border transition-all flex items-start justify-between gap-4 ${
              n.read ? 'bg-surface-container-low/40 border-outline-variant/30' : 'bg-surface-container-low border-primary-container/40 shadow-sm'
            }`}
          >
            <div className="flex items-start gap-3">
              <div className="w-9 h-9 rounded-xl bg-primary-container text-white flex items-center justify-center shrink-0">
                <span className="material-symbols-outlined text-[20px]">assignment_add</span>
              </div>
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <h3 className="font-title text-sm font-bold text-on-surface">{n.title}</h3>
                  {!n.read && (
                    <span className="px-2 py-0.2 rounded-full bg-secondary text-white text-[10px] font-bold">
                      NEW
                    </span>
                  )}
                </div>
                <p className="text-xs text-on-surface-variant">{n.message}</p>
                <span className="text-[11px] text-tertiary block font-code">{n.time}</span>
              </div>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              {n.referenceId && (
                <Link
                  to={`/worker/tasks/${n.referenceId}`}
                  onClick={() => markNotificationRead(n.id)}
                  className="px-3 py-1.5 rounded-lg bg-surface-container hover:bg-primary-container hover:text-white text-xs font-semibold text-on-surface transition-colors"
                >
                  View Task
                </Link>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
