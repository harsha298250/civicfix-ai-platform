import React, { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { useApp } from '../../context/AppContext';
import { adminService } from '../../services/adminService';
import Breadcrumb from '../../components/common/Breadcrumb';

const UserManagementPage = () => {
  const { showToast, currentUser } = useApp();

  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [totalElements, setTotalElements] = useState(0);
  const [page, setPage] = useState(0);
  const [pageSize] = useState(20);

  const [roleFilter, setRoleFilter] = useState('ALL');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [processingId, setProcessingId] = useState(null);

  const fetchUsers = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await adminService.getUsers({
        page,
        size: pageSize,
        role: roleFilter !== 'ALL' ? roleFilter : undefined,
        status: statusFilter !== 'ALL' ? statusFilter : undefined,
        search: searchQuery.trim() || undefined
      });
      setUsers(response?.content || []);
      setTotalElements(response?.totalElements || 0);
    } catch (err) {
      console.error('Failed to fetch users:', err);
      setError(err?.message || 'Failed to fetch users from database.');
    } finally {
      setLoading(false);
    }
  }, [page, pageSize, roleFilter, statusFilter, searchQuery]);

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  const handleStatusUpdate = async (userId, targetStatus, userName) => {
    if (currentUser?.id === userId) {
      showToast('Cannot modify your own administrative status', 'error');
      return;
    }
    setProcessingId(userId);
    try {
      await adminService.updateUserStatus(
        userId,
        targetStatus,
        `Status changed to ${targetStatus} via Admin User Directory`
      );
      showToast(`User ${userName} is now ${targetStatus}`, 'success');
      fetchUsers();
    } catch (err) {
      console.error('Failed to update status:', err);
      showToast(err?.message || 'Failed to update user status', 'error');
    } finally {
      setProcessingId(null);
    }
  };

  const pendingCount = users.filter(
    (u) => u.status === 'PENDING_APPROVAL' || u.status === 'Pending Approval'
  ).length;

  return (
    <div className="space-y-6">
      <Breadcrumb
        items={[
          { label: 'Admin Console', to: '/admin/dashboard' },
          { label: 'User Directory', to: '/admin/users' },
        ]}
      />

      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-[#18232F] flex items-center gap-2">
            User Directory & Access Control
            {pendingCount > 0 && (
              <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-100 text-amber-800">
                {pendingCount} Pending Vetting
              </span>
            )}
          </h1>
          <p className="text-sm text-[#667384]">
            Manage municipal accounts, field crews, citizen access, and role authorizations.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Link
            to="/admin/roles"
            className="px-4 py-2 text-sm font-semibold text-[#18232F] bg-white border border-[#E2E7ED] rounded-lg hover:bg-slate-50 transition-colors flex items-center gap-1.5 shadow-sm"
          >
            <span className="material-symbols-outlined text-[18px] text-[#667384]">admin_panel_settings</span>
            Role Matrix
          </Link>
          <Link
            to="/admin/users/new"
            className="px-4 py-2 text-sm font-semibold text-white bg-[#137A70] rounded-lg hover:bg-[#0F625B] transition-colors flex items-center gap-1.5 shadow-sm"
          >
            <span className="material-symbols-outlined text-[18px]">person_add</span>
            Provision Staff Account
          </Link>
        </div>
      </div>

      {error && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-xl flex items-center justify-between text-red-700 text-xs font-semibold">
          <div className="flex items-center gap-2">
            <span className="material-symbols-outlined text-[20px]">error</span>
            <span>{error}</span>
          </div>
          <button
            onClick={fetchUsers}
            className="px-3 py-1 bg-red-600 text-white rounded-lg text-xs font-bold hover:bg-red-700 transition-colors"
          >
            Retry
          </button>
        </div>
      )}

      {/* Filter and Search Bar */}
      <div className="bg-white p-4 rounded-xl border border-[#E2E7ED] shadow-sm flex flex-col md:flex-row gap-4 items-center justify-between">
        <div className="relative w-full md:w-96">
          <span className="material-symbols-outlined absolute left-3 top-2.5 text-[#667384] text-[20px]">search</span>
          <input
            type="text"
            placeholder="Search by name, email, or department..."
            value={searchQuery}
            onChange={(e) => {
              setSearchQuery(e.target.value);
              setPage(0);
            }}
            className="w-full pl-10 pr-4 py-2 text-sm border border-[#E2E7ED] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#137A70]"
          />
        </div>

        <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
          <select
            value={roleFilter}
            onChange={(e) => {
              setRoleFilter(e.target.value);
              setPage(0);
            }}
            className="text-sm border border-[#E2E7ED] rounded-lg px-3 py-2 bg-white text-[#18232F] focus:outline-none focus:ring-2 focus:ring-[#137A70]"
          >
            <option value="ALL">All Roles</option>
            <option value="CITIZEN">Citizens</option>
            <option value="OFFICER">Municipal Officers</option>
            <option value="WORKER">Field Workers</option>
            <option value="ADMIN">System Admins</option>
          </select>

          <select
            value={statusFilter}
            onChange={(e) => {
              setStatusFilter(e.target.value);
              setPage(0);
            }}
            className="text-sm border border-[#E2E7ED] rounded-lg px-3 py-2 bg-white text-[#18232F] focus:outline-none focus:ring-2 focus:ring-[#137A70]"
          >
            <option value="ALL">All Statuses</option>
            <option value="ACTIVE">Active</option>
            <option value="SUSPENDED">Suspended</option>
            <option value="PENDING_APPROVAL">Pending Approval</option>
          </select>

          <button
            onClick={fetchUsers}
            disabled={loading}
            className="p-2 border border-[#E2E7ED] rounded-lg text-[#667384] hover:text-[#18232F] hover:bg-slate-50 transition-colors"
            title="Refresh Directory"
          >
            <span className={`material-symbols-outlined text-[18px] ${loading ? 'animate-spin' : ''}`}>refresh</span>
          </button>
        </div>
      </div>

      {/* Users Table */}
      <div className="bg-white rounded-xl border border-[#E2E7ED] shadow-sm overflow-hidden">
        {loading && users.length === 0 ? (
          <div className="p-12 text-center text-[#667384] flex flex-col items-center justify-center gap-2">
            <span className="material-symbols-outlined text-3xl animate-spin text-[#137A70]">progress_activity</span>
            <p className="text-sm font-medium">Loading user records from PostgreSQL...</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm text-[#18232F]">
              <thead className="bg-[#F5F7FA] border-b border-[#E2E7ED] text-xs font-semibold text-[#667384] uppercase tracking-wider">
                <tr>
                  <th className="px-6 py-3.5">User Profile</th>
                  <th className="px-6 py-3.5">Assigned Role</th>
                  <th className="px-6 py-3.5">Department / Sector</th>
                  <th className="px-6 py-3.5">Account Status</th>
                  <th className="px-6 py-3.5">Created Date</th>
                  <th className="px-6 py-3.5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E2E7ED]">
                {users.length > 0 ? (
                  users.map((user) => {
                    const isSelf = currentUser?.id === user.id;
                    return (
                      <tr key={user.id} className="hover:bg-slate-50/60 transition-colors">
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-3">
                            <div className="w-9 h-9 rounded-full bg-[#E8F4F1] text-[#137A70] font-bold text-xs flex items-center justify-center border border-[#137A70]/20">
                              {(user.name || 'U').split(' ').map((n) => n[0]).join('')}
                            </div>
                            <div>
                              <div className="font-semibold text-[#18232F] flex items-center gap-1.5">
                                <span>{user.name}</span>
                                {isSelf && (
                                  <span className="px-1.5 py-0.2 rounded text-[10px] bg-slate-200 text-slate-700 font-semibold">
                                    You
                                  </span>
                                )}
                              </div>
                              <div className="text-xs text-[#667384]">{user.email}</div>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <span
                            className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                              user.role === 'ADMIN'
                                ? 'bg-purple-100 text-purple-800'
                                : user.role === 'OFFICER'
                                ? 'bg-teal-100 text-teal-800'
                                : user.role === 'WORKER'
                                ? 'bg-amber-100 text-amber-800'
                                : 'bg-blue-100 text-blue-800'
                            }`}
                          >
                            {user.role}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-[#667384] font-medium text-xs">
                          {user.department || 'N/A'}
                        </td>
                        <td className="px-6 py-4">
                          <span
                            className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium ${
                              user.status === 'ACTIVE'
                                ? 'bg-emerald-100 text-emerald-800'
                                : user.status === 'SUSPENDED'
                                ? 'bg-rose-100 text-rose-800'
                                : 'bg-amber-100 text-amber-800'
                            }`}
                          >
                            <span
                              className={`w-1.5 h-1.5 rounded-full ${
                                user.status === 'ACTIVE'
                                  ? 'bg-emerald-500'
                                  : user.status === 'SUSPENDED'
                                  ? 'bg-rose-500'
                                  : 'bg-amber-500'
                              }`}
                            />
                            {user.status}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-[#667384] text-xs">
                          {user.createdAt ? new Date(user.createdAt).toLocaleDateString() : 'N/A'}
                        </td>
                        <td className="px-6 py-4 text-right">
                          <div className="flex items-center justify-end gap-2">
                            {user.status === 'SUSPENDED' ? (
                              <button
                                disabled={processingId === user.id}
                                onClick={() => handleStatusUpdate(user.id, 'ACTIVE', user.name)}
                                className="px-2.5 py-1 text-xs font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-lg hover:bg-emerald-100 transition-colors"
                                title="Reactivate Account"
                              >
                                Activate
                              </button>
                            ) : (
                              !isSelf && (
                                <button
                                  disabled={processingId === user.id}
                                  onClick={() => handleStatusUpdate(user.id, 'SUSPENDED', user.name)}
                                  className="px-2.5 py-1 text-xs font-semibold text-rose-700 bg-rose-50 border border-rose-200 rounded-lg hover:bg-rose-100 transition-colors"
                                  title="Suspend Account"
                                >
                                  Suspend
                                </button>
                              )
                            )}
                            <Link
                              to={`/admin/users/${user.id}`}
                              className="px-2.5 py-1 text-xs font-semibold text-[#137A70] bg-[#E8F4F1] rounded-lg hover:bg-[#137A70] hover:text-white transition-colors"
                            >
                              View Details
                            </Link>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                ) : (
                  <tr>
                    <td colSpan="6" className="px-6 py-12 text-center text-[#667384]">
                      <span className="material-symbols-outlined text-4xl text-slate-300 mb-2">person_off</span>
                      <p className="font-medium">No users found matching your filters</p>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

export default UserManagementPage;
