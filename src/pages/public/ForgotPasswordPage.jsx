import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useApp } from '../../context/AppContext';

export const ForgotPasswordPage = () => {
  const navigate = useNavigate();
  const { showToast } = useApp();
  const [email, setEmail] = useState('');
  const [dispatched, setDispatched] = useState(false);

  const handleSubmit = (e) => {
    e.preventDefault();
    setDispatched(true);
    showToast('Secure recovery link generated for demonstration!', 'info');
  };

  return (
    <div className="w-full min-h-[calc(100vh-64px)] flex flex-col items-center justify-center p-4 sm:p-6 bg-surface">
      <div className="w-full max-w-md mx-auto bg-surface-container-lowest rounded-2xl p-6 sm:p-8 shadow-xl border border-outline-variant/40 space-y-6">
        <div>
          <div className="flex items-center justify-between text-xs mb-1">
            <span className="font-label-sm uppercase tracking-wider text-secondary font-bold">
              Zero-Knowledge Protocol
            </span>
            <span className="font-code text-on-surface-variant text-[11px]">RFC-7519</span>
          </div>
          <h1 className="font-headline-sm text-2xl font-bold text-on-surface">Forgot your password?</h1>
          <p className="text-body-md text-sm text-on-surface-variant mt-1.5 leading-relaxed">
            Enter your registered citizen email. We will route a cryptographic single-use passkey to restore report access.
          </p>
        </div>

        {/* Privacy & Security Assurance */}
        <div className="p-4 rounded-xl bg-surface-container-low flex items-start gap-3 border border-outline-variant/30 text-xs">
          <span className="material-symbols-outlined text-primary text-[20px] shrink-0 mt-0.5">shield</span>
          <div className="space-y-1">
            <strong className="text-on-surface block font-semibold">Privacy & Security Assurance</strong>
            <p className="text-on-surface-variant leading-relaxed">
              If an eligible resident account exists for that address, password reset instructions will be sent.
            </p>
          </div>
        </div>

        {!dispatched ? (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-1">
              <label className="block text-xs font-semibold text-on-surface" htmlFor="recovery-email">
                Registered Citizen Email
              </label>
              <div className="relative">
                <span className="material-symbols-outlined absolute left-3 top-2.5 text-on-surface-variant text-[18px]">
                  alternate_email
                </span>
                <input
                  id="recovery-email"
                  type="email"
                  required
                  placeholder="alex@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full pl-9 pr-3 py-2.5 bg-surface-container-low rounded-xl text-sm text-on-surface placeholder:text-outline border border-transparent focus:border-primary-container focus:bg-surface-container-lowest focus:outline-none transition-all"
                />
              </div>
            </div>

            <button
              type="submit"
              className="w-full h-11 rounded-xl bg-primary-container hover:bg-primary text-white font-semibold text-sm transition-all flex items-center justify-center gap-2 shadow-sm"
            >
              <span className="material-symbols-outlined text-[18px]">send</span>
              <span>Send Secure Reset Instructions</span>
            </button>
          </form>
        ) : (
          <div className="p-4 rounded-xl bg-surface-container space-y-3">
            <div className="flex items-center gap-2 text-primary font-semibold text-sm">
              <span className="material-symbols-outlined text-[20px]">mark_email_read</span>
              <span>Recovery Request Processed</span>
            </div>
            <p className="text-xs text-on-surface-variant leading-relaxed">
              Dispatch triggered for <strong>{email}</strong>. For demonstration purposes, click below to proceed directly to the Token Reset Form.
            </p>
            <button
              onClick={() => navigate('/reset-password')}
              className="w-full py-2 bg-secondary text-white rounded-lg text-xs font-semibold hover:bg-secondary-container transition-colors flex items-center justify-center gap-1.5"
            >
              <span>Proceed to Reset Password Form (Demo Token)</span>
              <span className="material-symbols-outlined text-[16px]">arrow_forward</span>
            </button>
          </div>
        )}

        <div className="text-center pt-2 text-xs text-on-surface-variant">
          <Link to="/login" className="font-semibold text-primary-container hover:underline flex items-center justify-center gap-1">
            <span className="material-symbols-outlined text-[14px]">arrow_back</span>
            <span>Return to Sign In</span>
          </Link>
        </div>
      </div>
    </div>
  );
};
