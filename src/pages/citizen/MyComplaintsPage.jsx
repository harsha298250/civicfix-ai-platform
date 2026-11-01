import React, { useState, useEffect, useCallback } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { useApp } from '../../context/AppContext';
import { useTranslation } from '../../context/LanguageContext';
import { complaintService } from '../../services/complaintService';
import { StatusBadge } from '../../components/common/StatusBadge';
import { PriorityBadge } from '../../components/common/PriorityBadge';
import { Breadcrumb } from '../../components/common/Breadcrumb';
import { CATEGORIES } from '../../constants/statusConstants';

export const MyComplaintsPage = () => {
  const { currentUser } = useApp();
  const { t } = useTranslation();
  const [searchParams] = useSearchParams();
  const [userComplaints, setUserComplaints] = useState([]);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState('');
  const [unauthorized, setUnauthorized] = useState(false);
  const [isLiveBackend, setIsLiveBackend] = useState(false);

  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('ALL');
  const [statusFilter, setStatusFilter] = useState(() => searchParams.get('status') || 'ALL');

  useEffect(() => {
    const statusParam = searchParams.get('status');
    if (statusParam) {
      setStatusFilter(statusParam);
    }
  }, [searchParams]);

  const loadComplaints = useCallback(async () => {
    setLoading(true);
    setErrorMsg('');
    setUnauthorized(false);
    try {
      const data = await complaintService.getByCitizen(currentUser?.id, currentUser?.email);
      setUserComplaints(Array.isArray(data) ? data : []);
      if (data && data.length > 0 && data[0].isLiveBackend) {
        setIsLiveBackend(true);
      }
    } catch (err) {
      console.error('Failed to load citizen complaints:', err);
      if (err.status === 401 || err.status === 403) {
        setUnauthorized(true);
        setErrorMsg('Unauthorized: Active resident session required to access your municipal complaints.');
      } else {
        setErrorMsg(err.message || 'Unable to load complaints from backend. Please retry.');
      }
    } finally {
      setLoading(false);
    }
  }, [currentUser]);

  useEffect(() => {
    loadComplaints();
  }, [loadComplaints]);

  // Search & filter ONLY within authorized citizen records
  const filtered = userComplaints.filter(item => {
    const title = item.title || '';
    const id = item.referenceId || item.id || '';
    const addr = item.location?.address || item.address || '';

    const matchesSearch =
      title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      id.toLowerCase().includes(searchTerm.toLowerCase()) ||
      addr.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesCategory = categoryFilter === 'ALL' || item.categoryId === categoryFilter;
    const matchesStatus = statusFilter === 'ALL' || item.status === statusFilter;

    return matchesSearch && matchesCategory && matchesStatus;
  });

  return (
    <div className="w-full flex flex-col gap-6">
      <Breadcrumb
        items={[
          { label: 'Citizen Portal', path: '/citizen/dashboard', icon: 'home' },
          { label: 'My Complaints' }
        ]}
      />

      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="font-headline-lg text-2xl sm:text-3xl font-extrabold text-on-surface tracking-tight">
              {t('complaints.pageTitle')}
            </h1>
            {isLiveBackend ? (
              <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-800 bg-emerald-50 px-2.5 py-0.5 rounded-full border border-emerald-200">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-600 animate-pulse" />
                PostgreSQL Live
              </span>
            ) : (
              <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-amber-800 bg-amber-50 px-2.5 py-0.5 rounded-full border border-amber-200">
                <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
                Offline Mode
              </span>
            )}
          </div>
          <p className="text-body-md text-sm text-on-surface-variant mt-1">
            {t('complaints.subtitle')}
          </p>
        </div>

        <Link
          to="/citizen/complaints/new"
          className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-primary-container hover:bg-primary text-white font-semibold text-xs shadow-sm transition-all"
        >
          <span className="material-symbols-outlined text-[18px]">add_circle</span>
          <span>{t('complaints.reportNewButton')}</span>
        </Link>
      </div>

      {/* Error / Unauthorized Alert */}
      {unauthorized ? (
        <div className="bg-amber-50 border border-amber-200 rounded-2xl p-6 text-center space-y-3">
          <div className="w-12 h-12 rounded-xl bg-amber-100 text-amber-800 flex items-center justify-center mx-auto">
            <span className="material-symbols-outlined text-[28px]">lock</span>
          </div>
          <h2 className="text-base font-bold text-amber-900">Resident Authentication Required</h2>
          <p className="text-xs text-amber-800 max-w-md mx-auto">
            {errorMsg || 'Your active resident session could not be authenticated. Please sign in to inspect your registered tickets.'}
          </p>
          <div className="pt-1">
            <Link
              to="/login"
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-amber-700 text-white text-xs font-semibold shadow-sm hover:bg-amber-800 transition-colors"
            >
              <span className="material-symbols-outlined text-[16px]">login</span>
              <span>Sign In to CivicFix</span>
            </Link>
          </div>
        </div>
      ) : errorMsg ? (
        <div className="bg-red-50 border border-red-200 rounded-2xl p-4 flex items-center justify-between gap-3 text-xs text-red-800">
          <div className="flex items-center gap-2">
            <span className="material-symbols-outlined text-red-600 text-[20px]">error</span>
            <span>{errorMsg}</span>
          </div>
          <button
            onClick={loadComplaints}
            className="px-3 py-1.5 bg-red-600 hover:bg-red-700 text-white font-semibold rounded-lg shrink-0 transition-colors"
          >
            Retry
          </button>
        </div>
      ) : null}

      {/* Filter and Search Bar */}
      <div className="bg-surface-container-lowest p-4 rounded-2xl shadow-sm border border-outline-variant/30 flex flex-col md:flex-row gap-3 items-center justify-between">
        <div className="relative flex-1 w-full">
          <span className="material-symbols-outlined absolute left-3 top-2.5 text-tertiary text-[18px]">
            search
          </span>
          <input
            type="text"
            placeholder="Search by ID (#CF-2026-00124), title, or road name..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-4 py-2 bg-surface-container-low rounded-xl text-xs text-on-surface placeholder:text-outline border border-transparent focus:border-primary-container focus:bg-surface-container-lowest focus:outline-none transition-all"
          />
        </div>

        <div className="flex flex-wrap items-center gap-2 w-full md:w-auto">
          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            className="px-3 py-2 bg-surface-container-low rounded-xl text-xs text-on-surface font-semibold border border-transparent focus:border-primary-container"
          >
            <option value="ALL">All Categories</option>
            {CATEGORIES.map(c => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>

          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-3 py-2 bg-surface-container-low rounded-xl text-xs text-on-surface font-semibold border border-transparent focus:border-primary-container"
          >
            <option value="ALL">All Statuses</option>
            <option value="SUBMITTED">Submitted</option>
            <option value="UNDER_REVIEW">Under Review</option>
            <option value="ASSIGNED">Assigned</option>
            <option value="IN_PROGRESS">In Progress</option>
            <option value="RESOLUTION_SUBMITTED">Resolution Submitted</option>
            <option value="RESOLVED">Verified Resolved</option>
            <option value="REWORK_REQUESTED">Rework Requested</option>
          </select>
        </div>
      </div>

      {/* Complaint List */}
      <div className="space-y-3">
        {loading ? (
          <div className="space-y-3">
            {[1, 2, 3].map((n) => (
              <div
                key={n}
                className="bg-surface-container-lowest p-5 rounded-2xl shadow-sm border border-outline-variant/30 animate-pulse space-y-3"
              >
                <div className="flex items-center gap-2">
                  <div className="h-5 w-24 bg-surface-container rounded" />
                  <div className="h-5 w-20 bg-surface-container rounded-full" />
                  <div className="h-5 w-16 bg-surface-container rounded-full" />
                </div>
                <div className="h-5 w-3/4 bg-surface-container rounded" />
                <div className="h-4 w-1/2 bg-surface-container-low rounded" />
              </div>
            ))}
          </div>
        ) : errorMsg ? (
          <div className="text-center py-16 bg-surface-container-lowest rounded-2xl p-8 border border-red-200 space-y-4 max-w-lg mx-auto">
            <div className="w-16 h-16 rounded-2xl bg-red-50 text-red-600 flex items-center justify-center mx-auto">
              <span className="material-symbols-outlined text-[32px]">cloud_off</span>
            </div>
            <div className="space-y-1">
              <h3 className="font-title text-base font-bold text-on-surface">Unable to Load Complaints</h3>
              <p className="text-xs text-on-surface-variant max-w-md mx-auto leading-relaxed">
                {errorMsg}
              </p>
            </div>
            <button
              onClick={loadComplaints}
              className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-primary-container hover:bg-primary text-white font-semibold text-xs transition-all shadow-sm"
            >
              <span className="material-symbols-outlined text-[18px]">refresh</span>
              <span>Retry</span>
            </button>
          </div>
        ) : userComplaints.length === 0 ? (
          <div className="text-center py-16 bg-surface-container-lowest rounded-2xl p-8 border border-outline-variant/30 space-y-4 max-w-lg mx-auto">
            <div className="w-16 h-16 rounded-2xl bg-primary/10 text-primary-container flex items-center justify-center mx-auto">
              <span className="material-symbols-outlined text-[32px]">folder_open</span>
            </div>
            <div className="space-y-1">
              <h3 className="font-title text-base font-bold text-on-surface">No Complaints Filed Yet</h3>
              <p className="text-xs text-on-surface-variant max-w-md mx-auto leading-relaxed">
                You haven't reported any civic defects under your resident account yet. When you report potholes, water leaks, or streetlight failures, their live status will be tracked here.
              </p>
            </div>
            <Link
              to="/citizen/complaints/new"
              className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-primary-container hover:bg-primary text-white font-semibold text-xs transition-all shadow-sm"
            >
              <span className="material-symbols-outlined text-[18px]">add_circle</span>
              <span>Report Your First Civic Issue</span>
            </Link>
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-12 bg-surface-container-lowest rounded-2xl p-6 border border-outline-variant/30 space-y-3">
            <span className="material-symbols-outlined text-[36px] text-tertiary">search_off</span>
            <p className="font-bold text-on-surface text-sm">No complaints match filters</p>
            <p className="text-xs text-tertiary">Try clearing your search query or category filters.</p>
          </div>
        ) : (
          filtered.map(c => (
            <div
              key={c.id}
              className="bg-surface-container-lowest p-5 rounded-2xl shadow-sm border border-outline-variant/30 hover:border-primary-container/40 transition-all flex flex-col md:flex-row md:items-center justify-between gap-4 group"
            >
              <div className="space-y-2 min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-code text-xs font-bold bg-surface-container text-on-surface px-2.5 py-0.5 rounded">
                    #{c.id}
                  </span>
                  <StatusBadge status={c.status} size="sm" />
                  <PriorityBadge priority={c.priority} />
                  <span className="text-[11px] text-tertiary flex items-center gap-1">
                    <span className="material-symbols-outlined text-[13px]">calendar_today</span>
                    <span>{new Date(c.createdAt).toLocaleDateString()}</span>
                  </span>
                </div>

                <h3 className="font-title text-base font-bold text-on-surface group-hover:text-primary transition-colors">
                  {c.title}
                </h3>

                <p className="text-xs text-on-surface-variant line-clamp-1">{c.description}</p>

                <div className="flex items-center gap-2 text-xs text-tertiary">
                  <span className="material-symbols-outlined text-[14px]">location_on</span>
                  <span>{c.location?.address}</span>
                  <span>•</span>
                  <span className="text-primary-container font-medium">{c.category}</span>
                </div>
              </div>

              <div className="flex items-center gap-2 self-start md:self-center shrink-0">
                <Link
                  to={`/citizen/complaints/${c.id}`}
                  className="px-4 py-2 rounded-xl bg-surface-container hover:bg-primary-container hover:text-white text-on-surface text-xs font-semibold transition-all flex items-center gap-1"
                >
                  <span>View Timeline & Proof</span>
                  <span className="material-symbols-outlined text-[16px]">arrow_forward</span>
                </Link>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};
