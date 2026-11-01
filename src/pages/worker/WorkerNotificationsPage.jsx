import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useApp } from '../../context/AppContext';
import { Breadcrumb } from '../../components/common/Breadcrumb';

export const WorkerNotificationsPage = () => {
  const {
    notifications,
    unreadCount,
    notificationsLoading,
    notificationsPagination,
    refreshNotifications,
    markNotificationRead,
    markAllNotificationsRead
  } = useApp();

  const [unreadOnly, setUnreadOnly] = useState(false);

  useEffect(() => {
    refreshNotifications({ page: 0, size: 15, unreadOnly });
  }, [unreadOnly]);

  const handlePageChange = (newPage) => {
    if (newPage < 0 || newPage >= notificationsPagination.totalPages) return;
    refreshNotifications({ page: newPage, size: notificationsPagination.size, unreadOnly });
  };

  const getWorkerIcon = (type, severity) => {
    if (type === 'WORKER_ASSIGNED') {
      return { icon: 'assignment_add', bg: 'bg-primary-container text-white' };
    }
    if (type === 'REWORK_REQUESTED' || severity === 'WARNING') {
      return { icon: 'priority_high', bg: 'bg-amber-500/20 text-amber-500 border border-amber-500/30' };
    }
    if (type === 'COMPLAINT_RESOLVED' || severity === 'SUCCESS') {
      return { icon: 'task_alt', bg: 'bg-emerald-500/20 text-emerald-500 border border-emerald-500/30' };
    }
    return { icon: 'notifications', bg: 'bg-primary-container text-white' };
  };

  return (
    <div className="w-full flex flex-col gap-6">
      <Breadcrumb
        items={[
          { label: 'Field Ops', path: '/worker/dashboard', icon: 'engineering' },
          { label: 'Worker Notifications' }
        ]}
      />

      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="font-headline-lg text-2xl sm:text-3xl font-extrabold text-on-surface tracking-tight">
            Field Dispatch Alerts
          </h1>
          <p className="text-body-md text-sm text-on-surface-variant mt-1">
            Work order dispatches, priority escalations, and officer verification feedback.
          </p>
        </div>

        <div className="flex items-center gap-2 self-start sm:self-auto">
          {/* Unread Filter Toggle */}
          <div className="flex items-center bg-surface-container-low p-1 rounded-xl border border-outline-variant/30 text-xs font-semibold">
            <button
              type="button"
              onClick={() => setUnreadOnly(false)}
              className={`px-3 py-1.5 rounded-lg transition-colors ${
                !unreadOnly
                  ? 'bg-primary-container text-white shadow-sm'
                  : 'text-on-surface-variant hover:text-on-surface'
              }`}
            >
              All
            </button>
            <button
              type="button"
              onClick={() => setUnreadOnly(true)}
              className={`px-3 py-1.5 rounded-lg transition-colors flex items-center gap-1.5 ${
                unreadOnly
                  ? 'bg-primary-container text-white shadow-sm'
                  : 'text-on-surface-variant hover:text-on-surface'
              }`}
            >
              <span>Unread</span>
              {unreadCount > 0 && (
                <span className="px-1.5 py-0.2 rounded-full bg-error text-white text-[10px] font-bold">
                  {unreadCount}
                </span>
              )}
            </button>
          </div>

          {unreadCount > 0 && (
            <button
              type="button"
              onClick={markAllNotificationsRead}
              className="px-4 py-2 bg-surface-container hover:bg-surface-container-high text-on-surface text-xs font-semibold rounded-xl border border-outline-variant/30 transition-colors flex items-center gap-1.5 shadow-sm"
            >
              <span className="material-symbols-outlined text-[16px] text-secondary">done_all</span>
              <span>Mark All as Read ({unreadCount})</span>
            </button>
          )}
        </div>
      </div>

      <div className="bg-surface-container-lowest rounded-2xl p-6 shadow-sm border border-outline-variant/30 space-y-3">
        {notificationsLoading && notifications.length === 0 ? (
          <div className="text-center py-12 space-y-2">
            <span className="material-symbols-outlined animate-spin text-primary text-[32px]">sync</span>
            <p className="text-sm font-semibold text-on-surface">Loading dispatch notices...</p>
            <p className="text-xs text-tertiary">Connecting to municipal notification engine.</p>
          </div>
        ) : notifications.length === 0 ? (
          <div className="text-center py-12 space-y-2">
            <span className="material-symbols-outlined text-tertiary text-[36px]">notifications_paused</span>
            <p className="text-sm font-semibold text-on-surface">No field alerts pending.</p>
            <p className="text-xs text-tertiary">
              {unreadOnly ? 'All dispatch notifications have been reviewed.' : 'Your active field log is up to date.'}
            </p>
          </div>
        ) : (
          notifications.map(n => {
            const iconConfig = getWorkerIcon(n.type, n.severity);
            const targetPath = n.targetUrl || (n.referenceId ? `/worker/tasks/${n.referenceId}` : null);

            return (
              <div
                key={n.id}
                className={`p-4 rounded-xl border transition-all flex items-start justify-between gap-4 ${
                  n.read
                    ? 'bg-surface-container-low/40 border-outline-variant/30'
                    : 'bg-surface-container-low border-primary-container/40 shadow-sm'
                }`}
              >
                <div className="flex items-start gap-3">
                  <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${iconConfig.bg}`}>
                    <span className="material-symbols-outlined text-[20px]">{iconConfig.icon}</span>
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
                  {targetPath && (
                    <Link
                      to={targetPath}
                      onClick={() => !n.read && markNotificationRead(n.id)}
                      className="px-3 py-1.5 rounded-lg bg-surface-container hover:bg-primary-container hover:text-white text-xs font-semibold text-on-surface transition-colors"
                    >
                      View Task
                    </Link>
                  )}
                </div>
              </div>
            );
          })
        )}

        {/* Pagination Bar */}
        {notificationsPagination.totalPages > 1 && (
          <div className="flex items-center justify-between pt-4 border-t border-outline-variant/20">
            <button
              type="button"
              disabled={notificationsPagination.page === 0}
              onClick={() => handlePageChange(notificationsPagination.page - 1)}
              className="px-3 py-1.5 rounded-lg bg-surface-container hover:bg-surface-container-high disabled:opacity-40 disabled:pointer-events-none text-xs font-semibold text-on-surface transition-colors flex items-center gap-1"
            >
              <span className="material-symbols-outlined text-[16px]">chevron_left</span>
              <span>Previous</span>
            </button>

            <span className="text-xs text-on-surface-variant font-medium">
              Page {notificationsPagination.page + 1} of {notificationsPagination.totalPages}
            </span>

            <button
              type="button"
              disabled={notificationsPagination.last || notificationsPagination.page >= notificationsPagination.totalPages - 1}
              onClick={() => handlePageChange(notificationsPagination.page + 1)}
              className="px-3 py-1.5 rounded-lg bg-surface-container hover:bg-surface-container-high disabled:opacity-40 disabled:pointer-events-none text-xs font-semibold text-on-surface transition-colors flex items-center gap-1"
            >
              <span>Next</span>
              <span className="material-symbols-outlined text-[16px]">chevron_right</span>
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default WorkerNotificationsPage;
