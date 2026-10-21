import React from 'react';
import { Link } from 'react-router-dom';
import { useApp } from '../../context/AppContext';
import { Breadcrumb } from '../../components/common/Breadcrumb';

export const CitizenNotificationsPage = () => {
  const { notifications, markNotificationRead } = useApp();

  const citizenNotifs = notifications.filter(n => n.role === 'CITIZEN' || n.role === 'ALL');

  return (
    <div className="w-full flex flex-col gap-6">
      <Breadcrumb
        items={[
          { label: 'Citizen Portal', path: '/citizen/dashboard', icon: 'home' },
          { label: 'Notifications' }
        ]}
      />

      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-headline-lg text-2xl sm:text-3xl font-extrabold text-on-surface tracking-tight">
            Notifications & Milestones
          </h1>
          <p className="text-body-md text-sm text-on-surface-variant mt-1">
            Real-time telemetry and dispatch updates on your reported defects.
          </p>
        </div>
      </div>

      <div className="bg-surface-container-lowest rounded-2xl p-6 shadow-sm border border-outline-variant/30 space-y-3">
        {citizenNotifs.length === 0 ? (
          <div className="text-center py-12 space-y-2">
            <span className="material-symbols-outlined text-tertiary text-[36px]">notifications_paused</span>
            <p className="text-sm font-semibold text-on-surface">You are all caught up!</p>
            <p className="text-xs text-tertiary">No pending alerts for your active complaints.</p>
          </div>
        ) : (
          citizenNotifs.map(n => (
            <div
              key={n.id}
              className={`p-4 rounded-xl border transition-all flex items-start justify-between gap-4 ${
                n.read
                  ? 'bg-surface-container-low/40 border-outline-variant/30'
                  : 'bg-surface-container-low border-primary-container/30 shadow-sm'
              }`}
            >
              <div className="flex items-start gap-3">
                <div
                  className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${
                    n.type === 'RESOLUTION'
                      ? 'bg-emerald-500/10 text-emerald-600'
                      : 'bg-primary-container text-white'
                  }`}
                >
                  <span className="material-symbols-outlined text-[20px]">
                    {n.type === 'RESOLUTION' ? 'verified' : 'engineering'}
                  </span>
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
                    to={`/citizen/complaints/${n.referenceId}`}
                    onClick={() => markNotificationRead(n.id)}
                    className="px-3 py-1.5 rounded-lg bg-surface-container hover:bg-primary-container hover:text-white text-xs font-semibold text-on-surface transition-colors"
                  >
                    View Ticket
                  </Link>
                )}
                {!n.read && (
                  <button
                    onClick={() => markNotificationRead(n.id)}
                    className="p-1.5 text-tertiary hover:text-on-surface rounded-lg"
                    title="Mark as read"
                  >
                    <span className="material-symbols-outlined text-[18px]">done</span>
                  </button>
                )}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};
