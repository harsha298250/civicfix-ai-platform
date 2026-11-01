import React, { useState } from 'react';
import { Outlet, Link, useNavigate, useLocation } from 'react-router-dom';
import { useApp } from '../../context/AppContext';
import LanguageToggle from '../common/LanguageToggle';
import InstallPwaButton from '../common/InstallPwaButton';

export const PublicLayout = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { toast } = useApp();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // Smooth scroll to section if on landing page, or navigate to /#section if on another page
  const handleNavClick = (sectionId, e) => {
    if (e) e.preventDefault();
    setMobileMenuOpen(false);

    if (location.pathname === '/') {
      const el = document.getElementById(sectionId);
      if (el) {
        el.scrollIntoView({ behavior: 'smooth', block: 'start' });
        window.history.pushState(null, '', `#${sectionId}`);
      }
    } else {
      navigate(`/#${sectionId}`);
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-surface font-sans text-on-surface">
      {/* Toast Notification */}
      {toast && (
        <div className="fixed top-4 right-4 z-50 bg-[#151D26] text-white px-4 py-3 rounded-xl shadow-xl flex items-center gap-3 border border-secondary/30 animate-fade-in">
          <span className="material-symbols-outlined text-secondary text-[20px]">info</span>
          <span className="text-body-sm font-medium">{toast.message}</span>
        </div>
      )}

      {/* Top Navigation Bar matching Stitch Public Landing Page */}
      <header className="sticky top-0 z-40 w-full bg-surface-container-lowest/90 backdrop-blur-md shadow-sm transition-all border-b border-outline-variant/30">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          {/* Logo + Brand */}
          <Link to="/" className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-primary-container text-on-primary flex items-center justify-center shadow-sm">
              <span className="material-symbols-outlined text-[20px]">share_location</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="font-title text-title text-on-surface tracking-tight font-bold text-lg">CivicFix</span>
              <span className="bg-secondary text-white font-label-sm text-[10px] px-1.5 py-0.5 rounded-full uppercase tracking-wider font-bold">
                AI
              </span>
            </div>
          </Link>

          {/* Center Desktop Nav Links */}
          <nav className="hidden md:flex items-center gap-6 text-on-surface-variant font-label-md text-label-md">
            <button
              type="button"
              onClick={(e) => handleNavClick('how-it-works', e)}
              className="hover:text-primary transition-colors font-medium text-left"
            >
              How It Works
            </button>
            <button
              type="button"
              onClick={(e) => handleNavClick('features', e)}
              className="hover:text-primary transition-colors font-medium text-left"
            >
              Features
            </button>
            <Link to="/map" className="hover:text-primary transition-colors flex items-center gap-1 font-medium">
              <span className="material-symbols-outlined text-[16px]">map</span>
              <span>Live City Map</span>
            </Link>
            <button
              type="button"
              onClick={(e) => handleNavClick('impact', e)}
              className="hover:text-primary transition-colors font-medium text-left"
            >
              Impact
            </button>
          </nav>

          {/* Action Buttons */}
          <div className="flex items-center gap-2.5 sm:gap-3">
            <InstallPwaButton />
            <LanguageToggle />

            <Link
              to="/login"
              className="hidden sm:inline-flex items-center justify-center h-9 px-4 rounded-lg font-label-md text-label-md text-on-surface hover:bg-surface-container transition-colors"
            >
              Sign In
            </Link>
            <Link
              to="/citizen/complaints/new"
              className="inline-flex items-center gap-1.5 bg-primary-container text-white hover:bg-primary h-9 px-4 rounded-lg font-label-md text-label-md shadow-sm transition-all hover:shadow"
            >
              <span className="material-symbols-outlined text-[18px]">add_location_alt</span>
              <span>Report an Issue</span>
            </Link>
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="md:hidden p-1.5 rounded-lg text-on-surface-variant hover:bg-surface-container"
              aria-label="Toggle Menu"
            >
              <span className="material-symbols-outlined text-[24px]">
                {mobileMenuOpen ? 'close' : 'menu'}
              </span>
            </button>
          </div>
        </div>

        {/* Mobile dropdown */}
        {mobileMenuOpen && (
          <div className="md:hidden bg-surface-container-lowest border-b border-outline-variant/40 px-4 py-3 flex flex-col gap-2 animate-fade-in text-sm">
            <button
              type="button"
              onClick={(e) => handleNavClick('how-it-works', e)}
              className="py-2 text-left text-on-surface font-medium hover:text-primary"
            >
              How It Works
            </button>
            <button
              type="button"
              onClick={(e) => handleNavClick('features', e)}
              className="py-2 text-left text-on-surface font-medium hover:text-primary"
            >
              Features
            </button>
            <Link
              to="/map"
              onClick={() => setMobileMenuOpen(false)}
              className="py-2 text-primary font-medium flex items-center gap-1.5"
            >
              <span className="material-symbols-outlined text-[18px]">map</span>
              <span>Live City Issue Map</span>
            </Link>
            <button
              type="button"
              onClick={(e) => handleNavClick('impact', e)}
              className="py-2 text-left text-on-surface font-medium hover:text-primary"
            >
              Impact & Metrics
            </button>
            <div className="border-t border-outline-variant/30 my-1" />
            <Link to="/login" onClick={() => setMobileMenuOpen(false)} className="py-2 text-on-surface font-medium">Sign In</Link>
            <Link to="/register" onClick={() => setMobileMenuOpen(false)} className="py-2 text-primary font-medium">Citizen Registration</Link>
          </div>
        )}
      </header>

      {/* Main Outlet */}
      <main className="flex-1 w-full">
        <Outlet />
      </main>

      {/* Public Footer */}
      <footer className="w-full bg-[#151D26] text-white py-12 border-t border-[#2D3748]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 grid grid-cols-1 md:grid-cols-4 gap-8">
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-lg bg-primary-container flex items-center justify-center text-white">
                <span className="material-symbols-outlined text-[16px]">domain</span>
              </div>
              <span className="font-bold text-lg">CivicFix AI</span>
            </div>
            <p className="text-sm text-gray-400">
              Autonomous verified civic work-orders and AI infrastructure triage for modern metropolitan centers.
            </p>
            <div className="flex items-center gap-2 text-xs text-emerald-400">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              <span>Municipal Systems Grid Online</span>
            </div>
          </div>
          <div>
            <h4 className="font-semibold text-sm uppercase tracking-wider text-gray-300 mb-3">Public Portals</h4>
            <ul className="space-y-2 text-sm text-gray-400">
              <li><Link to="/citizen/complaints/new" className="hover:text-white transition-colors">Report Civic Issue</Link></li>
              <li><Link to="/login" className="hover:text-white transition-colors">Unified Login Portal</Link></li>
              <li><Link to="/register" className="hover:text-white transition-colors">Citizen Registration</Link></li>
              <li><Link to="/forgot-password" className="hover:text-white transition-colors">Account Recovery</Link></li>
            </ul>
          </div>
          <div>
            <h4 className="font-semibold text-sm uppercase tracking-wider text-gray-300 mb-3">Workspaces</h4>
            <ul className="space-y-2 text-sm text-gray-400">
              <li><Link to="/citizen/dashboard" className="hover:text-white transition-colors">Citizen Dashboard</Link></li>
              <li><Link to="/officer/dashboard" className="hover:text-white transition-colors">Municipal Officer Command</Link></li>
              <li><Link to="/worker/dashboard" className="hover:text-white transition-colors">Field Crew Companion</Link></li>
              <li><Link to="/admin/dashboard" className="hover:text-white transition-colors">Platform Admin Governance</Link></li>
            </ul>
          </div>
          <div>
            <h4 className="font-semibold text-sm uppercase tracking-wider text-gray-300 mb-3">Legal & Compliance</h4>
            <ul className="space-y-2 text-sm text-gray-400">
              <li><Link to="/legal/terms" className="hover:text-white transition-colors">Terms of Service</Link></li>
              <li><Link to="/legal/privacy" className="hover:text-white transition-colors">Citizen Data Privacy Policy</Link></li>
              <li><Link to="/map" className="hover:text-white transition-colors">Public Infrastructure Map</Link></li>
              <li className="flex items-center gap-1.5 pt-1 text-xs text-gray-400">
                <span className="material-symbols-outlined text-[16px] text-primary">shield</span>
                <span>Resident Data Isolated</span>
              </li>
            </ul>
          </div>
        </div>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 pt-8 mt-8 border-t border-gray-800 text-xs text-gray-500 flex flex-col sm:flex-row items-center justify-between gap-4">
          <span>© 2026 CivicFix AI — Municipal Infrastructure Platform.</span>
          <span>Designed with Google Stitch Architecture</span>
        </div>
      </footer>

    </div>
  );
};

export default PublicLayout;
