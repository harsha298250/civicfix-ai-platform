import React, { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { useApp } from '../../context/AppContext';
import { officerService } from '../../services/officerService';
import { StatusBadge } from '../../components/common/StatusBadge';
import { PriorityBadge } from '../../components/common/PriorityBadge';
import { COMPLAINT_STATUS } from '../../constants/statusConstants';

export const OfficerDashboard = () => {
  const { currentUser } = useApp();
  const [summary, setSummary] = useState(null);
  const [queueComplaints, setQueueComplaints] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchDashboardData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [analyticsData, queueData] = await Promise.all([
        officerService.getAnalyticsSummary(),
        officerService.getQueue({ size: 5, page: 0 })
      ]);
      setSummary(analyticsData);
      setQueueComplaints(queueData || []);
    } catch (err) {
      console.error('Failed to load officer dashboard live data:', err);
      setError(err?.message || 'Cannot reach the server. Failed to fetch operations data.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchDashboardData();
  }, [fetchDashboardData]);

  // Real aggregate counts from database
  const statusCounts = summary?.countsByStatus || {};
  const awaitingReviewCount = (statusCounts.SUBMITTED || 0) + (statusCounts.UNDER_REVIEW || 0);
  const activeCrewsCount = statusCounts.IN_PROGRESS || 0;
  const verificationCount = statusCounts.RESOLUTION_SUBMITTED || 0;
  const openCount = Object.entries(statusCounts)
    .filter(([st]) => st !== COMPLAINT_STATUS.RESOLVED && st !== COMPLAINT_STATUS.REJECTED)
    .reduce((acc, [, cnt]) => acc + cnt, 0);

  return (
    <div className="w-full flex flex-col gap-6">
      {/* Command Strip / Page Header matching Stitch Design */}
      <div className="px-6 py-4 flex flex-col xl:flex-row xl:items-center xl:justify-between gap-4 bg-surface-container-lowest rounded-2xl shadow-sm border border-outline-variant/30">
        <div className="flex flex-col min-w-0">
          <div className="flex items-center gap-2">
            <span className="font-code text-xs text-primary font-bold tracking-wider uppercase">
              District Dispatch Hub
            </span>
            <span className="text-gray-300">•</span>
            <span className="inline-flex items-center gap-1 text-xs text-on-surface-variant font-medium">
              <span className={`w-2 h-2 rounded-full ${loading ? 'bg-amber-500' : 'bg-emerald-500 animate-pulse'}`} />
              {loading ? 'Refreshing Database Stream...' : 'Live SQL Telemetry Active'}
            </span>
          </div>
          <h1 className="font-headline-lg text-2xl sm:text-3xl font-extrabold text-on-surface tracking-tight mt-1">
            Operations Command Overview
          </h1>
          <p className="text-body-md text-sm text-on-surface-variant">
            Metropolitan District 4 · Real-time Civic Dispatch, Rule Triage & Verification
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <button
            type="button"
            onClick={fetchDashboardData}
            disabled={loading}
            className="px-3.5 py-2 bg-surface-container hover:bg-surface-container-high text-on-surface text-xs font-semibold rounded-xl transition-colors flex items-center gap-1.5 border border-outline-variant/30"
            title="Refresh Live Data"
          >
            <span className={`material-symbols-outlined text-[16px] ${loading ? 'animate-spin' : ''}`}>refresh</span>
            <span>Refresh</span>
          </button>
          <Link
            to="/officer/complaints"
            className="flex items-center gap-2 bg-primary hover:bg-primary-container text-white px-4 py-2 rounded-xl text-xs font-semibold shadow-sm transition-all"
          >
            <span className="material-symbols-outlined text-[18px]">assignment_turned_in</span>
            <span>Review Queue ({awaitingReviewCount})</span>
          </Link>
          <Link
            to="/officer/verifications"
            className="flex items-center gap-2 bg-secondary text-white hover:bg-secondary-container px-4 py-2 rounded-xl text-xs font-semibold shadow-sm transition-all"
          >
            <span className="material-symbols-outlined text-[18px]">verified</span>
            <span>Verifications ({verificationCount})</span>
          </Link>
          <Link
            to="/officer/analytics"
            className="flex items-center gap-2 bg-surface-container hover:bg-surface-container-high text-on-surface px-4 py-2 rounded-xl text-xs font-semibold shadow-sm transition-all"
          >
            <span className="material-symbols-outlined text-[18px]">insights</span>
            <span>Analytics Matrix</span>
          </Link>
        </div>
      </div>

      {error && (
        <div className="p-4 bg-error-container/20 border border-error/30 rounded-2xl flex items-center justify-between text-error text-xs font-semibold">
          <div className="flex items-center gap-2">
            <span className="material-symbols-outlined text-[20px]">error</span>
            <span>{error}</span>
          </div>
          <button
            onClick={fetchDashboardData}
            className="px-3 py-1 bg-error text-white rounded-lg text-xs font-bold hover:bg-error/90 transition-colors"
          >
            Retry
          </button>
        </div>
      )}

      {loading && !summary ? (
        <div className="p-16 text-center text-on-surface-variant flex flex-col items-center justify-center gap-3">
          <span className="material-symbols-outlined text-4xl animate-spin text-primary-container">progress_activity</span>
          <p className="text-sm font-semibold">Loading operations telemetry from PostgreSQL...</p>
        </div>
      ) : error && !summary ? (
        <div className="bg-surface-container-lowest rounded-2xl p-12 shadow-sm border border-red-200 text-center space-y-4">
          <span className="material-symbols-outlined text-[48px] text-red-600">cloud_off</span>
          <h2 className="text-lg font-bold text-on-surface">Operations Data Unavailable</h2>
          <p className="text-xs text-on-surface-variant max-w-sm mx-auto">{error}</p>
          <button
            onClick={fetchDashboardData}
            className="px-4 py-2 bg-primary-container text-white text-xs font-semibold rounded-xl shadow-sm hover:bg-primary transition-colors inline-flex items-center gap-1.5"
          >
            <span className="material-symbols-outlined text-[16px]">refresh</span>
            <span>Retry Connection</span>
          </button>
        </div>
      ) : (
        <>
          {/* Top 4 KPI Metrics Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Total Open */}
            <div className="bg-surface-container-lowest rounded-2xl p-5 shadow-sm border border-outline-variant/30 flex flex-col justify-between hover:shadow-md transition-shadow relative overflow-hidden">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-tertiary uppercase tracking-wider">Total Open</span>
                <span className="material-symbols-outlined text-tertiary text-[20px]">pending_actions</span>
              </div>
              <div className="my-2">
                <div className="font-display text-3xl font-extrabold text-on-surface">{openCount}</div>
              </div>
              <div className="flex items-center gap-1.5 text-primary text-xs font-semibold">
                <span className="material-symbols-outlined text-[16px]">trending_up</span>
                <span>Active tickets in jurisdiction</span>
              </div>
            </div>

            {/* Awaiting Review */}
            <div className="bg-surface-container-lowest rounded-2xl p-5 shadow-sm border border-outline-variant/30 flex flex-col justify-between hover:shadow-md transition-shadow relative overflow-hidden">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-tertiary uppercase tracking-wider">Awaiting Triage</span>
                <span className="px-2 py-0.5 rounded-full bg-error-container text-on-error-container text-[10px] font-bold">
                  High Priority
                </span>
              </div>
              <div className="my-2">
                <div className="font-display text-3xl font-extrabold text-error">{awaitingReviewCount}</div>
              </div>
              <div className="flex items-center gap-1 text-xs text-on-surface-variant font-medium">
                <span className="w-1.5 h-1.5 rounded-full bg-error" />
                <span>Requires officer assessment</span>
              </div>
            </div>

            {/* Active Field Crews */}
            <div className="bg-surface-container-lowest rounded-2xl p-5 shadow-sm border border-outline-variant/30 flex flex-col justify-between hover:shadow-md transition-shadow relative overflow-hidden">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-tertiary uppercase tracking-wider">Active Crews</span>
                <span className="material-symbols-outlined text-secondary text-[20px]">engineering</span>
              </div>
              <div className="my-2">
                <div className="font-display text-3xl font-extrabold text-secondary">{activeCrewsCount}</div>
              </div>
              <div className="flex items-center gap-1 text-xs text-on-surface-variant font-medium">
                <span className="text-secondary font-bold">Units deployed</span>
                <span>across District 4</span>
              </div>
            </div>

            {/* Verification Queue */}
            <div className="bg-surface-container-lowest rounded-2xl p-5 shadow-sm border border-outline-variant/30 flex flex-col justify-between hover:shadow-md transition-shadow relative overflow-hidden">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-tertiary uppercase tracking-wider">Awaiting Sign-Off</span>
                <span className="material-symbols-outlined text-emerald-600 text-[20px]">task_alt</span>
              </div>
              <div className="my-2">
                <div className="font-display text-3xl font-extrabold text-emerald-700">{verificationCount}</div>
              </div>
              <div className="flex items-center gap-1 text-xs text-on-surface-variant font-medium">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                <span>Evidence submitted by crew</span>
              </div>
            </div>
          </div>

          {/* Main Operations Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
            {/* Left Column: Priority Triage & Review Queue (8 cols) */}
            <div className="lg:col-span-8 bg-surface-container-lowest rounded-2xl p-6 shadow-sm border border-outline-variant/30 space-y-5">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="font-title text-base font-bold text-on-surface">Urgent Intake & Dispatch Queue</h2>
                  <p className="text-xs text-on-surface-variant">Review diagnostic assessment and assign maintenance units</p>
                </div>
                <Link
                  to="/officer/complaints"
                  className="text-xs font-semibold text-primary-container hover:underline flex items-center gap-1"
                >
                  <span>View Full Queue ({summary?.totalComplaints ?? queueComplaints.length})</span>
                  <span className="material-symbols-outlined text-[14px]">arrow_forward</span>
                </Link>
              </div>

              {queueComplaints.length === 0 ? (
                <div className="p-12 text-center text-on-surface-variant space-y-2">
                  <span className="material-symbols-outlined text-4xl text-slate-300">task_alt</span>
                  <p className="font-semibold text-sm">All complaints triaged and assigned</p>
                  <p className="text-xs text-tertiary">Zero backlog in District 4 operational dispatch.</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {queueComplaints.map(c => (
                    <div
                      key={c.id}
                      className="p-4 rounded-xl border border-outline-variant/40 hover:border-primary-container/40 bg-surface-container-lowest hover:bg-surface-container-low/30 transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-4"
                    >
                      <div className="space-y-1.5 min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="font-code text-xs font-bold bg-surface-container text-on-surface px-2.5 py-0.5 rounded">
                            #{c.id ? c.id.slice(0, 8) : ''}
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
                        </div>

                        <h3 className="font-title text-sm font-bold text-on-surface truncate">
                          {c.title}
                        </h3>

                        <div className="flex items-center gap-2 text-xs text-tertiary">
                          <span className="material-symbols-outlined text-[14px]">location_on</span>
                          <span className="truncate">{c.location?.address || c.address || 'Chennai'}</span>
                          <span>•</span>
                          <span className="text-primary-container font-semibold truncate">{c.category}</span>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        <Link
                          to={`/officer/complaints/${c.id}/review`}
                          className="px-3.5 py-2 rounded-xl bg-primary-container hover:bg-primary text-white text-xs font-semibold transition-colors flex items-center gap-1 shadow-sm"
                        >
                          <span>Assess & Dispatch</span>
                          <span className="material-symbols-outlined text-[16px]">arrow_forward</span>
                        </Link>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Right Column: Quick Analytics Snapshot & Map Link (4 cols) */}
            <div className="lg:col-span-4 space-y-6">
              {/* Performance Metrics */}
              <div className="bg-surface-container-lowest rounded-2xl p-5 shadow-sm border border-outline-variant/30 space-y-4">
                <div className="flex items-center justify-between">
                  <span className="font-title text-xs font-bold text-on-surface uppercase tracking-wider">
                    Performance Telemetry
                  </span>
                  <Link to="/officer/analytics" className="text-xs text-primary font-semibold hover:underline">
                    Detailed Matrix →
                  </Link>
                </div>

                <div className="space-y-3 text-xs">
                  <div className="p-3 rounded-xl bg-surface-container-low flex justify-between items-center">
                    <span className="text-tertiary">Mean Resolution Hours:</span>
                    <span className="font-display font-bold text-primary">
                      {summary?.averageResolutionHours != null ? `${summary.averageResolutionHours} hrs` : 'N/A'}
                    </span>
                  </div>
                  <div className="p-3 rounded-xl bg-surface-container-low flex justify-between items-center">
                    <span className="text-tertiary">First-Pass Rate:</span>
                    <span className="font-display font-bold text-secondary">
                      {summary?.reworkRate != null ? `${(100 - summary.reworkRate).toFixed(1)}%` : '100%'}
                    </span>
                  </div>
                  <div className="p-3 rounded-xl bg-surface-container-low flex justify-between items-center">
                    <span className="text-tertiary">SLA Status:</span>
                    <span className="font-semibold px-2 py-0.5 rounded text-[10px] bg-slate-200 text-slate-700">
                      {summary?.slaAdherenceRate != null ? `${summary.slaAdherenceRate}%` : 'SLA not configured'}
                    </span>
                  </div>
                  <div className="p-3 rounded-xl bg-surface-container-low flex justify-between items-center">
                    <span className="text-tertiary">Duplicates Linked:</span>
                    <span className="font-code font-bold text-on-surface">
                      {summary?.duplicatesLinked ?? 0}
                    </span>
                  </div>
                </div>
              </div>

              {/* Geographic Hotspot Link */}
              <div className="bg-surface-container-lowest rounded-2xl p-5 shadow-sm border border-outline-variant/30 space-y-3">
                <span className="font-title text-xs font-bold text-on-surface uppercase tracking-wider block">
                  Spatial Hotspot Density
                </span>
                <div className="p-4 rounded-xl bg-surface-container-low flex flex-col items-center text-center gap-2">
                  <span className="material-symbols-outlined text-3xl text-primary-container">map</span>
                  <p className="text-xs text-on-surface-variant">Explore live coordinate density and defect concentrations across Chennai.</p>
                  <Link
                    to="/officer/map"
                    className="mt-1 px-4 py-2 bg-primary text-white text-xs font-semibold rounded-xl shadow-sm hover:bg-primary-container transition-all"
                  >
                    Open Geographic Explorer
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default OfficerDashboard;
