import React from 'react';
import { Link } from 'react-router-dom';
import { useApp } from '../../context/AppContext';
import { StatusBadge } from '../../components/common/StatusBadge';
import { PriorityBadge } from '../../components/common/PriorityBadge';
import { Breadcrumb } from '../../components/common/Breadcrumb';

export const AssignmentsPage = () => {
  const { complaints } = useApp();

  const assignedComplaints = complaints.filter(c => c.assignedWorker);

  return (
    <div className="w-full flex flex-col gap-6">
      <Breadcrumb
        items={[
          { label: 'Operations Command', path: '/officer/dashboard', icon: 'account_balance' },
          { label: 'Worker Assignments' }
        ]}
      />

      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="font-headline-lg text-2xl sm:text-3xl font-extrabold text-on-surface tracking-tight">
            Field Worker Assignments & Allocation
          </h1>
          <p className="text-body-md text-sm text-on-surface-variant mt-1">
            Active dispatched units, vehicle rigs, and work order tracking across District 04.
          </p>
        </div>

        <Link
          to="/officer/complaints"
          className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-primary-container text-white text-xs font-semibold shadow-sm hover:bg-primary"
        >
          <span className="material-symbols-outlined text-[18px]">add_task</span>
          <span>Assign From Queue</span>
        </Link>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {[
          { name: 'Marcus Chen', unit: 'SDOT Rapid Asphalt 4', active: 2, rig: 'Van #14 (Roller T-12)' },
          { name: 'David Kalu', unit: 'Sanitation Emergency', active: 1, rig: 'Compactor Rig 3' },
          { name: 'Suresh Kumar', unit: 'High Voltage Grid Service', active: 1, rig: 'Aerial Lift Truck 9' }
        ].map((lead, idx) => (
          <div key={idx} className="bg-surface-container-lowest p-5 rounded-2xl shadow-sm border border-outline-variant/30 space-y-2">
            <div className="flex items-center justify-between">
              <span className="font-bold text-sm text-on-surface">{lead.name}</span>
              <span className="px-2 py-0.5 rounded-full bg-primary/10 text-primary text-xs font-bold">
                {lead.active} Active Orders
              </span>
            </div>
            <p className="text-xs text-tertiary">{lead.unit}</p>
            <p className="text-[11px] text-on-surface-variant font-code bg-surface-container-low p-2 rounded-lg">
              {lead.rig}
            </p>
          </div>
        ))}
      </div>

      <div className="bg-surface-container-lowest rounded-2xl p-6 shadow-sm border border-outline-variant/30 space-y-4">
        <h2 className="font-title text-base font-bold text-on-surface">Active Dispatched Tickets</h2>

        <div className="space-y-3">
          {assignedComplaints.length === 0 ? (
            <p className="text-xs text-tertiary text-center py-8">No tickets currently dispatched.</p>
          ) : (
            assignedComplaints.map(c => (
              <div
                key={c.id}
                className="p-4 rounded-xl border border-outline-variant/40 bg-surface-container-lowest flex flex-col md:flex-row md:items-center justify-between gap-4"
              >
                <div className="space-y-1 min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-code text-xs font-bold bg-surface-container text-on-surface px-2.5 py-0.5 rounded">
                      #{c.id}
                    </span>
                    <StatusBadge status={c.status} size="sm" />
                    <PriorityBadge priority={c.priority} />
                  </div>
                  <h3 className="font-title text-sm font-bold text-on-surface">{c.title}</h3>
                  <div className="flex items-center gap-3 text-xs text-tertiary">
                    <span>Crew Lead: <strong className="text-on-surface">{c.assignedWorker.name}</strong></span>
                    <span>•</span>
                    <span>Target Date: {c.assignedWorker.estimatedCompletion || '48h SLA'}</span>
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <Link
                    to={`/officer/complaints/${c.id}/review`}
                    className="px-3.5 py-2 rounded-xl bg-surface-container hover:bg-surface-container-high text-xs font-semibold text-on-surface"
                  >
                    Inspect Assignment
                  </Link>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};
