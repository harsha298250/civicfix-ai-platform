import React, { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { useApp } from '../../context/AppContext';
import { adminService } from '../../services/adminService';
import { officerService } from '../../services/officerService';
import { Breadcrumb } from '../../components/common/Breadcrumb';

export const AdminDashboard = () => {
  const { showToast, currentUser } = useApp();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [summary, setSummary] = useState(null);
  const [analytics, setAnalytics] = useState(null);
  const [recentUsers, setRecentUsers] = useState([]);
  const [recentLogs, setRecentLogs] = useState([]);
  const [processingUserId, setProcessingUserId] = useState(null);

  const fetchDashboardData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [summaryRes, usersRes, logsRes, analyticsRes] = await Promise.all([
        adminService.getDashboardSummary(),
        adminService.getUsers({ size: 6 }),
        adminService.getAuditLogs({ size: 5 }),
        officerService.getAnalyticsSummary().catch(e => {
          console.warn('Could not fetch officer analytics for admin dashboard:', e);
          return null;
        })
      ]);
      setSummary(summaryRes);
      setRecentUsers(usersRes?.content || []);
      setRecentLogs(logsRes?.content || []);
      setAnalytics(analyticsRes);
    } catch (err) {
      console.error('Failed to load admin dashboard telemetry:', err);
      setError(err?.message || 'Cannot load administrative dashboard telemetry from server.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchDashboardData();
  }, [fetchDashboardData]);

  const handleUpdateStatus = async (userId, targetStatus, userName) => {
    if (currentUser?.id === userId) {
      showToast('Cannot modify administrative status of your own session', 'error');
      return;
    }
    setProcessingUserId(userId);
    try {
      await adminService.updateUserStatus(
        userId,
        targetStatus,
        `Administrative status updated to ${targetStatus} via Platform Dashboard`
      );
      showToast(`Successfully updated account status for ${userName || 'user'} to ${targetStatus}`, 'success');
      await fetchDashboardData();
    } catch (err) {
      console.error('Failed to update user status:', err);
      showToast(err?.message || 'Failed to update user status', 'error');
    } finally {
      setProcessingUserId(null);
    }
  };

  const pendingUsers = (recentUsers || []).filter(
    u => u.status === 'PENDING_APPROVAL' || u.status === 'Pending Approval'
  );

  return (
    <div className="w-full flex flex-col gap-6">
      <Breadcrumb
        items={[
          { label: 'Admin Governance', path: '/admin/dashboard', icon: 'admin_panel_settings' },
          { label: 'Platform Overview' }
        ]}
      />

      {/* Header and Quick Action */}
      <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-4 bg-surface-container-lowest p-6 rounded-2xl shadow-sm border border-outline-variant/30">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-primary-container/10 text-primary-container flex items-center justify-center shadow-sm">
            <span className="material-symbols-outlined text-[26px]">policy</span>
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="font-headline-md text-2xl font-extrabold text-on-surface">
                Platform Administration Workspace
              </h1>
              <span className="px-2.5 py-0.5 rounded-full bg-primary-fixed text-on-primary-fixed-variant text-[10px] font-bold uppercase">
                Tier-0 Root
              </span>
            </div>
            <p className="text-xs text-on-surface-variant mt-0.5">
              Live database oversight, role governance, pending workforce vetting, and compliance ledger.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2.5 shrink-0">
          <button
            type="button"
            onClick={fetchDashboardData}
            disabled={loading}
            className="px-3.5 py-2.5 bg-surface-container hover:bg-surface-container-high text-on-surface text-xs font-semibold rounded-xl transition-colors flex items-center gap-1.5"
            title="Refresh Live Telemetry"
          >
            <span className={`material-symbols-outlined text-[16px] ${loading ? 'animate-spin' : ''}`}>refresh</span>
            <span>Refresh</span>
          </button>
          <Link
            to="/admin/users/new"
            className="px-4 py-2.5 bg-primary-container hover:bg-primary text-white text-xs font-semibold rounded-xl shadow transition-colors flex items-center gap-1.5"
          >
            <span className="material-symbols-outlined text-[16px]">person_add</span>
            <span>Create Staff Account</span>
          </Link>
          <Link
            to="/admin/roles"
            className="px-4 py-2.5 bg-surface-container hover:bg-surface-container-high text-on-surface text-xs font-semibold rounded-xl transition-colors flex items-center gap-1.5"
          >
            <span className="material-symbols-outlined text-[16px]">shield</span>
            <span>Role Matrix</span>
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
            Retry Connection
          </button>
        </div>
      )}

      {loading && !summary ? (
        <div className="p-12 text-center text-on-surface-variant flex flex-col items-center justify-center gap-3">
          <span className="material-symbols-outlined text-4xl animate-spin text-primary-container">progress_activity</span>
          <p className="text-sm font-semibold">Loading real platform telemetry from database...</p>
        </div>
      ) : (
        <>
          {/* 4 Summary KPI Cards with Real Data */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="p-5 rounded-2xl bg-surface-container-lowest shadow-sm border border-outline-variant/30 flex flex-col justify-between">
              <div className="flex items-start justify-between">
                <div>
                  <span className="text-xs font-bold text-tertiary uppercase tracking-wider">Total Users</span>
                  <div className="mt-1 flex items-baseline gap-2">
                    <span className="font-display text-3xl font-extrabold text-on-surface">
                      {summary?.totalUsers ?? 0}
                    </span>
                    <span className="font-code text-xs text-primary-container font-semibold">PostgreSQL</span>
                  </div>
                </div>
                <div className="w-9 h-9 rounded-xl bg-surface-container-low flex items-center justify-center text-primary-container">
                  <span className="material-symbols-outlined text-[20px]">group</span>
                </div>
              </div>
              <span className="text-[11px] text-tertiary mt-2">Verified resident and staff accounts</span>
            </div>

            <Link
              to="/admin/users"
              className="p-5 rounded-2xl bg-surface-container-lowest shadow-sm border border-outline-variant/30 flex flex-col justify-between hover:shadow-md transition-shadow group"
            >
              <div className="flex items-start justify-between">
                <div>
                  <span className="text-xs font-bold text-tertiary uppercase tracking-wider">Pending Vetting</span>
                  <div className="mt-1 flex items-baseline gap-2">
                    <span className={`font-display text-3xl font-extrabold ${(summary?.pendingApprovalCount ?? 0) > 0 ? 'text-amber-600' : 'text-on-surface'}`}>
                      {summary?.pendingApprovalCount ?? 0}
                    </span>
                    <span className={`font-code text-xs font-semibold ${(summary?.pendingApprovalCount ?? 0) > 0 ? 'text-amber-600' : 'text-emerald-600'}`}>
                      {(summary?.pendingApprovalCount ?? 0) > 0 ? 'Requires Action' : 'All Vetted'}
                    </span>
                  </div>
                </div>
                <div className={`w-9 h-9 rounded-xl flex items-center justify-center transition-transform group-hover:scale-105 ${
                  (summary?.pendingApprovalCount ?? 0) > 0 ? 'bg-amber-500/15 text-amber-600' : 'bg-surface-container-low text-tertiary'
                }`}>
                  <span className="material-symbols-outlined text-[20px]">badge</span>
                </div>
              </div>
              <div className="flex items-center justify-between text-[11px] text-tertiary mt-2">
                <span>Staff accounts awaiting sign-off</span>
                <span className="text-primary-container font-semibold group-hover:underline">View →</span>
              </div>
            </Link>

            <div className="p-5 rounded-2xl bg-surface-container-lowest shadow-sm border border-outline-variant/30 flex flex-col justify-between">
              <div className="flex items-start justify-between">
                <div>
                  <span className="text-xs font-bold text-tertiary uppercase tracking-wider">Audit Events (24h)</span>
                  <div className="mt-1 flex items-baseline gap-2">
                    <span className="font-display text-3xl font-extrabold text-secondary">
                      {summary?.auditEventsLast24h ?? 0}
                    </span>
                    <span className="font-code text-xs text-secondary font-semibold">Verified</span>
                  </div>
                </div>
                <div className="w-9 h-9 rounded-xl bg-secondary/10 flex items-center justify-center text-secondary">
                  <span className="material-symbols-outlined text-[20px]">receipt_long</span>
                </div>
              </div>
              <span className="text-[11px] text-tertiary mt-2">Events logged in past 24 hours</span>
            </div>

            <div className="p-5 rounded-2xl bg-surface-container-lowest shadow-sm border border-outline-variant/30 flex flex-col justify-between">
              <div className="flex items-start justify-between">
                <div>
                  <span className="text-xs font-bold text-tertiary uppercase tracking-wider">Total Complaints</span>
                  <div className="mt-1 flex items-baseline gap-2">
                    <span className="font-display text-3xl font-extrabold text-emerald-700">
                      {summary?.totalComplaints ?? 0}
                    </span>
                    <span className="font-code text-xs text-emerald-600 font-semibold">Triage Live</span>
                  </div>
                </div>
                <div className="w-9 h-9 rounded-xl bg-emerald-500/10 flex items-center justify-center text-emerald-600">
                  <span className="material-symbols-outlined text-[20px]">report</span>
                </div>
              </div>
              <span className="text-[11px] text-tertiary mt-2">System tickets managed in database</span>
            </div>
          </div>

          {/* District Operational Analytics & SLA Overview */}
          <div className="bg-surface-container-lowest rounded-2xl p-5 shadow-sm border border-outline-variant/30 flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <span className="font-title text-sm font-bold text-on-surface">District Operational Telemetry</span>
                <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-primary/10 text-primary">
                  PostgreSQL Aggregates
                </span>
              </div>
              <p className="text-xs text-on-surface-variant">
                Live performance metrics, field rework tracking, and SLA status for Ward Operations.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-6 text-xs">
              <div>
                <span className="text-tertiary block text-[11px]">Mean Resolution:</span>
                <strong className="text-on-surface font-display text-sm">
                  {analytics?.averageResolutionHours != null ? `${analytics.averageResolutionHours} hrs` : 'No data'}
                </strong>
              </div>
              <div>
                <span className="text-tertiary block text-[11px]">Rework Rate:</span>
                <strong className="text-secondary font-display text-sm">
                  {analytics?.reworkRate != null ? `${analytics.reworkRate}%` : '0%'}
                </strong>
              </div>
              <div>
                <span className="text-tertiary block text-[11px]">Duplicates Linked:</span>
                <strong className="text-on-surface font-code text-sm">
                  {analytics?.duplicatesLinked ?? 0}
                </strong>
              </div>
              <div>
                <span className="text-tertiary block text-[11px]">SLA Target Status:</span>
                <span className="px-2 py-0.5 rounded text-[11px] font-medium bg-slate-100 text-slate-700">
                  {analytics?.slaAdherenceRate != null ? `${analytics.slaAdherenceRate}%` : 'SLA not configured'}
                </span>
              </div>
              <Link
                to="/officer/analytics"
                className="px-3.5 py-1.5 bg-surface-container hover:bg-surface-container-high text-on-surface font-semibold rounded-lg transition-colors flex items-center gap-1 shrink-0"
              >
                <span>Full Telemetry</span>
                <span className="material-symbols-outlined text-[14px]">arrow_forward</span>
              </Link>
            </div>
          </div>

          {/* Pending Staff Approval Section */}
          {pendingUsers.length > 0 ? (
            <section className="bg-amber-500/10 border border-amber-500/30 rounded-2xl p-5 space-y-3 shadow-sm">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div className="flex items-center gap-2 text-amber-800 font-bold text-sm">
                  <span className="material-symbols-outlined text-[20px] text-amber-700">notification_important</span>
                  <span>Pending Municipal Personnel Vetting ({pendingUsers.length})</span>
                </div>
                <Link
                  to="/admin/users"
                  className="text-xs text-amber-800 hover:text-amber-950 font-semibold inline-flex items-center gap-1"
                >
                  <span>Manage in User Directory</span>
                  <span className="material-symbols-outlined text-[14px]">arrow_forward</span>
                </Link>
              </div>

              <div className="space-y-2">
                {pendingUsers.map(u => (
                  <div
                    key={u.id}
                    className="p-3 bg-surface-container-lowest rounded-xl flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs border border-outline-variant/30 shadow-xs"
                  >
                    <div>
                      <div className="flex items-center gap-2">
                        <strong className="text-on-surface font-semibold text-sm">{u.name}</strong>
                        <span className="text-tertiary text-xs">({u.email})</span>
                      </div>
                      <div className="text-[11px] text-on-surface-variant mt-0.5 flex flex-wrap items-center gap-2">
                        <span>Requested Role: <strong className="text-secondary font-semibold">{u.role}</strong></span>
                        <span>•</span>
                        <span>{u.department || 'Municipal Operations'}</span>
                        <span>•</span>
                        <span className="text-tertiary">Joined: {u.createdAt ? new Date(u.createdAt).toLocaleDateString() : 'Recently'}</span>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0 self-end sm:self-auto">
                      <button
                        type="button"
                        disabled={processingUserId === u.id}
                        onClick={() => handleUpdateStatus(u.id, 'SUSPENDED', u.name)}
                        className="px-3 py-1.5 bg-surface-container hover:bg-error-container hover:text-error text-on-surface rounded-lg font-semibold text-xs transition-colors flex items-center gap-1"
                      >
                        <span className="material-symbols-outlined text-[15px]">close</span>
                        <span>Reject / Suspend</span>
                      </button>
                      <button
                        type="button"
                        disabled={processingUserId === u.id}
                        onClick={() => handleUpdateStatus(u.id, 'ACTIVE', u.name)}
                        className="px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-semibold text-xs transition-colors flex items-center gap-1 shadow-sm"
                      >
                        <span className="material-symbols-outlined text-[15px]">verified</span>
                        <span>Approve Credentials</span>
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </section>
          ) : (
            <section className="bg-surface-container-lowest border border-outline-variant/30 rounded-2xl p-5 flex flex-col sm:flex-row items-center justify-between gap-4 shadow-sm">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-emerald-500/10 text-emerald-600 flex items-center justify-center shrink-0">
                  <span className="material-symbols-outlined text-[22px]">verified</span>
                </div>
                <div>
                  <h4 className="font-title text-sm font-bold text-on-surface">No Pending Staff Approvals</h4>
                  <p className="text-xs text-on-surface-variant">
                    All municipal officer and field crew accounts are fully vetted and authorized with active operational permissions.
                  </p>
                </div>
              </div>
              <Link
                to="/admin/users"
                className="px-3.5 py-1.5 bg-surface-container hover:bg-surface-container-high text-on-surface text-xs font-semibold rounded-lg transition-colors flex items-center gap-1 shrink-0"
              >
                <span>Open User Directory</span>
                <span className="material-symbols-outlined text-[14px]">arrow_forward</span>
              </Link>
            </section>
          )}

          {/* Dual Panels: User Directory + Recent Audit Trail */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
            {/* User Directory (7 cols) */}
            <div className="lg:col-span-7 bg-surface-container-lowest rounded-2xl p-6 shadow-sm border border-outline-variant/30 space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="font-title text-base font-bold text-on-surface">Personnel & Resident Directory</h3>
                <Link to="/admin/users" className="text-xs font-semibold text-primary-container hover:underline">
                  View All ({summary?.totalUsers ?? recentUsers.length})
                </Link>
              </div>

              {recentUsers.length === 0 ? (
                <div className="p-8 text-center text-xs text-tertiary">
                  No registered users found in database.
                </div>
              ) : (
                <div className="space-y-2.5">
                  {recentUsers.map(u => (
                    <div
                      key={u.id}
                      className="p-3.5 rounded-xl bg-surface-container-low border border-outline-variant/30 flex items-center justify-between gap-3 text-xs"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="w-8 h-8 rounded-full bg-primary-container text-white flex items-center justify-center font-bold text-xs shrink-0">
                          {(u.name || 'U').split(' ').map(n => n[0]).join('')}
                        </div>
                        <div className="min-w-0">
                          <div className="flex items-center gap-2">
                            <strong className="text-on-surface font-semibold truncate">{u.name}</strong>
                            <span className={`px-2 py-0.2 rounded-full text-[10px] font-bold ${
                              u.role === 'ADMIN' ? 'bg-secondary text-white' :
                              u.role === 'OFFICER' ? 'bg-primary-container text-white' :
                              u.role === 'WORKER' ? 'bg-amber-600 text-white' :
                              'bg-surface-container text-on-surface'
                            }`}>
                              {u.role}
                            </span>
                          </div>
                          <p className="text-tertiary truncate">{u.email}</p>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold ${
                          u.status === 'ACTIVE' ? 'bg-emerald-500/10 text-emerald-700' : 'bg-error-container text-error'
                        }`}>
                          {u.status}
                        </span>
                        <Link
                          to={`/admin/users/${u.id}`}
                          className="p-1 text-tertiary hover:text-on-surface rounded"
                          title="Inspect user"
                        >
                          <span className="material-symbols-outlined text-[16px]">visibility</span>
                        </Link>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Audit Log Stream (5 cols) */}
            <div className="lg:col-span-5 bg-surface-container-lowest rounded-2xl p-6 shadow-sm border border-outline-variant/30 space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="font-title text-base font-bold text-on-surface">Recent Security Audit Events</h3>
                <Link to="/admin/audit-logs" className="text-xs font-semibold text-primary-container hover:underline">
                  Full Ledger
                </Link>
              </div>

              {recentLogs.length === 0 ? (
                <div className="p-8 text-center text-xs text-tertiary">
                  No security audit events recorded.
                </div>
              ) : (
                <div className="space-y-3">
                  {recentLogs.map(log => (
                    <div key={log.id} className="p-3 rounded-xl bg-surface-container-low text-xs space-y-1 border border-outline-variant/30">
                      <div className="flex items-center justify-between">
                        <span className="font-code font-bold text-secondary text-[11px]">{log.action}</span>
                        <span className="font-code text-[10px] text-tertiary">
                          {log.createdAt ? new Date(log.createdAt).toLocaleTimeString() : ''}
                        </span>
                      </div>
                      <p className="text-on-surface font-semibold">{log.entityType ? `${log.entityType} #${log.entityId || ''}` : 'System'}</p>
                      <p className="text-[11px] text-on-surface-variant line-clamp-1">{log.details}</p>
                      <span className="text-[10px] text-tertiary block font-code">
                        Actor: {log.actorName || log.actorEmail || 'System'}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default AdminDashboard;
