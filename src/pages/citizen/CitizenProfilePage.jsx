import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { Breadcrumb } from '../../components/common/Breadcrumb';

export const CitizenProfilePage = () => {
  const { currentUser, showToast } = useApp();
  const [phone, setPhone] = useState(currentUser.phone || '+91 98401 23456');
  const [ward, setWard] = useState(currentUser.ward || 'Ward 08, Anna Nagar');
  const [emailAlerts, setEmailAlerts] = useState(true);
  const [smsAlerts, setSmsAlerts] = useState(true);

  const handleSave = (e) => {
    e.preventDefault();
    showToast('Profile and notification preferences updated successfully!', 'success');
  };

  return (
    <div className="w-full max-w-4xl mx-auto flex flex-col gap-6">
      <Breadcrumb
        items={[
          { label: 'Citizen Portal', path: '/citizen/dashboard', icon: 'home' },
          { label: 'Profile & Preferences' }
        ]}
      />

      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-headline-lg text-2xl sm:text-3xl font-extrabold text-on-surface tracking-tight">
            Resident Profile & Preferences
          </h1>
          <p className="text-body-md text-sm text-on-surface-variant mt-1">
            Manage your verified citizen credentials, contact details, and dispatch alert subscriptions.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-start">
        {/* Left Column: Profile Card */}
        <div className="md:col-span-5 bg-surface-container-lowest rounded-2xl p-6 shadow-sm border border-outline-variant/30 text-center space-y-4">
          <div className="w-20 h-20 rounded-full bg-primary-container text-white text-2xl font-bold flex items-center justify-center mx-auto shadow-md">
            {currentUser.avatar || 'AM'}
          </div>
          <div>
            <h2 className="font-headline-sm text-lg font-bold text-on-surface">{currentUser.name}</h2>
            <p className="text-xs text-tertiary">{currentUser.email}</p>
            <span className="inline-block mt-2 px-3 py-1 rounded-full bg-emerald-500/10 text-emerald-700 text-xs font-semibold">
              Verified Resident ID
            </span>
          </div>

          <div className="pt-4 border-t border-outline-variant/30 text-left space-y-2.5 text-xs">
            <div className="flex justify-between">
              <span className="text-tertiary">Community Trust Score:</span>
              <span className="font-bold text-primary-container font-code">98% Verified</span>
            </div>
            <div className="flex justify-between">
              <span className="text-tertiary">Primary Ward:</span>
              <span className="font-semibold text-on-surface">{currentUser.ward}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-tertiary">Member Since:</span>
              <span className="font-semibold text-on-surface">January 2026</span>
            </div>
          </div>
        </div>

        {/* Right Column: Preferences Form */}
        <div className="md:col-span-7 bg-surface-container-lowest rounded-2xl p-6 shadow-sm border border-outline-variant/30 space-y-5">
          <h3 className="font-title text-base font-bold text-on-surface">Update Contact & Alert Channels</h3>

          <form onSubmit={handleSave} className="space-y-4">
            <div className="space-y-1">
              <label className="block text-xs font-semibold text-on-surface">Registered Mobile Phone</label>
              <input
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-surface-container-low rounded-xl text-sm text-on-surface border border-transparent focus:border-primary-container focus:outline-none"
              />
            </div>

            <div className="space-y-1">
              <label className="block text-xs font-semibold text-on-surface">Primary Residential Ward</label>
              <input
                type="text"
                value={ward}
                onChange={(e) => setWard(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-surface-container-low rounded-xl text-sm text-on-surface border border-transparent focus:border-primary-container focus:outline-none"
              />
            </div>

            <div className="pt-2 border-t border-outline-variant/30 space-y-3">
              <h4 className="text-xs font-bold text-on-surface uppercase tracking-wider">Alert Subscriptions</h4>
              <label className="flex items-center gap-2 cursor-pointer text-xs text-on-surface">
                <input
                  type="checkbox"
                  checked={emailAlerts}
                  onChange={(e) => setEmailAlerts(e.target.checked)}
                  className="rounded text-primary-container"
                />
                <span>Email alerts on work-order status changes and officer approvals</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer text-xs text-on-surface">
                <input
                  type="checkbox"
                  checked={smsAlerts}
                  onChange={(e) => setSmsAlerts(e.target.checked)}
                  className="rounded text-primary-container"
                />
                <span>Instant SMS notifications when crew dispatches to site</span>
              </label>
            </div>

            <button
              type="submit"
              className="px-5 py-2.5 bg-primary-container hover:bg-primary text-white font-semibold text-xs rounded-xl shadow transition-colors"
            >
              Save Preferences
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};
