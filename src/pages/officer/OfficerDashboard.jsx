import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useApp } from '../../context/AppContext';
import { StatusBadge } from '../../components/common/StatusBadge';
import { PriorityBadge } from '../../components/common/PriorityBadge';
import { COMPLAINT_STATUS } from '../../constants/statusConstants';

export const OfficerDashboard = () => {
  const { complaints, currentUser } = useApp();
  const navigate = useNavigate();

  // Metrics
  const openCount = complaints.filter(c => c.status !== COMPLAINT_STATUS.RESOLVED && c.status !== COMPLAINT_STATUS.REJECTED).length;
  const awaitingReviewCount = complaints.filter(c => c.status === COMPLAINT_STATUS.SUBMITTED || c.status === COMPLAINT_STATUS.UNDER_REVIEW).length;
  const activeCrewsCount = complaints.filter(c => c.status === COMPLAINT_STATUS.IN_PROGRESS).length;
  const verificationCount = complaints.filter(c => c.status === COMPLAINT_STATUS.RESOLUTION_SUBMITTED).length;

  return (
    <div className="w-full flex flex-col gap-6">
      {/* Command Strip / Page Header matching Stitch Design */}
      <div className="px-6 py-4 flex flex-col xl:flex-row xl:items-center xl:justify-between gap-4 bg-surface-container-lowest rounded-2xl shadow-sm border border-outline-variant/30">
        <div className="flex flex-col min-w-0">
          <div className="flex items-center gap-2">
            <span className="font-code text-xs text-primary font-bold tracking-wider uppercase">
              District Dispatch Hub
            </span>
            <span className="text-gray-300">•</span>
            <span className="inline-flex items-center gap-1 text-xs text-on-surface-variant font-medium">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              Live Telemetry Stream Active
            </span>
          </div>
          <h1 className="font-headline-lg text-2xl sm:text-3xl font-extrabold text-on-surface tracking-tight mt-1">
            Operations Command Overview
          </h1>
          <p className="text-body-md text-sm text-on-surface-variant">
            Metropolitan District 4 · Real-time Civic Dispatch, AI Triage & Verification
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <Link
            to="/officer/complaints"
            className="flex items-center gap-2 bg-primary hover:bg-primary-container text-white px-4 py-2 rounded-xl text-xs font-semibold shadow-sm transition-all"
          >
            <span className="material-symbols-outlined text-[18px]">assignment_turned_in</span>
            <span>Review Complaint Queue ({awaitingReviewCount})</span>
          </Link>
          <Link
            to="/officer/verifications"
            className="flex items-center gap-2 bg-secondary text-white hover:bg-secondary-container px-4 py-2 rounded-xl text-xs font-semibold shadow-sm transition-all"
          >
            <span className="material-symbols-outlined text-[18px]">verified</span>
            <span>Verification Queue ({verificationCount})</span>
          </Link>
          <Link
            to="/officer/map"
            className="flex items-center gap-2 bg-surface-container hover:bg-surface-container-high text-on-surface px-4 py-2 rounded-xl text-xs font-semibold shadow-sm transition-all"
          >
            <span className="material-symbols-outlined text-[18px]">map</span>
            <span>Live Issue Map</span>
          </Link>
        </div>
      </div>

      {/* Top 4 KPI Metrics Cards matching Stitch */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Open */}
        <div className="bg-surface-container-lowest rounded-2xl p-5 shadow-sm border border-outline-variant/30 flex flex-col justify-between hover:shadow-md transition-shadow relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-tertiary uppercase tracking-wider">Total Open</span>
            <span className="material-symbols-outlined text-tertiary text-[20px]">pending_actions</span>
          </div>
          <div className="my-2">
            <div className="font-display text-3xl font-extrabold text-on-surface">{openCount}</div>
          </div>
          <div className="flex items-center gap-1.5 text-primary text-xs font-semibold">
            <span className="material-symbols-outlined text-[16px]">trending_up</span>
            <span>Active tickets in jurisdiction</span>
          </div>
        </div>

        {/* Awaiting Review */}
        <div className="bg-surface-container-lowest rounded-2xl p-5 shadow-sm border border-outline-variant/30 flex flex-col justify-between hover:shadow-md transition-shadow relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-tertiary uppercase tracking-wider">Awaiting Triage</span>
            <span className="px-2 py-0.5 rounded-full bg-error-container text-on-error-container text-[10px] font-bold">
              High Priority
            </span>
          </div>
          <div className="my-2">
            <div className="font-display text-3xl font-extrabold text-error">{awaitingReviewCount}</div>
          </div>
          <div className="flex items-center gap-1 text-xs text-on-surface-variant font-medium">
            <span className="w-1.5 h-1.5 rounded-full bg-error" />
            <span>Requires officer assessment</span>
          </div>
        </div>

        {/* Active Field Crews */}
        <div className="bg-surface-container-lowest rounded-2xl p-5 shadow-sm border border-outline-variant/30 flex flex-col justify-between hover:shadow-md transition-shadow relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-tertiary uppercase tracking-wider">Active Crews</span>
            <span className="material-symbols-outlined text-secondary text-[20px]">engineering</span>
          </div>
          <div className="my-2">
            <div className="font-display text-3xl font-extrabold text-secondary">{activeCrewsCount}</div>
          </div>
          <div className="flex items-center gap-1 text-xs text-on-surface-variant font-medium">
            <span className="text-secondary font-bold">Units deployed</span>
            <span>across District 4</span>
          </div>
        </div>

        {/* Verification Queue */}
        <div className="bg-surface-container-lowest rounded-2xl p-5 shadow-sm border border-outline-variant/30 flex flex-col justify-between hover:shadow-md transition-shadow relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-tertiary uppercase tracking-wider">Awaiting Sign-Off</span>
            <span className="material-symbols-outlined text-emerald-600 text-[20px]">task_alt</span>
          </div>
          <div className="my-2">
            <div className="font-display text-3xl font-extrabold text-emerald-700">{verificationCount}</div>
          </div>
          <div className="flex items-center gap-1 text-xs text-on-surface-variant font-medium">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
            <span>Evidence submitted by crew</span>
          </div>
        </div>
      </div>

      {/* Main Operations Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Column: Priority Triage & Review Queue (8 cols) */}
        <div className="lg:col-span-8 bg-surface-container-lowest rounded-2xl p-6 shadow-sm border border-outline-variant/30 space-y-5">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="font-title text-base font-bold text-on-surface">Urgent Intake & Dispatch Queue</h2>
              <p className="text-xs text-on-surface-variant">Review AI diagnostic assessment and assign maintenance units</p>
            </div>
            <Link
              to="/officer/complaints"
              className="text-xs font-semibold text-primary-container hover:underline flex items-center gap-1"
            >
              <span>View Full Queue ({complaints.length})</span>
              <span className="material-symbols-outlined text-[14px]">arrow_forward</span>
            </Link>
          </div>

          <div className="space-y-3">
            {complaints.slice(0, 5).map(c => (
              <div
                key={c.id}
                className="p-4 rounded-xl border border-outline-variant/40 hover:border-primary-container/40 bg-surface-container-lowest hover:bg-surface-container-low/30 transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-4"
              >
                <div className="space-y-1.5 min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-code text-xs font-bold bg-surface-container text-on-surface px-2.5 py-0.5 rounded">
                      #{c.id}
                    </span>
                    <StatusBadge status={c.status} size="sm" />
                    <PriorityBadge priority={c.priority} />
                    {c.aiTriage && (
                      <span className="text-[10px] bg-secondary-fixed text-on-secondary-fixed font-bold px-2 py-0.5 rounded-full">
                        AI: {c.aiTriage.confidence}%
                      </span>
                    )}
                  </div>

                  <h3 className="font-title text-sm font-bold text-on-surface truncate">
                    {c.title}
                  </h3>

                  <div className="flex items-center gap-2 text-xs text-tertiary">
                    <span className="material-symbols-outlined text-[14px]">location_on</span>
                    <span className="truncate">{c.location?.address}</span>
                    <span>•</span>
                    <span className="text-primary-container font-semibold truncate">{c.category}</span>
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <Link
                    to={`/officer/complaints/${c.id}/review`}
                    className="px-3.5 py-2 rounded-xl bg-primary-container hover:bg-primary text-white text-xs font-semibold transition-colors flex items-center gap-1 shadow-sm"
                  >
                    <span>Assess & Dispatch</span>
                    <span className="material-symbols-outlined text-[16px]">arrow_forward</span>
                  </Link>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Right Column: Active Dispatch Rigs & Quick Actions (4 cols) */}
        <div className="lg:col-span-4 space-y-6">
          {/* Active Work Units */}
          <div className="bg-surface-container-lowest rounded-2xl p-5 shadow-sm border border-outline-variant/30 space-y-4">
            <div className="flex items-center justify-between">
              <span className="font-title text-xs font-bold text-on-surface uppercase tracking-wider">
                Field Crews on Duty
              </span>
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            </div>

            <div className="space-y-3">
              {[
                { name: 'Marcus Chen', unit: 'SDOT Rapid Asphalt 4', rig: 'Van #14 (Roller T-12)', status: 'On Site', ticket: '#CF-2026-00124' },
                { name: 'David Kalu', unit: 'Sanitation Emergency', rig: 'Compactor Rig 3', status: 'Completed', ticket: '#CF-2026-00127' },
                { name: 'Suresh Kumar', unit: 'High Voltage Grid Service', rig: 'Aerial Lift Truck 9', status: 'Dispatched', ticket: '#CF-2026-00126' }
              ].map((crew, idx) => (
                <div key={idx} className="p-3 rounded-xl bg-surface-container-low border border-outline-variant/30 space-y-1 text-xs">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-on-surface">{crew.name}</span>
                    <span className="px-2 py-0.5 rounded-full bg-primary/10 text-primary font-bold text-[10px]">
                      {crew.status}
                    </span>
                  </div>
                  <p className="text-tertiary">{crew.unit}</p>
                  <div className="flex justify-between items-center pt-1 text-[11px]">
                    <span className="text-tertiary">{crew.rig}</span>
                    <span className="font-code text-primary-container font-semibold">{crew.ticket}</span>
                  </div>
                </div>
              ))}
            </div>

            <Link
              to="/officer/assignments"
              className="w-full py-2 bg-surface-container hover:bg-surface-container-high rounded-xl text-xs font-semibold text-on-surface flex items-center justify-center gap-1.5 transition-colors"
            >
              <span className="material-symbols-outlined text-[16px]">groups</span>
              <span>Manage Field Allocations</span>
            </Link>
          </div>

          {/* Quick GIS Map Link */}
          <div className="bg-surface-container-lowest rounded-2xl p-5 shadow-sm border border-outline-variant/30 space-y-3">
            <span className="font-title text-xs font-bold text-on-surface uppercase tracking-wider block">
              Spatial Hotspot Density
            </span>
            <div className="relative rounded-xl overflow-hidden h-32 bg-surface-container">
              <img
                src="https://images.unsplash.com/photo-1524661135-423995f22d0b?auto=format&fit=crop&w=600&q=80"
                alt="Map snapshot"
                className="w-full h-full object-cover"
              />
              <div className="absolute inset-0 bg-[#111c28]/40 flex items-center justify-center">
                <Link
                  to="/officer/map"
                  className="px-3.5 py-1.5 bg-primary text-white text-xs font-semibold rounded-xl shadow-md hover:bg-primary-container transition-all"
                >
                  Open Geographic Explorer
                </Link>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
