import React, { useState } from 'react';

/**
 * ClosureTrustBadge
 * Displays the Closure Trust Score with color coding and an informative tooltip
 * showing the mathematical formula, sample size threshold (>= 5), and event breakdown.
 *
 * Formula: confirmed closures / (confirmed closures + citizen rejections + reopened after resolution)
 */
export default function ClosureTrustBadge({
  score,
  total = 0,
  confirmed = 0,
  rejected = 0,
  reopened = 0,
  statusMessage = null,
  size = 'md',
  showLabel = true
}) {
  const [showTooltip, setShowTooltip] = useState(false);

  const hasScore = score !== null && score !== undefined && total >= 5;

  let colorClasses = 'bg-slate-100 text-slate-600 border-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700';
  let badgeText = 'Not enough data (< 5)';

  if (hasScore) {
    if (score >= 80) {
      colorClasses = 'bg-emerald-50 text-emerald-700 border-emerald-300 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800';
    } else if (score >= 60) {
      colorClasses = 'bg-amber-50 text-amber-700 border-amber-300 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-800';
    } else {
      colorClasses = 'bg-rose-50 text-rose-700 border-rose-300 dark:bg-rose-950/40 dark:text-rose-300 dark:border-rose-800';
    }
    badgeText = `${score.toFixed(1)}%`;
  }

  const sizeClasses = {
    sm: 'text-xs px-2 py-0.5',
    md: 'text-sm px-2.5 py-1',
    lg: 'text-base px-3.5 py-1.5 font-bold'
  }[size] || 'text-sm px-2.5 py-1';

  return (
    <div
      className="relative inline-flex items-center"
      onMouseEnter={() => setShowTooltip(true)}
      onMouseLeave={() => setShowTooltip(false)}
      tabIndex={0}
      role="button"
      aria-label={`Closure Trust Score: ${hasScore ? badgeText : 'Not enough data'}`}
      onFocus={() => setShowTooltip(true)}
      onBlur={() => setShowTooltip(false)}
    >
      <div
        className={`inline-flex items-center gap-1.5 font-semibold rounded-full border cursor-help transition-all ${colorClasses} ${sizeClasses}`}
      >
        <span className="material-symbols-outlined text-[1em]">
          {hasScore ? (score >= 80 ? 'verified' : score >= 60 ? 'balance' : 'warning') : 'info'}
        </span>
        <span>{badgeText}</span>
        {showLabel && size !== 'sm' && (
          <span className="text-[0.75em] opacity-80 uppercase tracking-wider ml-0.5">
            Trust
          </span>
        )}
      </div>

      {showTooltip && (
        <div
          role="tooltip"
          className="absolute z-50 bottom-full left-1/2 -translate-x-1/2 mb-2 w-72 p-3 bg-slate-900 text-slate-100 rounded-lg shadow-xl text-xs space-y-2 pointer-events-none transition-opacity"
        >
          <div className="font-semibold text-slate-200 border-b border-slate-700 pb-1 flex items-center justify-between">
            <span>Closure Trust Score</span>
            <span className="text-[10px] text-primary-400 font-mono">
              {hasScore ? `${score.toFixed(1)}%` : 'Insufficient Data'}
            </span>
          </div>

          <div className="space-y-1 text-slate-300">
            <p className="font-medium text-[11px] text-slate-200">
              Formula:
            </p>
            <p className="font-mono text-[10px] bg-slate-800 p-1.5 rounded border border-slate-700 leading-relaxed text-primary-300">
              confirmed / (confirmed + rejected + reopened)
            </p>
          </div>

          <div className="space-y-1 text-[11px]">
            <div className="flex justify-between text-slate-300">
              <span>Sample size (n):</span>
              <span className="font-mono font-medium text-slate-100">{total} closures</span>
            </div>
            <div className="flex justify-between text-emerald-400">
              <span>• Confirmed closures:</span>
              <span className="font-mono font-medium">{confirmed}</span>
            </div>
            <div className="flex justify-between text-rose-400">
              <span>• Citizen rejections:</span>
              <span className="font-mono font-medium">{rejected}</span>
            </div>
            <div className="flex justify-between text-amber-400">
              <span>• Reopened after resolve:</span>
              <span className="font-mono font-medium">{reopened}</span>
            </div>
          </div>

          {total < 5 ? (
            <p className="text-[10px] text-amber-300 bg-amber-950/60 p-1.5 rounded border border-amber-800">
              * Minimum 5 closures required to calculate statistical trust score. Current: {total} / 5.
            </p>
          ) : (
            <p className="text-[10px] text-slate-400">
              {statusMessage || 'Calculated from verified status history records.'}
            </p>
          )}

          {/* Tooltip arrow */}
          <div className="absolute top-full left-1/2 -translate-x-1/2 -mt-1 border-4 border-transparent border-t-slate-900" />
        </div>
      )}
    </div>
  );
}

