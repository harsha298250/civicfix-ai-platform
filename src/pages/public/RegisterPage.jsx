import React, { useState, useEffect, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useApp } from '../../context/AppContext';
import { authService } from '../../services/authService';
import {
  isValidIndianPhone,
  formatIndianPhone,
  normalizeIndianPhone,
  normalizeEmail
} from '../../utils/phoneUtils';

export const RegisterPage = () => {
  const navigate = useNavigate();
  const { setCurrentUser, showToast } = useApp();

  // Step 1: Citizen Details, Step 2: Contact OTP Verification, Step 3: Success Confirmation
  const [step, setStep] = useState(1);
  const [contactMethod, setContactMethod] = useState('MOBILE'); // 'MOBILE' | 'EMAIL'

  const [formData, setFormData] = useState({
    name: '',
    phone: '',
    email: '',
    ward: 'Zone 09, Anna Nagar, Chennai',
    password: '',
    confirmPassword: '',
    agreeTerms: false,
    agreeConsent: true
  });

  const [otpDigits, setOtpDigits] = useState(['', '', '', '', '', '']);
  const [cooldown, setCooldown] = useState(60);
  const [otpExpiresAt, setOtpExpiresAt] = useState(null);
  const [showPass, setShowPass] = useState(false);
  const [showConfirmPass, setShowConfirmPass] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [duplicateAccountNotice, setDuplicateAccountNotice] = useState(false);
  const [simulatedCode, setSimulatedCode] = useState('');

  const otpInputsRef = useRef([]);

  // Countdown timer for OTP resend and expiry
  useEffect(() => {
    let timer;
    if (step === 2 && cooldown > 0) {
      timer = setInterval(() => setCooldown((c) => c - 1), 1000);
    }
    return () => clearInterval(timer);
  }, [step, cooldown]);

  // Password strength calculator
  const calculatePasswordStrength = (pass) => {
    if (!pass) return { score: 0, label: 'None', color: 'bg-slate-200' };
    let score = 0;
    if (pass.length >= 8) score += 1;
    if (pass.length >= 12) score += 1;
    if (/[A-Z]/.test(pass) && /[a-z]/.test(pass)) score += 1;
    if (/[0-9]/.test(pass)) score += 1;
    if (/[^A-Za-z0-9]/.test(pass)) score += 1;

    if (score <= 2) return { score: 1, label: 'Weak', color: 'bg-red-500', width: 'w-1/3' };
    if (score <= 4) return { score: 2, label: 'Moderate', color: 'bg-amber-500', width: 'w-2/3' };
    return { score: 3, label: 'Strong', color: 'bg-emerald-600', width: 'w-full' };
  };

  const strength = calculatePasswordStrength(formData.password);

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
    if (errorMsg) setErrorMsg('');
    if (duplicateAccountNotice) setDuplicateAccountNotice(false);
  };

  // Handle phone input with live formatting
  const handlePhoneChange = (e) => {
    const raw = e.target.value;
    // Allow digits and spaces
    const digitsOnly = raw.replace(/\D/g, '');
    let clean10 = digitsOnly;
    if (clean10.startsWith('91') && clean10.length > 10) {
      clean10 = clean10.substring(2);
    }
    if (clean10.startsWith('0') && clean10.length > 10) {
      clean10 = clean10.substring(1);
    }
    clean10 = clean10.substring(0, 10);

    setFormData((prev) => ({
      ...prev,
      phone: clean10
    }));
    if (errorMsg) setErrorMsg('');
    if (duplicateAccountNotice) setDuplicateAccountNotice(false);
  };

  // Step 1 Validation & Proceed to OTP
  const handleProceedToOtp = async (e) => {
    e.preventDefault();
    setErrorMsg('');
    setDuplicateAccountNotice(false);

    if (!formData.name.trim() || formData.name.trim().length < 2) {
      setErrorMsg('Please enter your full legal name (minimum 2 characters).');
      return;
    }

    if (contactMethod === 'MOBILE') {
      if (!isValidIndianPhone(formData.phone)) {
        setErrorMsg('Please enter a valid 10-digit Indian mobile number starting with 6, 7, 8, or 9.');
        return;
      }
    } else {
      if (!formData.email.trim() || !formData.email.includes('@')) {
        setErrorMsg('Please enter a valid email address.');
        return;
      }
    }

    if (formData.password.length < 8) {
      setErrorMsg('Password must be at least 8 characters long.');
      return;
    }

    if (formData.password !== formData.confirmPassword) {
      setErrorMsg('Passwords do not match. Please verify your password entry.');
      return;
    }

    if (!formData.agreeTerms) {
      setErrorMsg('You must agree to the CivicFix Municipal Terms of Service and Privacy Notice.');
      return;
    }

    setLoading(true);

    try {
      const contact = contactMethod === 'MOBILE' ? formData.phone : formData.email;
      const res = await authService.requestRegistrationOtp(contact, contactMethod);

      setSimulatedCode(res.simulatedCode || '');
      setCooldown(res.cooldownSeconds || 60);
      setOtpExpiresAt(Date.now() + (res.expiresInSeconds || 300) * 1000);
      setOtpDigits(['', '', '', '', '', '']);
      setStep(2);
      showToast(
        `Verification OTP generated for ${contactMethod === 'MOBILE' ? formatIndianPhone(formData.phone) : formData.email}`,
        'info'
      );
    } catch (err) {
      if (err.message && err.message.includes('already registered')) {
        setDuplicateAccountNotice(true);
      }
      setErrorMsg(err.message || 'Unable to initiate contact verification.');
    } finally {
      setLoading(false);
    }
  };

  // Handle individual OTP digit inputs & auto-advance
  const handleOtpDigitChange = (index, value) => {
    const digit = value.replace(/\D/g, '').slice(-1);
    const updated = [...otpDigits];
    updated[index] = digit;
    setOtpDigits(updated);
    if (errorMsg) setErrorMsg('');

    // Advance to next box if digit entered
    if (digit && index < 5 && otpInputsRef.current[index + 1]) {
      otpInputsRef.current[index + 1].focus();
    }
  };

  const handleOtpKeyDown = (index, e) => {
    if (e.key === 'Backspace' && !otpDigits[index] && index > 0 && otpInputsRef.current[index - 1]) {
      otpInputsRef.current[index - 1].focus();
    }
  };

  const handleOtpPaste = (e) => {
    e.preventDefault();
    const pasted = e.clipboardData.getData('text').replace(/\D/g, '').substring(0, 6);
    if (pasted.length > 0) {
      const updated = ['', '', '', '', '', ''];
      for (let i = 0; i < pasted.length; i++) {
        updated[i] = pasted[i];
      }
      setOtpDigits(updated);
      const focusIndex = Math.min(pasted.length, 5);
      if (otpInputsRef.current[focusIndex]) {
        otpInputsRef.current[focusIndex].focus();
      }
    }
  };

  // Step 2: Verify OTP and Register Account
  const handleVerifyOtpAndRegister = async (e) => {
    e.preventDefault();
    const enteredCode = otpDigits.join('');

    if (enteredCode.length !== 6) {
      setErrorMsg('Please enter all 6 digits of the verification code.');
      return;
    }

    setLoading(true);
    setErrorMsg('');

    try {
      const contact = contactMethod === 'MOBILE' ? formData.phone : formData.email;
      await authService.verifyRegistrationOtp(contact, enteredCode);

      // OTP Verified — Now finalize citizen record
      const newUser = await authService.registerCitizen({
        name: formData.name,
        email: contactMethod === 'EMAIL' ? formData.email : `${formData.name.toLowerCase().replace(/\s+/g, '')}@citizen.org`,
        phone: contactMethod === 'MOBILE' ? formData.phone : (formData.phone || ''),
        ward: formData.ward,
        password: formData.password
      });

      setCurrentUser(newUser);
      showToast('Contact verified & citizen account created successfully!', 'success');
      navigate('/citizen/dashboard');
    } catch (err) {
      setErrorMsg(err.message || 'OTP verification failed.');
    } finally {
      setLoading(false);
    }
  };

  // Resend OTP handler
  const handleResendOtp = async () => {
    if (cooldown > 0) return;
    setLoading(true);
    setErrorMsg('');

    try {
      const contact = contactMethod === 'MOBILE' ? formData.phone : formData.email;
      const res = await authService.requestRegistrationOtp(contact, contactMethod);
      setSimulatedCode(res.simulatedCode || '');
      setCooldown(res.cooldownSeconds || 60);
      setOtpDigits(['', '', '', '', '', '']);
      showToast('Fresh verification code dispatched!', 'info');
    } catch (err) {
      setErrorMsg(err.message || 'Failed to resend code.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="w-full min-h-[calc(100vh-64px)] flex flex-col items-center justify-center p-4 sm:p-6 bg-[#F5F7FA]">
      <div className="w-full max-w-lg mx-auto space-y-4">
        {/* Municipal Staff Advisory Notice */}
        <div className="bg-white rounded-2xl p-4 shadow-sm border border-[#E2E7ED] flex items-start gap-3">
          <div className="w-8 h-8 rounded-xl bg-purple-100 text-purple-700 flex items-center justify-center shrink-0">
            <span className="material-symbols-outlined text-[18px]">verified_user</span>
          </div>
          <div className="text-xs">
            <h4 className="font-bold text-[#18232F]">Municipal Public Enrollment Boundary</h4>
            <p className="text-[#667384] mt-0.5 leading-relaxed">
              Public registration creates standard Citizen accounts for incident reporting. Municipal Officers and Field Crew accounts are provisioned exclusively through Municipal Administration.
            </p>
          </div>
        </div>

        {/* Main Enrollment Card */}
        <div className="bg-white rounded-2xl p-6 sm:p-8 shadow-sm border border-[#E2E7ED] space-y-5">
          {/* Header */}
          <div className="text-center space-y-1">
            <div className="w-12 h-12 rounded-2xl bg-[#E8F4F1] text-[#137A70] flex items-center justify-center mx-auto mb-2 shadow-xs">
              <span className="material-symbols-outlined text-2xl">
                {step === 1 ? 'person_add' : 'mark_email_read'}
              </span>
            </div>
            <h1 className="text-2xl font-bold text-[#18232F]">
              {step === 1 ? 'Citizen Account Enrollment' : 'Verify Contact Number'}
            </h1>
            <p className="text-xs text-[#667384]">
              {step === 1
                ? 'Join CivicFix AI to submit and track municipal resolutions across Tamil Nadu.'
                : `Enter the 6-digit verification code sent to ${
                    contactMethod === 'MOBILE' ? formatIndianPhone(formData.phone) : formData.email
                  }`}
            </p>
          </div>

          {/* Duplicate Account Alert Banner */}
          {duplicateAccountNotice && (
            <div className="p-4 bg-amber-50 border border-amber-200 rounded-xl text-xs space-y-2 animate-fade-in">
              <div className="flex items-start gap-2 text-amber-800 font-semibold">
                <span className="material-symbols-outlined text-[18px] shrink-0">account_circle</span>
                <p>An account is already registered with this contact information.</p>
              </div>
              <p className="text-amber-700 text-[11px] leading-relaxed">
                If this is your account, please sign in directly or restore access through account recovery.
              </p>
              <div className="flex items-center gap-3 pt-1">
                <Link
                  to="/login"
                  className="px-3 py-1.5 bg-[#137A70] text-white font-semibold rounded-lg text-xs hover:bg-[#0F625B]"
                >
                  Sign In to Account →
                </Link>
                <Link
                  to="/forgot-password"
                  className="text-xs text-[#137A70] font-semibold hover:underline"
                >
                  Forgot Password?
                </Link>
              </div>
            </div>
          )}

          {/* Error Message */}
          {errorMsg && !duplicateAccountNotice && (
            <div className="p-3.5 bg-red-50 border border-red-200 rounded-xl text-xs text-red-700 flex items-start gap-2 animate-fade-in">
              <span className="material-symbols-outlined text-[18px] shrink-0 mt-0.5">error</span>
              <p className="leading-relaxed">{errorMsg}</p>
            </div>
          )}

          {/* STEP 1: Registration Form */}
          {step === 1 && (
            <form onSubmit={handleProceedToOtp} className="space-y-4">
              {/* Full Name */}
              <div>
                <label className="block text-xs font-semibold text-[#18232F] uppercase tracking-wider mb-1" htmlFor="reg-name">
                  Full Legal Name *
                </label>
                <input
                  id="reg-name"
                  type="text"
                  name="name"
                  required
                  autoComplete="name"
                  placeholder="e.g. Anandhi Sundaram"
                  value={formData.name}
                  onChange={handleChange}
                  className="w-full min-h-[44px] px-3.5 py-2.5 text-sm bg-slate-50 border border-[#E2E7ED] rounded-xl text-[#18232F] focus:outline-none focus:ring-2 focus:ring-[#137A70] focus:bg-white"
                />
              </div>

              {/* Contact Method Selector (Mobile vs Email) */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-xs font-semibold text-[#18232F] uppercase tracking-wider">
                    Contact Method for Verification *
                  </label>
                  <div className="flex items-center bg-slate-100 p-0.5 rounded-lg text-[11px] font-semibold">
                    <button
                      type="button"
                      onClick={() => setContactMethod('MOBILE')}
                      className={`px-2.5 py-1 rounded-md transition-all ${
                        contactMethod === 'MOBILE'
                          ? 'bg-white text-emerald-800 shadow-xs'
                          : 'text-tertiary hover:text-on-surface'
                      }`}
                    >
                      🇮🇳 Mobile (+91)
                    </button>
                    <button
                      type="button"
                      onClick={() => setContactMethod('EMAIL')}
                      className={`px-2.5 py-1 rounded-md transition-all ${
                        contactMethod === 'EMAIL'
                          ? 'bg-white text-primary-container shadow-xs'
                          : 'text-tertiary hover:text-on-surface'
                      }`}
                    >
                      Email Address
                    </button>
                  </div>
                </div>

                {contactMethod === 'MOBILE' ? (
                  <div className="space-y-1">
                    <div className="flex items-center min-h-[44px] bg-slate-50 border border-[#E2E7ED] rounded-xl focus-within:ring-2 focus-within:ring-[#137A70] focus-within:border-transparent focus-within:bg-white overflow-hidden transition-all shadow-xs">
                      <div className="flex items-center gap-1.5 px-3.5 py-2.5 bg-slate-100 border-r border-[#E2E7ED] text-xs font-bold text-slate-700 select-none shrink-0">
                        <span className="text-sm">🇮🇳</span>
                        <span>+91</span>
                      </div>
                      <input
                        id="reg-phone"
                        type="tel"
                        name="phone"
                        required
                        autoComplete="tel-national"
                        inputMode="numeric"
                        placeholder="98401 23456"
                        value={formData.phone}
                        onChange={handlePhoneChange}
                        className="w-full px-3.5 py-2.5 text-sm bg-transparent text-[#18232F] focus:outline-none font-mono tracking-wider placeholder:font-sans placeholder:tracking-normal placeholder:text-slate-400"
                      />
                    </div>
                    <p className="text-[11px] text-[#667384]">
                      Standard 10-digit Indian telecom format (starts with 6, 7, 8, or 9).
                    </p>
                  </div>
                ) : (
                  <div className="space-y-1">
                    <div className="relative">
                      <span className="material-symbols-outlined absolute left-3 top-2.5 text-[#667384] text-[18px]">
                        alternate_email
                      </span>
                      <input
                        id="reg-email"
                        type="email"
                        name="email"
                        required
                        autoComplete="email"
                        placeholder="anandhi@example.com"
                        value={formData.email}
                        onChange={handleChange}
                        className="w-full min-h-[44px] pl-9 pr-3.5 py-2.5 text-sm bg-slate-50 border border-[#E2E7ED] rounded-xl text-[#18232F] focus:outline-none focus:ring-2 focus:ring-[#137A70] focus:bg-white"
                      />
                    </div>
                    <p className="text-[11px] text-[#667384]">
                      A 6-digit cryptographic verification passkey will be routed to this email.
                    </p>
                  </div>
                )}
              </div>

              {/* Primary Ward */}
              <div>
                <label className="block text-xs font-semibold text-[#18232F] uppercase tracking-wider mb-1" htmlFor="reg-ward">
                  Primary Municipal Ward / Jurisdiction
                </label>
                <input
                  id="reg-ward"
                  type="text"
                  name="ward"
                  value={formData.ward}
                  onChange={handleChange}
                  className="w-full min-h-[44px] px-3.5 py-2.5 text-sm bg-slate-50 border border-[#E2E7ED] rounded-xl text-[#18232F] focus:outline-none focus:ring-2 focus:ring-[#137A70] focus:bg-white"
                />
              </div>

              {/* Password & Confirm Password */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-[#18232F] uppercase tracking-wider mb-1" htmlFor="reg-pass">
                    Password *
                  </label>
                  <div className="relative">
                    <input
                      id="reg-pass"
                      type={showPass ? 'text' : 'password'}
                      name="password"
                      required
                      autoComplete="new-password"
                      placeholder="Min 8 characters"
                      value={formData.password}
                      onChange={handleChange}
                      className="w-full min-h-[44px] px-3.5 pr-9 py-2.5 text-sm bg-slate-50 border border-[#E2E7ED] rounded-xl text-[#18232F] focus:outline-none focus:ring-2 focus:ring-[#137A70] focus:bg-white"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPass(!showPass)}
                      className="absolute right-2.5 top-2.5 text-[#667384] hover:text-[#18232F]"
                    >
                      <span className="material-symbols-outlined text-[18px]">
                        {showPass ? 'visibility_off' : 'visibility'}
                      </span>
                    </button>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-[#18232F] uppercase tracking-wider mb-1" htmlFor="reg-confirm">
                    Confirm Password *
                  </label>
                  <div className="relative">
                    <input
                      id="reg-confirm"
                      type={showConfirmPass ? 'text' : 'password'}
                      name="confirmPassword"
                      required
                      autoComplete="new-password"
                      placeholder="Re-enter password"
                      value={formData.confirmPassword}
                      onChange={handleChange}
                      className="w-full min-h-[44px] px-3.5 pr-9 py-2.5 text-sm bg-slate-50 border border-[#E2E7ED] rounded-xl text-[#18232F] focus:outline-none focus:ring-2 focus:ring-[#137A70] focus:bg-white"
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirmPass(!showConfirmPass)}
                      className="absolute right-2.5 top-2.5 text-[#667384] hover:text-[#18232F]"
                    >
                      <span className="material-symbols-outlined text-[18px]">
                        {showConfirmPass ? 'visibility_off' : 'visibility'}
                      </span>
                    </button>
                  </div>
                </div>
              </div>

              {/* Password Strength Indicator */}
              {formData.password && (
                <div className="space-y-1 text-xs">
                  <div className="flex justify-between items-center text-[11px]">
                    <span className="text-[#667384]">Password Strength:</span>
                    <span className="font-semibold text-on-surface">{strength.label}</span>
                  </div>
                  <div className="w-full h-1.5 bg-slate-200 rounded-full overflow-hidden">
                    <div className={`h-full ${strength.color} ${strength.width} transition-all`} />
                  </div>
                </div>
              )}

              {/* Consent and Privacy Disclosures */}
              <div className="space-y-2 pt-2 border-t border-[#E2E7ED] text-xs">
                <div className="flex items-start gap-2.5 text-[#18232F]">
                  <input
                    id="reg-agree-terms"
                    type="checkbox"
                    name="agreeTerms"
                    checked={formData.agreeTerms}
                    onChange={handleChange}
                    className="mt-1 h-4 w-4 rounded border-gray-300 text-[#137A70] focus:ring-[#137A70] cursor-pointer"
                  />
                  <label htmlFor="reg-agree-terms" className="leading-relaxed select-none">
                    I have read and agree to the{' '}
                    <Link
                      to="/legal/terms"
                      target="_blank"
                      rel="noopener noreferrer"
                      onClick={(e) => e.stopPropagation()}
                      className="font-semibold text-[#137A70] hover:underline inline-flex items-center gap-0.5"
                    >
                      <span>CivicFix Terms of Service</span>
                      <span className="material-symbols-outlined text-[13px]">open_in_new</span>
                    </Link>{' '}
                    and{' '}
                    <Link
                      to="/legal/privacy"
                      target="_blank"
                      rel="noopener noreferrer"
                      onClick={(e) => e.stopPropagation()}
                      className="font-semibold text-[#137A70] hover:underline inline-flex items-center gap-0.5"
                    >
                      <span>Citizen Data Privacy Policy</span>
                      <span className="material-symbols-outlined text-[13px]">open_in_new</span>
                    </Link>.
                  </label>
                </div>

                <p className="text-[11px] text-[#667384] pl-6 leading-relaxed">
                  Your contact information is strictly utilized for dispatch notifications, issue status alerts, and resolution verifications.
                </p>
              </div>

              {/* Submit to Step 2 */}
              <button
                type="submit"
                disabled={loading}
                className="w-full min-h-[44px] py-3 bg-[#137A70] hover:bg-[#0F625B] text-white text-sm font-semibold rounded-xl shadow-sm transition-all flex items-center justify-center gap-2 disabled:opacity-60"
              >
                {loading ? (
                  <>
                    <span className="material-symbols-outlined animate-spin text-[18px]">progress_activity</span>
                    <span>Checking Availability & Generating OTP...</span>
                  </>
                ) : (
                  <>
                    <span>Proceed to Verification</span>
                    <span className="material-symbols-outlined text-[18px]">arrow_forward</span>
                  </>
                )}
              </button>
            </form>
          )}

          {/* STEP 2: Dedicated OTP Verification Step */}
          {step === 2 && (
            <form onSubmit={handleVerifyOtpAndRegister} className="space-y-5">
              {/* Development Mode Honest Badge */}
              <div className="p-3.5 bg-emerald-50 border border-emerald-200 rounded-xl text-xs space-y-1">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-emerald-800 flex items-center gap-1">
                    <span className="material-symbols-outlined text-[16px]">verified</span>
                    Simulated Verification Gateway (Development Mode)
                  </span>
                  <span className="text-[10px] font-mono text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded">
                    Active
                  </span>
                </div>
                <p className="text-emerald-700 text-[11px] leading-relaxed">
                  In production, this OTP is dispatched via an authorized SMS/Email delivery gateway. For this prototype, your generated 6-digit code is:{' '}
                  <strong className="font-mono text-xs font-bold text-emerald-900 bg-white px-2 py-0.5 rounded border border-emerald-300">
                    {simulatedCode}
                  </strong>
                </p>
              </div>

              {/* OTP 6-Box Entry */}
              <div className="space-y-2">
                <label className="block text-xs font-semibold text-[#18232F] uppercase tracking-wider text-center">
                  Enter 6-Digit Verification Code
                </label>
                <div className="flex justify-center gap-2 sm:gap-3" onPaste={handleOtpPaste}>
                  {otpDigits.map((digit, idx) => (
                    <input
                      key={idx}
                      ref={(el) => (otpInputsRef.current[idx] = el)}
                      type="text"
                      inputMode="numeric"
                      pattern="[0-9]*"
                      maxLength={1}
                      value={digit}
                      onChange={(e) => handleOtpDigitChange(idx, e.target.value)}
                      onKeyDown={(e) => handleOtpKeyDown(idx, e)}
                      className="w-11 h-12 sm:w-12 sm:h-14 text-center font-mono text-lg font-bold bg-slate-50 border border-[#E2E7ED] rounded-xl text-[#18232F] focus:outline-none focus:ring-2 focus:ring-[#137A70] focus:bg-white transition-all"
                    />
                  ))}
                </div>
              </div>

              {/* Resend and Timer */}
              <div className="flex items-center justify-between text-xs pt-1">
                <span className="text-[#667384]">
                  Code valid for 5 minutes
                </span>

                <button
                  type="button"
                  onClick={handleResendOtp}
                  disabled={cooldown > 0 || loading}
                  className="font-semibold text-[#137A70] hover:underline disabled:opacity-50 disabled:no-underline"
                >
                  {cooldown > 0 ? `Resend Code in ${cooldown}s` : 'Resend Code Now'}
                </button>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setStep(1)}
                  className="w-1/3 min-h-[44px] py-2.5 border border-[#E2E7ED] hover:bg-slate-50 text-xs font-semibold text-[#18232F] rounded-xl transition-all"
                >
                  Back to Details
                </button>
                <button
                  type="submit"
                  disabled={loading || otpDigits.join('').length !== 6}
                  className="w-2/3 min-h-[44px] py-2.5 bg-[#137A70] hover:bg-[#0F625B] text-white text-sm font-semibold rounded-xl shadow-sm transition-all flex items-center justify-center gap-2 disabled:opacity-60"
                >
                  {loading ? (
                    <>
                      <span className="material-symbols-outlined animate-spin text-[18px]">progress_activity</span>
                      <span>Activating Account...</span>
                    </>
                  ) : (
                    <>
                      <span className="material-symbols-outlined text-[18px]">check_circle</span>
                      <span>Verify & Complete Registration</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          )}

          {/* Identity Verification Clarity Notice (Phase 4 Specification) */}
          <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl text-[11px] text-[#667384] flex items-start gap-2">
            <span className="material-symbols-outlined text-[16px] text-primary-container shrink-0 mt-0.5">
              shield_person
            </span>
            <p>
              <strong>Privacy Assurance:</strong> CivicFix AI does not mandate Aadhaar or biometric documents to report civic defects. Contact verification ensures abuse prevention while preserving resident privacy.
            </p>
          </div>

          {/* Direct Sign In link */}
          <div className="text-center text-xs text-[#667384] pt-2 border-t border-[#E2E7ED]">
            Already have an active account?{' '}
            <Link to="/login" className="font-semibold text-[#137A70] hover:underline">
              Sign In to CivicFix
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
};

export default RegisterPage;
