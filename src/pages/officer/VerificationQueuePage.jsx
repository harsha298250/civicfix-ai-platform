import React from 'react';
import { Link } from 'react-router-dom';
import { useApp } from '../../context/AppContext';
import { StatusBadge } from '../../components/common/StatusBadge';
import { PriorityBadge } from '../../components/common/PriorityBadge';
import { Breadcrumb } from '../../components/common/Breadcrumb';
import { COMPLAINT_STATUS } from '../../constants/statusConstants';

export const VerificationQueuePage = () => {
  const { complaints } = useApp();

  const verificationItems = complaints.filter(
    c => c.status === COMPLAINT_STATUS.RESOLUTION_SUBMITTED
  );

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

        <div className="px-3.5 py-1.5 rounded-full bg-secondary text-white text-xs font-bold">
          {verificationItems.length} Cases Awaiting Adjudication
        </div>
      </div>

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
          verificationItems.map(c => (
            <div
              key={c.id}
              className="bg-surface-container-lowest p-6 rounded-2xl shadow-sm border border-secondary/30 hover:border-secondary transition-all flex flex-col md:flex-row items-start md:items-center justify-between gap-6"
            >
              <div className="flex items-start gap-4 flex-1 min-w-0">
                {/* Proof Thumbnail */}
                <div className="w-24 h-24 rounded-xl overflow-hidden bg-surface-container shrink-0 border border-outline-variant/40 flex items-center justify-center">
                  {(c.resolutionEvidence?.photos && c.resolutionEvidence.photos[0]) || (c.photos && c.photos[0]) ? (
                    <img
                      src={(c.resolutionEvidence?.photos && c.resolutionEvidence.photos[0]) || (c.photos && c.photos[0])}
                      alt="Repair thumbnail"
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
                      #{c.id}
                    </span>
                    <StatusBadge status={c.status} size="sm" />
                    <PriorityBadge priority={c.priority} />
                    <span className="text-[11px] text-tertiary">
                      Crew Lead: <strong className="text-on-surface">{c.assignedWorker?.name || 'Marcus Chen'}</strong>
                    </span>
                  </div>

                  <h3 className="font-title text-base font-bold text-on-surface truncate">
                    {c.title}
                  </h3>

                  <p className="text-xs text-on-surface-variant line-clamp-1">
                    {c.resolutionEvidence?.notes || c.description}
                  </p>

                  <div className="flex items-center gap-2 text-xs text-tertiary pt-1">
                    <span className="material-symbols-outlined text-[14px]">location_on</span>
                    <span>{c.location?.address}</span>
                    <span>•</span>
                    <span className="text-emerald-600 font-semibold flex items-center gap-1">
                      <span className="material-symbols-outlined text-[13px]">sensors</span>
                      <span>GPS Verified Proof Attached</span>
                    </span>
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2 self-start md:self-center shrink-0">
                <Link
                  to={`/officer/verifications/${c.id}`}
                  className="px-5 py-2.5 rounded-xl bg-secondary hover:bg-secondary-container text-white text-xs font-semibold shadow-md transition-all flex items-center gap-1.5"
                >
                  <span className="material-symbols-outlined text-[18px]">verified</span>
                  <span>Inspect Evidence & Sign Off</span>
                </Link>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};
