import React, { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { officerService } from '../../services/officerService';
import { StatusBadge } from '../../components/common/StatusBadge';
import { PriorityBadge } from '../../components/common/PriorityBadge';
import { Breadcrumb } from '../../components/common/Breadcrumb';

export const VerificationQueuePage = () => {
  const [verificationItems, setVerificationItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchQueue = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const items = await officerService.getVerificationQueue();
      setVerificationItems(items);
    } catch (err) {
      console.error('Failed to load verification queue:', err);
      setError(err.message || 'Unable to load municipal resolution verification queue.');
      setVerificationItems([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchQueue();
  }, [fetchQueue]);

  return (
    <div className="w-full flex flex-col gap-6">
      <Breadcrumb
        items={[
          { label: 'Operations Command', path: '/officer/dashboard', icon: 'account_balance' },
          { label: 'Resolution Verification Queue' }
        ]}
      />

      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="font-headline-lg text-2xl sm:text-3xl font-extrabold text-on-surface tracking-tight">
            Resolution Verification Queue
          </h1>
          <p className="text-body-md text-sm text-on-surface-variant mt-1">
            Work orders completed by field maintenance crews awaiting official municipal officer sign-off.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={fetchQueue}
            disabled={loading}
            className="p-2 rounded-xl border border-outline-variant/40 hover:bg-surface-container text-on-surface text-xs font-semibold flex items-center gap-1.5 transition-colors disabled:opacity-50"
            title="Refresh Queue"
          >
            <span className={`material-symbols-outlined text-[16px] ${loading ? 'animate-spin' : ''}`}>
              refresh
            </span>
            <span className="hidden sm:inline">Refresh</span>
          </button>

          <div className="px-3.5 py-1.5 rounded-full bg-secondary text-white text-xs font-bold">
            {verificationItems.length} {verificationItems.length === 1 ? 'Case' : 'Cases'} Awaiting Adjudication
          </div>
        </div>
      </div>

      {/* Error State with Retry Button */}
      {error && (
        <div className="p-4 rounded-2xl bg-error-container/20 border border-error/30 text-on-surface flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 animate-fade-in">
          <div className="flex items-center gap-2 text-error">
            <span className="material-symbols-outlined text-[20px]">error</span>
            <span className="text-xs font-semibold">{error}</span>
          </div>
          <button
            type="button"
            onClick={fetchQueue}
            className="px-3 py-1.5 bg-error text-white rounded-xl text-xs font-semibold hover:bg-red-700 transition-colors shrink-0"
          >
            Retry Connection
          </button>
        </div>
      )}

      {/* Loading Skeleton */}
      {loading && (
        <div className="space-y-4 animate-pulse">
          {[1, 2, 3].map((n) => (
            <div
              key={n}
              className="bg-surface-container-lowest p-6 rounded-2xl border border-outline-variant/20 flex flex-col md:flex-row gap-6 items-center"
            >
              <div className="w-24 h-24 rounded-xl bg-surface-container shrink-0" />
              <div className="flex-1 space-y-3 w-full">
                <div className="h-4 bg-surface-container rounded w-1/4" />
                <div className="h-5 bg-surface-container rounded w-3/4" />
                <div className="h-3 bg-surface-container rounded w-1/2" />
              </div>
              <div className="w-32 h-10 bg-surface-container rounded-xl shrink-0" />
            </div>
          ))}
        </div>
      )}

      {/* Verification Items List */}
      {!loading && !error && (
        <div className="space-y-4">
          {verificationItems.length === 0 ? (
            <div className="text-center py-16 bg-surface-container-lowest rounded-2xl p-6 border border-outline-variant/30 space-y-3">
              <span className="material-symbols-outlined text-emerald-600 text-[48px]">task_alt</span>
              <h3 className="font-title text-base font-bold text-on-surface">Queue Clear!</h3>
              <p className="text-xs text-on-surface-variant max-w-sm mx-auto">
                All field repairs have been inspected and verified. You have zero pending verification requests.
              </p>
              <Link
                to="/officer/dashboard"
                className="inline-block px-4 py-2 rounded-xl bg-primary-container text-white text-xs font-semibold"
              >
                Back to Dashboard
              </Link>
            </div>
          ) : (
            verificationItems.map((c) => {
              const evidenceThumb = (c.resolutionEvidence?.photos && c.resolutionEvidence.photos[0]) || (c.photos && c.photos[0]);
              return (
                <div
                  key={c.id}
                  className="bg-surface-container-lowest p-6 rounded-2xl shadow-sm border border-secondary/30 hover:border-secondary transition-all flex flex-col md:flex-row items-start md:items-center justify-between gap-6"
                >
                  <div className="flex items-start gap-4 flex-1 min-w-0">
                    {/* Proof Thumbnail */}
                    <div className="w-24 h-24 rounded-xl overflow-hidden bg-surface-container shrink-0 border border-outline-variant/40 flex items-center justify-center">
                      {evidenceThumb ? (
                        <img
                          src={evidenceThumb}
                          alt="Repair evidence thumbnail"
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="flex flex-col items-center justify-center text-tertiary p-2 text-center">
                          <span className="material-symbols-outlined text-[24px]">no_photography</span>
                          <span className="text-[9px] mt-0.5 font-medium">No Photo</span>
                        </div>
                      )}
                    </div>

                    <div className="space-y-1.5 min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-code text-xs font-bold bg-surface-container text-on-surface px-2.5 py-0.5 rounded">
                          #{c.referenceId || c.id}
                        </span>
                        <StatusBadge status={c.status} size="sm" />
                        <PriorityBadge priority={c.priority} />
                        <span className="text-[11px] text-tertiary">
                          Crew Lead: <strong className="text-on-surface">{c.assignedWorker?.name || c.resolutionEvidence?.workerName || 'Marcus Chen'}</strong>
                        </span>
                      </div>

                      <h3 className="font-title text-base font-bold text-on-surface truncate">
                        {c.title}
                      </h3>

                      <p className="text-xs text-on-surface-variant line-clamp-1">
                        {c.resolutionEvidence?.notes || c.description}
                      </p>

                      <div className="flex flex-wrap items-center gap-2 text-xs text-tertiary pt-1">
                        <span className="material-symbols-outlined text-[14px]">location_on</span>
                        <span>{c.location?.address || c.address}</span>
                        <span>•</span>
                        <span className="text-on-surface-variant font-medium flex items-center gap-1">
                          <span className="material-symbols-outlined text-[13px] text-secondary">sensors</span>
                          <span>Field Evidence Attached (Device GPS Unverified)</span>
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 self-start md:self-center shrink-0">
                    <Link
                      to={`/officer/verifications/${c.referenceId || c.id}`}
                      className="px-5 py-2.5 rounded-xl bg-secondary hover:bg-secondary-container text-white text-xs font-semibold shadow-md transition-all flex items-center gap-1.5"
                    >
                      <span className="material-symbols-outlined text-[18px]">verified</span>
                      <span>Inspect Evidence & Sign Off</span>
                    </Link>
                  </div>
                </div>
              );
            })
          )}
        </div>
      )}
    </div>
  );
};
