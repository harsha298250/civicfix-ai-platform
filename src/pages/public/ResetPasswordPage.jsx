import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useApp } from '../../context/AppContext';

export const ResetPasswordPage = () => {
  const navigate = useNavigate();
  const { showToast } = useApp();
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPass, setShowPass] = useState(false);
  const [success, setSuccess] = useState(false);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (password !== confirmPassword) {
      alert('Passwords do not match');
      return;
    }
    setSuccess(true);
    showToast('Password updated successfully! You can now log in.', 'success');
  };

  return (
    <div className="w-full min-h-[calc(100vh-64px)] flex flex-col items-center justify-center p-4 sm:p-6 bg-surface">
      <div className="w-full max-w-md mx-auto bg-surface-container-lowest rounded-2xl p-6 sm:p-8 shadow-xl border border-outline-variant/40 space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <span className="font-label-sm uppercase tracking-wider text-primary font-bold text-xs">
              Active Token Handshake
            </span>
            <h1 className="font-headline-sm text-2xl font-bold text-on-surface mt-0.5">
              Create a new password
            </h1>
          </div>
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-error-container text-on-error-container text-xs font-semibold">
            <span className="material-symbols-outlined text-[14px]">timer</span>
            <span>14:52 left</span>
          </span>
        </div>

        {/* Token Badge */}
        <div className="rounded-xl bg-surface-container-low p-3 flex items-center justify-between border border-outline-variant/30 text-xs">
          <div className="flex items-center gap-2">
            <span className="material-symbols-outlined text-outline text-[18px]">key</span>
            <div>
              <span className="font-code text-on-surface font-semibold block">TOKEN: 9f8a-e24b-c790</span>
              <span className="text-[10px] text-on-surface-variant">Validated for user: alex.m@citizen.org</span>
            </div>
          </div>
          <span className="px-2 py-0.5 rounded bg-surface-container-highest font-code text-[10px]">Active Token</span>
        </div>

        {!success ? (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-1">
              <label className="block text-xs font-semibold text-on-surface" htmlFor="new-pass">
                New Password
              </label>
              <div className="relative">
                <span className="material-symbols-outlined absolute left-3 top-2.5 text-on-surface-variant text-[18px]">
                  lock
                </span>
                <input
                  id="new-pass"
                  type={showPass ? 'text' : 'password'}
                  required
                  placeholder="Enter new password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full pl-9 pr-10 py-2.5 bg-surface-container-low rounded-xl text-sm text-on-surface placeholder:text-outline border border-transparent focus:border-primary-container focus:bg-surface-container-lowest focus:outline-none transition-all"
                />
                <button
                  type="button"
                  onClick={() => setShowPass(!showPass)}
                  className="absolute right-3 top-2.5 text-on-surface-variant"
                >
                  <span className="material-symbols-outlined text-[18px]">
                    {showPass ? 'visibility_off' : 'visibility'}
                  </span>
                </button>
              </div>
            </div>

            <div className="space-y-1">
              <label className="block text-xs font-semibold text-on-surface" htmlFor="confirm-pass">
                Re-type New Password
              </label>
              <div className="relative">
                <span className="material-symbols-outlined absolute left-3 top-2.5 text-on-surface-variant text-[18px]">
                  lock_reset
                </span>
                <input
                  id="confirm-pass"
                  type={showPass ? 'text' : 'password'}
                  required
                  placeholder="Confirm new password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="w-full pl-9 pr-10 py-2.5 bg-surface-container-low rounded-xl text-sm text-on-surface placeholder:text-outline border border-transparent focus:border-primary-container focus:bg-surface-container-lowest focus:outline-none transition-all"
                />
              </div>
            </div>

            <button
              type="submit"
              className="w-full h-11 bg-primary-container hover:bg-primary text-white font-semibold rounded-xl shadow-md transition-all flex items-center justify-center gap-2 mt-2"
            >
              <span>Update Credentials & Sign In</span>
              <span className="material-symbols-outlined text-[18px]">arrow_forward</span>
            </button>
          </form>
        ) : (
          <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-center space-y-3">
            <span className="material-symbols-outlined text-emerald-600 text-[36px]">check_circle</span>
            <h3 className="font-bold text-emerald-800 text-sm">Credentials Updated</h3>
            <p className="text-xs text-on-surface-variant">Your password has been changed. You can now log into your account.</p>
            <button
              onClick={() => navigate('/login')}
              className="w-full py-2.5 bg-primary-container text-white rounded-xl text-xs font-semibold hover:bg-primary transition-colors"
            >
              Go to Sign In
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
