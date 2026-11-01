import React, { useState, useEffect } from 'react';
import { useApp } from '../../context/AppContext';
import { adminService } from '../../services/adminService';
import Breadcrumb from '../../components/common/Breadcrumb';

const CATEGORY_NAMES = {
  ROADS: 'Roads & Pavements',
  WATER_SEWERAGE: 'Water & Sewerage',
  STREET_LIGHT: 'Street Lighting',
  GARBAGE: 'Garbage & Sanitation',
  DRAINAGE: 'Stormwater Drainage',
  PUBLIC_TRANSPORT: 'Public Transport',
  PARKS: 'Parks & Green Spaces',
  DEFAULT: 'Global Default Policy'
};

const PRIORITY_ORDER = ['CRITICAL', 'HIGH', 'MEDIUM', 'LOW'];

const SystemSettingsPage = () => {
  const { showToast, refreshComplaints } = useApp();
  const [resettingDemo, setResettingDemo] = useState(false);

  // Live SLA policies state
  const [slaPolicies, setSlaPolicies] = useState([]);
  const [loadingSla, setLoadingSla] = useState(true);
  const [slaError, setSlaError] = useState(null);

  // Backend demo reset availability state
  const [demoStatus, setDemoStatus] = useState(null);
  const [loadingDemoStatus, setLoadingDemoStatus] = useState(true);

  useEffect(() => {
    let isMounted = true;

    const loadPlatformSettings = async () => {
      // 1. Fetch real SLA policy matrix from PostgreSQL via /api/admin/sla-policies
      setLoadingSla(true);
      setSlaError(null);
      try {
        const policies = await adminService.getSlaPolicies();
        if (isMounted) {
          setSlaPolicies(Array.isArray(policies) ? policies : []);
        }
      } catch (err) {
        console.error('Failed to load SLA policies:', err);
        if (isMounted) {
          setSlaError(err?.message || 'Failed to load SLA policy matrix from database');
        }
      } finally {
        if (isMounted) setLoadingSla(false);
      }

      // 2. Fetch demo dataset availability via /api/admin/demo/status
      setLoadingDemoStatus(true);
      try {
        const status = await adminService.getDemoStatus();
        if (isMounted) {
          setDemoStatus(status);
        }
      } catch (err) {
        console.warn('Could not determine demo reset capability status:', err);
        if (isMounted) {
          setDemoStatus({ available: false });
        }
      } finally {
        if (isMounted) setLoadingDemoStatus(false);
      }
    };

    loadPlatformSettings();
    return () => {
      isMounted = false;
    };
  }, []);

  const handleResetDemoData = async () => {
    if (!window.confirm('Reset demo dataset in PostgreSQL? This will delete all is_demo=true records and deterministically reseed 40 Chennai civic tickets.')) {
      return;
    }
    setResettingDemo(true);
    try {
      const res = await adminService.resetDemoData();
      showToast(res?.message || 'Demo dataset successfully reset in PostgreSQL!', 'success');
      if (refreshComplaints) await refreshComplaints();
    } catch (err) {
      showToast(err?.message || 'Failed to reset demo data on server.', 'error');
    } finally {
      setResettingDemo(false);
    }
  };

  // Group SLA policies by category for matrix visualization
  const groupedSla = React.useMemo(() => {
    const groups = {};
    for (const policy of slaPolicies) {
      const cat = policy.category || 'DEFAULT';
      if (!groups[cat]) {
        groups[cat] = {};
      }
      groups[cat][policy.priority] = policy.hours;
    }
    return groups;
  }, [slaPolicies]);

  return (
    <div className="space-y-6">
      <Breadcrumb
        items={[
          { label: 'Admin Console', to: '/admin/dashboard' },
          { label: 'System Settings', to: '/admin/settings' },
        ]}
      />

      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-[#18232F] flex items-center gap-2">
            <span className="material-symbols-outlined text-[#137A70] text-3xl">tune</span>
            Platform & Governance Settings
          </h1>
          <p className="text-sm text-[#667384]">
            Immutable system configurations, SLA policy matrices, GIS operational boundaries, and security parameters.
          </p>
        </div>
        <div className="flex items-center gap-2 text-xs font-semibold text-slate-500 bg-slate-100 px-3 py-1.5 rounded-lg border border-slate-200">
          <span className="material-symbols-outlined text-[16px] text-slate-600">lock</span>
          Read-Only Architectural Specification
        </div>
      </div>

      <div className="space-y-6">
        {/* Real SLA Policy Matrix Section */}
        <div className="bg-white rounded-xl border border-[#E2E7ED] shadow-sm overflow-hidden">
          <div className="p-5 border-b border-[#E2E7ED] flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div>
              <div className="flex items-center gap-2 text-base font-bold text-[#18232F]">
                <span className="material-symbols-outlined text-[#D97706]">timer</span>
                Municipal Service Level Agreement (SLA) Policy Matrix
              </div>
              <p className="text-xs text-[#667384] mt-0.5">
                Maximum resolution windows enforced in PostgreSQL (<code className="font-mono text-amber-700">sla_policies</code>) and monitored by the automated escalation service.
              </p>
            </div>
            <span className="text-xs font-semibold text-emerald-700 bg-emerald-50 px-3 py-1 rounded-full border border-emerald-200 self-start sm:self-auto">
              Live Backend Policy
            </span>
          </div>

          {loadingSla ? (
            <div className="p-8 text-center text-sm text-[#667384] flex items-center justify-center gap-2">
              <span className="material-symbols-outlined animate-spin text-[20px]">progress_activity</span>
              Loading SLA policy matrix from database...
            </div>
          ) : slaError ? (
            <div className="p-5 bg-red-50 text-xs text-red-700 flex items-center gap-2">
              <span className="material-symbols-outlined text-[18px]">error</span>
              {slaError}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm text-[#18232F]">
                <thead className="bg-[#F5F7FA] border-b border-[#E2E7ED] text-xs font-semibold text-[#667384] uppercase tracking-wider">
                  <tr>
                    <th className="px-6 py-3.5">Civic Category</th>
                    <th className="px-6 py-3.5 text-center text-red-700">Critical</th>
                    <th className="px-6 py-3.5 text-center text-amber-700">High</th>
                    <th className="px-6 py-3.5 text-center text-blue-700">Medium</th>
                    <th className="px-6 py-3.5 text-center text-slate-700">Low</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#E2E7ED]">
                  {Object.keys(groupedSla).map((cat) => (
                    <tr key={cat} className="hover:bg-slate-50 transition-colors">
                      <td className="px-6 py-4">
                        <div className="font-semibold text-xs text-[#18232F]">
                          {CATEGORY_NAMES[cat] || cat}
                        </div>
                        <div className="text-[11px] font-mono text-[#667384]">{cat}</div>
                      </td>
                      {PRIORITY_ORDER.map((pri) => {
                        const hours = groupedSla[cat]?.[pri];
                        return (
                          <td key={pri} className="px-6 py-4 text-center">
                            {hours !== undefined ? (
                              <span className="inline-block px-2.5 py-1 text-xs font-bold rounded bg-slate-100 text-[#18232F] font-mono">
                                {hours}h
                              </span>
                            ) : (
                              <span className="text-slate-300 font-mono">-</span>
                            )}
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Rule-Based Triage Configuration (Read-Only) */}
        <div className="bg-white p-6 rounded-xl border border-[#E2E7ED] shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-base font-bold text-[#18232F]">
              <span className="material-symbols-outlined text-[#7C6CF2]">rule</span>
              CivicFix Rule-Based Triage Parameters
            </div>
            <span className="text-xs text-slate-500 font-medium font-mono">Immutable System Profile</span>
          </div>
          <p className="text-xs text-[#667384]">
            Runtime specifications governing deterministic keyword triage, spatial clustering, and automated priority escalation.
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 pt-2">
            <div className="p-4 rounded-lg bg-slate-50 border border-[#E2E7ED]">
              <span className="text-xs font-semibold text-[#667384] uppercase block mb-1">
                Triage Engine
              </span>
              <p className="font-bold text-sm text-[#18232F]">Deterministic Keyword Engine</p>
              <span className="text-[11px] text-[#137A70] font-semibold mt-1 inline-block">Bilingual Lexicon Active</span>
            </div>

            <div className="p-4 rounded-lg bg-slate-50 border border-[#E2E7ED]">
              <span className="text-xs font-semibold text-[#667384] uppercase block mb-1">
                Triage Confidence Bar
              </span>
              <p className="font-bold text-sm text-[#18232F]">85% Threshold</p>
              <span className="text-[11px] text-[#667384] mt-1 inline-block">Deterministic fallback below</span>
            </div>

            <div className="p-4 rounded-lg bg-slate-50 border border-[#E2E7ED]">
              <span className="text-xs font-semibold text-[#667384] uppercase block mb-1">
                Duplicate Detection
              </span>
              <p className="font-bold text-sm text-[#18232F]">50m Spatial Radius</p>
              <span className="text-[11px] text-[#667384] mt-1 inline-block">Haversine & PostGIS index</span>
            </div>

            <div className="p-4 rounded-lg bg-slate-50 border border-[#E2E7ED]">
              <span className="text-xs font-semibold text-[#667384] uppercase block mb-1">
                Hazard Escalation
              </span>
              <p className="font-bold text-sm text-[#18232F]">CRITICAL Auto-Tag</p>
              <span className="text-[11px] text-[#667384] mt-1 inline-block">Live wire / gas / arterial hazard</span>
            </div>
          </div>
        </div>

        {/* GIS & Geospatial Coordinates (Read-Only GCC Chennai Defaults) */}
        <div className="bg-white p-6 rounded-xl border border-[#E2E7ED] shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-base font-bold text-[#18232F]">
              <span className="material-symbols-outlined text-[#137A70]">map</span>
              Municipal GIS & Sector Bounds
            </div>
            <span className="text-xs font-semibold text-teal-800 bg-teal-50 px-2.5 py-0.5 rounded border border-teal-200">
              Chennai GCC
            </span>
          </div>
          <p className="text-xs text-[#667384]">
            Municipal operational coordinate center and projection system for Greater Chennai Corporation civic management.
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 pt-2">
            <div className="p-4 rounded-lg bg-slate-50 border border-[#E2E7ED]">
              <span className="text-xs font-semibold text-[#667384] uppercase block mb-1">
                Center Latitude
              </span>
              <p className="font-mono font-bold text-sm text-[#18232F]">13.0827° N</p>
              <span className="text-[11px] text-[#667384] mt-1 inline-block">Ripon Building GCC</span>
            </div>

            <div className="p-4 rounded-lg bg-slate-50 border border-[#E2E7ED]">
              <span className="text-xs font-semibold text-[#667384] uppercase block mb-1">
                Center Longitude
              </span>
              <p className="font-mono font-bold text-sm text-[#18232F]">80.2707° E</p>
              <span className="text-[11px] text-[#667384] mt-1 inline-block">Chennai Urban Zone</span>
            </div>

            <div className="p-4 rounded-lg bg-slate-50 border border-[#E2E7ED]">
              <span className="text-xs font-semibold text-[#667384] uppercase block mb-1">
                Default Zoom
              </span>
              <p className="font-mono font-bold text-sm text-[#18232F]">Level 12</p>
              <span className="text-[11px] text-[#667384] mt-1 inline-block">Metropolitan overview</span>
            </div>

            <div className="p-4 rounded-lg bg-slate-50 border border-[#E2E7ED]">
              <span className="text-xs font-semibold text-[#667384] uppercase block mb-1">
                Spatial Radius & Engine
              </span>
              <p className="font-mono font-bold text-sm text-[#18232F]">25 km / PostGIS</p>
              <span className="text-[11px] text-[#667384] mt-1 inline-block">EPSG:4326 MultiPolygon Wards</span>
            </div>
          </div>
        </div>

        {/* Development & Demo Dataset Operations - Conditional on Backend Demo Availability */}
        {demoStatus?.available === true ? (
          <div className="bg-white p-6 rounded-xl border border-red-200 shadow-sm space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-base font-bold text-red-900">
                <span className="material-symbols-outlined text-red-600">dataset</span>
                PostgreSQL Demo Dataset Management
              </div>
              <span className="px-2.5 py-0.5 rounded text-[11px] font-bold bg-amber-100 text-amber-900 border border-amber-200">
                Dev Profile Active
              </span>
            </div>
            <p className="text-xs text-[#667384] leading-relaxed">
              Re-initializes the 40-record Chennai civic complaints dataset in PostgreSQL. Purges only demo records (<code className="font-mono text-red-700">is_demo = true</code>) with matching status history, audit entries, and evidence photos. Real citizen complaints and system user accounts are never touched.
            </p>

            <div className="pt-2 flex items-center gap-3">
              <button
                type="button"
                disabled={resettingDemo}
                onClick={handleResetDemoData}
                className="px-4 py-2.5 text-xs font-semibold text-white bg-red-600 hover:bg-red-700 disabled:opacity-50 rounded-lg transition-colors shadow-sm flex items-center gap-2"
              >
                <span className="material-symbols-outlined text-[18px]">
                  {resettingDemo ? 'progress_activity' : 'restart_alt'}
                </span>
                <span>{resettingDemo ? 'Resetting Demo Data in PostgreSQL...' : 'Reset Demo Data'}</span>
              </button>
            </div>
          </div>
        ) : !loadingDemoStatus && (
          <div className="bg-slate-50 p-5 rounded-xl border border-slate-200 flex items-center gap-3 text-xs text-slate-600">
            <span className="material-symbols-outlined text-slate-400 text-[20px]">verified_user</span>
            <span>
              <strong>Production Environment:</strong> Demo dataset reset endpoint is restricted to local development environments and disabled on this server.
            </span>
          </div>
        )}
      </div>
    </div>
  );
};

export default SystemSettingsPage;
