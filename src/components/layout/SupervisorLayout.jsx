import React, { useState } from 'react';
import { Outlet, Link, useLocation, useNavigate } from 'react-router-dom';
import { useApp } from '../../context/AppContext';
import { DemoRoleSwitcher } from '../common/DemoRoleSwitcher';
import LanguageToggle from '../common/LanguageToggle';

export const SupervisorLayout = () => {
  const { currentUser, unreadCount, toast, logout } = useApp();
  const location = useLocation();
  const navigate = useNavigate();
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);

  const navItems = [
    {
      label: 'Escalations Queue',
      path: '/supervisor/escalations',
      icon: 'crisis_alert'
    },
    {
      label: 'Operational Analytics',
      path: '/officer/analytics',
      icon: 'monitoring'
    },
    {
      label: 'Live Issue Map',
      path: '/officer/map',
      icon: 'map'
    },
    {
      label: 'Notifications',
      path: '/officer/notifications',
      icon: 'notifications',
      badge: unreadCount > 0 ? unreadCount : null,
      badgeColor: 'bg-red-500 text-white'
    }
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
        className={`fixed inset-y-0 left-0 z-50 w-64 bg-[#151D26] text-white flex flex-col justify-between shadow-xl transition-transform duration-300 ${
          mobileSidebarOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'
        }`}
      >
        <div className="flex flex-col flex-1 min-h-0">
          {/* Brand Header */}
          <div className="h-16 px-4 flex items-center justify-between border-b border-white/10">
            <Link to="/supervisor/escalations" className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-red-600 flex items-center justify-center text-white shadow-sm">
                <span className="material-symbols-outlined text-[20px]">shield_person</span>
              </div>
              <div className="flex flex-col">
                <div className="flex items-center gap-1">
                  <span className="font-title text-title text-white tracking-tight font-bold">CivicFix</span>
                  <span className="px-1.5 py-0.2 rounded bg-red-500 text-white text-[10px] font-bold uppercase tracking-wider">
                    SLA
                  </span>
                </div>
                <span className="text-[10px] text-gray-400 uppercase tracking-wider">Supervisory Command</span>
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
              <span className="block text-[10px] uppercase font-bold tracking-wider text-red-400">
                Supervisor Session
              </span>
              <span className="font-semibold text-sm text-white truncate block">
                {currentUser?.name || 'Sarah Jenkins'}
              </span>
              <span className="text-xs text-emerald-400 flex items-center gap-1 mt-0.5">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                Active SLA Governance
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
                      ? 'bg-red-600/80 text-white font-semibold shadow-sm'
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
              <span className="material-symbols-outlined text-[16px]">verified_user</span>
              <span className="font-code text-[11px]">SLA Monitor • Active</span>
            </div>
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
          </div>

          <button
            onClick={() => {
              logout();
              navigate('/login');
            }}
            className="w-full flex items-center gap-2 px-3 py-2 rounded-xl text-sm text-gray-400 hover:text-white hover:bg-white/10 transition-colors"
          >
            <span className="material-symbols-outlined text-[18px]">logout</span>
            <span>Sign Out</span>
          </button>
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 md:pl-64">
        {/* Top Navbar */}
        <header className="sticky top-0 z-40 bg-surface/80 backdrop-blur-md border-b border-outline/10 h-16 px-4 md:px-8 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setMobileSidebarOpen(true)}
              className="md:hidden text-on-surface-variant hover:text-on-surface p-1"
            >
              <span className="material-symbols-outlined text-[24px]">menu</span>
            </button>
            <h1 className="font-title text-title font-bold text-on-surface hidden sm:block">
              Supervisory Control Center
            </h1>
          </div>

          <div className="flex items-center gap-3">
            <LanguageToggle />
            <DemoRoleSwitcher />
          </div>
        </header>

        {/* Dynamic Nested Page Content */}
        <main className="flex-1 p-4 md:p-8 max-w-7xl w-full mx-auto">
          <Outlet />
        </main>
      </div>
    </div>
  );
};

export default SupervisorLayout;

