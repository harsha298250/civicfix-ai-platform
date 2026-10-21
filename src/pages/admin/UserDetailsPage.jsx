import React, { useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { useApp } from '../../context/AppContext';
import Breadcrumb from '../../components/common/Breadcrumb';

const UserDetailsPage = () => {
  const { userId } = useParams();
  const navigate = useNavigate();
  const { users, approveStaff, showToast, auditLogs } = useApp();

  const user = users.find((u) => u.id === userId) || users[0];

  const [activeTab, setActiveTab] = useState('overview');

  if (!user) {
    return (
      <div className="bg-white p-8 rounded-xl border border-[#E2E7ED] text-center">
        <h2 className="text-xl font-bold text-[#18232F]">User Not Found</h2>
        <p className="text-sm text-[#667384] mt-2">The requested user ID {userId} does not exist in the directory.</p>
        <Link to="/admin/users" className="mt-4 inline-block px-4 py-2 bg-[#137A70] text-white rounded-lg text-sm font-semibold">
          Back to User Directory
        </Link>
      </div>
    );
  }

  const userLogs = auditLogs.filter(
    (l) => l.actor.toLowerCase().includes(user.name.toLowerCase()) || l.details.toLowerCase().includes(user.name.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <Breadcrumb
        items={[
          { label: 'Admin Console', to: '/admin/dashboard' },
          { label: 'User Directory', to: '/admin/users' },
          { label: user.name, to: `/admin/users/${user.id}` },
        ]}
      />

      {/* Profile Card Header */}
      <div className="bg-white rounded-xl border border-[#E2E7ED] shadow-sm p-6">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6">
          <div className="flex items-center gap-5">
            <div className="w-16 h-16 rounded-2xl bg-[#E8F4F1] text-[#137A70] font-bold text-2xl flex items-center justify-center border-2 border-[#137A70]/20 shadow-sm">
              {user.name.split(' ').map((n) => n[0]).join('')}
            </div>
            <div>
              <div className="flex items-center gap-3">
                <h1 className="text-2xl font-bold text-[#18232F]">{user.name}</h1>
                <span
                  className={`px-2.5 py-0.5 rounded-full text-xs font-semibold ${
                    user.status === 'Active'
                      ? 'bg-emerald-100 text-emerald-800'
                      : 'bg-amber-100 text-amber-800'
                  }`}
                >
                  {user.status}
                </span>
              </div>
              <p className="text-sm text-[#667384] mt-0.5">{user.email} • ID: {user.id}</p>
              <div className="flex items-center gap-2 mt-2">
                <span className="px-2.5 py-0.5 rounded-md text-xs font-medium bg-slate-100 text-slate-700">
                  {user.role}
                </span>
                <span className="text-xs text-[#667384]">Department: {user.department}</span>
              </div>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3 w-full sm:w-auto">
            {user.status === 'Pending Approval' && (
              <button
                onClick={() => {
                  approveStaff(user.id);
                  showToast(`Approved account credentials for ${user.name}`);
                }}
                className="px-4 py-2 text-sm font-semibold text-white bg-emerald-600 rounded-lg hover:bg-emerald-700 transition-colors shadow-sm flex items-center gap-1.5"
              >
                <span className="material-symbols-outlined text-[18px]">verified</span>
                Approve Account
              </button>
            )}
            <button
              onClick={() => showToast(`Password reset link dispatched to ${user.email}`)}
              className="px-3.5 py-2 text-sm font-semibold text-[#18232F] bg-white border border-[#E2E7ED] rounded-lg hover:bg-slate-50 transition-colors flex items-center gap-1.5"
            >
              <span className="material-symbols-outlined text-[18px] text-[#667384]">lock_reset</span>
              Reset Password
            </button>
            <Link
              to="/admin/users"
              className="px-3.5 py-2 text-sm font-semibold text-[#667384] hover:text-[#18232F] border border-[#E2E7ED] rounded-lg bg-slate-50 hover:bg-slate-100 transition-colors"
            >
              Back to List
            </Link>
          </div>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="flex border-b border-[#E2E7ED] gap-8">
        <button
          onClick={() => setActiveTab('overview')}
          className={`pb-3 text-sm font-semibold border-b-2 transition-colors ${
            activeTab === 'overview'
              ? 'border-[#137A70] text-[#137A70]'
              : 'border-transparent text-[#667384] hover:text-[#18232F]'
          }`}
        >
          Account Overview
        </button>
        <button
          onClick={() => setActiveTab('permissions')}
          className={`pb-3 text-sm font-semibold border-b-2 transition-colors ${
            activeTab === 'permissions'
              ? 'border-[#137A70] text-[#137A70]'
              : 'border-transparent text-[#667384] hover:text-[#18232F]'
          }`}
        >
          Assigned Permissions
        </button>
        <button
          onClick={() => setActiveTab('logs')}
          className={`pb-3 text-sm font-semibold border-b-2 transition-colors ${
            activeTab === 'logs'
              ? 'border-[#137A70] text-[#137A70]'
              : 'border-transparent text-[#667384] hover:text-[#18232F]'
          }`}
        >
          Audit History ({userLogs.length})
        </button>
      </div>

      {/* Content based on tab */}
      {activeTab === 'overview' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="bg-white p-6 rounded-xl border border-[#E2E7ED] shadow-sm space-y-4">
            <h3 className="font-bold text-base text-[#18232F]">Identity & Contact</h3>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <p className="text-xs text-[#667384]">Full Legal Name</p>
                <p className="font-medium text-[#18232F] mt-0.5">{user.name}</p>
              </div>
              <div>
                <p className="text-xs text-[#667384]">Official Email</p>
                <p className="font-medium text-[#18232F] mt-0.5">{user.email}</p>
              </div>
              <div>
                <p className="text-xs text-[#667384]">Phone Number</p>
                <p className="font-medium text-[#18232F] mt-0.5">{user.phone || '+91 98401 23456'}</p>
              </div>
              <div>
                <p className="text-xs text-[#667384]">Department / Division</p>
                <p className="font-medium text-[#18232F] mt-0.5">{user.department}</p>
              </div>
            </div>
          </div>

          <div className="bg-white p-6 rounded-xl border border-[#E2E7ED] shadow-sm space-y-4">
            <h3 className="font-bold text-base text-[#18232F]">Security & Authentication</h3>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <p className="text-xs text-[#667384]">MFA / 2FA Status</p>
                <span className="inline-flex items-center gap-1 text-emerald-700 font-semibold text-xs mt-0.5">
                  <span className="material-symbols-outlined text-[16px]">check_circle</span>
                  Enforced (TOTP)
                </span>
              </div>
              <div>
                <p className="text-xs text-[#667384]">Account Creation Date</p>
                <p className="font-medium text-[#18232F] mt-0.5">{user.joined || 'Feb 10, 2026'}</p>
              </div>
              <div>
                <p className="text-xs text-[#667384]">Last Login Timestamp</p>
                <p className="font-medium text-[#18232F] mt-0.5">{user.lastActive || 'Today at 08:30 AM'}</p>
              </div>
              <div>
                <p className="text-xs text-[#667384]">RBAC Level</p>
                <p className="font-medium text-[#18232F] mt-0.5">Tier 2 Authorized Operator</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'permissions' && (
        <div className="bg-white p-6 rounded-xl border border-[#E2E7ED] shadow-sm space-y-4">
          <h3 className="font-bold text-base text-[#18232F]">Role-Based Access Control Privileges</h3>
          <p className="text-sm text-[#667384]">
            Capabilities granted to this profile based on the assigned role <span className="font-semibold text-[#18232F]">{user.role}</span>.
          </p>

          <div className="divide-y divide-[#E2E7ED] border border-[#E2E7ED] rounded-lg">
            <div className="p-4 flex items-center justify-between">
              <div>
                <p className="text-sm font-semibold text-[#18232F]">Complaint Dispatch & Assignment</p>
                <p className="text-xs text-[#667384]">Can triage tickets and dispatch work orders to field crews.</p>
              </div>
              <span className={`material-symbols-outlined text-2xl ${user.role === 'OFFICER' || user.role === 'ADMIN' ? 'text-emerald-600' : 'text-slate-300'}`}>
                {user.role === 'OFFICER' || user.role === 'ADMIN' ? 'check_box' : 'disabled_by_default'}
              </span>
            </div>
            <div className="p-4 flex items-center justify-between">
              <div>
                <p className="text-sm font-semibold text-[#18232F]">Resolution Verification & Signoff</p>
                <p className="text-xs text-[#667384]">Authorized to approve completed field work or issue rework orders.</p>
              </div>
              <span className={`material-symbols-outlined text-2xl ${user.role === 'OFFICER' || user.role === 'ADMIN' ? 'text-emerald-600' : 'text-slate-300'}`}>
                {user.role === 'OFFICER' || user.role === 'ADMIN' ? 'check_box' : 'disabled_by_default'}
              </span>
            </div>
            <div className="p-4 flex items-center justify-between">
              <div>
                <p className="text-sm font-semibold text-[#18232F]">Field Evidence Submission</p>
                <p className="text-xs text-[#667384]">Can capture on-site photographic telemetry and progress remarks.</p>
              </div>
              <span className={`material-symbols-outlined text-2xl ${user.role === 'WORKER' || user.role === 'ADMIN' ? 'text-emerald-600' : 'text-slate-300'}`}>
                {user.role === 'WORKER' || user.role === 'ADMIN' ? 'check_box' : 'disabled_by_default'}
              </span>
            </div>
            <div className="p-4 flex items-center justify-between">
              <div>
                <p className="text-sm font-semibold text-[#18232F]">System Configuration & Staff Provisioning</p>
                <p className="text-xs text-[#667384]">Root administrative privileges to manage accounts and policies.</p>
              </div>
              <span className={`material-symbols-outlined text-2xl ${user.role === 'ADMIN' ? 'text-emerald-600' : 'text-slate-300'}`}>
                {user.role === 'ADMIN' ? 'check_box' : 'disabled_by_default'}
              </span>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'logs' && (
        <div className="bg-white rounded-xl border border-[#E2E7ED] shadow-sm overflow-hidden">
          <div className="p-4 border-b border-[#E2E7ED] font-semibold text-sm text-[#18232F]">
            Activity Trail for {user.name}
          </div>
          {userLogs.length > 0 ? (
            <div className="divide-y divide-[#E2E7ED]">
              {userLogs.map((log) => (
                <div key={log.id} className="p-4 flex items-center justify-between text-sm">
                  <div>
                    <span className="font-semibold text-[#18232F]">{log.action}</span>
                    <p className="text-xs text-[#667384] mt-0.5">{log.details}</p>
                  </div>
                  <span className="text-xs text-[#667384] font-mono">{log.timestamp}</span>
                </div>
              ))}
            </div>
          ) : (
            <div className="p-8 text-center text-sm text-[#667384]">
              No audit log entries recorded for this user in this demo session.
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default UserDetailsPage;
