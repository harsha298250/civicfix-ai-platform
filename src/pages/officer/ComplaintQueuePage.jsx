import React, { useState, useEffect, useCallback } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { officerService } from '../../services/officerService.js';
import { StatusBadge } from '../../components/common/StatusBadge';
import { PriorityBadge } from '../../components/common/PriorityBadge';
import { Breadcrumb } from '../../components/common/Breadcrumb';
import { COMPLAINT_STATUS } from '../../constants/statusConstants';

export const ComplaintQueuePage = () => {
  const [searchParams] = useSearchParams();
  const queryFromUrl = searchParams.get('q') || '';

  const [complaints, setComplaints] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isUnauthorized, setIsUnauthorized] = useState(false);
  const [searchTerm, setSearchTerm] = useState(queryFromUrl);
  const [statusFilter, setStatusFilter] = useState('ALL');

  const fetchQueue = useCallback(async () => {
    setLoading(true);
    setError(null);
    setIsUnauthorized(false);
    try {
      const data = await officerService.getQueue();
      setComplaints(data);
    } catch (err) {
      console.error('Failed to fetch officer complaint queue:', err);
      if (err.status === 401 || err.status === 403) {
        setIsUnauthorized(true);
      }
      setError(err.message || 'Unable to connect to municipal complaint queue.');
      setComplaints([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchQueue();
  }, [fetchQueue]);

  const filtered = complaints.filter(c => {
    const term = searchTerm.toLowerCase();
    const matchesSearch =
      (c.title && c.title.toLowerCase().includes(term)) ||
      (c.id && c.id.toLowerCase().includes(term)) ||
      (c.referenceId && c.referenceId.toLowerCase().includes(term)) ||
      (c.location?.address && c.location.address.toLowerCase().includes(term)) ||
      (c.category && c.category.toLowerCase().includes(term));

    const matchesStatus =
      statusFilter === 'ALL' ? true :
      statusFilter === 'AWAITING' ? (c.status === COMPLAINT_STATUS.SUBMITTED || c.status === COMPLAINT_STATUS.UNDER_REVIEW) :
      statusFilter === 'ASSIGNED' ? c.status === COMPLAINT_STATUS.ASSIGNED :
      statusFilter === 'IN_PROGRESS' ? c.status === COMPLAINT_STATUS.IN_PROGRESS :
      statusFilter === 'VERIFICATION' ? c.status === COMPLAINT_STATUS.RESOLUTION_SUBMITTED :
      statusFilter === 'REOPENED' ? c.status === COMPLAINT_STATUS.REOPENED :
      statusFilter === 'PENDING_CITIZEN_CONFIRMATION' ? c.status === COMPLAINT_STATUS.PENDING_CITIZEN_CONFIRMATION :
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

      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <h1 className="font-headline-lg text-2xl sm:text-3xl font-extrabold text-on-surface tracking-tight">
              Municipal Complaint Queue
            </h1>
            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/10 text-emerald-700 border border-emerald-500/20">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-600 animate-pulse"></span>
              Live Backend
            </span>
          </div>
          <p className="text-body-md text-sm text-on-surface-variant mt-1">
            Review incoming public defect submissions, verify rule triage ratings, and dispatch personnel.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            type="button"
            onClick={fetchQueue}
            disabled={loading}
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-surface-container-high hover:bg-surface-container text-on-surface text-xs font-semibold border border-outline-variant/30 transition-colors"
            title="Refresh from PostgreSQL backend"
          >
            <span className={`material-symbols-outlined text-[16px] ${loading ? 'animate-spin' : ''}`}>
              refresh
            </span>
            <span>Refresh</span>
          </button>

          <Link
            to="/officer/verifications"
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-secondary text-white text-xs font-semibold shadow-sm hover:bg-secondary-container transition-colors"
          >
            <span className="material-symbols-outlined text-[18px]">verified</span>
            <span>Resolution Verification Queue</span>
          </Link>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-surface-container-lowest p-4 rounded-2xl shadow-sm border border-outline-variant/30 flex flex-col md:flex-row gap-3 items-center justify-between">
        <div className="relative flex-1 w-full">
          <span className="material-symbols-outlined absolute left-3 top-2.5 text-tertiary text-[18px]">
            search
          </span>
          <input
            type="text"
            placeholder="Search complaint ID (#CF-2026-...), defect title, category, or address..."
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
            { id: 'VERIFICATION', label: 'Verification Ready' },
            { id: 'PENDING_CITIZEN_CONFIRMATION', label: 'Awaiting Citizen' },
            { id: 'REOPENED', label: 'Reopened' }
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

      {/* Unauthorized State (401/403) */}
      {isUnauthorized && (
        <div className="p-6 bg-error-container/20 border border-error/30 rounded-2xl flex flex-col sm:flex-row items-center gap-4 text-center sm:text-left">
          <div className="w-12 h-12 rounded-xl bg-error/10 text-error flex items-center justify-center shrink-0">
            <span className="material-symbols-outlined text-[28px]">lock</span>
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="font-bold text-base text-on-surface">Officer Authorization Required</h3>
            <p className="text-xs text-on-surface-variant mt-1">
              You must be signed in with municipal officer permissions (ROLE_OFFICER) to access the live triage queue.
            </p>
          </div>
          <Link
            to="/login"
            className="px-4 py-2 rounded-xl bg-primary text-white text-xs font-semibold hover:bg-primary-container shrink-0"
          >
            Sign In as Municipal Officer
          </Link>
        </div>
      )}

      {/* General Error State */}
      {!isUnauthorized && error && (
        <div className="p-6 bg-amber-500/10 border border-amber-500/30 rounded-2xl flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <span className="material-symbols-outlined text-amber-600 text-[28px]">warning</span>
            <div>
              <h3 className="font-bold text-sm text-on-surface">Backend Queue Unavailable</h3>
              <p className="text-xs text-on-surface-variant mt-0.5">{error}</p>
            </div>
          </div>
          <button
            type="button"
            onClick={fetchQueue}
            className="px-4 py-2 rounded-xl bg-primary-container text-white text-xs font-semibold hover:bg-primary transition-colors shrink-0"
          >
            Retry Connection
          </button>
        </div>
      )}

      {/* Loading Skeleton */}
      {loading && !error && (
        <div className="space-y-3">
          {[1, 2, 3, 4].map(n => (
            <div
              key={n}
              className="bg-surface-container-lowest p-5 rounded-2xl border border-outline-variant/30 animate-pulse space-y-3"
            >
              <div className="flex items-center gap-3">
                <div className="h-5 w-24 bg-surface-container rounded"></div>
                <div className="h-5 w-20 bg-surface-container rounded-full"></div>
                <div className="h-5 w-16 bg-surface-container rounded"></div>
              </div>
              <div className="h-5 w-2/3 bg-surface-container rounded"></div>
              <div className="h-4 w-1/3 bg-surface-container rounded"></div>
            </div>
          ))}
        </div>
      )}

      {/* Queue Items */}
      {!loading && !error && (
        <div className="space-y-3">
          {filtered.length === 0 ? (
            <div className="bg-surface-container-lowest p-12 rounded-2xl border border-outline-variant/30 text-center space-y-3">
              <span className="material-symbols-outlined text-[48px] text-tertiary">
                {searchTerm || statusFilter !== 'ALL' ? 'filter_list_off' : 'inbox'}
              </span>
              <h3 className="text-base font-bold text-on-surface">No Complaints Found</h3>
              <p className="text-xs text-on-surface-variant max-w-sm mx-auto">
                {searchTerm || statusFilter !== 'ALL'
                  ? 'No complaints match the current filter and search criteria.'
                  : 'There are currently no active public complaints registered in the municipal database.'}
              </p>
              {(searchTerm || statusFilter !== 'ALL') && (
                <button
                  type="button"
                  onClick={() => { setSearchTerm(''); setStatusFilter('ALL'); }}
                  className="px-3.5 py-1.5 rounded-xl bg-surface-container text-xs font-semibold text-on-surface hover:bg-surface-container-high transition-colors"
                >
                  Clear Filters
                </button>
              )}
            </div>
          ) : (
            filtered.map(c => (
              <div
                key={c.id || c.referenceId}
                className="bg-surface-container-lowest p-5 rounded-2xl shadow-sm border border-outline-variant/30 hover:border-primary-container/40 transition-all flex flex-col md:flex-row md:items-center justify-between gap-4 group"
              >
                <div className="space-y-1.5 min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-code text-xs font-bold bg-surface-container text-on-surface px-2.5 py-0.5 rounded">
                      #{c.referenceId || c.id}
                    </span>
                    <StatusBadge status={c.status} size="sm" />
                    <PriorityBadge priority={c.priority} />
                    {c.aiTriage ? (
                      <span className="text-[10px] bg-secondary-fixed text-on-secondary-fixed font-bold px-2 py-0.5 rounded-full">
                        Rule-match score: {c.aiTriage.confidence != null ? `${c.aiTriage.confidence}%` : 'Not available'}
                      </span>
                    ) : (
                      <span className="text-[10px] bg-surface-container text-tertiary font-bold px-2 py-0.5 rounded-full">
                        Triage pending
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

                  <div className="flex items-center gap-2 text-xs text-on-surface-variant flex-wrap">
                    <span className="material-symbols-outlined text-[14px] text-tertiary">location_on</span>
                    <span>{c.location?.address || c.address}</span>
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
            ))
          )}
        </div>
      )}
    </div>
  );
};

export default ComplaintQueuePage;
