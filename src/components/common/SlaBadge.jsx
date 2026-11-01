import React from 'react';

/**
 * SlaBadge — Displays server-computed SLA state and escalation status.
 * Never calculates SLA state on the client; renders strictly from backend ComplaintResponse.
 */
export const SlaBadge = ({ slaState, slaDueAt, escalatedAt, showDueTime = true, className = '' }) => {
  const getBadgeConfig = () => {
    switch (slaState) {
      case 'ON_TRACK':
        return {
          label: 'On Track',
          bg: 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-400 dark:border-emerald-800',
          icon: 'schedule'
        };
      case 'DUE_SOON':
        return {
          label: 'Due Soon',
          bg: 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/40 dark:text-amber-400 dark:border-amber-800',
          icon: 'hourglass_bottom'
        };
      case 'OVERDUE':
        return {
          label: 'Overdue',
          bg: 'bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-950/40 dark:text-rose-400 dark:border-rose-800',
          icon: 'crisis_alert'
        };
      case 'STOPPED':
        return {
          label: 'SLA Met',
          bg: 'bg-slate-100 text-slate-600 border-slate-200 dark:bg-slate-800 dark:text-slate-400 dark:border-slate-700',
          icon: 'task_alt'
        };
      case 'NOT_SET':
      default:
        return {
          label: 'No SLA',
          bg: 'bg-slate-100 text-slate-500 border-slate-200 dark:bg-slate-800 dark:text-slate-400 dark:border-slate-700',
          icon: 'timer_off'
        };
    }
  };

  const config = getBadgeConfig();

  const formatDueAt = (dateStr) => {
    if (!dateStr) return null;
    try {
      const d = new Date(dateStr);
      return d.toLocaleDateString(undefined, {
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    } catch {
      return dateStr;
    }
  };

  return (
    <div className={`inline-flex items-center gap-1.5 flex-wrap ${className}`}>
      {/* SLA Status Chip */}
      <span
        className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold border ${config.bg}`}
        title={slaDueAt ? `SLA Due: ${new Date(slaDueAt).toLocaleString()}` : 'No SLA configured'}
      >
        <span className="material-symbols-outlined text-[14px]">{config.icon}</span>
        <span>{config.label}</span>
        {showDueTime && slaDueAt && slaState !== 'STOPPED' && (
          <span className="opacity-75 font-normal ml-0.5">· {formatDueAt(slaDueAt)}</span>
        )}
      </span>

      {/* Escalated Tag */}
      {escalatedAt && (
        <span
          className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-bold bg-red-100 text-red-800 border border-red-300 dark:bg-red-950/60 dark:text-red-300 dark:border-red-800 animate-pulse"
          title={`Escalated at: ${new Date(escalatedAt).toLocaleString()}`}
        >
          <span className="material-symbols-outlined text-[14px]">shield_alert</span>
          <span>ESCALATED</span>
        </span>
      )}
    </div>
  );
};

export default SlaBadge;
