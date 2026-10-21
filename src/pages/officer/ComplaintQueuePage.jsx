import React, { useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { useApp } from '../../context/AppContext';
import { StatusBadge } from '../../components/common/StatusBadge';
import { PriorityBadge } from '../../components/common/PriorityBadge';
import { Breadcrumb } from '../../components/common/Breadcrumb';
import { COMPLAINT_STATUS } from '../../constants/statusConstants';

export const ComplaintQueuePage = () => {
  const { complaints } = useApp();
  const [searchParams] = useSearchParams();
  const queryFromUrl = searchParams.get('q') || '';

  const [searchTerm, setSearchTerm] = useState(queryFromUrl);
  const [statusFilter, setStatusFilter] = useState('ALL');

  const filtered = complaints.filter(c => {
    const matchesSearch =
      c.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      c.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
      c.location?.address?.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesStatus =
      statusFilter === 'ALL' ? true :
      statusFilter === 'AWAITING' ? (c.status === COMPLAINT_STATUS.SUBMITTED || c.status === COMPLAINT_STATUS.UNDER_REVIEW) :
      statusFilter === 'ASSIGNED' ? c.status === COMPLAINT_STATUS.ASSIGNED :
      statusFilter === 'IN_PROGRESS' ? c.status === COMPLAINT_STATUS.IN_PROGRESS :
      statusFilter === 'VERIFICATION' ? c.status === COMPLAINT_STATUS.RESOLUTION_SUBMITTED :
      c.status === statusFilter;

    return matchesSearch && matchesStatus;
  });

  return (
    <div className="w-full flex flex-col gap-6">
      <Breadcrumb
        items={[
          { label: 'Operations Command', path: '/officer/dashboard', icon: 'account_balance' },
          { label: 'Complaint Queue' }
        ]}
      />

      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="font-headline-lg text-2xl sm:text-3xl font-extrabold text-on-surface tracking-tight">
            Municipal Complaint Queue
          </h1>
          <p className="text-body-md text-sm text-on-surface-variant mt-1">
            Review incoming public defect submissions, verify AI triage ratings, and dispatch personnel.
          </p>
        </div>

        <Link
          to="/officer/verifications"
          className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-secondary text-white text-xs font-semibold shadow-sm hover:bg-secondary-container"
        >
          <span className="material-symbols-outlined text-[18px]">verified</span>
          <span>Resolution Verification Queue</span>
        </Link>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-surface-container-lowest p-4 rounded-2xl shadow-sm border border-outline-variant/30 flex flex-col md:flex-row gap-3 items-center justify-between">
        <div className="relative flex-1 w-full">
          <span className="material-symbols-outlined absolute left-3 top-2.5 text-tertiary text-[18px]">
            search
          </span>
          <input
            type="text"
            placeholder="Search complaint ID (#CF-2026-00124), defect title, or intersection..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-4 py-2 bg-surface-container-low rounded-xl text-xs text-on-surface placeholder:text-outline border border-transparent focus:border-primary-container focus:bg-surface-container-lowest focus:outline-none transition-all"
          />
        </div>

        <div className="flex flex-wrap items-center gap-1.5 w-full md:w-auto">
          {[
            { id: 'ALL', label: 'All Items' },
            { id: 'AWAITING', label: 'Awaiting Triage' },
            { id: 'ASSIGNED', label: 'Assigned' },
            { id: 'IN_PROGRESS', label: 'In Progress' },
            { id: 'VERIFICATION', label: 'Verification Ready' }
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setStatusFilter(tab.id)}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all ${
                statusFilter === tab.id
                  ? 'bg-primary-container text-white shadow-sm'
                  : 'bg-surface-container-low text-on-surface hover:bg-surface-container'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Queue Items */}
      <div className="space-y-3">
        {filtered.map(c => (
          <div
            key={c.id}
            className="bg-surface-container-lowest p-5 rounded-2xl shadow-sm border border-outline-variant/30 hover:border-primary-container/40 transition-all flex flex-col md:flex-row md:items-center justify-between gap-4 group"
          >
            <div className="space-y-1.5 min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <span className="font-code text-xs font-bold bg-surface-container text-on-surface px-2.5 py-0.5 rounded">
                  #{c.id}
                </span>
                <StatusBadge status={c.status} size="sm" />
                <PriorityBadge priority={c.priority} />
                {c.aiTriage && (
                  <span className="text-[10px] bg-secondary-fixed text-on-secondary-fixed font-bold px-2 py-0.5 rounded-full">
                    AI Match: {c.aiTriage.confidence}%
                  </span>
                )}
                <span className="text-[11px] text-tertiary flex items-center gap-1">
                  <span className="material-symbols-outlined text-[13px]">calendar_today</span>
                  <span>{new Date(c.createdAt).toLocaleDateString()}</span>
                </span>
              </div>

              <h3 className="font-title text-base font-bold text-on-surface group-hover:text-primary transition-colors">
                {c.title}
              </h3>

              <div className="flex items-center gap-2 text-xs text-on-surface-variant">
                <span className="material-symbols-outlined text-[14px] text-tertiary">location_on</span>
                <span>{c.location?.address}</span>
                <span>•</span>
                <span className="text-primary-container font-semibold">{c.category}</span>
                {c.assignedWorker && (
                  <>
                    <span>•</span>
                    <span className="text-secondary font-medium">Assigned: {c.assignedWorker.name}</span>
                  </>
                )}
              </div>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              {c.status === 'RESOLUTION_SUBMITTED' ? (
                <Link
                  to={`/officer/verifications/${c.id}`}
                  className="px-4 py-2 rounded-xl bg-secondary hover:bg-secondary-container text-white text-xs font-semibold transition-colors flex items-center gap-1.5 shadow-sm"
                >
                  <span className="material-symbols-outlined text-[16px]">verified</span>
                  <span>Verify Evidence</span>
                </Link>
              ) : c.assignedWorker ? (
                <Link
                  to={`/officer/complaints/${c.id}/review`}
                  className="px-4 py-2 rounded-xl bg-surface-container-high hover:bg-primary-container hover:text-white text-on-surface text-xs font-semibold transition-colors flex items-center gap-1.5 border border-outline-variant/30"
                >
                  <span className="material-symbols-outlined text-[16px]">assignment_turned_in</span>
                  <span>Manage Work Order</span>
                </Link>
              ) : (
                <Link
                  to={`/officer/complaints/${c.id}/review`}
                  className="px-4 py-2 rounded-xl bg-primary-container hover:bg-primary text-white text-xs font-semibold transition-colors flex items-center gap-1.5 shadow-sm"
                >
                  <span>Review & Dispatch</span>
                  <span className="material-symbols-outlined text-[16px]">arrow_forward</span>
                </Link>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
