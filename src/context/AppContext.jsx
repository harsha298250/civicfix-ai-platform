import React, { createContext, useContext, useState, useEffect, useRef } from 'react';
import { authService, isDemoModeEnabled } from '../services/authService';
import { complaintService } from '../services/complaintService';
import { notificationService } from '../services/notificationService';
import apiClient from '../services/apiClient';

// One-time cleanup of obsolete mock localStorage keys from prior versions
try {
  localStorage.removeItem('civicfix_users_v1');
  localStorage.removeItem('civicfix_audit_v1');
  localStorage.removeItem('civicfix_complaints_v2');
} catch (e) {
  // Ignore storage access errors in restricted contexts
}

const AppContext = createContext();

export const AppProvider = ({ children }) => {
  const [currentUser, setCurrentUser] = useState(() => authService.getCurrentUser());
  const [serverUnreachable, setServerUnreachable] = useState(false);
  const [complaints, setComplaints] = useState([]);
  const [complaintsError, setComplaintsError] = useState(null);

  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [notificationsLoading, setNotificationsLoading] = useState(false);
  const [notificationsPagination, setNotificationsPagination] = useState({
    page: 0,
    size: 15,
    totalElements: 0,
    totalPages: 1,
    last: true
  });
  const isRefreshingNotifs = useRef(false);

  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState(null);

  const showToast = (message, type = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 4000);
  };

  const refreshComplaints = async () => {
    setLoading(true);
    setComplaintsError(null);
    try {
      const data = await complaintService.getAll();
      setComplaints(data);
    } catch (e) {
      console.error('Failed to load complaints', e);
      setComplaintsError(e.message || 'Cannot reach the server.');
      setComplaints([]);
    } finally {
      setLoading(false);
    }
  };

  const refreshNotifications = async (params = {}) => {
    if (isRefreshingNotifs.current) return;
    isRefreshingNotifs.current = true;
    setNotificationsLoading(true);
    try {
      const data = await notificationService.getNotifications(params);
      setNotifications(data.content || []);
      setNotificationsPagination({
        page: data.page,
        size: data.size,
        totalElements: data.totalElements,
        totalPages: data.totalPages,
        last: data.last
      });
      // Fetch latest accurate unread count from backend
      const count = await notificationService.getUnreadCount();
      setUnreadCount(count);
    } catch (e) {
      console.error('Failed to load notifications from backend:', e);
    } finally {
      setNotificationsLoading(false);
      isRefreshingNotifs.current = false;
    }
  };

  const refreshUnreadCount = async () => {
    try {
      const count = await notificationService.getUnreadCount();
      setUnreadCount(count);
    } catch (e) {}
  };

  useEffect(() => {
    refreshComplaints();
    // Validate active session with Spring Boot backend on application bootstrap
    authService.checkSession()
      .then((liveUser) => {
        setServerUnreachable(false);
        if (liveUser) setCurrentUser(liveUser);
        else setCurrentUser(null);
      })
      .catch((err) => {
        setCurrentUser(null);
        setServerUnreachable(true);
      });
  }, []);

  useEffect(() => {
    if (currentUser) {
      refreshNotifications();
      refreshUnreadCount();
    } else {
      setNotifications([]);
      setUnreadCount(0);
    }
  }, [currentUser?.id, currentUser?.role]);

  const switchRole = (role) => {
    if (!isDemoModeEnabled()) {
      throw new Error('Demo mode is disabled. Role switching is not permitted.');
    }
    const updated = authService.switchRole(role);
    if (updated) {
      setCurrentUser(updated);
      showToast(`Switched active persona to ${role} (${updated.name})`, 'info');
    }
  };

  const markNotificationRead = async (notifId) => {
    if (!notifId) return;
    // Optimistic UI update
    setNotifications(prev => prev.map(n => n.id === notifId ? { ...n, read: true } : n));
    setUnreadCount(prev => Math.max(0, prev - 1));

    try {
      await notificationService.markAsRead(notifId);
      refreshUnreadCount();
    } catch (e) {
      console.error('Failed to mark notification read on backend:', e);
      refreshNotifications();
    }
  };

  const markAllNotificationsRead = async () => {
    // Optimistic UI update
    setNotifications(prev => prev.map(n => ({ ...n, read: true })));
    setUnreadCount(0);

    try {
      await notificationService.markAllAsRead();
      refreshUnreadCount();
    } catch (e) {
      console.error('Failed to mark all notifications read on backend:', e);
      refreshNotifications();
    }
  };

  const logout = async () => {
    await authService.logout();
    setCurrentUser(null);
    showToast('Signed out of CivicFix AI session.', 'info');
  };

  const resetAllData = async () => {
    try {
      const res = await apiClient.admin.resetDemoData();
      await refreshComplaints();
      showToast(res?.message || 'Demo dataset reset successfully in PostgreSQL', 'success');
      return res;
    } catch (err) {
      showToast(err.message || 'Failed to reset demo dataset on server.', 'error');
      throw err;
    }
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
        serverUnreachable,
        setServerUnreachable,
        switchRole,
        complaints,
        complaintsError,
        refreshComplaints,
        getCitizenComplaints,
        isComplaintOwner,
        notifications,
        unreadCount,
        notificationsLoading,
        notificationsPagination,
        refreshNotifications,
        refreshUnreadCount,
        markNotificationRead,
        markAllNotificationsRead,
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
