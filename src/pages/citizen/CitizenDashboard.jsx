import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useApp } from '../../context/AppContext';
import { useTranslation } from '../../context/LanguageContext';
import { StatusBadge } from '../../components/common/StatusBadge';
import { PriorityBadge } from '../../components/common/PriorityBadge';
import { COMPLAINT_STATUS } from '../../constants/statusConstants';

export const CitizenDashboard = () => {
  const { currentUser, complaints, getCitizenComplaints, complaintsError, refreshComplaints, loading } = useApp();
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [activeFilter, setActiveFilter] = useState('ALL');
  const [searchTerm, setSearchTerm] = useState('');

  // Strictly isolated to the authenticated citizen resident
  const myComplaints = getCitizenComplaints
    ? getCitizenComplaints(currentUser)
    : complaints.filter(c => c.citizen?.id === currentUser?.id || (currentUser?.email && c.citizen?.email?.toLowerCase() === currentUser?.email.toLowerCase()));

  const totalCount = myComplaints.length;
  const inProgressCount = myComplaints.filter(c => c.status === COMPLAINT_STATUS.IN_PROGRESS).length;
  const verificationCount = myComplaints.filter(c => c.status === COMPLAINT_STATUS.RESOLUTION_SUBMITTED).length;
  const resolvedCount = myComplaints.filter(c => c.status === COMPLAINT_STATUS.RESOLVED).length;

  const filteredComplaints = myComplaints.filter(c => {
    const matchesFilter =
      activeFilter === 'ALL' ? true :
      activeFilter === 'IN_PROGRESS' ? c.status === COMPLAINT_STATUS.IN_PROGRESS :
      activeFilter === 'RESOLUTION_SUBMITTED' ? c.status === COMPLAINT_STATUS.RESOLUTION_SUBMITTED :
      activeFilter === 'RESOLVED' ? c.status === COMPLAINT_STATUS.RESOLVED : true;

    const matchesSearch =
      c.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      c.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
      c.location?.address?.toLowerCase().includes(searchTerm.toLowerCase());

    return matchesFilter && matchesSearch;
  });

  return (
    <div className="w-full flex flex-col gap-6">
      {/* Hero Banner matching Stitch Citizen Dashboard */}
      <section className="w-full bg-surface-container-lowest rounded-2xl shadow-sm border border-outline-variant/30 p-6 sm:p-8 relative overflow-hidden">
        <div className="absolute right-0 top-0 bottom-0 w-96 bg-gradient-to-l from-primary/10 via-secondary/5 to-transparent pointer-events-none" />
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 relative z-10">
          <div className="flex flex-col gap-1.5">
            <div className="flex items-center gap-2">
              <h1 className="font-headline-lg text-2xl sm:text-3xl font-extrabold text-on-surface">
                {t('citizenDashboard.welcome', { name: currentUser?.name ? currentUser.name.split(' ')[0] : 'Resident' })}
              </h1>
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-surface-container-low text-primary-container text-xs font-semibold">
                <span className="w-1.5 h-1.5 rounded-full bg-primary-container" />
                Verified Resident
              </span>
            </div>
            <p className="text-body-md text-sm text-on-surface-variant">
              {t('citizenDashboard.subtitle')}
            </p>
            <div className="flex flex-wrap items-center gap-3 pt-1 text-xs text-tertiary">
              <span className="flex items-center gap-1">
                <span className="material-symbols-outlined text-[14px]">update</span>
                <span>Real-time Sync Active</span>
              </span>
              <span>•</span>
              <span className="flex items-center gap-1 text-on-surface font-medium">
                <span className="material-symbols-outlined text-[14px] text-primary-container">near_me</span>
                <span>{currentUser.ward || 'Ward 08, Anna Nagar, Chennai'}</span>
              </span>
              <span>•</span>
              <span className="flex items-center gap-1 text-secondary font-medium">
                <span className="material-symbols-outlined text-[14px]">auto_fix_high</span>
                <span>AI Triage Engine v3.4 Active</span>
              </span>
            </div>
          </div>

          {/* Primary Action Callout */}
          <div className="flex items-center bg-surface-container-low p-4 rounded-xl gap-4 border border-outline-variant/30 shrink-0">
            <div className="flex flex-col text-left">
              <span className="font-title text-sm font-bold text-on-surface">{t('citizenDashboard.reportNewDefect')}</span>
              <span className="text-xs text-tertiary max-w-[200px]">
                Spotted a pothole, leak, or electrical hazard?
              </span>
            </div>
            <Link
              to="/citizen/complaints/new"
              className="px-4 py-2.5 rounded-xl bg-primary-container hover:bg-primary text-white font-semibold text-xs transition-all shadow-sm flex items-center gap-2 whitespace-nowrap active:scale-98"
            >
              <span className="material-symbols-outlined text-[18px]">add_circle</span>
              <span>{t('citizenDashboard.reportNewDefect')}</span>
            </Link>
          </div>
        </div>
      </section>

      {complaintsError && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-2xl flex items-center justify-between text-red-800 text-xs">
          <div className="flex items-center gap-2">
            <span className="material-symbols-outlined text-red-600 text-[20px]">error</span>
            <span>{complaintsError}</span>
          </div>
          <button
            onClick={refreshComplaints}
            className="px-3 py-1.5 bg-red-600 hover:bg-red-700 text-white font-semibold rounded-lg shrink-0 transition-colors flex items-center gap-1"
          >
            <span className="material-symbols-outlined text-[16px]">refresh</span>
            <span>Retry</span>
          </button>
        </div>
      )}

      {/* 4 Summary Metric Cards matching Stitch */}
      <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-surface-container-lowest p-5 rounded-2xl shadow-sm border border-outline-variant/30 flex flex-col justify-between hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold text-tertiary uppercase tracking-wider">Total Reports</span>
            <div className="w-8 h-8 rounded-lg bg-surface-container-low flex items-center justify-center text-primary-container">
              <span className="material-symbols-outlined text-[18px]">folder_shared</span>
            </div>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="font-display text-3xl font-extrabold text-on-surface">{totalCount}</span>
            <span className="text-xs text-primary font-semibold">100% indexed</span>
          </div>
          <span className="text-[11px] text-tertiary mt-2">Active in municipal ledger</span>
        </div>

        <div className="bg-surface-container-lowest p-5 rounded-2xl shadow-sm border border-outline-variant/30 flex flex-col justify-between hover:shadow-md transition-shadow">
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-semibold text-tertiary uppercase tracking-wider">Reports Being Worked On</span>
              <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center text-primary">
                <span className="material-symbols-outlined text-[18px]">engineering</span>
              </div>
            </div>
            <div className="flex items-baseline gap-2">
              <span className="font-display text-3xl font-extrabold text-primary">{inProgressCount}</span>
              <span className="text-xs text-primary font-semibold">Crews On Site</span>
            </div>
            <p className="text-[11px] text-tertiary mt-2">
              Assigned municipal work orders currently being executed on-site by dispatched field units.
            </p>
          </div>
          <div className="pt-3 border-t border-outline-variant/20 mt-3">
            <Link
              to="/citizen/complaints?status=IN_PROGRESS"
              className="inline-flex items-center gap-1.5 text-xs font-semibold text-primary hover:text-primary-container transition-colors group"
            >
              <span>Track Work</span>
              <span className="material-symbols-outlined text-[14px] transition-transform group-hover:translate-x-0.5">arrow_forward</span>
            </Link>
          </div>
        </div>

        <div className="bg-surface-container-lowest p-5 rounded-2xl shadow-sm border border-outline-variant/30 flex flex-col justify-between hover:shadow-md transition-shadow">
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-semibold text-tertiary uppercase tracking-wider">Awaiting Verification</span>
              <div className="w-8 h-8 rounded-lg bg-secondary/10 flex items-center justify-center text-secondary">
                <span className="material-symbols-outlined text-[18px]">fact_check</span>
              </div>
            </div>
            <div className="flex items-baseline gap-2">
              <span className="font-display text-3xl font-extrabold text-secondary">{verificationCount}</span>
              <span className="text-xs text-secondary font-semibold">Resolution Submitted</span>
            </div>
            <p className="text-[11px] text-tertiary mt-2">
              Repairs completed by field crews, currently undergoing officer quality audit and sign-off.
            </p>
          </div>
          <div className="pt-3 border-t border-outline-variant/20 mt-3">
            <Link
              to="/citizen/complaints?status=RESOLUTION_SUBMITTED"
              className="inline-flex items-center gap-1.5 text-xs font-semibold text-secondary hover:text-secondary-container transition-colors group"
            >
              <span>View Status</span>
              <span className="material-symbols-outlined text-[14px] transition-transform group-hover:translate-x-0.5">arrow_forward</span>
            </Link>
          </div>
        </div>

        <div className="bg-surface-container-lowest p-5 rounded-2xl shadow-sm border border-outline-variant/30 flex flex-col justify-between hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold text-tertiary uppercase tracking-wider">Verified Resolved</span>
            <div className="w-8 h-8 rounded-lg bg-emerald-500/10 flex items-center justify-center text-emerald-700">
              <span className="material-symbols-outlined text-[18px]">check_circle</span>
            </div>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="font-display text-3xl font-extrabold text-emerald-700">{resolvedCount}</span>
            <span className="text-xs text-emerald-600 font-semibold">100% Verified</span>
          </div>
          <span className="text-[11px] text-tertiary mt-2">Officially closed cases</span>
        </div>
      </section>

      {/* Main Workspace Split Grid */}
      <section className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Column: Complaint List (8 cols) */}
        <div className="lg:col-span-8 bg-surface-container-lowest rounded-2xl p-6 shadow-sm border border-outline-variant/30 space-y-5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h2 className="font-title text-base font-bold text-on-surface">Registered Civic Complaints</h2>
              <p className="text-xs text-on-surface-variant">Real-time status updates from Central Operations</p>
            </div>

            {/* Filter Tabs */}
            <div className="flex items-center gap-1 bg-surface-container-low p-1 rounded-xl text-xs overflow-x-auto no-scrollbar">
              {[
                { id: 'ALL', label: 'All Reports' },
                { id: 'IN_PROGRESS', label: 'In Progress' },
                { id: 'RESOLUTION_SUBMITTED', label: 'Verification' },
                { id: 'RESOLVED', label: 'Resolved' }
              ].map(tab => (
                <button
                  key={tab.id}
                  onClick={() => setActiveFilter(tab.id)}
                  className={`px-3 py-1 rounded-lg font-semibold transition-all whitespace-nowrap ${
                    activeFilter === tab.id
                      ? 'bg-surface-container-lowest text-primary-container shadow-sm'
                      : 'text-tertiary hover:text-on-surface'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>
          </div>

          {/* Search Box */}
          <div className="relative">
            <span className="material-symbols-outlined absolute left-3 top-2.5 text-tertiary text-[18px]">
              search
            </span>
            <input
              type="text"
              placeholder="Search by ticket ID (#CF-2026-00124), issue title, street..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-4 py-2 bg-surface-container-low rounded-xl text-xs text-on-surface placeholder:text-outline border border-transparent focus:border-primary-container focus:bg-surface-container-lowest focus:outline-none transition-all"
            />
          </div>

          {/* Complaints Table/Cards */}
          <div className="space-y-3">
            {complaintsError ? (
              <div className="text-center py-12 bg-surface-container-low rounded-xl p-6 space-y-3 border border-red-200">
                <span className="material-symbols-outlined text-red-600 text-[36px]">cloud_off</span>
                <p className="font-semibold text-sm text-on-surface">Unable to load complaints</p>
                <p className="text-xs text-on-surface-variant max-w-sm mx-auto">
                  {complaintsError}
                </p>
                <button
                  type="button"
                  onClick={refreshComplaints}
                  className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-primary-container text-white text-xs font-semibold shadow-sm hover:bg-primary transition-colors"
                >
                  <span className="material-symbols-outlined text-[16px]">refresh</span>
                  <span>Retry</span>
                </button>
              </div>
            ) : filteredComplaints.length === 0 ? (
              <div className="text-center py-12 bg-surface-container-low rounded-xl p-6 space-y-3">
                <span className="material-symbols-outlined text-tertiary text-[36px]">inbox</span>
                <p className="font-semibold text-sm text-on-surface">No complaints match your criteria</p>
                <p className="text-xs text-tertiary max-w-sm mx-auto">
                  Try adjusting your filter or report a new civic defect in your area.
                </p>
                <Link
                  to="/citizen/complaints/new"
                  className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-primary-container text-white text-xs font-semibold shadow-sm hover:bg-primary"
                >
                  <span className="material-symbols-outlined text-[16px]">add_location_alt</span>
                  <span>File a Report Now</span>
                </Link>
              </div>
            ) : (
              filteredComplaints.map(item => (
                <div
                  key={item.id}
                  className="p-4 rounded-xl border border-outline-variant/40 hover:border-primary-container/40 bg-surface-container-lowest hover:bg-surface-container-low/30 transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-4 group"
                >
                  <div className="flex-1 min-w-0 space-y-1.5">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-code text-xs font-bold text-on-surface bg-surface-container px-2 py-0.5 rounded">
                        #{item.id}
                      </span>
                      <StatusBadge status={item.status} size="sm" />
                      <PriorityBadge priority={item.priority} />
                      <span className="text-[11px] text-tertiary flex items-center gap-1">
                        <span className="material-symbols-outlined text-[13px]">calendar_today</span>
                        <span>{new Date(item.createdAt).toLocaleDateString()}</span>
                      </span>
                    </div>

                    <h3 className="font-title text-sm font-bold text-on-surface group-hover:text-primary transition-colors truncate">
                      {item.title}
                    </h3>

                    <div className="flex items-center gap-2 text-xs text-on-surface-variant truncate">
                      <span className="material-symbols-outlined text-[14px] text-tertiary shrink-0">location_on</span>
                      <span className="truncate">{item.location?.address}</span>
                      <span>•</span>
                      <span className="text-primary-container font-semibold truncate">{item.category}</span>
                    </div>

                    {item.progressPercent > 0 && (
                      <div className="pt-1 flex items-center gap-2">
                        <div className="w-24 bg-surface-container-high rounded-full h-1.5 overflow-hidden">
                          <div
                            className="bg-primary-container h-full rounded-full transition-all"
                            style={{ width: `${item.progressPercent}%` }}
                          />
                        </div>
                        <span className="text-[10px] text-tertiary font-code">{item.progressPercent}% progress</span>
                        {item.assignedWorker && (
                          <span className="text-[10px] text-on-surface-variant font-medium">
                            · Assigned: {item.assignedWorker.name}
                          </span>
                        )}
                      </div>
                    )}
                  </div>

                  <div className="flex items-center gap-2 sm:self-center shrink-0">
                    <Link
                      to={`/citizen/complaints/${item.id}`}
                      className="px-3.5 py-2 rounded-xl bg-surface-container hover:bg-primary-container hover:text-white text-on-surface font-semibold text-xs transition-all flex items-center gap-1 shadow-sm"
                    >
                      <span>Track Details</span>
                      <span className="material-symbols-outlined text-[16px]">chevron_right</span>
                    </Link>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Right Column: Community & Intelligence Feed (4 cols) */}
        <div className="lg:col-span-4 space-y-6">
          {/* Municipal Resolution Standards & Privacy Notice Card */}
          <div className="bg-surface-container-lowest rounded-2xl p-5 shadow-sm border border-outline-variant/30 space-y-3">
            <div className="flex items-center justify-between">
              <span className="font-title text-xs font-bold text-on-surface uppercase tracking-wider flex items-center gap-1.5">
                <span className="material-symbols-outlined text-[16px] text-primary-container">verified_user</span>
                <span>Citizen Data Isolation</span>
              </span>
              <span className="text-[10px] font-code text-primary-container font-semibold">Active</span>
            </div>
            <p className="text-xs text-on-surface-variant leading-relaxed">
              Your reported complaints, uploaded photos, and location coordinates are private to your resident identity. Only authorized municipal officers and assigned field crews review repair telemetry.
            </p>
            <div className="pt-2 border-t border-outline-variant/20 flex items-center justify-between text-xs">
              <span className="text-tertiary">Resolution Verification:</span>
              <span className="font-semibold text-primary">Officer Inspected</span>
            </div>
          </div>

          {/* AI Autonomous Triage Telemetry Card */}
          <div className="bg-surface-container-lowest rounded-2xl p-5 shadow-sm border border-outline-variant/30 space-y-3">
            <div className="flex items-center gap-2 text-secondary font-bold text-xs uppercase tracking-wider">
              <span className="material-symbols-outlined text-[18px]">psychology</span>
              <span>Gemini AI Infrastructure Model</span>
            </div>
            <p className="text-xs text-on-surface-variant leading-relaxed">
              Every complaint is ingested by multi-modal vision intelligence to detect severity, verify duplicate reports, and auto-dispatch work orders.
            </p>
            <div className="bg-surface-container-low p-3 rounded-xl space-y-2 text-xs">
              <div className="flex justify-between">
                <span className="text-tertiary">Duplicate Detection:</span>
                <span className="font-semibold text-on-surface">3 Clustered</span>
              </div>
              <div className="flex justify-between">
                <span className="text-tertiary">Mean Triage Latency:</span>
                <span className="font-semibold text-primary-container font-code">1.4s</span>
              </div>
              <div className="flex justify-between">
                <span className="text-tertiary">Inspection Precision:</span>
                <span className="font-semibold text-emerald-600">98.4%</span>
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
};
