import React, { useState } from 'react';
import { Outlet, Link, useLocation, useNavigate } from 'react-router-dom';
import { useApp } from '../../context/AppContext';
import { useTranslation } from '../../context/LanguageContext';
import LanguageToggle from '../common/LanguageToggle';
import InstallPwaButton from '../common/InstallPwaButton';
import { DemoRoleSwitcher } from '../common/DemoRoleSwitcher';

export const CitizenLayout = () => {
  const { currentUser, unreadCount, toast, logout } = useApp();
  const { t } = useTranslation();
  const location = useLocation();
  const navigate = useNavigate();
  const [userMenuOpen, setUserMenuOpen] = useState(false);

  const navLinks = [
    { label: t('nav.dashboard'), path: '/citizen/dashboard', icon: 'dashboard' },
    { label: t('nav.myComplaints'), path: '/citizen/complaints', icon: 'list_alt' },
    {
      label: t('nav.notifications'),
      path: '/citizen/notifications',
      icon: 'notifications',
      badge: unreadCount > 0 ? unreadCount : null
    }
  ];

  return (
    <div className="min-h-screen flex flex-col bg-background font-sans text-on-surface">
      {/* Toast Notification */}
      {toast && (
        <div className="fixed top-4 right-4 z-50 bg-[#151D26] text-white px-4 py-3 rounded-xl shadow-xl flex items-center gap-3 border border-secondary/30 animate-fade-in">
          <span className="material-symbols-outlined text-secondary text-[20px]">info</span>
          <span className="text-body-sm font-medium">{toast.message}</span>
        </div>
      )}

      {/* Top Citizen Header Bar */}
      <header className="sticky top-0 z-40 bg-surface-container-lowest/95 backdrop-blur-xl shadow-sm border-b border-outline-variant/30">
        <div className="h-16 w-full max-w-7xl mx-auto px-4 sm:px-6 flex items-center justify-between gap-4">
          {/* Logo & Grid Status */}
          <div className="flex items-center gap-6">
            <Link to="/citizen/dashboard" className="flex items-center gap-2.5">
              <div className="relative flex items-center justify-center w-8 h-8 rounded-lg bg-primary-container text-on-primary shadow-sm">
                <span className="material-symbols-outlined text-[20px]">location_on</span>
                <span className="material-symbols-outlined absolute -bottom-1 -right-1 text-[12px] bg-secondary text-white rounded-full p-0.5">
                  check
                </span>
              </div>
              <div className="flex flex-col">
                <span className="font-title text-title tracking-tight text-on-surface leading-tight font-bold">
                  CivicFix
                </span>
                <span className="font-label-sm text-label-sm text-tertiary uppercase tracking-wider text-[10px]">
                  Citizen Portal
                </span>
              </div>
            </Link>

            <div className="hidden lg:flex items-center gap-2 bg-surface-container-low py-1 px-3 rounded-full text-xs text-tertiary">
              <span className="w-2 h-2 rounded-full bg-primary animate-pulse" />
              <span>Municipal Grid: Online</span>
              <span>•</span>
              <span className="text-on-surface font-medium">Central District 04</span>
            </div>
          </div>

          {/* Center Navigation Links */}
          <nav className="hidden md:flex items-center gap-1 bg-surface-container-low/70 p-1 rounded-xl">
            {navLinks.map((item) => {
              const isActive = location.pathname === item.path;
              return (
                <Link
                  key={item.path}
                  to={item.path}
                  className={`px-3 py-1.5 rounded-lg text-label-md transition-all flex items-center gap-1.5 ${
                    isActive
                      ? 'bg-primary-container text-white font-semibold shadow-sm'
                      : 'text-on-surface-variant hover:text-on-surface hover:bg-surface-container-high'
                  }`}
                >
                  <span className="material-symbols-outlined text-[17px]">{item.icon}</span>
                  <span>{item.label}</span>
                  {item.badge && (
                    <span className="px-1.5 py-0.2 rounded-full font-label-sm text-[10px] bg-error text-white font-bold">
                      {item.badge}
                    </span>
                  )}
                </Link>
              );
            })}
          </nav>

          {/* Action CTAs & Profile */}
          <div className="flex items-center gap-2.5 sm:gap-3">
            <InstallPwaButton />
            <LanguageToggle />

            <Link
              to="/citizen/complaints/new"
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-primary-container text-white hover:bg-primary font-label-md text-label-md transition-all shadow-sm active:scale-98"
            >
              <span className="material-symbols-outlined text-[18px]">add_circle</span>
              <span className="hidden sm:inline">{t('nav.reportComplaint')}</span>
              <span className="sm:hidden">{t('common.submit')}</span>
            </Link>

            {/* Profile Dropdown */}
            <div className="relative">
              <button
                onClick={() => setUserMenuOpen(!userMenuOpen)}
                className="flex items-center gap-2 pl-2 bg-surface-container-low rounded-full pr-3 py-1 hover:bg-surface-container transition-colors"
              >
                <div className="w-7 h-7 rounded-full bg-primary flex items-center justify-center text-white text-xs font-bold">
                  {currentUser?.avatar || 'AM'}
                </div>
                <div className="hidden sm:flex flex-col text-left">
                  <span className="font-label-md text-xs text-on-surface leading-tight font-semibold">
                    {currentUser?.name || 'Resident'}
                  </span>
                  <span className="text-[10px] text-tertiary leading-tight">Resident</span>
                </div>
                <span className="material-symbols-outlined text-[16px] text-tertiary">expand_more</span>
              </button>

              {userMenuOpen && (
                <div className="absolute right-0 mt-2 w-56 bg-surface-container-lowest rounded-xl shadow-xl border border-outline-variant/40 py-2 z-50">
                  <div className="px-4 py-2 border-b border-outline-variant/30">
                    <p className="font-semibold text-sm text-on-surface">{currentUser?.name || 'Resident'}</p>
                    <p className="text-xs text-tertiary">{currentUser?.email || ''}</p>
                    <div className="flex flex-wrap items-center gap-1.5 mt-1.5">
                      <span className="px-2 py-0.5 rounded-full bg-surface-container-low text-primary text-[10px] font-semibold">
                        {currentUser?.ward || 'Registered Citizen'}
                      </span>
                      {currentUser?.isLiveBackend ? (
                        <span className="px-1.5 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 text-[9px] font-semibold">
                          Live DB
                        </span>
                      ) : (
                        <span className="px-1.5 py-0.5 rounded-full bg-amber-50 text-amber-700 border border-amber-200 text-[9px] font-semibold">
                          Demo Mode
                        </span>
                      )}
                    </div>
                  </div>
                  <Link
                    to="/citizen/profile"
                    onClick={() => setUserMenuOpen(false)}
                    className="flex items-center gap-2 px-4 py-2 text-sm text-on-surface hover:bg-surface-container-low transition-colors"
                  >
                    <span className="material-symbols-outlined text-[18px]">person</span>
                    <span>My Profile & Preferences</span>
                  </Link>
                  <Link
                    to="/citizen/complaints"
                    onClick={() => setUserMenuOpen(false)}
                    className="flex items-center gap-2 px-4 py-2 text-sm text-on-surface hover:bg-surface-container-low transition-colors"
                  >
                    <span className="material-symbols-outlined text-[18px]">folder_shared</span>
                    <span>My Complaints History</span>
                  </Link>
                  <div className="border-t border-outline-variant/30 my-1" />
                  <button
                    type="button"
                    onClick={() => {
                      setUserMenuOpen(false);
                      logout();
                      navigate('/login');
                    }}
                    className="w-full text-left flex items-center gap-2 px-4 py-2 text-sm text-error hover:bg-error-container/20 transition-colors"
                  >
                    <span className="material-symbols-outlined text-[18px]">logout</span>
                    <span>Sign Out</span>
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Mobile Navigation Strip */}
        <div className="md:hidden flex items-center justify-around border-t border-outline-variant/30 py-2 bg-surface-container-lowest">
          {navLinks.map((item) => {
            const isActive = location.pathname === item.path;
            return (
              <Link
                key={item.path}
                to={item.path}
                className={`flex flex-col items-center gap-0.5 text-[10px] font-medium ${
                  isActive ? 'text-primary-container font-bold' : 'text-on-surface-variant'
                }`}
              >
                <span className="material-symbols-outlined text-[20px]">{item.icon}</span>
                <span>{item.label}</span>
              </Link>
            );
          })}
        </div>
      </header>

      {/* Main Outlet */}
      <main className="flex-1 w-full max-w-7xl mx-auto px-4 sm:px-6 py-6">
        <Outlet />
      </main>

      {/* Floating Role Switcher */}
      <DemoRoleSwitcher />
    </div>
  );
};

export default CitizenLayout;
