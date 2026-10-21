import React from 'react';
import { Link } from 'react-router-dom';
import { useApp } from '../../context/AppContext';
import { Breadcrumb } from '../../components/common/Breadcrumb';

export const OfficerNotificationsPage = () => {
  const { notifications, markNotificationRead, markAllNotificationsRead } = useApp();

  const officerNotifs = notifications.filter(n => n.role === 'OFFICER' || n.role === 'ALL');
  const unreadCount = officerNotifs.filter(n => !n.read).length;

  return (
    <div className="w-full flex flex-col gap-6">
      <Breadcrumb
        items={[
          { label: 'Operations Command', path: '/officer/dashboard', icon: 'account_balance' },
          { label: 'Officer Notifications' }
        ]}
      />

      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="font-headline-lg text-2xl sm:text-3xl font-extrabold text-on-surface tracking-tight">
            Operational Alerts & Verification Signals
          </h1>
          <p className="text-body-md text-sm text-on-surface-variant mt-1">
            Incoming high hazard incident alerts and field completion notifications.
          </p>
        </div>

        {unreadCount > 0 && (
          <button
            type="button"
            onClick={markAllNotificationsRead}
            className="px-4 py-2 bg-surface-container hover:bg-surface-container-high text-on-surface text-xs font-semibold rounded-xl border border-outline-variant/30 transition-colors flex items-center gap-1.5 self-start sm:self-auto"
          >
            <span className="material-symbols-outlined text-[16px] text-secondary">done_all</span>
            <span>Mark All as Read ({unreadCount})</span>
          </button>
        )}
      </div>

      <div className="bg-surface-container-lowest rounded-2xl p-6 shadow-sm border border-outline-variant/30 space-y-3">
        {officerNotifs.map(n => (
          <div
            key={n.id}
            className={`p-4 rounded-xl border transition-all flex items-start justify-between gap-4 ${
              n.read
                ? 'bg-surface-container-low/40 border-outline-variant/30'
                : 'bg-surface-container-low border-secondary/40 shadow-sm'
            }`}
          >
            <div className="flex items-start gap-3">
              <div
                className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${
                  n.type === 'NEW_COMPLAINT'
                    ? 'bg-error text-white'
                    : 'bg-secondary text-white'
                }`}
              >
                <span className="material-symbols-outlined text-[20px]">
                  {n.type === 'NEW_COMPLAINT' ? 'warning' : 'verified'}
                </span>
              </div>
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <h3 className="font-title text-sm font-bold text-on-surface">{n.title}</h3>
                  {!n.read && (
                    <span className="px-2 py-0.2 rounded-full bg-error text-white text-[10px] font-bold">
                      ACTION REQUIRED
                    </span>
                  )}
                </div>
                <p className="text-xs text-on-surface-variant">{n.message}</p>
                <span className="text-[11px] text-tertiary block font-code">{n.time}</span>
              </div>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              {!n.read && (
                <button
                  type="button"
                  onClick={() => markNotificationRead(n.id)}
                  className="px-2.5 py-1.5 rounded-lg text-xs font-semibold text-tertiary hover:text-on-surface hover:bg-surface-container transition-colors"
                  title="Mark as read"
                >
                  Mark Read
                </button>
              )}
              {n.referenceId && (
                <Link
                  to={n.type === 'NEW_COMPLAINT' ? `/officer/complaints/${n.referenceId}/review` : `/officer/verifications/${n.referenceId}`}
                  onClick={() => markNotificationRead(n.id)}
                  className="px-3 py-1.5 rounded-lg bg-surface-container hover:bg-primary-container hover:text-white text-xs font-semibold text-on-surface transition-colors"
                >
                  Inspect Case
                </Link>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
