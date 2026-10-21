import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import Breadcrumb from '../../components/common/Breadcrumb';

const SystemSettingsPage = () => {
  const { showToast } = useApp();

  const [aiSettings, setAiSettings] = useState({
    model: 'Gemini 1.5 Pro (Multimodal)',
    minConfidence: '85',
    autoTagDuplicates: true,
    severityAutoEscalate: true,
  });

  const [slaSettings, setSlaSettings] = useState({
    criticalHours: '24',
    highHours: '48',
    mediumHours: '72',
    lowDays: '7',
  });

  const [gisSettings, setGisSettings] = useState({
    centerLat: '37.7749',
    centerLng: '-122.4194',
    defaultZoom: '13',
    maxRadiusKm: '25',
  });

  const handleSave = (e) => {
    e.preventDefault();
    showToast('Platform configurations and SLA rules successfully synchronized');
  };

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
            Platform & Engine Settings
          </h1>
          <p className="text-sm text-[#667384]">
            Configure AI multimodal inference, SLA thresholds, GIS boundaries, and security policies.
          </p>
        </div>
        <button
          onClick={handleSave}
          className="px-5 py-2.5 text-sm font-semibold text-white bg-[#137A70] hover:bg-[#0F625B] rounded-lg transition-colors shadow-sm flex items-center gap-2 self-start"
        >
          <span className="material-symbols-outlined text-[18px]">save</span>
          Save Configuration
        </button>
      </div>

      <form onSubmit={handleSave} className="space-y-6">
        {/* AI & Gemini Configuration */}
        <div className="bg-white p-6 rounded-xl border border-[#E2E7ED] shadow-sm space-y-4">
          <div className="flex items-center gap-2 text-base font-bold text-[#18232F]">
            <span className="material-symbols-outlined text-[#7C6CF2]">neurology</span>
            CivicFix AI & Vision Pipeline Configuration
          </div>
          <p className="text-xs text-[#667384]">
            Settings governing Google Gemini API multimodal classification, damage severity estimation, and automated dispatch suggestions.
          </p>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5 pt-2">
            <div>
              <label className="block text-xs font-semibold text-[#18232F] uppercase mb-1.5">
                Multimodal AI Model Endpoint
              </label>
              <select
                value={aiSettings.model}
                onChange={(e) => setAiSettings({ ...aiSettings, model: e.target.value })}
                className="w-full px-3.5 py-2 text-sm border border-[#E2E7ED] rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-[#137A70]"
              >
                <option value="Gemini 1.5 Pro (Multimodal)">Gemini 1.5 Pro (Multimodal - Recommended)</option>
                <option value="Gemini 1.5 Flash (Low Latency)">Gemini 1.5 Flash (Low Latency)</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-[#18232F] uppercase mb-1.5">
                Minimum Confidence Auto-Triage Threshold (%)
              </label>
              <input
                type="number"
                value={aiSettings.minConfidence}
                onChange={(e) => setAiSettings({ ...aiSettings, minConfidence: e.target.value })}
                className="w-full px-3.5 py-2 text-sm border border-[#E2E7ED] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#137A70]"
              />
            </div>
          </div>

          <div className="space-y-3 pt-2">
            <label className="flex items-center gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={aiSettings.autoTagDuplicates}
                onChange={(e) => setAiSettings({ ...aiSettings, autoTagDuplicates: e.target.checked })}
                className="w-4 h-4 text-[#137A70] rounded border-[#E2E7ED] focus:ring-[#137A70]"
              />
              <span className="text-sm text-[#18232F]">
                Enable geospatial duplicate detection (flags redundant complaints within a 50m radius)
              </span>
            </label>

            <label className="flex items-center gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={aiSettings.severityAutoEscalate}
                onChange={(e) => setAiSettings({ ...aiSettings, severityAutoEscalate: e.target.checked })}
                className="w-4 h-4 text-[#137A70] rounded border-[#E2E7ED] focus:ring-[#137A70]"
              />
              <span className="text-sm text-[#18232F]">
                Auto-escalate priority to CRITICAL when hazard signals (gas, live wire, arterial roadway) are detected
              </span>
            </label>
          </div>
        </div>

        {/* SLA & Turnaround Times */}
        <div className="bg-white p-6 rounded-xl border border-[#E2E7ED] shadow-sm space-y-4">
          <div className="flex items-center gap-2 text-base font-bold text-[#18232F]">
            <span className="material-symbols-outlined text-[#D97706]">timer</span>
            Municipal Service Level Agreement (SLA) Windows
          </div>
          <p className="text-xs text-[#667384]">
            Maximum permissible elapsed time before tickets are flagged as overdue and escalate to department directors.
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 pt-2">
            <div>
              <label className="block text-xs font-semibold text-[#18232F] uppercase mb-1.5">
                Critical Severity (Hours)
              </label>
              <input
                type="number"
                value={slaSettings.criticalHours}
                onChange={(e) => setSlaSettings({ ...slaSettings, criticalHours: e.target.value })}
                className="w-full px-3.5 py-2 text-sm border border-[#E2E7ED] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#137A70]"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-[#18232F] uppercase mb-1.5">
                High Priority (Hours)
              </label>
              <input
                type="number"
                value={slaSettings.highHours}
                onChange={(e) => setSlaSettings({ ...slaSettings, highHours: e.target.value })}
                className="w-full px-3.5 py-2 text-sm border border-[#E2E7ED] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#137A70]"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-[#18232F] uppercase mb-1.5">
                Medium Priority (Hours)
              </label>
              <input
                type="number"
                value={slaSettings.mediumHours}
                onChange={(e) => setSlaSettings({ ...slaSettings, mediumHours: e.target.value })}
                className="w-full px-3.5 py-2 text-sm border border-[#E2E7ED] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#137A70]"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-[#18232F] uppercase mb-1.5">
                Low Priority (Days)
              </label>
              <input
                type="number"
                value={slaSettings.lowDays}
                onChange={(e) => setSlaSettings({ ...slaSettings, lowDays: e.target.value })}
                className="w-full px-3.5 py-2 text-sm border border-[#E2E7ED] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#137A70]"
              />
            </div>
          </div>
        </div>

        {/* GIS & Geospatial Coordinates */}
        <div className="bg-white p-6 rounded-xl border border-[#E2E7ED] shadow-sm space-y-4">
          <div className="flex items-center gap-2 text-base font-bold text-[#18232F]">
            <span className="material-symbols-outlined text-[#137A70]">map</span>
            Municipal GIS & Sector Bounds
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 pt-2">
            <div>
              <label className="block text-xs font-semibold text-[#18232F] uppercase mb-1.5">
                Center Latitude
              </label>
              <input
                type="text"
                value={gisSettings.centerLat}
                onChange={(e) => setGisSettings({ ...gisSettings, centerLat: e.target.value })}
                className="w-full px-3.5 py-2 text-sm border border-[#E2E7ED] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#137A70]"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-[#18232F] uppercase mb-1.5">
                Center Longitude
              </label>
              <input
                type="text"
                value={gisSettings.centerLng}
                onChange={(e) => setGisSettings({ ...gisSettings, centerLng: e.target.value })}
                className="w-full px-3.5 py-2 text-sm border border-[#E2E7ED] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#137A70]"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-[#18232F] uppercase mb-1.5">
                Default Zoom Level
              </label>
              <input
                type="number"
                value={gisSettings.defaultZoom}
                onChange={(e) => setGisSettings({ ...gisSettings, defaultZoom: e.target.value })}
                className="w-full px-3.5 py-2 text-sm border border-[#E2E7ED] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#137A70]"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-[#18232F] uppercase mb-1.5">
                Service Radius (km)
              </label>
              <input
                type="number"
                value={gisSettings.maxRadiusKm}
                onChange={(e) => setGisSettings({ ...gisSettings, maxRadiusKm: e.target.value })}
                className="w-full px-3.5 py-2 text-sm border border-[#E2E7ED] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#137A70]"
              />
            </div>
          </div>
        </div>
      </form>
    </div>
  );
};

export default SystemSettingsPage;
