import React, { useState } from 'react';
import { Outlet, Link, useLocation, useNavigate } from 'react-router-dom';
import { useApp } from '../../context/AppContext';
import { DemoRoleSwitcher } from '../common/DemoRoleSwitcher';
import { COMPLAINT_STATUS } from '../../constants/statusConstants';

export const WorkerLayout = () => {
  const { currentUser, complaints, toast, logout } = useApp();
  const location = useLocation();
  const navigate = useNavigate();
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);

  // Field worker assigned tasks
  const myAssignedTasks = complaints.filter(
    c => (currentUser?.id && c.assignedWorker?.id === currentUser.id) || c.status === COMPLAINT_STATUS.ASSIGNED || c.status === COMPLAINT_STATUS.IN_PROGRESS
  );

  const activeTaskCount = myAssignedTasks.filter(c => c.status === COMPLAINT_STATUS.IN_PROGRESS).length;

  const activeTaskId = myAssignedTasks.find(c => c.status === COMPLAINT_STATUS.IN_PROGRESS)?.id || myAssignedTasks[0]?.id || 'CF-2026-00124';

  const navItems = [
    { label: 'My Dashboard', path: '/worker/dashboard', icon: 'dashboard' },
    {
      label: 'Assigned Tasks',
      path: '/worker/tasks',
      icon: 'assignment',
      badge: myAssignedTasks.length > 0 ? myAssignedTasks.length : null
    },
    {
      label: 'Task Details',
      path: `/worker/tasks/${activeTaskId}`,
      icon: 'manage_search'
    },
    {
      label: 'Update Progress / Blocker',
      path: `/worker/tasks/${activeTaskId}/progress`,
      icon: 'pending_actions',
      badge: activeTaskCount > 0 ? `${activeTaskCount} Active` : null,
      badgeColor: 'bg-primary-container text-white'
    },
    {
      label: 'Submit Repair Evidence',
      path: `/worker/tasks/${activeTaskId}/evidence`,
      icon: 'fact_check'
    },
    { label: 'Notifications', path: '/worker/notifications', icon: 'notifications' },
    { label: 'My Profile & Equipment', path: '/worker/profile', icon: 'badge' }
  ];

  return (
    <div className="min-h-screen bg-background font-sans text-on-surface flex">
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
            <Link to="/worker/dashboard" className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-primary-container flex items-center justify-center text-white shadow-sm">
                <span className="material-symbols-outlined text-[20px]">precision_manufacturing</span>
              </div>
              <div className="flex flex-col">
                <div className="flex items-center gap-1">
                  <span className="font-title text-title text-white tracking-tight font-bold">CivicFix AI</span>
                </div>
                <span className="text-[10px] text-gray-400 uppercase tracking-wider">Field Ops Suite</span>
              </div>
            </Link>
            <button
              onClick={() => setMobileSidebarOpen(false)}
              className="md:hidden text-gray-400 hover:text-white"
            >
              <span className="material-symbols-outlined text-[20px]">close</span>
            </button>
          </div>

          {/* Rapid Response Unit Badge */}
          <div className="px-4 py-3">
            <div className="bg-white/5 border border-white/10 rounded-xl p-3 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                <span className="text-xs font-semibold text-white">Rapid Response Unit</span>
              </div>
              <span className="font-code text-[11px] text-primary-fixed bg-white/10 px-1.5 py-0.5 rounded">
                #FW-882
              </span>
            </div>
          </div>

          {/* Navigation Items */}
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

        {/* Worker Account Card */}
        <div className="p-3 border-t border-white/10 bg-white/5">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 rounded-full bg-primary-container text-white flex items-center justify-center font-bold text-sm">
              {currentUser?.avatar || 'MC'}
            </div>
            <div className="flex-1 min-w-0">
              <div className="font-semibold text-sm text-white truncate">{currentUser?.name || 'Field Technician'}</div>
              <div className="text-[11px] text-gray-400 truncate">{currentUser?.department || 'Field Operations'}</div>
            </div>
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
        {/* Top Header */}
        <header className="sticky top-0 z-30 h-16 bg-surface-container-lowest/90 backdrop-blur-xl border-b border-outline-variant/30 px-4 sm:px-6 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setMobileSidebarOpen(true)}
              className="md:hidden p-2 rounded-lg hover:bg-surface-container text-on-surface-variant"
            >
              <span className="material-symbols-outlined text-[24px]">menu</span>
            </button>
            <div>
              <h2 className="font-headline-sm text-headline-sm text-on-surface font-bold">
                Field Operations
              </h2>
              <p className="text-[11px] text-tertiary">Municipal Field Work Orders & Repair Evidence</p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="hidden sm:flex items-center gap-1.5 px-3 py-1 rounded-full bg-surface-container-low text-primary-container text-xs font-semibold">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              <span>Device GPS Active</span>
            </div>

            <Link
              to="/worker/notifications"
              className="relative p-2 rounded-lg text-on-surface-variant hover:bg-surface-container transition-colors"
              title="Notifications"
            >
              <span className="material-symbols-outlined text-[22px]">notifications</span>
              <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-error" />
            </Link>

            <Link
              to="/worker/profile"
              className="w-8 h-8 rounded-full bg-primary flex items-center justify-center text-white text-xs font-bold"
            >
              {currentUser?.avatar || 'MC'}
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

export default WorkerLayout;
