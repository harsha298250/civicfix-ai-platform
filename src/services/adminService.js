import apiClient from './apiClient.js';

export const adminService = {
  /**
   * Fetch live aggregate dashboard summary from PostgreSQL backend.
   * Returns: { usersByRole, complaintsByStatus, auditEventsLast24h, totalUsers, totalComplaints, pendingApprovalCount }
   */
  getDashboardSummary: async () => {
    return await apiClient.admin.getDashboardSummary();
  },

  /**
   * Fetch paginated users with optional role, status, and search filters.
   */
  getUsers: async (params = {}) => {
    return await apiClient.admin.getUsers(params);
  },

  /**
   * Fetch sanitized user profile by UUID without password hash.
   */
  getUserById: async (id) => {
    return await apiClient.admin.getUserById(id);
  },

  /**
   * Provision a new municipal staff member (OFFICER or WORKER) with a temporary password.
   */
  createStaff: async (staffData) => {
    return await apiClient.admin.createStaff(staffData);
  },

  /**
   * Update user account status (ACTIVE or SUSPENDED) with an audit reason.
   */
  updateUserStatus: async (id, status, reason = '') => {
    return await apiClient.admin.updateUserStatus(id, { status, reason });
  },

  /**
   * Fetch paginated audit log events with optional action, actor, or date filters.
   */
  getAuditLogs: async (params = {}) => {
    return await apiClient.admin.getAuditLogs(params);
  },

  /**
   * Fetch live SLA policy matrix from PostgreSQL backend (ADMIN only).
   */
  getSlaPolicies: async () => {
    return await apiClient.admin.getSlaPolicies();
  },

  /**
   * Query backend demo dataset management availability (dev profile).
   */
  getDemoStatus: async () => {
    return await apiClient.admin.getDemoStatus();
  },

  /**
   * Reset deterministic demo data in PostgreSQL (DEV profile + ADMIN role only).
   */
  resetDemoData: async () => {
    return await apiClient.admin.resetDemoData();
  }
};

export default adminService;
