import React, { useState, useEffect, useCallback } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useApp } from '../../context/AppContext';
import { adminService } from '../../services/adminService';
import Breadcrumb from '../../components/common/Breadcrumb';

const UserDetailsPage = () => {
  const { userId } = useParams();
  const { showToast, currentUser } = useApp();

  const [user, setUser] = useState(null);
  const [userLogs, setUserLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [activeTab, setActiveTab] = useState('overview');
  const [isUpdatingStatus, setIsUpdatingStatus] = useState(false);

  const loadUserData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const userData = await adminService.getUserById(userId);
      setUser(userData);

      // Fetch audit logs related to this user
      if (userData?.email) {
        try {
          const logsRes = await adminService.getAuditLogs({ actor: userData.email, size: 50 });
          setUserLogs(logsRes?.content || []);
        } catch (logErr) {
          console.warn('Could not load specific audit logs for user:', logErr);
          setUserLogs([]);
        }
      }
    } catch (err) {
      console.error('Failed to load user details:', err);
      setError(err?.message || 'User not found or server unreachable.');
    } finally {
      setLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    loadUserData();
  }, [loadUserData]);

  const handleToggleStatus = async () => {
    if (!user) return;
    if (currentUser?.id === user.id) {
      showToast('Cannot suspend your own administrative account', 'error');
      return;
    }
    const targetStatus = user.status === 'ACTIVE' ? 'SUSPENDED' : 'ACTIVE';
    setIsUpdatingStatus(true);
    try {
      const updated = await adminService.updateUserStatus(
        user.id,
        targetStatus,
        `Status toggled to ${targetStatus} from user details profile screen`
      );
      setUser(updated);
      showToast(`User ${user.name} is now ${targetStatus}`, 'success');
    } catch (err) {
      console.error('Failed to update status:', err);
      showToast(err?.message || 'Failed to update user status', 'error');
    } finally {
      setIsUpdatingStatus(false);
    }
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <Breadcrumb
          items={[
            { label: 'Admin Console', to: '/admin/dashboard' },
            { label: 'User Directory', to: '/admin/users' },
            { label: 'Loading Profile...' }
          ]}
        />
        <div className="p-16 text-center text-[#667384] flex flex-col items-center justify-center gap-3">
          <span className="material-symbols-outlined text-4xl animate-spin text-[#137A70]">progress_activity</span>
          <p className="text-sm font-semibold">Retrieving verified identity profile from PostgreSQL...</p>
        </div>
      </div>
    );
  }

  if (error || !user) {
    return (
      <div className="space-y-6">
        <Breadcrumb
          items={[
            { label: 'Admin Console', to: '/admin/dashboard' },
            { label: 'User Directory', to: '/admin/users' },
            { label: 'User Not Found' }
          ]}
        />
        <div className="bg-white p-12 rounded-xl border border-[#E2E7ED] text-center max-w-lg mx-auto shadow-sm space-y-4">
          <span className="material-symbols-outlined text-[48px] text-slate-400">person_off</span>
          <h2 className="text-xl font-bold text-[#18232F]">User Not Found</h2>
          <p className="text-sm text-[#667384]">
            {error || `The requested user account #${userId} does not exist in the municipal directory.`}
          </p>
          <Link
            to="/admin/users"
            className="inline-block px-5 py-2.5 bg-[#137A70] hover:bg-[#0F625B] text-white rounded-lg text-sm font-semibold transition-colors"
          >
            Back to User Directory
          </Link>
        </div>
      </div>
    );
  }

  const isSelf = currentUser?.id === user.id;

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
              {(user.name || 'User').split(' ').filter(Boolean).map((n) => n[0]).join('')}
            </div>
            <div>
              <div className="flex items-center gap-3">
                <h1 className="text-2xl font-bold text-[#18232F]">{user.name}</h1>
                <span
                  className={`px-2.5 py-0.5 rounded-full text-xs font-semibold ${
                    user.status === 'ACTIVE'
                      ? 'bg-emerald-100 text-emerald-800'
                      : user.status === 'SUSPENDED'
                      ? 'bg-rose-100 text-rose-800'
                      : 'bg-amber-100 text-amber-800'
                  }`}
                >
                  {user.status}
                </span>
                {isSelf && (
                  <span className="px-2 py-0.5 rounded text-xs bg-slate-200 text-slate-700 font-semibold">
                    Current Session
                  </span>
                )}
              </div>
              <p className="text-sm text-[#667384] mt-0.5">{user.email} • ID: {user.id}</p>
              <div className="flex items-center gap-2 mt-2">
                <span className="px-2.5 py-0.5 rounded-md text-xs font-medium bg-slate-100 text-slate-700">
                  {user.role}
                </span>
                <span className="text-xs text-[#667384]">Department: {user.department || 'Municipal Operations'}</span>
              </div>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3 w-full sm:w-auto">
            {!isSelf && (
              <button
                type="button"
                disabled={isUpdatingStatus}
                onClick={handleToggleStatus}
                className={`px-4 py-2 text-sm font-semibold rounded-lg transition-colors shadow-sm flex items-center gap-1.5 ${
                  user.status === 'ACTIVE'
                    ? 'text-rose-700 bg-rose-50 border border-rose-200 hover:bg-rose-100'
                    : 'text-white bg-emerald-600 hover:bg-emerald-700'
                }`}
              >
                <span className="material-symbols-outlined text-[18px]">
                  {user.status === 'ACTIVE' ? 'block' : 'verified'}
                </span>
                {user.status === 'ACTIVE' ? 'Suspend Account' : 'Activate Account'}
              </button>
            )}
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
                <p className="font-medium text-[#18232F] mt-0.5">{user.phone || 'Not provided'}</p>
              </div>
              <div>
                <p className="text-xs text-[#667384]">Department / Division</p>
                <p className="font-medium text-[#18232F] mt-0.5">{user.department || 'Municipal Operations'}</p>
              </div>
            </div>
          </div>

          <div className="bg-white p-6 rounded-xl border border-[#E2E7ED] shadow-sm space-y-4">
            <h3 className="font-bold text-base text-[#18232F]">Security & Telemetry</h3>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <p className="text-xs text-[#667384]">Authentication Hash</p>
                <span className="inline-flex items-center gap-1 text-emerald-700 font-semibold text-xs mt-0.5">
                  <span className="material-symbols-outlined text-[16px]">lock</span>
                  Sanitized (BCrypt Layered)
                </span>
              </div>
              <div>
                <p className="text-xs text-[#667384]">Account Creation Date</p>
                <p className="font-medium text-[#18232F] mt-0.5">
                  {user.createdAt ? new Date(user.createdAt).toLocaleString() : 'N/A'}
                </p>
              </div>
              <div>
                <p className="text-xs text-[#667384]">Last Updated</p>
                <p className="font-medium text-[#18232F] mt-0.5">
                  {user.updatedAt ? new Date(user.updatedAt).toLocaleString() : 'N/A'}
                </p>
              </div>
              <div>
                <p className="text-xs text-[#667384]">Assigned RBAC Level</p>
                <p className="font-medium text-[#18232F] mt-0.5">{user.role} Authority</p>
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
            Activity Trail for {user.name} ({user.email})
          </div>
          {userLogs.length > 0 ? (
            <div className="divide-y divide-[#E2E7ED]">
              {userLogs.map((log) => (
                <div key={log.id} className="p-4 flex items-center justify-between text-sm">
                  <div>
                    <span className="font-semibold text-[#18232F]">{log.action}</span>
                    <p className="text-xs text-[#667384] mt-0.5">{log.details}</p>
                  </div>
                  <span className="text-xs text-[#667384] font-mono">
                    {log.createdAt ? new Date(log.createdAt).toLocaleString() : ''}
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <div className="p-8 text-center text-sm text-[#667384]">
              No audit log entries recorded for this user in PostgreSQL ledger.
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default UserDetailsPage;
