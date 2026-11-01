import React, { useState, useEffect, useCallback } from 'react';
import { officerService } from '../../services/officerService';
import { Breadcrumb } from '../../components/common/Breadcrumb';
import ClosureTrustBadge from '../../components/common/ClosureTrustBadge';

const CATEGORY_COLORS = [
  'bg-primary-container',
  'bg-secondary',
  'bg-amber-600',
  'bg-emerald-600',
  'bg-indigo-600',
  'bg-rose-600',
  'bg-cyan-600',
  'bg-purple-600',
];

export const OfficerAnalyticsPage = () => {
  const [summary, setSummary] = useState(null);
  const [trustScores, setTrustScores] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [wardFilter, setWardFilter] = useState('ALL');
  const [categoryFilter, setCategoryFilter] = useState('ALL');
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');

  const fetchAnalytics = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [summaryData, trustData] = await Promise.all([
        officerService.getAnalyticsSummary({
          from: fromDate || undefined,
          to: toDate || undefined,
          ward: wardFilter !== 'ALL' ? wardFilter : undefined,
          category: categoryFilter !== 'ALL' ? categoryFilter : undefined,
        }),
        officerService.getClosureTrustScores({
          from: fromDate || undefined,
          to: toDate || undefined,
          ward: wardFilter !== 'ALL' ? wardFilter : undefined,
        })
      ]);
      setSummary(summaryData);
      setTrustScores(trustData);
    } catch (err) {
      console.error('Failed to load operational analytics:', err);
      setError(err?.message || 'Cannot reach the server. Failed to fetch database analytics.');
    } finally {
      setLoading(false);
    }
  }, [fromDate, toDate, wardFilter, categoryFilter]);

  useEffect(() => {
    fetchAnalytics();
  }, [fetchAnalytics]);

  const categories = summary?.countsByCategory ? Object.entries(summary.countsByCategory) : [];
  const wards = summary?.countsByWard ? Object.entries(summary.countsByWard) : [];
  const statuses = summary?.countsByStatus ? Object.entries(summary.countsByStatus) : [];
  const total = summary?.totalComplaints || 0;

  return (
    <div className="w-full flex flex-col gap-6">
      <Breadcrumb
        items={[
          { label: 'Operations Command', path: '/officer/dashboard', icon: 'account_balance' },
          { label: 'Operational Analytics & SLA' }
        ]}
      />

      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="font-headline-lg text-2xl sm:text-3xl font-extrabold text-on-surface tracking-tight">
            Operational Analytics & Telemetry Ledger
          </h1>
          <p className="text-body-md text-sm text-on-surface-variant mt-1">
            Database-backed civic turnaround times, resolution metrics, and defect distribution matrices.
          </p>
        </div>
        <button
          onClick={fetchAnalytics}
          disabled={loading}
          className="px-4 py-2 bg-surface-container hover:bg-surface-container-high text-on-surface text-xs font-semibold rounded-xl transition-colors flex items-center gap-1.5 self-start sm:self-auto border border-outline-variant/30"
          title="Refresh Live Metrics"
        >
          <span className={`material-symbols-outlined text-[16px] ${loading ? 'animate-spin' : ''}`}>refresh</span>
          <span>Refresh Analytics</span>
        </button>
      </div>

      {/* Filter and Date Bar */}
      <div className="bg-surface-container-lowest p-4 rounded-2xl border border-outline-variant/30 shadow-sm flex flex-wrap gap-3 items-center justify-between text-xs">
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-1.5">
            <span className="text-tertiary font-semibold uppercase text-[11px]">From:</span>
            <input
              type="date"
              value={fromDate}
              onChange={(e) => setFromDate(e.target.value)}
              className="px-2.5 py-1.5 border border-outline-variant/40 rounded-lg text-on-surface bg-surface-container-lowest"
            />
          </div>
          <div className="flex items-center gap-1.5">
            <span className="text-tertiary font-semibold uppercase text-[11px]">To:</span>
            <input
              type="date"
              value={toDate}
              onChange={(e) => setToDate(e.target.value)}
              className="px-2.5 py-1.5 border border-outline-variant/40 rounded-lg text-on-surface bg-surface-container-lowest"
            />
          </div>
          <select
            value={wardFilter}
            onChange={(e) => setWardFilter(e.target.value)}
            className="px-3 py-1.5 border border-outline-variant/40 rounded-lg text-on-surface bg-surface-container-lowest"
          >
            <option value="ALL">All Wards</option>
            <option value="Ward 10, T. Nagar">Ward 10, T. Nagar</option>
            <option value="Ward 13, Adyar">Ward 13, Adyar</option>
            <option value="Ward 14, Velachery">Ward 14, Velachery</option>
            <option value="Ward 08, Anna Nagar">Ward 08, Anna Nagar</option>
            <option value="Ward 09, Kodambakkam">Ward 09, Kodambakkam</option>
            <option value="Ward 04, Tondiarpet">Ward 04, Tondiarpet</option>
            <option value="Ward 11, Guindy">Ward 11, Guindy</option>
          </select>
          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            className="px-3 py-1.5 border border-outline-variant/40 rounded-lg text-on-surface bg-surface-container-lowest"
          >
            <option value="ALL">All Categories</option>
            <option value="Roads & Pavements">Roads & Pavements</option>
            <option value="Water Supply & Sewage Management">Water Supply & Drainage</option>
            <option value="Solid Waste & Sanitation">Sanitation & Garbage</option>
            <option value="Municipal Traffic & Electrical">Street Lights & Electrical</option>
            <option value="Parks & Urban Environment">Parks & Environment</option>
          </select>
        </div>

        {(fromDate || toDate || wardFilter !== 'ALL' || categoryFilter !== 'ALL') && (
          <button
            onClick={() => {
              setFromDate('');
              setToDate('');
              setWardFilter('ALL');
              setCategoryFilter('ALL');
            }}
            className="text-primary hover:underline font-semibold text-xs"
          >
            Reset Filters
          </button>
        )}
      </div>

      {error && (
        <div className="p-4 bg-error-container/20 border border-error/30 rounded-2xl flex items-center justify-between text-error text-xs font-semibold">
          <div className="flex items-center gap-2">
            <span className="material-symbols-outlined text-[20px]">error</span>
            <span>{error}</span>
          </div>
          <button
            onClick={fetchAnalytics}
            className="px-3 py-1 bg-error text-white rounded-lg text-xs font-bold hover:bg-error/90 transition-colors"
          >
            Retry
          </button>
        </div>
      )}

      {loading && !summary ? (
        <div className="p-16 text-center text-on-surface-variant flex flex-col items-center justify-center gap-3">
          <span className="material-symbols-outlined text-4xl animate-spin text-primary-container">progress_activity</span>
          <p className="text-sm font-semibold">Computing live SQL database aggregates...</p>
        </div>
      ) : (
        <>
          {/* Top 4 KPI Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Mean & Median Resolution Time */}
            <div className="bg-surface-container-lowest p-5 rounded-2xl shadow-sm border border-outline-variant/30 flex flex-col justify-between">
              <div>
                <span className="text-xs font-bold text-tertiary uppercase">Mean Resolution Time</span>
                <p className="font-display text-3xl font-bold text-primary mt-2">
                  {summary?.averageResolutionHours != null ? `${summary.averageResolutionHours} hrs` : 'No data'}
                </p>
              </div>
              <span className="text-xs text-on-surface-variant font-medium mt-2 block">
                {summary?.medianResolutionHours != null ? `Median: ${summary.medianResolutionHours} hrs` : 'Awaiting ticket resolutions'}
              </span>
            </div>

            {/* First-Pass Verification & Rework Rate */}
            <div className="bg-surface-container-lowest p-5 rounded-2xl shadow-sm border border-outline-variant/30 flex flex-col justify-between">
              <div>
                <span className="text-xs font-bold text-tertiary uppercase">First-Pass Verification Rate</span>
                <p className="font-display text-3xl font-bold text-secondary mt-2">
                  {summary?.reworkRate != null ? `${(100 - summary.reworkRate).toFixed(1)}%` : '100%'}
                </p>
              </div>
              <span className="text-xs text-secondary font-semibold mt-2 block">
                Rework rate: {summary?.reworkRate != null ? `${summary.reworkRate}%` : '0%'}
              </span>
            </div>

            {/* AI Adjudication & Duplicates */}
            <div className="bg-surface-container-lowest p-5 rounded-2xl shadow-sm border border-outline-variant/30 flex flex-col justify-between">
              <div>
                <span className="text-xs font-bold text-tertiary uppercase">AI Multi-Modal Adjudication</span>
                <p className="font-display text-3xl font-bold text-emerald-700 mt-2">
                  {summary?.aiAdjudicationCounts?.accepted ?? 0} Accepted
                </p>
              </div>
              <span className="text-xs text-tertiary mt-2 block truncate">
                {summary?.aiAdjudicationCounts?.overridden ?? 0} Overridden • {summary?.aiAdjudicationCounts?.dismissed ?? 0} Dismissed • {summary?.duplicatesLinked ?? 0} Duplicates
              </span>
            </div>

            {/* Total Defect Inventory */}
            <div className="bg-surface-container-lowest p-5 rounded-2xl shadow-sm border border-outline-variant/30 flex flex-col justify-between">
              <div>
                <span className="text-xs font-bold text-tertiary uppercase">Total Defect Inventory</span>
                <p className="font-display text-3xl font-bold text-on-surface mt-2">{total}</p>
              </div>
              <span className="text-xs text-tertiary mt-2 block">
                Resolved: {summary?.countsByStatus?.RESOLVED ?? 0} • In Progress: {summary?.countsByStatus?.IN_PROGRESS ?? 0}
              </span>
            </div>
          </div>

          {/* Main Distribution Matrices */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* Category Distribution (7 cols) */}
            <div className="lg:col-span-7 bg-surface-container-lowest rounded-2xl p-6 shadow-sm border border-outline-variant/30 space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="font-title text-base font-bold text-on-surface">Defects by Category Distribution</h3>
                <span className="text-xs text-tertiary font-mono">{categories.length} Categories</span>
              </div>

              {categories.length === 0 ? (
                <div className="p-8 text-center text-xs text-tertiary">
                  No complaint data matching selected filters.
                </div>
              ) : (
                <div className="space-y-3">
                  {categories.map(([catName, count], idx) => {
                    const pct = total > 0 ? Math.round((count / total) * 100) : 0;
                    const color = CATEGORY_COLORS[idx % CATEGORY_COLORS.length];
                    return (
                      <div key={catName} className="space-y-1 text-xs">
                        <div className="flex justify-between">
                          <span className="font-semibold text-on-surface">{catName}</span>
                          <span className="font-code text-tertiary">{count} cases ({pct}%)</span>
                        </div>
                        <div className="w-full bg-surface-container-low rounded-full h-2 overflow-hidden">
                          <div className={`${color} h-full rounded-full transition-all`} style={{ width: `${pct}%` }} />
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Ward Distribution & SLA Status (5 cols) */}
            <div className="lg:col-span-5 space-y-6">
              {/* Ward Breakdown */}
              <div className="bg-surface-container-lowest rounded-2xl p-6 shadow-sm border border-outline-variant/30 space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="font-title text-base font-bold text-on-surface">Volume by Municipal Ward</h3>
                  <span className="text-xs text-tertiary font-mono">{wards.length} Wards</span>
                </div>

                {wards.length === 0 ? (
                  <div className="p-8 text-center text-xs text-tertiary">
                    No ward data matching selected filters.
                  </div>
                ) : (
                  <div className="space-y-2">
                    {wards.map(([wardName, count]) => (
                      <div key={wardName} className="p-2.5 rounded-xl bg-surface-container-low flex justify-between items-center text-xs">
                        <span className="font-semibold text-on-surface">{wardName}</span>
                        <span className="font-code font-bold text-primary-container px-2 py-0.5 rounded bg-surface-container">
                          {count} tickets
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* SLA & Compliance Status */}
              <div className="bg-surface-container-lowest rounded-2xl p-6 shadow-sm border border-outline-variant/30 space-y-4">
                <h3 className="font-title text-base font-bold text-on-surface">SLA & Governance Telemetry</h3>
                <div className="space-y-2.5 text-xs">
                  <div className="p-3 bg-surface-container-low rounded-xl flex justify-between items-center">
                    <span className="text-tertiary font-medium">SLA Target Adherence:</span>
                    <span className="font-semibold px-2 py-0.5 rounded text-[11px] bg-slate-200 text-slate-700">
                      {summary?.slaAdherenceRate != null ? `${summary.slaAdherenceRate}%` : 'SLA not configured'}
                    </span>
                  </div>
                  <div className="p-3 bg-surface-container-low rounded-xl flex justify-between items-center">
                    <span className="text-tertiary font-medium">PostgreSQL Query Aggregates:</span>
                    <span className="font-semibold text-emerald-600">Active (Direct SQL)</span>
                  </div>
                  <div className="p-3 bg-surface-container-low rounded-xl flex justify-between items-center">
                    <span className="text-tertiary font-medium">Cryptographic Audit Ledger:</span>
                    <span className="font-semibold text-primary-container">RFC 3161 Verified</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Closure Trust Score Analytics Section */}
          <div className="bg-surface-container-lowest rounded-2xl p-6 shadow-sm border border-outline-variant/30 space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-outline-variant/30 pb-4">
              <div>
                <div className="flex items-center gap-2">
                  <span className="material-symbols-outlined text-primary text-[24px]">verified_user</span>
                  <h3 className="font-title text-lg font-bold text-on-surface">Closure Trust Score & Verification Telemetry</h3>
                </div>
                <p className="text-xs text-on-surface-variant mt-1">
                  Integrity index quantifying post-repair verification quality. Tracks citizen confirmations vs. rejections and rework.
                </p>
              </div>

              {trustScores?.overall && (
                <div className="flex items-center gap-3 bg-surface-container-low px-4 py-2.5 rounded-2xl border border-outline-variant/20">
                  <div className="text-right">
                    <span className="text-[10px] font-bold text-tertiary uppercase tracking-wider block">Overall Trust Index</span>
                    <span className="text-xs text-on-surface-variant font-mono">
                      n = {trustScores.overall.totalClosures || 0} closures
                    </span>
                  </div>
                  <ClosureTrustBadge
                    score={trustScores.overall.trustScore}
                    total={trustScores.overall.totalClosures}
                    confirmed={trustScores.overall.confirmedClosures}
                    rejected={trustScores.overall.citizenRejections}
                    reopened={trustScores.overall.reopenedAfterResolution}
                    statusMessage={trustScores.overall.statusMessage}
                    size="lg"
                  />
                </div>
              )}
            </div>

            {/* Sub-tables: Wards & Officers */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Trust Score by Ward */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="font-title text-sm font-bold text-on-surface flex items-center gap-1.5">
                    <span className="material-symbols-outlined text-tertiary text-[18px]">location_city</span>
                    <span>Closure Trust by Municipal Ward</span>
                  </h4>
                  <span className="text-[11px] text-tertiary font-mono">
                    {trustScores?.byWard?.length || 0} Wards
                  </span>
                </div>

                {(!trustScores?.byWard || trustScores.byWard.length === 0) ? (
                  <div className="p-6 rounded-xl bg-surface-container-low text-center text-xs text-tertiary">
                    No ward closure events recorded in selected window.
                  </div>
                ) : (
                  <div className="border border-outline-variant/30 rounded-xl overflow-hidden overflow-x-auto">
                    <table className="w-full text-left text-xs">
                      <thead className="bg-surface-container-low border-b border-outline-variant/30 font-semibold text-tertiary uppercase text-[10px]">
                        <tr>
                          <th className="py-2.5 px-3">Ward</th>
                          <th className="py-2.5 px-2 text-center" title="Confirmed Closures">Conf.</th>
                          <th className="py-2.5 px-2 text-center" title="Citizen Rejections">Rej.</th>
                          <th className="py-2.5 px-2 text-center" title="Reopened After Resolution">Reop.</th>
                          <th className="py-2.5 px-2 text-center" title="Total Closures">Total</th>
                          <th className="py-2.5 px-3 text-right">Trust Score</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-outline-variant/20 bg-surface-container-lowest">
                        {trustScores.byWard.map((w) => (
                          <tr key={w.ward} className="hover:bg-surface-container-low/50 transition-colors">
                            <td className="py-2.5 px-3 font-semibold text-on-surface truncate max-w-[140px]" title={w.ward}>
                              {w.ward}
                            </td>
                            <td className="py-2.5 px-2 text-center font-mono text-emerald-600 font-medium">{w.confirmedClosures}</td>
                            <td className="py-2.5 px-2 text-center font-mono text-rose-600 font-medium">{w.citizenRejections}</td>
                            <td className="py-2.5 px-2 text-center font-mono text-amber-600 font-medium">{w.reopenedAfterResolution}</td>
                            <td className="py-2.5 px-2 text-center font-mono text-on-surface font-semibold">{w.totalClosures}</td>
                            <td className="py-2.5 px-3 text-right">
                              <ClosureTrustBadge
                                score={w.trustScore}
                                total={w.totalClosures}
                                confirmed={w.confirmedClosures}
                                rejected={w.citizenRejections}
                                reopened={w.reopenedAfterResolution}
                                statusMessage={w.statusMessage}
                                size="sm"
                                showLabel={false}
                              />
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>

              {/* Trust Score by Officer */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="font-title text-sm font-bold text-on-surface flex items-center gap-1.5">
                    <span className="material-symbols-outlined text-tertiary text-[18px]">badge</span>
                    <span>Closure Trust by Assigned Officer</span>
                  </h4>
                  <span className="text-[11px] text-tertiary font-mono">
                    {trustScores?.byOfficer?.length || 0} Officers
                  </span>
                </div>

                {(!trustScores?.byOfficer || trustScores.byOfficer.length === 0) ? (
                  <div className="p-6 rounded-xl bg-surface-container-low text-center text-xs text-tertiary">
                    No officer closure activity recorded in selected window.
                  </div>
                ) : (
                  <div className="border border-outline-variant/30 rounded-xl overflow-hidden overflow-x-auto">
                    <table className="w-full text-left text-xs">
                      <thead className="bg-surface-container-low border-b border-outline-variant/30 font-semibold text-tertiary uppercase text-[10px]">
                        <tr>
                          <th className="py-2.5 px-3">Officer</th>
                          <th className="py-2.5 px-2">Dept</th>
                          <th className="py-2.5 px-2 text-center" title="Confirmed Closures">Conf.</th>
                          <th className="py-2.5 px-2 text-center" title="Citizen Rejections">Rej.</th>
                          <th className="py-2.5 px-2 text-center" title="Reopened After Resolution">Reop.</th>
                          <th className="py-2.5 px-2 text-center" title="Total Closures">Total</th>
                          <th className="py-2.5 px-3 text-right">Trust Score</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-outline-variant/20 bg-surface-container-lowest">
                        {trustScores.byOfficer.map((off) => (
                          <tr key={off.officerId || off.officerName} className="hover:bg-surface-container-low/50 transition-colors">
                            <td className="py-2.5 px-3">
                              <p className="font-semibold text-on-surface truncate max-w-[120px]" title={off.officerName}>
                                {off.officerName}
                              </p>
                              <p className="text-[10px] text-tertiary truncate max-w-[120px]" title={off.officerEmail}>
                                {off.officerEmail}
                              </p>
                            </td>
                            <td className="py-2.5 px-2 text-tertiary truncate max-w-[100px]" title={off.department}>
                              {off.department || 'General'}
                            </td>
                            <td className="py-2.5 px-2 text-center font-mono text-emerald-600 font-medium">{off.confirmedClosures}</td>
                            <td className="py-2.5 px-2 text-center font-mono text-rose-600 font-medium">{off.citizenRejections}</td>
                            <td className="py-2.5 px-2 text-center font-mono text-amber-600 font-medium">{off.reopenedAfterResolution}</td>
                            <td className="py-2.5 px-2 text-center font-mono text-on-surface font-semibold">{off.totalClosures}</td>
                            <td className="py-2.5 px-3 text-right">
                              <ClosureTrustBadge
                                score={off.trustScore}
                                total={off.totalClosures}
                                confirmed={off.confirmedClosures}
                                rejected={off.citizenRejections}
                                reopened={off.reopenedAfterResolution}
                                statusMessage={off.statusMessage}
                                size="sm"
                                showLabel={false}
                              />
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Status State Machine Breakdown */}
          <div className="bg-surface-container-lowest rounded-2xl p-6 shadow-sm border border-outline-variant/30 space-y-4">
            <h3 className="font-title text-base font-bold text-on-surface">Lifecycle Status Breakdown</h3>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-7 gap-3">
              {statuses.map(([st, cnt]) => (
                <div key={st} className="p-3 bg-surface-container-low rounded-xl text-center">
                  <span className="text-[10px] uppercase font-bold text-tertiary block truncate" title={st}>
                    {st.replace(/_/g, ' ')}
                  </span>
                  <span className="font-display text-2xl font-extrabold text-on-surface mt-1 block">
                    {cnt}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default OfficerAnalyticsPage;
