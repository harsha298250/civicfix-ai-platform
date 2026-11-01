import React from 'react';
import { Navigate } from 'react-router-dom';
import { useApp } from '../../context/AppContext';

/**
 * RoleRoute enforces role-based access control (RBAC) across application workspaces.
 * Prevents citizens from accessing officer command tools (e.g. /officer/map) or admin settings.
 */
export const RoleRoute = ({ children, allowedRoles }) => {
  const { currentUser, showToast } = useApp();

  if (!currentUser) {
    return <Navigate to="/login" replace />;
  }

  if (allowedRoles && !allowedRoles.includes(currentUser.role)) {
    // Show security notification
    if (showToast) {
      showToast(
        `Access Restricted: Your active persona (${currentUser.role}) does not have permission for this workspace.`,
        'error'
      );
    }

    // Role-appropriate redirect
    switch (currentUser.role) {
      case 'CITIZEN':
        return <Navigate to="/citizen/dashboard" replace />;
      case 'OFFICER':
        return <Navigate to="/officer/dashboard" replace />;
      case 'WORKER':
        return <Navigate to="/worker/dashboard" replace />;
      case 'ADMIN':
        return <Navigate to="/admin/dashboard" replace />;
      case 'SUPERVISOR':
        return <Navigate to="/supervisor/escalations" replace />;
      default:
        return <Navigate to="/login" replace />;
    }
  }

  return children;
};

export default RoleRoute;
