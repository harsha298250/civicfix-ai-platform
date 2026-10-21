import React, { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useApp } from '../../context/AppContext';

export const DemoRoleSwitcher = () => {
  const { currentUser, switchRole, resetAllData } = useApp();
  const navigate = useNavigate();
  const location = useLocation();
  const isAuthPage =
    location.pathname === '/login' ||
    location.pathname === '/register' ||
    location.pathname === '/forgot-password' ||
    location.pathname === '/reset-password';
  const [collapsed, setCollapsed] = useState(
    isAuthPage || (typeof window !== 'undefined' && window.innerWidth < 768)
  );

  const roles = [
    { id: 'CITIZEN', label: 'Citizen', user: 'Alex M.', path: '/citizen/dashboard', icon: 'person' },
    { id: 'OFFICER', label: 'Municipal Officer', user: 'Elena V.', path: '/officer/dashboard', icon: 'account_balance' },
    { id: 'WORKER', label: 'Field Worker', user: 'Marcus C.', path: '/worker/dashboard', icon: 'engineering' },
    { id: 'ADMIN', label: 'Administrator', user: 'Priya S.', path: '/admin/dashboard', icon: 'admin_panel_settings' }
  ];

  const handleRoleSelect = (roleId, path) => {
    switchRole(roleId);
    navigate(path);
  };

  return (
    <aside
      aria-label="Development Demo Role Simulator"
      className="fixed bottom-4 right-4 z-50 print:hidden transition-all duration-300"
    >
      {collapsed ? (
        <button
          onClick={() => setCollapsed(false)}
          className="flex items-center gap-2 bg-[#151D26] text-white px-3.5 py-2 rounded-full shadow-2xl border border-teal-500/40 hover:bg-[#1E293B] transition-all text-xs font-semibold"
          title="Open Development Demo Persona Switcher"
        >
          <span className="w-2 h-2 rounded-full bg-teal-400 animate-pulse" />
          <span className="material-symbols-outlined text-[16px] text-teal-400">tune</span>
          <span>
            Dev Mode Role: <strong className="text-teal-300">{currentUser?.role || 'Guest'}</strong>
          </span>
        </button>
      ) : (
        <div className="bg-[#151D26]/95 backdrop-blur-md text-white rounded-2xl shadow-2xl border border-[#2D3748] p-3.5 max-w-md w-full">
          <div className="flex items-center justify-between pb-2 mb-2 border-b border-[#2D3748]">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-teal-400 animate-pulse" />
              <span className="text-[11px] font-bold uppercase tracking-wider text-teal-300">
                Development & Demo Simulator
              </span>
            </div>
            <div className="flex items-center gap-1">
              <button
                onClick={resetAllData}
                className="text-[11px] text-gray-400 hover:text-white px-2 py-0.5 rounded hover:bg-white/10 transition-colors flex items-center gap-1"
                title="Reset demo complaints and statuses to defaults"
              >
                <span className="material-symbols-outlined text-[13px]">restart_alt</span>
                <span>Reset Demo State</span>
              </button>
              <button
                onClick={() => setCollapsed(true)}
                className="text-gray-400 hover:text-white p-1 rounded hover:bg-white/10 transition-colors"
                title="Minimize simulator"
              >
                <span className="material-symbols-outlined text-[16px]">close</span>
              </button>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-1.5 sm:grid-cols-4">
            {roles.map((r) => {
              const isActive = currentUser?.role === r.id;
              return (
                <button
                  key={r.id}
                  onClick={() => handleRoleSelect(r.id, r.path)}
                  className={`flex flex-col items-center justify-center p-2 rounded-xl text-center transition-all ${
                    isActive
                      ? 'bg-[#137A70] text-white shadow-md ring-1 ring-white/30'
                      : 'bg-white/5 hover:bg-white/10 text-gray-300'
                  }`}
                >
                  <span className="material-symbols-outlined text-[18px] mb-0.5">{r.icon}</span>
                  <span className="text-[11px] font-semibold leading-tight">{r.label}</span>
                  <span className="text-[9px] opacity-75">{r.user}</span>
                </button>
              );
            })}
          </div>

          <div className="mt-2.5 pt-2 border-t border-[#2D3748]/60 flex items-center justify-between text-[10px] text-gray-400 px-1">
            <span>
              Route: <code className="text-gray-300 font-mono">{location.pathname}</code>
            </span>
            <span className="text-gray-400 italic">
              Client prototype simulator — Not a security boundary
            </span>
          </div>
        </div>
      )}
    </aside>
  );
};

export default DemoRoleSwitcher;
