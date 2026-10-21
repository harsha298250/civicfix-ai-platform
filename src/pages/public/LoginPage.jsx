import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useApp } from '../../context/AppContext';
import { authService } from '../../services/authService';
import { apiClient } from '../../services/apiClient';
import { detectContactType, formatIndianPhone, isValidIndianPhone } from '../../utils/phoneUtils';

export const LoginPage = () => {
  const navigate = useNavigate();
  const { setCurrentUser, showToast } = useApp();

  const [identifier, setIdentifier] = useState('alex.m@citizen.org');
  const [password, setPassword] = useState('CivicSecure#2026!');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [backendStatus, setBackendStatus] = useState({ checked: false, online: false });

  useEffect(() => {
    let mounted = true;
    apiClient.checkHealth()
      .then((res) => {
        if (mounted) setBackendStatus({ checked: true, online: true, version: res?.version || '1.0.0' });
      })
      .catch(() => {
        if (mounted) setBackendStatus({ checked: true, online: false });
      });
    return () => { mounted = false; };
  }, []);

  // Quick Demo Account Presets with Indian phone numbers
  const DEMO_PRESETS = [
    { label: 'Citizen', name: 'Alex Morgan', identifier: 'alex.m@citizen.org', phone: '+91 98401 23456', role: 'CITIZEN' },
    { label: 'Municipal Officer', name: 'Elena Vance', identifier: 'elena.vance@metro.gov', phone: '+91 94440 12345', role: 'OFFICER' },
    { label: 'Field Worker', name: 'Marcus Chen', identifier: 'marcus.chen@fieldops.gov', phone: '+91 91760 98765', role: 'WORKER' },
    { label: 'System Admin', name: 'Priya Sharma', identifier: 'priya.sharma@admin.metro.gov', phone: '+91 98410 87654', role: 'ADMIN' }
  ];

  const handleApplyPreset = (preset, usePhone = false) => {
    setIdentifier(usePhone ? preset.phone : preset.identifier);
    setPassword('CivicSecure#2026!');
    setErrorMsg('');
  };

  const contactType = detectContactType(identifier);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!identifier.trim()) {
      setErrorMsg('Please enter your registered email address or Indian mobile number.');
      return;
    }

    if (contactType === 'PHONE' && !isValidIndianPhone(identifier)) {
      setErrorMsg('Please enter a valid 10-digit Indian mobile number (e.g. 98401 23456).');
      return;
    }

    if (!password) {
      setErrorMsg('Please enter your account password.');
      return;
    }

    setLoading(true);
    setErrorMsg('');

    try {
      const user = await authService.login(identifier, password);
      setCurrentUser(user);
      const modeLabel = user.isLiveBackend ? ' (PostgreSQL Live)' : ' (Demo Mode)';
      showToast(`Welcome back, ${user.name}!${modeLabel}`, 'success');

      if (user.role === 'CITIZEN') navigate('/citizen/dashboard');
      else if (user.role === 'OFFICER') navigate('/officer/dashboard');
      else if (user.role === 'WORKER') navigate('/worker/dashboard');
      else if (user.role === 'ADMIN') navigate('/admin/dashboard');
      else navigate('/citizen/dashboard');
    } catch (err) {
      setErrorMsg(err.message || 'Login failed. Please verify your credentials.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="w-full min-h-[calc(100vh-64px)] flex flex-col items-center justify-center p-4 sm:p-6 bg-[#F5F7FA]">
      <div className="w-full max-w-md mx-auto">
        <div className="bg-white rounded-2xl p-6 sm:p-8 shadow-sm border border-[#E2E7ED] space-y-6">
          {/* Header */}
          <div className="text-center space-y-1">
            <div className="w-12 h-12 rounded-2xl bg-[#E8F4F1] text-[#137A70] flex items-center justify-center mx-auto mb-3 shadow-xs">
              <span className="material-symbols-outlined text-2xl">account_circle</span>
            </div>
            <h1 className="text-2xl font-bold text-[#18232F]">Sign In to CivicFix AI</h1>
            <p className="text-xs text-[#667384]">
              Unified municipal platform for residents, officers, and field personnel.
            </p>

            {/* Backend Connectivity Status Pill */}
            {backendStatus.checked && (
              <div className="pt-2 flex items-center justify-center">
                {backendStatus.online ? (
                  <span className="inline-flex items-center gap-1.5 text-[11px] font-semibold text-emerald-800 bg-emerald-50 px-2.5 py-0.5 rounded-full border border-emerald-200">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-600 animate-pulse"></span>
                    Spring Boot & PostgreSQL Connected
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1.5 text-[11px] font-semibold text-amber-800 bg-amber-50 px-2.5 py-0.5 rounded-full border border-amber-200">
                    <span className="w-1.5 h-1.5 rounded-full bg-amber-500"></span>
                    Backend Offline (Demo Fallback Active)
                  </span>
                )}
              </div>
            )}
          </div>

          {/* Error Message */}
          {errorMsg && (
            <div className="p-3.5 bg-red-50 border border-red-200 rounded-xl text-xs text-red-700 flex items-start gap-2 animate-fade-in">
              <span className="material-symbols-outlined text-[18px] shrink-0 mt-0.5">error</span>
              <p className="leading-relaxed">{errorMsg}</p>
            </div>
          )}

          {/* Login Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="block text-xs font-semibold text-[#18232F] uppercase tracking-wider">
                  Email or Indian Mobile Number *
                </label>
                {contactType === 'PHONE' && (
                  <span className="text-[10px] text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full font-mono font-semibold flex items-center gap-1 border border-emerald-200">
                    <span>🇮🇳</span> +91 Mobile
                  </span>
                )}
                {contactType === 'EMAIL' && (
                  <span className="text-[10px] text-blue-700 bg-blue-50 px-2 py-0.5 rounded-full font-mono font-semibold">
                    Email Login
                  </span>
                )}
              </div>
              <div className="relative">
                <span className="material-symbols-outlined absolute left-3 top-2.5 text-[#667384] text-[18px]">
                  {contactType === 'PHONE' ? 'smartphone' : 'alternate_email'}
                </span>
                <input
                  type={contactType === 'PHONE' ? 'tel' : 'text'}
                  required
                  placeholder="name@example.com or 98401 23456"
                  value={identifier}
                  onChange={(e) => {
                    setIdentifier(e.target.value);
                    if (errorMsg) setErrorMsg('');
                  }}
                  className="w-full pl-9 pr-3.5 py-2.5 text-sm bg-slate-50 border border-[#E2E7ED] rounded-xl text-[#18232F] focus:outline-none focus:ring-2 focus:ring-[#137A70] focus:bg-white transition-all font-sans"
                />
              </div>
              <p className="text-[11px] text-[#667384] mt-1">
                Accepts registered email or standard 10-digit Indian mobile (+91).
              </p>
            </div>

            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="block text-xs font-semibold text-[#18232F] uppercase tracking-wider">
                  Password *
                </label>
                <Link
                  to="/forgot-password"
                  className="text-xs font-medium text-[#137A70] hover:underline"
                >
                  Forgot password?
                </Link>
              </div>
              <div className="relative">
                <span className="material-symbols-outlined absolute left-3 top-2.5 text-[#667384] text-[18px]">
                  lock
                </span>
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  placeholder="Enter your password"
                  value={password}
                  onChange={(e) => {
                    setPassword(e.target.value);
                    if (errorMsg) setErrorMsg('');
                  }}
                  className="w-full pl-9 pr-10 py-2.5 text-sm bg-slate-50 border border-[#E2E7ED] rounded-xl text-[#18232F] focus:outline-none focus:ring-2 focus:ring-[#137A70] focus:bg-white transition-all"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-2.5 text-[#667384] hover:text-[#18232F] p-0.5"
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                >
                  <span className="material-symbols-outlined text-[18px]">
                    {showPassword ? 'visibility_off' : 'visibility'}
                  </span>
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full min-h-[44px] py-2.5 bg-[#137A70] hover:bg-[#0F625B] text-white text-sm font-semibold rounded-xl shadow-sm transition-all flex items-center justify-center gap-2 disabled:opacity-60"
            >
              {loading ? (
                <>
                  <span className="material-symbols-outlined animate-spin text-[18px]">progress_activity</span>
                  <span>Authenticating...</span>
                </>
              ) : (
                <span>Sign In</span>
              )}
            </button>
          </form>

          {/* Quick Demo Account Presets */}
          <div className="pt-2 border-t border-[#E2E7ED] space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold text-[#667384] uppercase tracking-wider">
                Demo Quick Sign-In
              </span>
              <span className="text-[10px] text-tertiary font-mono">CivicSecure#2026!</span>
            </div>
            <div className="grid grid-cols-2 gap-2">
              {DEMO_PRESETS.map((p, idx) => (
                <div
                  key={idx}
                  className="p-2 rounded-xl border border-[#E2E7ED] bg-slate-50 hover:bg-[#E8F4F1] hover:border-[#137A70] transition-colors"
                >
                  <div className="flex items-center justify-between">
                    <p className="text-xs font-bold text-[#18232F]">{p.label}</p>
                    <span className="text-[9px] font-mono text-tertiary">{p.role}</span>
                  </div>
                  <p className="text-[11px] text-[#667384] truncate">{p.name}</p>
                  <div className="flex items-center gap-1.5 mt-1.5 pt-1.5 border-t border-slate-200 text-[10px]">
                    <button
                      type="button"
                      onClick={() => handleApplyPreset(p, false)}
                      className="px-1.5 py-0.5 rounded bg-white hover:bg-slate-100 text-primary-container font-semibold border border-slate-200"
                    >
                      Email
                    </button>
                    <button
                      type="button"
                      onClick={() => handleApplyPreset(p, true)}
                      className="px-1.5 py-0.5 rounded bg-white hover:bg-slate-100 text-emerald-800 font-semibold border border-slate-200"
                    >
                      🇮🇳 Mobile
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Registration link */}
          <div className="text-center text-xs text-[#667384] pt-2 border-t border-[#E2E7ED]">
            Don't have a citizen account?{' '}
            <Link to="/register" className="font-semibold text-[#137A70] hover:underline">
              Enroll as Citizen
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LoginPage;
