import React from 'react';
import { useApp } from '../../context/AppContext';
import { Breadcrumb } from '../../components/common/Breadcrumb';

export const WorkerProfilePage = () => {
  const { currentUser } = useApp();

  return (
    <div className="w-full max-w-4xl mx-auto flex flex-col gap-6">
      <Breadcrumb
        items={[
          { label: 'Field Ops', path: '/worker/dashboard', icon: 'engineering' },
          { label: 'Crew Profile & Rig Equipment' }
        ]}
      />

      <div>
        <h1 className="font-headline-lg text-2xl sm:text-3xl font-extrabold text-on-surface tracking-tight">
          Field Technician Profile
        </h1>
        <p className="text-body-md text-sm text-on-surface-variant mt-1">
          Assigned rapid service rig, equipment inventory, and departmental telemetry credentials.
        </p>
      </div>

      <div className="bg-surface-container-lowest rounded-2xl p-6 sm:p-8 shadow-sm border border-outline-variant/30 space-y-6">
        <div className="flex items-center gap-4">
          <div className="w-16 h-16 rounded-2xl bg-primary-container text-white text-xl font-bold flex items-center justify-center shadow-md">
            {currentUser?.avatar || 'MC'}
          </div>
          <div>
            <h2 className="font-headline-sm text-xl font-bold text-on-surface">{currentUser?.name || 'Field Technician'}</h2>
            <p className="text-xs text-on-surface-variant">{currentUser?.department || 'Field Operations Division'}</p>
            <div className="flex items-center gap-2 mt-1">
              <span className="px-2.5 py-0.5 rounded-full bg-primary/10 text-primary-container text-xs font-semibold">
                Lead Field Technician
              </span>
              <span className="font-code text-xs text-tertiary">#FW-882-UNIT4</span>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-4 border-t border-outline-variant/30 text-xs">
          <div className="p-4 rounded-xl bg-surface-container-low space-y-1">
            <span className="text-tertiary block text-[10px] uppercase">Official Email</span>
            <span className="font-semibold text-on-surface">{currentUser?.email || 'technician@fieldops.gov'}</span>
          </div>
          <div className="p-4 rounded-xl bg-surface-container-low space-y-1">
            <span className="text-tertiary block text-[10px] uppercase">Radio / Phone</span>
            <span className="font-semibold text-on-surface">{currentUser?.phone || '+91 91760 98765'}</span>
          </div>
          <div className="p-4 rounded-xl bg-surface-container-low space-y-1">
            <span className="text-tertiary block text-[10px] uppercase">Assigned Service Rig</span>
            <span className="font-semibold text-on-surface">Van #14 (Roller T-12 hitched)</span>
          </div>
          <div className="p-4 rounded-xl bg-surface-container-low space-y-1">
            <span className="text-tertiary block text-[10px] uppercase">Device Geolocation</span>
            <span className="font-semibold text-emerald-600">Active · Browser GPS Enabled</span>
          </div>
        </div>
      </div>
    </div>
  );
};
