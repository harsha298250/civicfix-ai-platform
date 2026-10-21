import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { useApp } from '../../context/AppContext';
import { StatusBadge } from '../../components/common/StatusBadge';
import { PriorityBadge } from '../../components/common/PriorityBadge';
import { Breadcrumb } from '../../components/common/Breadcrumb';
import { TamilNaduOverviewMap } from '../../components/common/TamilNaduOverviewMap';
import { CATEGORIES } from '../../constants/statusConstants';

export const CitizenIssueMapPage = () => {
  const { complaints, loading } = useApp();
  const [selectedComplaint, setSelectedComplaint] = useState(complaints[0] || null);
  const [viewMode, setViewMode] = useState('split'); // 'split', 'map'
  const [activeCategory, setActiveCategory] = useState('ALL');
  const [activeStatus, setActiveStatus] = useState('ALL');
  const [searchQuery, setSearchQuery] = useState('');

  // Filter complaints based on public criteria only
  const filtered = complaints.filter((c) => {
    const matchesSearch =
      c.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.location?.address?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.location?.ward?.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesCategory = activeCategory === 'ALL' || c.categoryId === activeCategory;
    const matchesStatus = activeStatus === 'ALL' || c.status === activeStatus;

    return matchesSearch && matchesCategory && matchesStatus;
  });

  // Filter valid geographic coordinates
  const validCoordinatesCount = filtered.filter(
    (c) => c.location?.coordinates?.lat && c.location?.coordinates?.lng
  ).length;

  return (
    <div className="w-full flex flex-col gap-4">
      <Breadcrumb
        items={[
          { label: 'Citizen Portal', path: '/citizen/dashboard', icon: 'home' },
          { label: 'Civic Issue Map' }
        ]}
      />

      {/* Top Header & Public Controls */}
      <div className="bg-surface-container-lowest rounded-2xl p-4 sm:p-5 shadow-sm border border-outline-variant/30 space-y-4">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
          <div>
            <div className="flex items-center gap-2">
              <h1 className="font-headline-sm text-xl font-bold text-on-surface">Community Civic Issue Map</h1>
              <span className="font-code text-xs px-2.5 py-0.5 rounded-full bg-primary/10 text-primary font-bold">
                Tamil Nadu Grid
              </span>
            </div>
            <p className="text-xs text-on-surface-variant mt-0.5">
              Explore reported public infrastructure issues across Tamil Nadu. Click any marker to view defect details and track status.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {/* View Mode Switcher */}
            <div className="flex items-center p-1 rounded-xl bg-surface-container-low text-xs">
              <button
                type="button"
                onClick={() => setViewMode('split')}
                className={`px-3 py-1.5 rounded-lg font-semibold transition-all flex items-center gap-1.5 ${
                  viewMode === 'split' ? 'bg-surface-container-lowest text-primary shadow-sm' : 'text-tertiary'
                }`}
              >
                <span className="material-symbols-outlined text-[16px]">splitscreen</span>
                <span>List + Map</span>
              </button>
              <button
                type="button"
                onClick={() => setViewMode('map')}
                className={`px-3 py-1.5 rounded-lg font-semibold transition-all flex items-center gap-1.5 ${
                  viewMode === 'map' ? 'bg-surface-container-lowest text-primary shadow-sm' : 'text-tertiary'
                }`}
              >
                <span className="material-symbols-outlined text-[16px]">map</span>
                <span>Full Map</span>
              </button>
            </div>

            <Link
              to="/citizen/complaints/new"
              className="px-4 py-2 bg-primary-container hover:bg-primary text-white text-xs font-semibold rounded-xl shadow-sm transition-all flex items-center gap-1.5"
            >
              <span className="material-symbols-outlined text-[16px]">add_location_alt</span>
              <span>Report Issue</span>
            </Link>
          </div>
        </div>

        {/* Filter Bar */}
        <div className="flex flex-wrap items-center gap-3 pt-2 border-t border-outline-variant/30 text-xs">
          <div className="relative flex-1 min-w-[200px] max-w-xs">
            <span className="material-symbols-outlined absolute left-3 top-2 text-tertiary text-[18px]">
              search
            </span>
            <input
              type="text"
              placeholder="Search area, defect, ID..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3 py-1.5 bg-surface-container-low rounded-xl text-xs text-on-surface placeholder:text-outline border border-transparent focus:border-primary-container focus:outline-none"
            />
          </div>

          <div className="flex items-center gap-2">
            <label className="text-tertiary text-[11px] font-semibold uppercase">Category:</label>
            <select
              value={activeCategory}
              onChange={(e) => setActiveCategory(e.target.value)}
              className="px-2.5 py-1.5 rounded-lg bg-surface-container-low border border-outline-variant/40 text-xs text-on-surface"
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
              className="px-2.5 py-1.5 rounded-lg bg-surface-container-low border border-outline-variant/40 text-xs text-on-surface"
            >
              <option value="ALL">All Statuses</option>
              <option value="SUBMITTED">Submitted</option>
              <option value="UNDER_REVIEW">Under Review</option>
              <option value="ASSIGNED">Crew Assigned</option>
              <option value="IN_PROGRESS">Repairs In Progress</option>
              <option value="RESOLUTION_SUBMITTED">Awaiting Verification</option>
              <option value="RESOLVED">Resolved</option>
            </select>
          </div>

          <span className="text-tertiary text-xs ml-auto font-mono">
            {validCoordinatesCount} of {filtered.length} Pinpoints Mapped
          </span>
        </div>
      </div>

      {/* Main Map + Inspection Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 h-[650px]">
        {/* Split List (if not in map-only mode) (4 cols) */}
        {viewMode !== 'map' && (
          <div className="lg:col-span-4 bg-surface-container-lowest rounded-2xl p-4 shadow-sm border border-outline-variant/30 flex flex-col h-full overflow-hidden">
            <div className="flex items-center justify-between pb-2 border-b border-outline-variant/30">
              <span className="text-xs font-bold text-tertiary uppercase tracking-wider">
                Public Issues List ({filtered.length})
              </span>
              <span className="text-[10px] text-primary font-mono">Live Sync</span>
            </div>

            <div className="flex-1 overflow-y-auto space-y-2.5 pr-1 mt-3">
              {loading ? (
                <div className="p-8 text-center text-xs text-tertiary space-y-2">
                  <span className="material-symbols-outlined text-2xl animate-spin text-primary">progress_activity</span>
                  <p>Loading community reports...</p>
                </div>
              ) : filtered.length > 0 ? (
                filtered.map((c) => {
                  const isSelected = selectedComplaint?.id === c.id;
                  const hasCoordinates = c.location?.coordinates?.lat && c.location?.coordinates?.lng;

                  return (
                    <div
                      key={c.id}
                      onClick={() => setSelectedComplaint(c)}
                      className={`p-3.5 rounded-xl border cursor-pointer transition-all ${
                        isSelected
                          ? 'border-primary bg-surface-container-low ring-1 ring-primary shadow-sm'
                          : 'border-outline-variant/40 bg-surface-container-lowest hover:bg-surface-container-low/40'
                      }`}
                    >
                      <div className="flex items-center justify-between text-xs mb-1">
                        <span className="font-mono font-bold text-on-surface">#{c.id}</span>
                        <PriorityBadge priority={c.priority} />
                      </div>
                      <h4 className="font-title text-xs font-bold text-on-surface line-clamp-1">{c.title}</h4>
                      <p className="text-[11px] text-on-surface-variant flex items-center gap-1 mt-1 truncate">
                        <span className="material-symbols-outlined text-[13px] text-tertiary">location_on</span>
                        <span>{c.location?.address}</span>
                      </p>
                      <div className="flex items-center justify-between pt-2 mt-1 border-t border-outline-variant/20 text-[10px]">
                        <StatusBadge status={c.status} size="sm" showIcon={false} />
                        <Link
                          to={`/citizen/complaints/${c.id}`}
                          onClick={(e) => e.stopPropagation()}
                          className="font-semibold text-primary hover:underline flex items-center gap-0.5"
                        >
                          <span>Track</span>
                          <span className="material-symbols-outlined text-[12px]">arrow_forward</span>
                        </Link>
                      </div>

                      {!hasCoordinates && (
                        <div className="text-[10px] text-amber-700 bg-amber-50 px-2 py-0.5 rounded mt-1.5 font-medium flex items-center gap-1">
                          <span className="material-symbols-outlined text-[12px]">warning</span>
                          <span>No precise GPS coordinates provided</span>
                        </div>
                      )}
                    </div>
                  );
                })
              ) : (
                <div className="p-8 text-center text-xs text-tertiary space-y-1">
                  <span className="material-symbols-outlined text-3xl text-slate-300">search_off</span>
                  <p className="font-semibold">No complaints found</p>
                  <p className="text-[11px]">Try clearing your search query or filters.</p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Real Leaflet Map (8 or 12 cols) */}
        <div
          className={`${
            viewMode === 'map' ? 'lg:col-span-12' : 'lg:col-span-8'
          } rounded-2xl overflow-hidden shadow-sm border border-outline-variant/30 h-full min-h-[500px] flex flex-col flex-1`}
        >
          {filtered.length === 0 ? (
            <div className="w-full h-full min-h-[480px] bg-slate-50 flex flex-col items-center justify-center p-6 text-center space-y-2">
              <span className="material-symbols-outlined text-4xl text-slate-300">location_off</span>
              <p className="text-sm font-semibold text-on-surface">No map markers for active filters</p>
              <button
                type="button"
                onClick={() => {
                  setActiveCategory('ALL');
                  setActiveStatus('ALL');
                  setSearchQuery('');
                }}
                className="px-3.5 py-1.5 bg-primary-container text-white text-xs font-semibold rounded-lg shadow-sm"
              >
                Reset Filters
              </button>
            </div>
          ) : (
            <TamilNaduOverviewMap
              complaints={filtered}
              selectedComplaintId={selectedComplaint?.id}
              onSelectComplaint={(c) => setSelectedComplaint(c)}
              height="100%"
              getDetailUrl={(c) => `/citizen/complaints/${c.id}`}
            />
          )}
        </div>
      </div>
    </div>
  );
};

export default CitizenIssueMapPage;
