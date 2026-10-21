import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { useApp } from '../../context/AppContext';
import { StatusBadge } from '../../components/common/StatusBadge';
import { PriorityBadge } from '../../components/common/PriorityBadge';
import { TamilNaduOverviewMap } from '../../components/common/TamilNaduOverviewMap';
import { CATEGORIES } from '../../constants/statusConstants';

/**
 * PublicMapPage — Sanitized Macro-Level Public GIS Defect Map
 * Displays public defect markers without exposing citizen names, phone numbers,
 * email addresses, private evidence, or internal officer notes.
 */
export const PublicMapPage = () => {
  const { complaints } = useApp();
  const [selectedComplaint, setSelectedComplaint] = useState(complaints[0] || null);
  const [activeCategory, setActiveCategory] = useState('ALL');
  const [activeStatus, setActiveStatus] = useState('ALL');
  const [searchQuery, setSearchQuery] = useState('');

  // Sanitized complaints: Strips any personally identifiable citizen markers
  const sanitizedComplaints = complaints.map((c) => ({
    id: c.id,
    title: c.title,
    category: c.category,
    categoryId: c.categoryId,
    status: c.status,
    priority: c.priority,
    location: c.location,
    createdAt: c.createdAt,
    // Note: citizen name, phone, email, worker private notes, and internal notes are strictly omitted
    citizen: {
      name: 'Verified Citizen Resident',
      ward: c.location?.ward || 'Local Ward'
    }
  }));

  const filtered = sanitizedComplaints.filter((c) => {
    const matchesSearch =
      c.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.location?.address?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.location?.ward?.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesCategory = activeCategory === 'ALL' || c.categoryId === activeCategory;
    const matchesStatus = activeStatus === 'ALL' || c.status === activeStatus;

    return matchesSearch && matchesCategory && matchesStatus;
  });

  return (
    <div className="w-full max-w-7xl mx-auto px-4 sm:px-6 py-6 flex flex-col gap-6">
      {/* Header Banner */}
      <div className="bg-surface-container-lowest rounded-2xl p-6 shadow-sm border border-outline-variant/30 space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 text-primary-container text-xs font-semibold">
              <span className="material-symbols-outlined text-[16px]">public</span>
              <span>Sanitized Public GIS Explorer</span>
            </div>
            <h1 className="font-display text-2xl sm:text-3xl font-extrabold text-on-surface tracking-tight">
              Tamil Nadu Infrastructure Grid
            </h1>
            <p className="text-on-surface-variant text-xs sm:text-sm max-w-2xl">
              Public status of urban maintenance work-orders. In accordance with resident privacy policies, all personal reporter information is fully redacted.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <Link
              to="/citizen/complaints/new"
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-primary-container hover:bg-primary text-white text-xs font-semibold shadow-sm transition-all"
            >
              <span className="material-symbols-outlined text-[18px]">add_location_alt</span>
              <span>Report an Issue</span>
            </Link>
          </div>
        </div>

        {/* Filter Bar */}
        <div className="flex flex-wrap items-center gap-3 pt-3 border-t border-outline-variant/30 text-xs">
          <div className="relative flex-1 min-w-[200px] max-w-xs">
            <span className="material-symbols-outlined absolute left-3 top-2.5 text-tertiary text-[18px]">
              search
            </span>
            <input
              type="text"
              placeholder="Search area, road, defect..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3 py-2 bg-surface-container-low rounded-xl text-xs text-on-surface placeholder:text-outline border border-transparent focus:border-primary-container focus:outline-none"
            >
            </input>
          </div>

          <div className="flex items-center gap-2">
            <label className="text-tertiary text-[11px] font-semibold uppercase">Category:</label>
            <select
              value={activeCategory}
              onChange={(e) => setActiveCategory(e.target.value)}
              className="px-3 py-2 rounded-xl bg-surface-container-low border border-outline-variant/40 text-xs text-on-surface font-semibold"
            >
              <option value="ALL">All Categories</option>
              {CATEGORIES.map((cat) => (
                <option key={cat.id} value={cat.id}>
                  {cat.name}
                </option>
              ))}
            </select>
          </div>

          <div className="flex items-center gap-2">
            <label className="text-tertiary text-[11px] font-semibold uppercase">Status:</label>
            <select
              value={activeStatus}
              onChange={(e) => setActiveStatus(e.target.value)}
              className="px-3 py-2 rounded-xl bg-surface-container-low border border-outline-variant/40 text-xs text-on-surface font-semibold"
            >
              <option value="ALL">All Statuses</option>
              <option value="SUBMITTED">Submitted</option>
              <option value="UNDER_REVIEW">Under Review</option>
              <option value="ASSIGNED">Crew Dispatched</option>
              <option value="IN_PROGRESS">In Progress</option>
              <option value="RESOLUTION_SUBMITTED">Verification Pending</option>
              <option value="RESOLVED">Verified Resolved</option>
            </select>
          </div>
        </div>
      </div>

      {/* Main Grid: List (4 cols) + Map (8 cols) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left List Column */}
        <div className="lg:col-span-4 bg-surface-container-lowest rounded-2xl p-4 shadow-sm border border-outline-variant/30 space-y-3 max-h-[640px] overflow-y-auto">
          <div className="flex items-center justify-between pb-2 border-b border-outline-variant/30">
            <span className="font-title text-xs font-bold uppercase tracking-wider text-on-surface">
              Public Work Orders ({filtered.length})
            </span>
            <span className="text-[10px] font-code text-tertiary">Anonymized</span>
          </div>

          {filtered.length === 0 ? (
            <div className="text-center py-12 text-tertiary text-xs">
              <span className="material-symbols-outlined text-[32px] text-slate-300">search_off</span>
              <p className="mt-1 font-semibold">No issues match filters</p>
            </div>
          ) : (
            filtered.map((c) => (
              <div
                key={c.id}
                onClick={() => setSelectedComplaint(c)}
                className={`p-3.5 rounded-xl border transition-all cursor-pointer space-y-1.5 ${
                  selectedComplaint?.id === c.id
                    ? 'border-primary-container bg-primary/5 shadow-xs'
                    : 'border-outline-variant/30 bg-surface-container-low/40 hover:bg-surface-container-low'
                }`}
              >
                <div className="flex items-center justify-between text-xs">
                  <span className="font-mono font-bold text-on-surface">#{c.id}</span>
                  <PriorityBadge priority={c.priority} />
                </div>
                <h4 className="font-title text-xs font-bold text-on-surface line-clamp-1">{c.title}</h4>
                <p className="text-[11px] text-on-surface-variant flex items-center gap-1">
                  <span className="material-symbols-outlined text-[13px] text-tertiary">location_on</span>
                  <span className="truncate">{c.location?.address}</span>
                </p>
                <div className="flex items-center justify-between pt-1.5 border-t border-outline-variant/20 text-[10px]">
                  <StatusBadge status={c.status} size="sm" showIcon={false} />
                  <span className="text-tertiary">{c.location?.ward || 'Tamil Nadu'}</span>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Right Map Column */}
        <div className="lg:col-span-8 bg-surface-container-lowest rounded-2xl overflow-hidden shadow-sm border border-outline-variant/30 h-[640px] flex flex-col">
          <TamilNaduOverviewMap
            complaints={filtered}
            selectedComplaintId={selectedComplaint?.id}
            onSelectComplaint={(c) => setSelectedComplaint(c)}
            height="100%"
          />
        </div>
      </div>
    </div>
  );
};

export default PublicMapPage;
