import React, { useState } from 'react';
import { Outlet, Link, useLocation, useNavigate } from 'react-router-dom';
import { useApp } from '../../context/AppContext';
import LanguageToggle from '../common/LanguageToggle';
import { DemoRoleSwitcher } from '../common/DemoRoleSwitcher';
import { COMPLAINT_STATUS } from '../../constants/statusConstants';

export const OfficerLayout = () => {
  const { currentUser, complaints, unreadCount, toast, logout } = useApp();
  const location = useLocation();
  const navigate = useNavigate();
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  const pendingQueueCount = complaints.filter(
    c => c.status === COMPLAINT_STATUS.SUBMITTED || c.status === COMPLAINT_STATUS.UNDER_REVIEW
  ).length;

  const verificationQueueCount = complaints.filter(
    c => c.status === COMPLAINT_STATUS.RESOLUTION_SUBMITTED
  ).length;

  const navItems = [
    { label: 'Overview', path: '/officer/dashboard', icon: 'dashboard' },
    {
      label: 'Complaint Queue',
      path: '/officer/complaints',
      icon: 'inbox',
      badge: pendingQueueCount > 0 ? pendingQueueCount : null
    },
    {
      label: 'Review & Assignment',
      path: '/officer/complaints/CF-2026-00124/review',
      icon: 'assignment_turned_in'
    },
    { label: 'Worker Assignments', path: '/officer/assignments', icon: 'assignment_ind' },
    {
      label: 'Resolution Verification',
      path: '/officer/verifications',
      icon: 'verified',
      badge: verificationQueueCount > 0 ? `${verificationQueueCount} Ready` : null,
      badgeColor: 'bg-secondary text-white'
    },
    { label: 'Live Issue Map', path: '/officer/map', icon: 'map' },
    { label: 'Operational Analytics', path: '/officer/analytics', icon: 'monitoring' },
    {
      label: 'Notifications',
      path: '/officer/notifications',
      icon: 'notifications',
      badge: unreadCount > 0 ? unreadCount : null,
      badgeColor: 'bg-error text-white'
    },
    { label: 'Profile & Settings', path: '/officer/profile', icon: 'badge' }
  ];

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      navigate(`/officer/complaints?q=${encodeURIComponent(searchQuery)}`);
    }
  };

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
        className={`fixed inset-y-0 left-0 z-50 w-64 bg-[#151D26] text-white flex flex-col justify-between shadow-xl transition-transform duration-300 ${
          mobileSidebarOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'
        }`}
      >
        <div className="flex flex-col flex-1 min-h-0">
          {/* Brand Header */}
          <div className="h-16 px-4 flex items-center justify-between border-b border-white/10">
            <Link to="/officer/dashboard" className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-primary-container flex items-center justify-center text-white shadow-sm">
                <span className="material-symbols-outlined text-[20px]">account_balance</span>
              </div>
              <div className="flex flex-col">
                <div className="flex items-center gap-1">
                  <span className="font-title text-title text-white tracking-tight font-bold">CivicFix</span>
                  <span className="px-1.5 py-0.2 rounded bg-secondary text-white text-[10px] font-bold uppercase tracking-wider">
                    AI
                  </span>
                </div>
                <span className="text-[10px] text-gray-400 uppercase tracking-wider">Municipal Ops</span>
              </div>
            </Link>
            <button
              onClick={() => setMobileSidebarOpen(false)}
              className="md:hidden text-gray-400 hover:text-white"
            >
              <span className="material-symbols-outlined text-[20px]">close</span>
            </button>
          </div>

          {/* Active Session Badge */}
          <div className="px-4 py-3">
            <div className="bg-white/5 border border-white/10 rounded-xl p-3">
              <span className="block text-[10px] uppercase font-bold tracking-wider text-gray-400">
                Active Officer Session
              </span>
              <span className="font-semibold text-sm text-white truncate block">
                {currentUser?.name || 'Municipal Officer'}
              </span>
              <span className="text-xs text-emerald-400 flex items-center gap-1 mt-0.5">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                Central District 4 Dispatch
              </span>
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

        {/* Footer Telemetry & Sign Out */}
        <div className="p-3 border-t border-white/10 space-y-2">
          <div className="flex items-center justify-between p-2 rounded-lg bg-white/5 text-xs text-gray-400">
            <div className="flex items-center gap-2">
              <span className="material-symbols-outlined text-[16px]">dns</span>
              <span className="font-code text-[11px]">Node-04 • Operational</span>
            </div>
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
          </div>
          <button
            type="button"
            onClick={() => {
              setMobileSidebarOpen(false);
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
      <div className="flex-1 md:pl-64 flex flex-col min-h-screen">
        {/* Top Header */}
        <header className="sticky top-0 z-30 h-16 bg-surface-container-lowest/90 backdrop-blur-xl border-b border-outline-variant/30 px-4 sm:px-6 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3 flex-1 max-w-lg">
            <button
              onClick={() => setMobileSidebarOpen(true)}
              className="md:hidden p-2 rounded-lg hover:bg-surface-container text-on-surface-variant"
            >
              <span className="material-symbols-outlined text-[24px]">menu</span>
            </button>
            <form onSubmit={handleSearchSubmit} className="relative w-full">
              <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-tertiary text-[18px]">
                search
              </span>
              <input
                type="text"
                placeholder="Search ticket IDs (e.g. #CF-2026-00124), wards, tags..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full h-9 pl-9 pr-4 rounded-lg bg-surface-container-low text-on-surface placeholder:text-outline text-body-sm focus:outline-none focus:bg-surface-container-lowest border border-transparent focus:border-primary-container transition-all"
              />
            </form>
          </div>

          <div className="flex items-center gap-3 sm:gap-4">
            <LanguageToggle />

            <Link
              to="/officer/notifications"
              className="relative p-2 rounded-lg text-on-surface-variant hover:bg-surface-container transition-colors"
              title="Notifications"
            >
              <span className="material-symbols-outlined text-[22px]">notifications</span>
              {unreadOfficerNotifs > 0 && (
                <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-error animate-pulse" />
              )}
            </Link>

            <div className="h-6 w-px bg-outline-variant/40 hidden sm:block" />

            <Link
              to="/officer/profile"
              className="flex items-center gap-2.5 pl-2 py-1 rounded-lg hover:bg-surface-container transition-colors"
            >
              <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center text-white text-xs font-bold">
                {currentUser?.avatar || 'EV'}
              </div>
              <div className="hidden sm:flex flex-col text-left">
                <span className="text-xs font-semibold text-on-surface leading-tight">
                  {currentUser?.name || 'Municipal Officer'}
                </span>
                <span className="text-[10px] text-tertiary leading-tight">
                  Municipal Officer
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

export default OfficerLayout;
