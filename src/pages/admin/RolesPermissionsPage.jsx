import React from 'react';
import { Link } from 'react-router-dom';
import Breadcrumb from '../../components/common/Breadcrumb';

const RolesPermissionsPage = () => {
  const roles = [
    {
      id: 'CITIZEN',
      name: 'Registered Citizen',
      badgeClass: 'bg-blue-100 text-blue-800',
      description: 'Public community member who files reports, tracks ticket resolution, and provides community feedback.',
      userCount: 1420,
      permissions: {
        fileComplaint: true,
        viewPublicFeed: true,
        trackOwnTickets: true,
        assignCrew: false,
        verifyEvidence: false,
        manageUsers: false,
        systemConfig: false,
      },
    },
    {
      id: 'OFFICER',
      name: 'Municipal Officer',
      badgeClass: 'bg-teal-100 text-teal-800',
      description: 'Departmental triage officer responsible for reviewing citizen reports, assessing priority, dispatching field crews, and approving repair verifications.',
      userCount: 42,
      permissions: {
        fileComplaint: true,
        viewPublicFeed: true,
        trackOwnTickets: true,
        assignCrew: true,
        verifyEvidence: true,
        manageUsers: false,
        systemConfig: false,
      },
    },
    {
      id: 'WORKER',
      name: 'Field Crew Specialist',
      badgeClass: 'bg-amber-100 text-amber-800',
      description: 'On-site municipal operations specialist tasked with executing repairs, logging field blockers, and capturing verifiable photo evidence.',
      userCount: 88,
      permissions: {
        fileComplaint: false,
        viewPublicFeed: true,
        trackOwnTickets: false,
        assignCrew: false,
        verifyEvidence: false,
        manageUsers: false,
        systemConfig: false,
        submitEvidence: true,
        logProgress: true,
      },
    },
    {
      id: 'ADMIN',
      name: 'System Administrator',
      badgeClass: 'bg-purple-100 text-purple-800',
      description: 'Platform administrator possessing full authority over system parameters, staff account approval, audit ledger access, and SLA rules.',
      userCount: 6,
      permissions: {
        fileComplaint: true,
        viewPublicFeed: true,
        trackOwnTickets: true,
        assignCrew: true,
        verifyEvidence: true,
        manageUsers: true,
        systemConfig: true,
        submitEvidence: true,
        logProgress: true,
      },
    },
  ];

  return (
    <div className="space-y-6">
      <Breadcrumb
        items={[
          { label: 'Admin Console', to: '/admin/dashboard' },
          { label: 'Roles & Permissions', to: '/admin/roles' },
        ]}
      />

      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-[#18232F]">Role-Based Access Control (RBAC)</h1>
          <p className="text-sm text-[#667384]">
            Enforce least-privilege security boundaries and functional authority across the platform.
          </p>
        </div>
        <Link
          to="/admin/users/new"
          className="px-4 py-2 text-sm font-semibold text-white bg-[#137A70] rounded-lg hover:bg-[#0F625B] transition-colors flex items-center gap-1.5 shadow-sm self-start"
        >
          <span className="material-symbols-outlined text-[18px]">person_add</span>
          Provision Staff Account
        </Link>
      </div>

      {/* Role Cards Overview */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
        {roles.map((r) => (
          <div key={r.id} className="bg-white p-5 rounded-xl border border-[#E2E7ED] shadow-sm space-y-3">
            <div className="flex items-center justify-between">
              <span className={`px-2.5 py-0.5 rounded-full text-xs font-semibold ${r.badgeClass}`}>
                {r.id}
              </span>
              <span className="text-xs text-[#667384] font-medium">{r.userCount} Accounts</span>
            </div>
            <h3 className="font-bold text-base text-[#18232F]">{r.name}</h3>
            <p className="text-xs text-[#667384] line-clamp-3 leading-relaxed">{r.description}</p>
          </div>
        ))}
      </div>

      {/* Permissions Matrix */}
      <div className="bg-white rounded-xl border border-[#E2E7ED] shadow-sm overflow-hidden">
        <div className="p-5 border-b border-[#E2E7ED] flex items-center justify-between">
          <div>
            <h2 className="text-base font-bold text-[#18232F]">Permission Matrix by Persona</h2>
            <p className="text-xs text-[#667384] mt-0.5">
              Verified security capabilities enforced at API gateway and client routing layers.
            </p>
          </div>
          <span className="text-xs font-semibold text-emerald-700 bg-emerald-50 px-3 py-1 rounded-full border border-emerald-200">
            Enforced by Spring Security
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-[#18232F]">
            <thead className="bg-[#F5F7FA] border-b border-[#E2E7ED] text-xs font-semibold text-[#667384] uppercase tracking-wider">
              <tr>
                <th className="px-6 py-3.5">Permission Capability</th>
                <th className="px-6 py-3.5 text-center">Citizen</th>
                <th className="px-6 py-3.5 text-center">Officer</th>
                <th className="px-6 py-3.5 text-center">Field Worker</th>
                <th className="px-6 py-3.5 text-center">Admin</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E2E7ED]">
              <tr>
                <td className="px-6 py-4">
                  <div className="font-semibold text-xs text-[#18232F]">Report Civic Issue</div>
                  <div className="text-[11px] text-[#667384]">Create and submit public complaints with GPS & photos</div>
                </td>
                <td className="px-6 py-4 text-center"><span className="material-symbols-outlined text-emerald-600 text-lg">check_circle</span></td>
                <td className="px-6 py-4 text-center"><span className="material-symbols-outlined text-emerald-600 text-lg">check_circle</span></td>
                <td className="px-6 py-4 text-center"><span className="material-symbols-outlined text-slate-300 text-lg">cancel</span></td>
                <td className="px-6 py-4 text-center"><span className="material-symbols-outlined text-emerald-600 text-lg">check_circle</span></td>
              </tr>
              <tr>
                <td className="px-6 py-4">
                  <div className="font-semibold text-xs text-[#18232F]">Triage & Dispatch Crew</div>
                  <div className="text-[11px] text-[#667384]">Review complaints, assess urgency, assign field crew leads</div>
                </td>
                <td className="px-6 py-4 text-center"><span className="material-symbols-outlined text-slate-300 text-lg">cancel</span></td>
                <td className="px-6 py-4 text-center"><span className="material-symbols-outlined text-emerald-600 text-lg">check_circle</span></td>
                <td className="px-6 py-4 text-center"><span className="material-symbols-outlined text-slate-300 text-lg">cancel</span></td>
                <td className="px-6 py-4 text-center"><span className="material-symbols-outlined text-emerald-600 text-lg">check_circle</span></td>
              </tr>
              <tr>
                <td className="px-6 py-4">
                  <div className="font-semibold text-xs text-[#18232F]">Field Evidence Submission</div>
                  <div className="text-[11px] text-[#667384]">Log work start, record blockers, capture completion photos</div>
                </td>
                <td className="px-6 py-4 text-center"><span className="material-symbols-outlined text-slate-300 text-lg">cancel</span></td>
                <td className="px-6 py-4 text-center"><span className="material-symbols-outlined text-slate-300 text-lg">cancel</span></td>
                <td className="px-6 py-4 text-center"><span className="material-symbols-outlined text-emerald-600 text-lg">check_circle</span></td>
                <td className="px-6 py-4 text-center"><span className="material-symbols-outlined text-emerald-600 text-lg">check_circle</span></td>
              </tr>
              <tr>
                <td className="px-6 py-4">
                  <div className="font-semibold text-xs text-[#18232F]">Resolution Signoff & Approval</div>
                  <div className="text-[11px] text-[#667384]">Compare before/after photos and transition ticket to RESOLVED</div>
                </td>
                <td className="px-6 py-4 text-center"><span className="material-symbols-outlined text-slate-300 text-lg">cancel</span></td>
                <td className="px-6 py-4 text-center"><span className="material-symbols-outlined text-emerald-600 text-lg">check_circle</span></td>
                <td className="px-6 py-4 text-center"><span className="material-symbols-outlined text-slate-300 text-lg">cancel</span></td>
                <td className="px-6 py-4 text-center"><span className="material-symbols-outlined text-emerald-600 text-lg">check_circle</span></td>
              </tr>
              <tr>
                <td className="px-6 py-4">
                  <div className="font-semibold text-xs text-[#18232F]">User Administration & Approvals</div>
                  <div className="text-[11px] text-[#667384]">Approve staff credentials, deactivate users, reset access</div>
                </td>
                <td className="px-6 py-4 text-center"><span className="material-symbols-outlined text-slate-300 text-lg">cancel</span></td>
                <td className="px-6 py-4 text-center"><span className="material-symbols-outlined text-slate-300 text-lg">cancel</span></td>
                <td className="px-6 py-4 text-center"><span className="material-symbols-outlined text-slate-300 text-lg">cancel</span></td>
                <td className="px-6 py-4 text-center"><span className="material-symbols-outlined text-emerald-600 text-lg">check_circle</span></td>
              </tr>
              <tr>
                <td className="px-6 py-4">
                  <div className="font-semibold text-xs text-[#18232F]">Audit Logs & System Settings</div>
                  <div className="text-[11px] text-[#667384]">Access immutable audit log, tune SLA triggers, configure AI</div>
                </td>
                <td className="px-6 py-4 text-center"><span className="material-symbols-outlined text-slate-300 text-lg">cancel</span></td>
                <td className="px-6 py-4 text-center"><span className="material-symbols-outlined text-slate-300 text-lg">cancel</span></td>
                <td className="px-6 py-4 text-center"><span className="material-symbols-outlined text-slate-300 text-lg">cancel</span></td>
                <td className="px-6 py-4 text-center"><span className="material-symbols-outlined text-emerald-600 text-lg">check_circle</span></td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default RolesPermissionsPage;
