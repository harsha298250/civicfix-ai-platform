import React, { useState, useEffect, useCallback } from 'react';
import { useApp } from '../../context/AppContext';
import { adminService } from '../../services/adminService';
import Breadcrumb from '../../components/common/Breadcrumb';

const AuditLogsPage = () => {
  const { showToast } = useApp();
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [totalElements, setTotalElements] = useState(0);
  const [page, setPage] = useState(0);
  const [pageSize] = useState(25);

  const [actorFilter, setActorFilter] = useState('');
  const [actionFilter, setActionFilter] = useState('ALL');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  const fetchLogs = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await adminService.getAuditLogs({
        page,
        size: pageSize,
        action: actionFilter !== 'ALL' ? actionFilter : undefined,
        actor: actorFilter.trim() || undefined,
        startDate: startDate ? new Date(startDate).toISOString() : undefined,
        endDate: endDate ? new Date(endDate).toISOString() : undefined,
      });
      setLogs(response?.content || []);
      setTotalElements(response?.totalElements || 0);
    } catch (err) {
      console.error('Failed to load audit logs:', err);
      setError(err?.message || 'Failed to fetch audit log trail from database.');
    } finally {
      setLoading(false);
    }
  }, [page, pageSize, actionFilter, actorFilter, startDate, endDate]);

  useEffect(() => {
    fetchLogs();
  }, [fetchLogs]);

  const handleExport = () => {
    if (logs.length === 0) {
      showToast('No audit logs available to export', 'info');
      return;
    }
    const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(logs, null, 2));
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute('href', dataStr);
    downloadAnchor.setAttribute('download', `civicfix_audit_ledger_${new Date().toISOString().slice(0, 10)}.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
    showToast(`Exported ${logs.length} audit records (RFC 3161 audit trail format)`, 'success');
  };

  return (
    <div className="space-y-6">
      <Breadcrumb
        items={[
          { label: 'Admin Console', to: '/admin/dashboard' },
          { label: 'Audit Logs', to: '/admin/audit-logs' },
        ]}
      />

      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-[#18232F] flex items-center gap-2">
            <span className="material-symbols-outlined text-[#137A70] text-3xl">history_edu</span>
            Immutable System Audit Logs
          </h1>
          <p className="text-sm text-[#667384]">
            Live PostgreSQL audit trail capturing every triage, assignment, verification, and administrative operation.
          </p>
        </div>
        <button
          onClick={handleExport}
          className="px-4 py-2 text-sm font-semibold text-white bg-[#137A70] hover:bg-[#0F625B] rounded-lg transition-colors shadow-sm flex items-center gap-1.5 self-start"
        >
          <span className="material-symbols-outlined text-[18px]">file_download</span>
          Export Audit Ledger ({totalElements})
        </button>
      </div>

      {error && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-xl flex items-center justify-between text-red-700 text-xs font-semibold">
          <div className="flex items-center gap-2">
            <span className="material-symbols-outlined text-[20px]">error</span>
            <span>{error}</span>
          </div>
          <button
            onClick={fetchLogs}
            className="px-3 py-1 bg-red-600 text-white rounded-lg text-xs font-bold hover:bg-red-700 transition-colors"
          >
            Retry
          </button>
        </div>
      )}

      {/* Filter and Search Bar */}
      <div className="bg-white p-4 rounded-xl border border-[#E2E7ED] shadow-sm flex flex-col md:flex-row gap-4 items-center justify-between">
        <div className="relative w-full md:w-80">
          <span className="material-symbols-outlined absolute left-3 top-2.5 text-[#667384] text-[20px]">search</span>
          <input
            type="text"
            placeholder="Search by actor name or email..."
            value={actorFilter}
            onChange={(e) => {
              setActorFilter(e.target.value);
              setPage(0);
            }}
            className="w-full pl-10 pr-4 py-2 text-sm border border-[#E2E7ED] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#137A70]"
          />
        </div>

        <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
          <select
            value={actionFilter}
            onChange={(e) => {
              setActionFilter(e.target.value);
              setPage(0);
            }}
            className="text-sm border border-[#E2E7ED] rounded-lg px-3 py-2 bg-white text-[#18232F] focus:outline-none focus:ring-2 focus:ring-[#137A70]"
          >
            <option value="ALL">All Actions</option>
            <option value="USER_CREATED">User Created</option>
            <option value="USER_STATUS_UPDATED">Status Updated</option>
            <option value="COMPLAINT_CREATED">Complaint Created</option>
            <option value="ASSIGNED">Assignments</option>
            <option value="STATUS_CHANGE">Status Changes</option>
            <option value="DEMO_DATA_RESET">Demo Reset</option>
          </select>

          <input
            type="date"
            value={startDate}
            onChange={(e) => {
              setStartDate(e.target.value);
              setPage(0);
            }}
            className="text-sm border border-[#E2E7ED] rounded-lg px-3 py-2 bg-white text-[#18232F] focus:outline-none focus:ring-2 focus:ring-[#137A70]"
            title="Start Date"
          />

          <input
            type="date"
            value={endDate}
            onChange={(e) => {
              setEndDate(e.target.value);
              setPage(0);
            }}
            className="text-sm border border-[#E2E7ED] rounded-lg px-3 py-2 bg-white text-[#18232F] focus:outline-none focus:ring-2 focus:ring-[#137A70]"
            title="End Date"
          />

          <button
            onClick={fetchLogs}
            disabled={loading}
            className="p-2 border border-[#E2E7ED] rounded-lg text-[#667384] hover:text-[#18232F] hover:bg-slate-50 transition-colors"
            title="Refresh Ledger"
          >
            <span className={`material-symbols-outlined text-[18px] ${loading ? 'animate-spin' : ''}`}>refresh</span>
          </button>
        </div>
      </div>

      {/* Audit Log Table */}
      <div className="bg-white rounded-xl border border-[#E2E7ED] shadow-sm overflow-hidden">
        {loading && logs.length === 0 ? (
          <div className="p-12 text-center text-[#667384] flex flex-col items-center justify-center gap-2">
            <span className="material-symbols-outlined text-3xl animate-spin text-[#137A70]">progress_activity</span>
            <p className="text-sm font-medium">Querying immutable audit logs from PostgreSQL...</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm text-[#18232F]">
              <thead className="bg-[#F5F7FA] border-b border-[#E2E7ED] text-xs font-semibold text-[#667384] uppercase tracking-wider">
                <tr>
                  <th className="px-6 py-3.5">Timestamp</th>
                  <th className="px-6 py-3.5">Actor Profile</th>
                  <th className="px-6 py-3.5">Action Event</th>
                  <th className="px-6 py-3.5">Target Entity</th>
                  <th className="px-6 py-3.5">Event Description</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E2E7ED] font-mono text-xs">
                {logs.length > 0 ? (
                  logs.map((log) => (
                    <tr key={log.id} className="hover:bg-slate-50/60 transition-colors">
                      <td className="px-6 py-3.5 text-[#667384] whitespace-nowrap">
                        {log.createdAt ? new Date(log.createdAt).toLocaleString() : 'N/A'}
                      </td>
                      <td className="px-6 py-3.5 font-sans font-medium text-[#18232F]">
                        <div>
                          <span>{log.actorName || 'System'}</span>
                          {log.actorEmail && (
                            <span className="text-[#667384] text-[11px] block">{log.actorEmail}</span>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-3.5 font-sans">
                        <span className="px-2 py-0.5 rounded bg-slate-100 text-[#18232F] font-semibold text-[11px]">
                          {log.action}
                        </span>
                      </td>
                      <td className="px-6 py-3.5 font-mono text-tertiary">
                        {log.entityType ? `${log.entityType} #${log.entityId ? log.entityId.slice(0, 8) : ''}` : '—'}
                      </td>
                      <td className="px-6 py-3.5 font-sans text-[#667384] max-w-md truncate">
                        {log.details}
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan="5" className="px-6 py-12 text-center text-[#667384] font-sans">
                      <span className="material-symbols-outlined text-4xl text-slate-300 mb-2">history</span>
                      <p className="font-medium">No audit log records found matching your filters</p>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

export default AuditLogsPage;
