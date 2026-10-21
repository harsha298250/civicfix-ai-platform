import React from 'react';
import { useApp } from '../../context/AppContext';
import { Breadcrumb } from '../../components/common/Breadcrumb';

export const OfficerAnalyticsPage = () => {
  const { complaints } = useApp();

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
            District 04 civic turnaround times, SLA adherence, and defect distribution matrices.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-surface-container-lowest p-5 rounded-2xl shadow-sm border border-outline-variant/30">
          <span className="text-xs font-bold text-tertiary uppercase">Mean Resolution Time</span>
          <p className="font-display text-3xl font-bold text-primary mt-2">31.4 hrs</p>
          <span className="text-xs text-emerald-600 font-semibold mt-1 block">↓ 14% improvement vs target</span>
        </div>
        <div className="bg-surface-container-lowest p-5 rounded-2xl shadow-sm border border-outline-variant/30">
          <span className="text-xs font-bold text-tertiary uppercase">First-Pass Verification Rate</span>
          <p className="font-display text-3xl font-bold text-secondary mt-2">94.8%</p>
          <span className="text-xs text-secondary font-semibold mt-1 block">Rework rate &lt; 5.2%</span>
        </div>
        <div className="bg-surface-container-lowest p-5 rounded-2xl shadow-sm border border-outline-variant/30">
          <span className="text-xs font-bold text-tertiary uppercase">AI Multi-Modal Accuracy</span>
          <p className="font-display text-3xl font-bold text-emerald-700 mt-2">98.4%</p>
          <span className="text-xs text-emerald-600 font-semibold mt-1 block">Vision defect classifier</span>
        </div>
        <div className="bg-surface-container-lowest p-5 rounded-2xl shadow-sm border border-outline-variant/30">
          <span className="text-xs font-bold text-tertiary uppercase">Active Defect Inventory</span>
          <p className="font-display text-3xl font-bold text-on-surface mt-2">{complaints.length}</p>
          <span className="text-xs text-tertiary mt-1 block">Tracked across district ledger</span>
        </div>
      </div>

      {/* Category Breakdown & Ward Performance */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <div className="lg:col-span-7 bg-surface-container-lowest rounded-2xl p-6 shadow-sm border border-outline-variant/30 space-y-4">
          <h3 className="font-title text-base font-bold text-on-surface">Defects by Category Distribution</h3>
          <div className="space-y-3">
            {[
              { label: 'Roads & Asphalt Cavities', count: 18, pct: 45, color: 'bg-primary-container' },
              { label: 'Water Pipelines & Sanitation', count: 11, pct: 28, color: 'bg-secondary' },
              { label: 'Electrical & Streetlights', count: 7, pct: 18, color: 'bg-amber-600' },
              { label: 'Solid Waste & Obstacles', count: 4, pct: 9, color: 'bg-emerald-600' }
            ].map(row => (
              <div key={row.label} className="space-y-1 text-xs">
                <div className="flex justify-between">
                  <span className="font-semibold text-on-surface">{row.label}</span>
                  <span className="font-code text-tertiary">{row.count} cases ({row.pct}%)</span>
                </div>
                <div className="w-full bg-surface-container-low rounded-full h-2 overflow-hidden">
                  <div className={`${row.color} h-full rounded-full`} style={{ width: `${row.pct}%` }} />
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="lg:col-span-5 bg-surface-container-lowest rounded-2xl p-6 shadow-sm border border-outline-variant/30 space-y-4">
          <h3 className="font-title text-base font-bold text-on-surface">Audit Compliance Metrics</h3>
          <div className="space-y-2.5 text-xs">
            <div className="p-3 bg-surface-container-low rounded-xl flex justify-between">
              <span className="text-tertiary">FedRAMP Audit Ledger:</span>
              <span className="font-semibold text-emerald-600">Compliant</span>
            </div>
            <div className="p-3 bg-surface-container-low rounded-xl flex justify-between">
              <span className="text-tertiary">Spring Security Guardrails:</span>
              <span className="font-semibold text-on-surface">Enforced</span>
            </div>
            <div className="p-3 bg-surface-container-low rounded-xl flex justify-between">
              <span className="text-tertiary">Cryptographic Geotags:</span>
              <span className="font-semibold text-primary-container">100% Signed</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
