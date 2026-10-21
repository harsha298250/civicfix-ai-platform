import React, { createContext, useContext, useState, useEffect } from 'react';
import { authService } from '../services/authService';
import { complaintService } from '../services/complaintService';
import { INITIAL_USERS, INITIAL_NOTIFICATIONS, INITIAL_AUDIT_LOGS } from '../services/mockData';

const AppContext = createContext();

export const AppProvider = ({ children }) => {
  const [currentUser, setCurrentUser] = useState(() => authService.getCurrentUser());
  const [complaints, setComplaints] = useState([]);
  
  const [users, setUsers] = useState(() => {
    try {
      const raw = localStorage.getItem('civicfix_users_v1');
      if (raw) return JSON.parse(raw);
    } catch (e) {}
    return INITIAL_USERS;
  });

  const [notifications, setNotifications] = useState(() => {
    try {
      const raw = localStorage.getItem('civicfix_notifs_v1');
      if (raw) return JSON.parse(raw);
    } catch (e) {}
    return INITIAL_NOTIFICATIONS;
  });

  const [auditLogs, setAuditLogs] = useState(() => {
    try {
      const raw = localStorage.getItem('civicfix_audit_v1');
      if (raw) return JSON.parse(raw);
    } catch (e) {}
    return INITIAL_AUDIT_LOGS;
  });

  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState(null);

  const showToast = (message, type = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 4000);
  };

  const refreshComplaints = async () => {
    try {
      const data = await complaintService.getAll();
      setComplaints(data);
    } catch (e) {
      console.error('Failed to load complaints', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    refreshComplaints();
    // Validate active session with Spring Boot backend on application bootstrap
    authService.checkSession()
      .then((liveUser) => {
        if (liveUser) setCurrentUser(liveUser);
      })
      .catch(() => {});
  }, []);

  const switchRole = (role) => {
    const updated = authService.switchRole(role);
    setCurrentUser(updated);
    showToast(`Switched active persona to ${role} (${updated.name})`, 'info');
  };

  const markNotificationRead = (notifId) => {
    const updated = notifications.map(n => n.id === notifId ? { ...n, read: true } : n);
    setNotifications(updated);
    try {
      localStorage.setItem('civicfix_notifs_v1', JSON.stringify(updated));
    } catch (e) {}
  };

  const markAllNotificationsRead = () => {
    const updated = notifications.map(n => ({ ...n, read: true }));
    setNotifications(updated);
    try {
      localStorage.setItem('civicfix_notifs_v1', JSON.stringify(updated));
    } catch (e) {}
  };

  const approveStaff = (userId) => {
    if (currentUser?.role !== 'ADMIN') {
      showToast('Unauthorized: Only System Administrators can approve staff credentials', 'error');
      return;
    }
    const userToApprove = users.find(u => u.id === userId);
    const updated = users.map(u => u.id === userId ? { ...u, status: 'ACTIVE' } : u);
    setUsers(updated);
    try {
      localStorage.setItem('civicfix_users_v1', JSON.stringify(updated));
    } catch (e) {}
    addAuditLog('APPROVE_STAFF', `User #${userId}`, `Approved official staff credentials for ${userToApprove?.name || userId}.`);
    showToast(`Approved credentials for ${userToApprove?.name || 'staff member'}`, 'success');
  };

  const rejectStaff = (userId) => {
    if (currentUser?.role !== 'ADMIN') {
      showToast('Unauthorized: Only System Administrators can reject staff applications', 'error');
      return;
    }
    const userToReject = users.find(u => u.id === userId);
    const updated = users.filter(u => u.id !== userId);
    setUsers(updated);
    try {
      localStorage.setItem('civicfix_users_v1', JSON.stringify(updated));
    } catch (e) {}
    addAuditLog('REJECT_STAFF', `User #${userId}`, `Rejected staff application for ${userToReject?.name || userId}.`);
    showToast(`Rejected application for ${userToReject?.name || 'staff applicant'}`, 'info');
  };

  const addStaffUser = (staffData) => {
    const newUser = {
      id: `usr-${String(Math.floor(100 + Math.random() * 900))}`,
      name: staffData.name,
      email: staffData.email,
      phone: staffData.phone || '+91 98765 00000',
      role: staffData.role,
      department: staffData.department || 'Municipal Operations',
      badgeId: staffData.badgeId || `STF-${Math.floor(1000 + Math.random() * 9000)}`,
      status: 'Active',
      joined: 'Today',
      lastActive: 'Just now'
    };
    const updated = [newUser, ...users];
    setUsers(updated);
    try {
      localStorage.setItem('civicfix_users_v1', JSON.stringify(updated));
    } catch (e) {}
    addAuditLog('PROVISION_STAFF', `User #${newUser.id}`, `Provisioned staff account for ${newUser.name}.`);
    return newUser;
  };

  const logout = async () => {
    await authService.logout();
    setCurrentUser(null);
    showToast('Signed out of CivicFix AI session.', 'info');
  };

  const addAuditLog = (action, target, details) => {
    const entry = {
      id: `aud-${Date.now()}`,
      timestamp: new Date().toISOString(),
      actor: currentUser ? `${currentUser.name} (${currentUser.role})` : 'Unauthenticated Session',
      action,
      target,
      details,
      ip: '127.0.0.1 (Local Session)',
      status: 'SUCCESS'
    };
    const updated = [entry, ...auditLogs];
    setAuditLogs(updated);
    try {
      localStorage.setItem('civicfix_audit_v1', JSON.stringify(updated));
    } catch (e) {}
  };

  const resetAllData = () => {
    complaintService.resetToDefaults();
    refreshComplaints();
    setUsers(INITIAL_USERS);
    try {
      localStorage.setItem('civicfix_users_v1', JSON.stringify(INITIAL_USERS));
    } catch (e) {}
    showToast('All demo complaints and accounts reset to initial state', 'info');
  };

  // Data isolation helper: Returns ONLY complaints belonging to the specified citizen
  const getCitizenComplaints = (targetUser = currentUser) => {
    if (!targetUser) return [];
    return complaints.filter(c => {
      const matchId = targetUser.id && c.citizen?.id === targetUser.id;
      const matchEmail = targetUser.email && c.citizen?.email?.toLowerCase() === targetUser.email.toLowerCase();
      return matchId || matchEmail;
    });
  };

  // Authorization check: Verifies if a given complaint is owned by the current citizen
  const isComplaintOwner = (complaint, user = currentUser) => {
    if (!complaint || !user) return false;
    const matchId = user.id && complaint.citizen?.id === user.id;
    const matchEmail = user.email && complaint.citizen?.email?.toLowerCase() === user.email.toLowerCase();
    return Boolean(matchId || matchEmail);
  };

  return (
    <AppContext.Provider
      value={{
        currentUser,
        currentPersona: currentUser, // alias for consistency
        setCurrentUser,
        switchRole,
        complaints,
        refreshComplaints,
        getCitizenComplaints,
        isComplaintOwner,
        users,
        approveStaff,
        rejectStaff,
        addStaffUser,
        notifications,
        markNotificationRead,
        markAllNotificationsRead,
        auditLogs,
        addAuditLog,
        loading,
        toast,
        showToast,
        logout,
        resetAllData
      }}
    >
      {children}
    </AppContext.Provider>
  );
};

export const useApp = () => useContext(AppContext);
