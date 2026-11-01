import React, { useState, useEffect } from 'react';
import { Outlet, Link, useLocation, useNavigate } from 'react-router-dom';
import { useApp } from '../../context/AppContext';
import { adminService } from '../../services/adminService';
import LanguageToggle from '../common/LanguageToggle';
import { DemoRoleSwitcher } from '../common/DemoRoleSwitcher';

export const AdminLayout = () => {
  const { currentUser, unreadCount, toast, logout } = useApp();
  const location = useLocation();
  const navigate = useNavigate();
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
  const [pendingCount, setPendingCount] = useState(0);

  useEffect(() => {
    let isMounted = true;
    adminService.getDashboardSummary()
      .then(summary => {
        if (isMounted && typeof summary?.pendingApprovalCount === 'number') {
          setPendingCount(summary.pendingApprovalCount);
        }
      })
      .catch(() => {
        // Fall back gracefully if server is unreachable
      });
    return () => { isMounted = false; };
  }, [location.pathname]);

  const navItems = [
    { label: 'Overview', path: '/admin/dashboard', icon: 'dashboard' },
    {
      label: 'User Directory & Approvals',
      path: '/admin/users',
      icon: 'group',
      badge: pendingCount > 0 ? `${pendingCount} Pending` : null,
      badgeColor: 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
    },
    { label: 'Roles & RBAC Matrix', path: '/admin/roles', icon: 'verified_user' },
    { label: 'Platform Analytics', path: '/admin/activity', icon: 'analytics' },
    { label: 'Audit Event Ledger', path: '/admin/audit-logs', icon: 'receipt_long' },
    { label: 'System Settings', path: '/admin/settings', icon: 'settings' },
    {
      label: 'Notifications & Alerts',
      path: '/admin/notifications',
      icon: 'notifications_active',
      badge: unreadCount > 0 ? unreadCount : null,
      badgeColor: 'bg-error text-white'
    },
    { label: 'My Profile', path: '/admin/profile', icon: 'account_circle' }
  ];

  return (
    <div className="min-h-screen bg-surface font-sans text-on-surface flex">
      {/* Toast Notification */}
      {toast && (
        <div className="fixed top-4 right-4 z-50 bg-[#151D26] text-white px-4 py-3 rounded-xl shadow-xl flex items-center gap-3 border border-secondary/30 animate-fade-in">
          <span className="material-symbols-outlined text-secondary text-[20px]">info</span>
          <span className="text-body-sm font-medium">{toast.message}</span>
        </div>
      )}

      {/* Persistent Left Navigation Sidebar */}
      <aside
        className={`fixed inset-y-0 left-0 z-50 w-72 bg-[#151D26] text-white flex flex-col justify-between shadow-xl transition-transform duration-300 ${
          mobileSidebarOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'
        }`}
      >
        <div className="flex flex-col flex-1 min-h-0">
          {/* Brand Header */}
          <div className="h-16 px-4 flex items-center justify-between border-b border-white/10">
            <Link to="/admin/dashboard" className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-primary-container flex items-center justify-center text-white shrink-0 shadow-sm">
                <span className="material-symbols-outlined text-[20px]">admin_panel_settings</span>
              </div>
              <div className="flex flex-col min-w-0">
                <span className="font-title text-title text-white tracking-tight font-bold truncate">
                  CivicFix Admin Suite
                </span>
                <span className="text-[10px] text-gray-400 uppercase tracking-wider">Root Control</span>
              </div>
            </Link>
            <button
              onClick={() => setMobileSidebarOpen(false)}
              className="md:hidden text-gray-400 hover:text-white"
            >
              <span className="material-symbols-outlined text-[20px]">close</span>
            </button>
          </div>

          {/* Node Indicator */}
          <div className="px-4 py-3">
            <div className="px-3 py-1.5 rounded-lg bg-white/5 border border-white/10 flex items-center justify-between text-xs text-gray-300">
              <span className="font-mono text-[11px] text-gray-300">Cluster Status: Active</span>
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            </div>
          </div>

          {/* Nav List */}
          <nav className="flex-1 px-3 space-y-1 overflow-y-auto no-scrollbar">
            {navItems.map((item) => {
              const isActive = location.pathname === item.path || location.pathname.startsWith(`${item.path}/`);
              return (
                <Link
                  key={item.path}
                  to={item.path}
                  onClick={() => setMobileSidebarOpen(false)}
                  className={`flex items-center justify-between px-3 py-2 rounded-xl text-body-md transition-all ${
                    isActive
                      ? 'bg-primary-container text-white font-semibold shadow-sm'
                      : 'text-gray-300 hover:bg-white/10 hover:text-white'
                  }`}
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <span className="material-symbols-outlined text-[20px]">{item.icon}</span>
                    <span className="truncate">{item.label}</span>
                  </div>
                  {item.badge && (
                    <span
                      className={`text-[10px] px-1.5 py-0.5 rounded-full font-bold uppercase tracking-wider ${
                        item.badgeColor || 'bg-white/20 text-white'
                      }`}
                    >
                      {item.badge}
                    </span>
                  )}
                </Link>
              );
            })}
          </nav>
        </div>

        {/* Security / RBAC Engine Notice */}
        <div className="p-3 border-t border-white/10 bg-white/5 space-y-2">
          <div className="flex items-center justify-between text-xs text-gray-400">
            <span className="text-[10px] uppercase font-bold tracking-wider">Security Engine</span>
            <span className="font-code text-[11px] text-emerald-400 font-semibold">RBAC Active</span>
          </div>
          <button
            type="button"
            onClick={() => {
              logout();
              navigate('/login');
            }}
            className="flex items-center justify-center gap-1.5 w-full py-1.5 rounded-lg bg-white/5 hover:bg-error/20 hover:text-error text-gray-400 text-xs font-semibold transition-colors"
          >
            <span className="material-symbols-outlined text-[16px]">logout</span>
            <span>Sign Out</span>
          </button>
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="flex-1 md:pl-72 flex flex-col min-h-screen">
        {/* Compliance Staging Banner matching Stitch Admin Design */}
        <div className="px-4 sm:px-6 py-1.5 bg-surface-container-high/80 border-b border-surface-container-highest flex items-center justify-between text-xs text-on-surface">
          <div className="flex items-center gap-2 min-w-0">
            <span className="inline-flex items-center justify-center w-4 h-4 rounded-full bg-secondary text-white text-[10px]">
              <span className="material-symbols-outlined text-[12px]">shield</span>
            </span>
            <p className="truncate">
              <strong className="text-on-surface">DEMO & STAGING ENVIRONMENT</strong>
              <span className="mx-1 text-gray-400">/</span>
              <span className="text-on-surface-variant">Spring Security RBAC v2.4 Enforced · Server-Side Authorization Enabled</span>
            </p>
          </div>
          <div className="hidden sm:flex items-center gap-2">
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-surface-container-lowest font-code text-[11px] text-primary-container shadow-sm">
              <span className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse" />
              <span>TLS 1.3 · STRICT_AUTH</span>
            </span>
          </div>
        </div>

        {/* Top Header */}
        <header className="sticky top-0 z-30 h-16 bg-surface-container-lowest/90 backdrop-blur-xl border-b border-outline-variant/30 px-4 sm:px-6 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setMobileSidebarOpen(true)}
              className="md:hidden p-2 rounded-lg hover:bg-surface-container text-on-surface-variant"
            >
              <span className="material-symbols-outlined text-[24px]">menu</span>
            </button>
            <div className="flex flex-col">
              <span className="font-headline-sm text-headline-sm text-on-surface font-bold tracking-tight">
                CivicFix AI
              </span>
              <span className="text-[11px] text-on-surface-variant">Platform Governance & Administration</span>
            </div>
          </div>

          <div className="flex items-center gap-3 sm:gap-4">
            <LanguageToggle />

            <Link
              to="/admin/users/new"
              className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-primary-container text-white text-xs font-semibold shadow-sm hover:bg-primary transition-all"
            >
              <span className="material-symbols-outlined text-[16px]">person_add</span>
              <span>Create Staff</span>
            </Link>

            <Link
              to="/admin/notifications"
              className="relative p-2 rounded-lg text-on-surface-variant hover:bg-surface-container transition-colors"
              title="Notifications"
            >
              <span className="material-symbols-outlined text-[22px]">notifications</span>
              <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-error" />
            </Link>

            <Link
              to="/admin/profile"
              className="flex items-center gap-2.5 pl-2 py-1 rounded-lg hover:bg-surface-container transition-colors"
            >
              <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center text-white text-xs font-bold">
                {currentUser?.avatar || 'PS'}
              </div>
              <div className="hidden sm:flex flex-col text-left">
                <span className="text-xs font-semibold text-on-surface leading-tight">
                  {currentUser?.name || 'Administrator'}
                </span>
                <span className="text-[10px] text-tertiary leading-tight">
                  Principal Admin
                </span>
              </div>
            </Link>
          </div>
        </header>

        {/* Dynamic Page Content */}
        <main className="flex-1 p-4 sm:p-6 max-w-7xl w-full mx-auto">
          <Outlet />
        </main>
      </div>

      {/* Floating Demo Role Switcher */}
      <DemoRoleSwitcher />
    </div>
  );
};

export default AdminLayout;
