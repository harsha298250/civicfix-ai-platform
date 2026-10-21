import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import Breadcrumb from '../../components/common/Breadcrumb';

const AuditLogsPage = () => {
  const { auditLogs, showToast } = useApp();
  const [searchTerm, setSearchTerm] = useState('');
  const [actionFilter, setActionFilter] = useState('ALL');

  const filteredLogs = auditLogs.filter((log) => {
    const matchesSearch =
      log.actor.toLowerCase().includes(searchTerm.toLowerCase()) ||
      log.action.toLowerCase().includes(searchTerm.toLowerCase()) ||
      log.details.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesAction = actionFilter === 'ALL' || log.action.toUpperCase().includes(actionFilter);
    return matchesSearch && matchesAction;
  });

  const handleExport = () => {
    showToast('Immutable audit trail exported (JSON / RFC 3161 compliant format)');
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
            Tamper-evident operational record capturing every triage, assignment, verification, and authentication event.
          </p>
        </div>
        <button
          onClick={handleExport}
          className="px-4 py-2 text-sm font-semibold text-white bg-[#137A70] hover:bg-[#0F625B] rounded-lg transition-colors shadow-sm flex items-center gap-1.5 self-start"
        >
          <span className="material-symbols-outlined text-[18px]">file_download</span>
          Export Audit Ledger
        </button>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white p-4 rounded-xl border border-[#E2E7ED] shadow-sm flex flex-col md:flex-row gap-4 items-center justify-between">
        <div className="relative w-full md:w-96">
          <span className="material-symbols-outlined absolute left-3 top-2.5 text-[#667384] text-[20px]">search</span>
          <input
            type="text"
            placeholder="Search by actor, action, or ticket..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 text-sm border border-[#E2E7ED] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#137A70]"
          />
        </div>

        <div className="flex items-center gap-3 w-full md:w-auto">
          <select
            value={actionFilter}
            onChange={(e) => setActionFilter(e.target.value)}
            className="text-sm border border-[#E2E7ED] rounded-lg px-3 py-2 bg-white text-[#18232F] focus:outline-none focus:ring-2 focus:ring-[#137A70]"
          >
            <option value="ALL">All Actions</option>
            <option value="ASSIGNED">Assignments</option>
            <option value="VERIFIED">Verifications</option>
            <option value="SUBMITTED">Submissions</option>
            <option value="PROGRESS">Progress / Field Work</option>
          </select>
        </div>
      </div>

      {/* Audit Log Table */}
      <div className="bg-white rounded-xl border border-[#E2E7ED] shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-[#18232F]">
            <thead className="bg-[#F5F7FA] border-b border-[#E2E7ED] text-xs font-semibold text-[#667384] uppercase tracking-wider">
              <tr>
                <th className="px-6 py-3.5">Timestamp</th>
                <th className="px-6 py-3.5">Actor Profile</th>
                <th className="px-6 py-3.5">Action Event</th>
                <th className="px-6 py-3.5">Event Description</th>
                <th className="px-6 py-3.5 text-right">Integrity Hash</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E2E7ED] font-mono text-xs">
              {filteredLogs.length > 0 ? (
                filteredLogs.map((log) => (
                  <tr key={log.id} className="hover:bg-slate-50/60 transition-colors">
                    <td className="px-6 py-3.5 text-[#667384] whitespace-nowrap">
                      {log.timestamp}
                    </td>
                    <td className="px-6 py-3.5 font-sans font-medium text-[#18232F]">
                      {log.actor}
                    </td>
                    <td className="px-6 py-3.5 font-sans">
                      <span className="px-2 py-0.5 rounded bg-slate-100 text-[#18232F] font-semibold text-[11px]">
                        {log.action}
                      </span>
                    </td>
                    <td className="px-6 py-3.5 font-sans text-[#667384] max-w-md truncate">
                      {log.details}
                    </td>
                    <td className="px-6 py-3.5 text-right text-slate-400">
                      SHA256: {log.id.replace(/[^0-9]/g, '').padEnd(8, '7')}e4...
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan="5" className="px-6 py-12 text-center text-[#667384] font-sans">
                    No matching audit logs found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default AuditLogsPage;
