import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { useApp } from '../../context/AppContext';
import { StatusBadge } from '../../components/common/StatusBadge';
import { PriorityBadge } from '../../components/common/PriorityBadge';
import { Breadcrumb } from '../../components/common/Breadcrumb';
import { TamilNaduOverviewMap } from '../../components/common/TamilNaduOverviewMap';
import { CATEGORIES } from '../../constants/statusConstants';
import { geolocationService } from '../../services/geolocationService';

export const CivicIssueMapPage = () => {
  const { complaints, showToast } = useApp();
  const [selectedComplaint, setSelectedComplaint] = useState(complaints[0] || null);
  const [viewMode, setViewMode] = useState('split'); // 'map', 'split'
  const [activeCategory, setActiveCategory] = useState('ALL');
  const [activePriority, setActivePriority] = useState('ALL');
  const [activeStatus, setActiveStatus] = useState('ALL');
  const [searchGis, setSearchGis] = useState('');
  const [searchedLocation, setSearchedLocation] = useState(null);
  const [searchingLocation, setSearchingLocation] = useState(false);

  const filtered = complaints.filter((c) => {
    const matchesSearch =
      c.title.toLowerCase().includes(searchGis.toLowerCase()) ||
      c.id.toLowerCase().includes(searchGis.toLowerCase()) ||
      c.location?.address?.toLowerCase().includes(searchGis.toLowerCase()) ||
      c.location?.ward?.toLowerCase().includes(searchGis.toLowerCase());

    const matchesCategory = activeCategory === 'ALL' || c.categoryId === activeCategory;
    const matchesPriority = activePriority === 'ALL' || c.priority === activePriority;
    const matchesStatus = activeStatus === 'ALL' || c.status === activeStatus;

    return matchesSearch && matchesCategory && matchesPriority && matchesStatus;
  });

  const handleSearchGisSubmit = async (e) => {
    if (e) e.preventDefault();
    if (!searchGis.trim()) return;

    // If an issue in the list matches, select it first
    if (filtered.length > 0) {
      setSelectedComplaint(filtered[0]);
    }

    setSearchingLocation(true);
    try {
      const loc = await geolocationService.searchLocation(searchGis);
      if (loc && loc.lat && loc.lng) {
        setSearchedLocation({
          lat: loc.lat,
          lng: loc.lng,
          label: loc.streetAddress || loc.displayName || searchGis
        });
        showToast(`Located "${searchGis}" on Tamil Nadu map!`, 'success');
      } else if (filtered.length > 0) {
        showToast(`Showing issue #${filtered[0].id} on map.`, 'info');
      } else {
        showToast('Location not found. Try searching a Tamil Nadu area or coordinates.', 'warning');
      }
    } catch (err) {
      console.warn('Location search error:', err);
    } finally {
      setSearchingLocation(false);
    }
  };

  const handleExportGeoJson = () => {
    const geoJson = {
      type: 'FeatureCollection',
      features: filtered.map((c) => ({
        type: 'Feature',
        properties: {
          id: c.id,
          title: c.title,
          status: c.status,
          priority: c.priority,
          category: c.category,
          address: c.location?.address
        },
        geometry: {
          type: 'Point',
          coordinates: [c.location?.coordinates?.lng || 80.21, c.location?.coordinates?.lat || 13.085]
        }
      }))
    };
    const blob = new Blob([JSON.stringify(geoJson, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `civicfix-tamilnadu-gis-${Date.now()}.geojson`;
    a.click();
    showToast('Exported active GIS layers as GeoJSON!', 'success');
  };

  return (
    <div className="w-full flex flex-col gap-4">
      <Breadcrumb
        items={[
          { label: 'Operations Command', path: '/officer/dashboard', icon: 'account_balance' },
          { label: 'Civic Issue Map (Tamil Nadu)' }
        ]}
      />

      {/* Top Map Control Bar */}
      <div className="bg-surface-container-lowest rounded-2xl p-4 shadow-sm border border-outline-variant/30 space-y-3">
        <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div>
              <div className="flex items-center gap-2">
                <h1 className="font-headline-sm text-xl font-bold text-on-surface">Tamil Nadu Civic Issue Map</h1>
                <span className="font-code text-xs px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800 font-bold">
                  OpenStreetMap Live
                </span>
              </div>
              <p className="text-xs text-on-surface-variant">
                Statewide spatial operations workspace — Visual defect pins across Chennai, Coimbatore, Madurai, Trichy & Salem
              </p>
            </div>

            {/* View Mode Switcher */}
            <div className="hidden lg:flex items-center p-1 rounded-xl bg-surface-container-low text-xs">
              <button
                type="button"
                onClick={() => setViewMode('split')}
                className={`px-3 py-1.5 rounded-lg font-semibold transition-all flex items-center gap-1.5 ${
                  viewMode === 'split' ? 'bg-surface-container-lowest text-primary-container shadow-sm' : 'text-tertiary'
                }`}
              >
                <span className="material-symbols-outlined text-[16px]">splitscreen</span>
                <span>Map + Split List</span>
              </button>
              <button
                type="button"
                onClick={() => setViewMode('map')}
                className={`px-3 py-1.5 rounded-lg font-semibold transition-all flex items-center gap-1.5 ${
                  viewMode === 'map' ? 'bg-surface-container-lowest text-primary-container shadow-sm' : 'text-tertiary'
                }`}
              >
                <span className="material-symbols-outlined text-[16px]">map</span>
                <span>Full Map View</span>
              </button>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <form onSubmit={handleSearchGisSubmit} className="relative flex items-center">
              <span className="material-symbols-outlined absolute left-3 text-tertiary text-[18px]">
                {searchingLocation ? 'sync' : 'travel_explore'}
              </span>
              <input
                type="text"
                placeholder="Search coordinates, street, ID..."
                value={searchGis}
                onChange={(e) => setSearchGis(e.target.value)}
                className="pl-9 pr-14 py-1.5 bg-surface-container-low rounded-xl text-xs text-on-surface placeholder:text-outline border border-transparent focus:border-primary-container focus:outline-none w-56 sm:w-72"
              />
              <button
                type="submit"
                disabled={searchingLocation}
                className="absolute right-1 px-2 py-0.5 rounded-lg bg-surface-container-lowest text-primary-container hover:bg-primary-container hover:text-white font-semibold text-[11px] border border-outline-variant/30 transition-colors"
              >
                {searchingLocation ? '...' : 'Locate'}
              </button>
            </form>
            <button
              onClick={handleExportGeoJson}
              className="px-3.5 py-1.5 bg-primary-container hover:bg-primary text-white text-xs font-semibold rounded-xl shadow-sm flex items-center gap-1.5 shrink-0"
            >
              <span className="material-symbols-outlined text-[16px]">file_download</span>
              <span className="hidden sm:inline">Export GeoJSON</span>
            </button>
          </div>
        </div>

        {/* Filter Chips Bar */}
        <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-outline-variant/30 text-xs">
          <span className="text-tertiary text-[11px] font-semibold uppercase">Category:</span>
          <select
            value={activeCategory}
            onChange={(e) => setActiveCategory(e.target.value)}
            className="px-2.5 py-1 rounded-lg bg-surface-container-low border border-outline-variant/40 text-xs text-on-surface"
          >
            <option value="ALL">All Categories</option>
            {CATEGORIES.map((cat) => (
              <option key={cat.id} value={cat.id}>
                {cat.name}
              </option>
            ))}
          </select>

          <span className="text-tertiary text-[11px] font-semibold uppercase ml-2">Priority:</span>
          <select
            value={activePriority}
            onChange={(e) => setActivePriority(e.target.value)}
            className="px-2.5 py-1 rounded-lg bg-surface-container-low border border-outline-variant/40 text-xs text-on-surface"
          >
            <option value="ALL">All Priorities</option>
            <option value="CRITICAL">Critical (P1)</option>
            <option value="HIGH">High (P2)</option>
            <option value="MEDIUM">Medium (P3)</option>
            <option value="LOW">Low (P4)</option>
          </select>

          <span className="text-tertiary text-[11px] font-semibold uppercase ml-2">Status:</span>
          <select
            value={activeStatus}
            onChange={(e) => setActiveStatus(e.target.value)}
            className="px-2.5 py-1 rounded-lg bg-surface-container-low border border-outline-variant/40 text-xs text-on-surface"
          >
            <option value="ALL">All Statuses</option>
            <option value="SUBMITTED">Submitted</option>
            <option value="UNDER_REVIEW">Under Review</option>
            <option value="ASSIGNED">Assigned</option>
            <option value="IN_PROGRESS">In Progress</option>
            <option value="RESOLUTION_SUBMITTED">Resolution Submitted</option>
            <option value="RESOLVED">Resolved</option>
          </select>

          <span className="text-tertiary text-xs ml-auto font-mono">
            {filtered.length} Pinpoints Displayed
          </span>
        </div>
      </div>

      {/* Main Map + Inspection Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 h-[700px]">
        {/* Split List (if not in map only mode) (4 cols) */}
        {viewMode !== 'map' && (
          <div className="lg:col-span-4 bg-surface-container-lowest rounded-2xl p-4 shadow-sm border border-outline-variant/30 flex flex-col h-full overflow-hidden">
            <div className="flex items-center justify-between pb-2 border-b border-outline-variant/30">
              <span className="text-xs font-bold text-tertiary uppercase tracking-wider">
                Geotagged Issues List ({filtered.length})
              </span>
              <span className="text-[10px] text-primary-container font-mono">Synced</span>
            </div>

            <div className="flex-1 overflow-y-auto space-y-2.5 pr-1 mt-3">
              {filtered.length > 0 ? (
                filtered.map((c) => {
                  const isSelected = selectedComplaint?.id === c.id;
                  return (
                    <div
                      key={c.id}
                      onClick={() => setSelectedComplaint(c)}
                      className={`p-3.5 rounded-xl border cursor-pointer transition-all ${
                        isSelected
                          ? 'border-primary-container bg-surface-container-low ring-1 ring-primary-container shadow-sm'
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
                      <div className="flex items-center justify-between pt-1 text-[10px]">
                        <StatusBadge status={c.status} size="sm" showIcon={false} />
                        <span className="font-mono text-tertiary">
                          {c.location?.coordinates?.lat?.toFixed(3)}°, {c.location?.coordinates?.lng?.toFixed(3)}°
                        </span>
                      </div>
                    </div>
                  );
                })
              ) : (
                <div className="p-8 text-center text-xs text-tertiary space-y-1">
                  <span className="material-symbols-outlined text-3xl text-slate-300">location_off</span>
                  <p>No complaints match selected filters.</p>
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
          <TamilNaduOverviewMap
            complaints={filtered}
            selectedComplaintId={selectedComplaint?.id}
            onSelectComplaint={(c) => setSelectedComplaint(c)}
            searchedLocation={searchedLocation}
            height="100%"
            getDetailUrl={(c) => `/officer/complaints/${c.id}/review`}
          />
        </div>
      </div>
    </div>
  );
};

export default CivicIssueMapPage;
