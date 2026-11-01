import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { useApp } from '../../context/AppContext';
import { adminService } from '../../services/adminService';
import { downloadAuditLogsCsv } from '../../utils/csvExport';
import Breadcrumb from '../../components/common/Breadcrumb';

const PlatformActivityPage = () => {
  const { complaints, showToast } = useApp();
  const [exporting, setExporting] = useState(false);

  const handleExport = async () => {
    setExporting(true);
    try {
      // Fetch all audit log records from PostgreSQL backend through paginated queries
      const firstPage = await adminService.getAuditLogs({ page: 0, size: 100 });
      const allLogs = [...(firstPage?.content || [])];
      const totalPages = firstPage?.totalPages || 1;

      for (let p = 1; p < totalPages; p++) {
        const nextPage = await adminService.getAuditLogs({ page: p, size: 100 });
        if (nextPage?.content) {
          allLogs.push(...nextPage.content);
        }
      }

      if (allLogs.length === 0) {
        showToast('No audit logs available to export', 'info');
        return;
      }

      downloadAuditLogsCsv(allLogs);
      showToast(`Exported ${allLogs.length} audit records to CSV`, 'success');
    } catch (err) {
      console.error('Failed to export audit logs:', err);
      showToast(err?.message || 'Failed to export audit logs from database', 'error');
    } finally {
      setExporting(false);
    }
  };

  return (
    <div className="space-y-6">
      <Breadcrumb
        items={[
          { label: 'Admin Console', to: '/admin/dashboard' },
          { label: 'Platform Activity', to: '/admin/activity' },
        ]}
      />

      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-[#18232F]">Platform Telemetry & System Activity</h1>
          <p className="text-sm text-[#667384]">
            Real-time infrastructure health, citizen engagement rates, and municipal throughput.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={handleExport}
            disabled={exporting}
            className="px-4 py-2 text-sm font-semibold text-[#18232F] bg-white border border-[#E2E7ED] rounded-lg hover:bg-slate-50 disabled:opacity-50 transition-colors flex items-center gap-1.5 shadow-sm"
          >
            <span className={`material-symbols-outlined text-[18px] text-[#667384] ${exporting ? 'animate-spin' : ''}`}>
              {exporting ? 'progress_activity' : 'download'}
            </span>
            {exporting ? 'Exporting...' : 'Export Audit Dump'}
          </button>
          <Link
            to="/admin/audit-logs"
            className="px-4 py-2 text-sm font-semibold text-white bg-[#137A70] rounded-lg hover:bg-[#0F625B] transition-colors flex items-center gap-1.5 shadow-sm"
          >
            <span className="material-symbols-outlined text-[18px]">history_edu</span>
            Audit Ledger
          </Link>
        </div>
      </div>

      {/* KPI metrics */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        <div className="bg-white p-5 rounded-xl border border-[#E2E7ED] shadow-sm">
          <div className="flex items-center justify-between text-xs text-[#667384] font-medium">
            <span>API Request Throughput</span>
            <span className="text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded text-[11px] font-semibold">+14.2%</span>
          </div>
          <div className="text-2xl font-bold text-[#18232F] mt-2">1,842 req/min</div>
          <p className="text-xs text-[#667384] mt-1">Average latency: 42ms</p>
        </div>

        <div className="bg-white p-5 rounded-xl border border-[#E2E7ED] shadow-sm">
          <div className="flex items-center justify-between text-xs text-[#667384] font-medium">
            <span>Rule-Based Triage</span>
            <span className="text-purple-700 bg-purple-50 px-2 py-0.5 rounded text-[11px] font-semibold">Rule-Based</span>
          </div>
          <div className="text-2xl font-bold text-[#18232F] mt-2">98.4% Confidence</div>
          <p className="text-xs text-[#667384] mt-1">14,290 classifications run</p>
        </div>

        <div className="bg-white p-5 rounded-xl border border-[#E2E7ED] shadow-sm">
          <div className="flex items-center justify-between text-xs text-[#667384] font-medium">
            <span>Active Worker Telemetry</span>
            <span className="text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded text-[11px] font-semibold">Live RTK</span>
          </div>
          <div className="text-2xl font-bold text-[#18232F] mt-2">18 Active Crews</div>
          <p className="text-xs text-[#667384] mt-1">4 Field sectors deployed</p>
        </div>

        <div className="bg-white p-5 rounded-xl border border-[#E2E7ED] shadow-sm">
          <div className="flex items-center justify-between text-xs text-[#667384] font-medium">
            <span>SLA Compliance Index</span>
            <span className="text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded text-[11px] font-semibold">High Tier</span>
          </div>
          <div className="text-2xl font-bold text-[#18232F] mt-2">94.8% on-time</div>
          <p className="text-xs text-[#667384] mt-1">Target: &gt; 92.0%</p>
        </div>
      </div>

      {/* Hourly Load Visualization */}
      <div className="bg-white p-6 rounded-xl border border-[#E2E7ED] shadow-sm space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-base font-bold text-[#18232F]">24-Hour Municipal Activity Load</h2>
          <span className="text-xs text-[#667384]">Hourly reports filed vs verified resolutions</span>
        </div>

        <div className="h-48 flex items-end justify-between gap-2 pt-8 px-2 border-b border-[#E2E7ED]">
          {[
            { hour: '00:00', filed: 8, resolved: 2 },
            { hour: '03:00', filed: 4, resolved: 1 },
            { hour: '06:00', filed: 24, resolved: 12 },
            { hour: '09:00', filed: 78, resolved: 45 },
            { hour: '12:00', filed: 92, resolved: 68 },
            { hour: '15:00', filed: 85, resolved: 74 },
            { hour: '18:00', filed: 64, resolved: 52 },
            { hour: '21:00', filed: 32, resolved: 28 },
          ].map((bar, i) => (
            <div key={i} className="flex-1 flex flex-col items-center gap-2 group">
              <div className="w-full max-w-[40px] flex items-end justify-center gap-1 h-36">
                <div
                  style={{ height: `${(bar.filed / 92) * 100}%` }}
                  className="w-1/2 bg-[#137A70] rounded-t transition-all group-hover:brightness-110"
                  title={`Filed: ${bar.filed}`}
                />
                <div
                  style={{ height: `${(bar.resolved / 92) * 100}%` }}
                  className="w-1/2 bg-[#7C6CF2] rounded-t transition-all group-hover:brightness-110"
                  title={`Resolved: ${bar.resolved}`}
                />
              </div>
              <span className="text-[11px] text-[#667384] font-medium">{bar.hour}</span>
            </div>
          ))}
        </div>

        <div className="flex items-center justify-center gap-6 pt-2 text-xs">
          <div className="flex items-center gap-2">
            <span className="w-3 h-3 rounded bg-[#137A70]" />
            <span className="text-[#667384]">Citizen Submissions</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-3 h-3 rounded bg-[#7C6CF2]" />
            <span className="text-[#667384]">Verified Resolutions</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PlatformActivityPage;
