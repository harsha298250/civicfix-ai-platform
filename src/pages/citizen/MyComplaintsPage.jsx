import React, { useState, useEffect } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { useApp } from '../../context/AppContext';
import { StatusBadge } from '../../components/common/StatusBadge';
import { PriorityBadge } from '../../components/common/PriorityBadge';
import { Breadcrumb } from '../../components/common/Breadcrumb';
import { CATEGORIES } from '../../constants/statusConstants';

export const MyComplaintsPage = () => {
  const { complaints, currentUser, getCitizenComplaints } = useApp();
  const [searchParams] = useSearchParams();
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('ALL');
  const [statusFilter, setStatusFilter] = useState(() => searchParams.get('status') || 'ALL');

  useEffect(() => {
    const statusParam = searchParams.get('status');
    if (statusParam) {
      setStatusFilter(statusParam);
    }
  }, [searchParams]);

  // Strictly isolated to current authenticated citizen
  const userComplaints = getCitizenComplaints
    ? getCitizenComplaints(currentUser)
    : complaints.filter(c => c.citizen?.id === currentUser?.id || (currentUser?.email && c.citizen?.email?.toLowerCase() === currentUser?.email.toLowerCase()));

  // Search & filter ONLY within authorized citizen records
  const filtered = userComplaints.filter(item => {
    const matchesSearch =
      item.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.location?.address?.toLowerCase().includes(searchTerm.toLowerCase());

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
          <h1 className="font-headline-lg text-2xl sm:text-3xl font-extrabold text-on-surface tracking-tight">
            My Registered Complaints
          </h1>
          <p className="text-body-md text-sm text-on-surface-variant mt-1">
            Historical log of all civic issues reported under your resident identity.
          </p>
        </div>

        <Link
          to="/citizen/complaints/new"
          className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-primary-container hover:bg-primary text-white font-semibold text-xs shadow-sm transition-all"
        >
          <span className="material-symbols-outlined text-[18px]">add_circle</span>
          <span>Report New Defect</span>
        </Link>
      </div>

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
        {userComplaints.length === 0 ? (
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
