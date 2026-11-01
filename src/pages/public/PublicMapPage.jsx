import React, { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { complaintService } from '../../services/complaintService';
import { officerService } from '../../services/officerService';
import { StatusBadge } from '../../components/common/StatusBadge';
import { PriorityBadge } from '../../components/common/PriorityBadge';
import { TamilNaduOverviewMap } from '../../components/common/TamilNaduOverviewMap';
import ClosureTrustBadge from '../../components/common/ClosureTrustBadge';
import { CATEGORIES } from '../../constants/statusConstants';

/**
 * PublicMapPage — Sanitized Macro-Level Public GIS Defect Map
 * Displays public defect markers without exposing citizen names, phone numbers,
 * email addresses, private evidence, or internal officer notes.
 * Directly backed by GET /api/complaints/public/map
 */
export const PublicMapPage = () => {
  const [complaints, setComplaints] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedComplaint, setSelectedComplaint] = useState(null);
  const [activeCategory, setActiveCategory] = useState('ALL');
  const [activeStatus, setActiveStatus] = useState('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [trustData, setTrustData] = useState(null);

  useEffect(() => {
    let isMounted = true;
    officerService.getPublicClosureTrustScores()
      .then((data) => {
        if (isMounted && data) {
          setTrustData(data);
        }
      })
      .catch((err) => {
        console.warn('Could not load public ward trust scores:', err);
      });
    return () => { isMounted = false; };
  }, []);

  const fetchComplaints = useCallback(() => {
    setLoading(true);
    setError(null);
    const params = {};
    if (activeStatus !== 'ALL') params.status = activeStatus;
    if (activeCategory !== 'ALL') params.category = activeCategory;

    complaintService.getPublicMapComplaints(params)
      .then((data) => {
        setComplaints(data);
        if (data.length > 0) {
          setSelectedComplaint((prev) => prev ? (data.find(c => c.id === prev.id) || data[0]) : data[0]);
        } else {
          setSelectedComplaint(null);
        }
      })
      .catch((err) => {
        setError(err.message || 'Failed to load public map feed.');
      })
      .finally(() => {
        setLoading(false);
      });
  }, [activeStatus, activeCategory]);

  useEffect(() => {
    fetchComplaints();
  }, [fetchComplaints]);

  const filtered = complaints.filter((c) => {
    const q = searchQuery.toLowerCase();
    const matchesSearch =
      (c.category && c.category.toLowerCase().includes(q)) ||
      (c.ward && c.ward.toLowerCase().includes(q)) ||
      (c.id && String(c.id).toLowerCase().includes(q));

    const matchesCategory = activeCategory === 'ALL' || c.category === activeCategory || c.categoryId === activeCategory;
    const matchesStatus = activeStatus === 'ALL' || c.status === activeStatus;

    return matchesSearch && matchesCategory && matchesStatus;
  });

  return (
    <div className="w-full max-w-7xl mx-auto px-4 sm:px-6 py-6 flex flex-col gap-6">
      {error && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-2xl flex items-center justify-between text-red-800 text-xs">
          <div className="flex items-center gap-2">
            <span className="material-symbols-outlined text-red-600 text-[20px]">error</span>
            <span>{error}</span>
          </div>
          <button
            onClick={fetchComplaints}
            className="px-3 py-1.5 bg-red-600 hover:bg-red-700 text-white font-semibold rounded-lg shrink-0 transition-colors flex items-center gap-1"
          >
            <span className="material-symbols-outlined text-[16px]">refresh</span>
            <span>Retry</span>
          </button>
        </div>
      )}
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

          {loading ? (
            <div className="text-center py-12 text-tertiary text-xs space-y-2">
              <span className="material-symbols-outlined text-2xl animate-spin text-primary">progress_activity</span>
              <p>Loading public work orders...</p>
            </div>
          ) : error ? (
            <div className="text-center py-12 text-xs space-y-3">
              <span className="material-symbols-outlined text-3xl text-red-600">cloud_off</span>
              <p className="font-semibold text-on-surface">Unable to load map data</p>
              <p className="text-on-surface-variant max-w-xs mx-auto">{error}</p>
              <button
                onClick={fetchComplaints}
                className="px-3 py-1.5 bg-primary-container text-white rounded-lg font-semibold hover:bg-primary transition-colors inline-flex items-center gap-1"
              >
                <span className="material-symbols-outlined text-[14px]">refresh</span>
                <span>Retry</span>
              </button>
            </div>
          ) : filtered.length === 0 ? (
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
                  <span className="font-mono font-bold text-on-surface">Issue #{c.id}</span>
                  <PriorityBadge priority={c.priority} />
                </div>
                <h4 className="font-title text-xs font-bold text-on-surface line-clamp-1">{c.category}</h4>
                <p className="text-[11px] text-on-surface-variant flex items-center gap-1">
                  <span className="material-symbols-outlined text-[13px] text-tertiary">location_on</span>
                  <span className="truncate">{c.ward || 'Tamil Nadu'}</span>
                </p>
                <div className="flex items-center justify-between pt-1.5 border-t border-outline-variant/20 text-[10px]">
                  <StatusBadge status={c.status} size="sm" showIcon={false} />
                  <span className="text-tertiary">{c.ward || 'Tamil Nadu'}</span>
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

      {/* Public Ward Closure Trust Transparency Panel */}
      {trustData?.overall && (
        <div className="bg-surface-container-lowest rounded-2xl p-6 shadow-sm border border-outline-variant/30 space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-outline-variant/30 pb-4">
            <div>
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-primary text-[24px]">verified</span>
                <h3 className="font-title text-lg font-bold text-on-surface">Municipal Ward Closure Trust Transparency</h3>
              </div>
              <p className="text-xs text-on-surface-variant mt-1 max-w-2xl">
                Public accountability index quantifying citizen repair confirmations across municipal wards.
                Formula: confirmed closures / (confirmed closures + citizen rejections + reopened after resolution).
              </p>
            </div>

            <div className="flex items-center gap-3 bg-surface-container-low px-4 py-2.5 rounded-2xl border border-outline-variant/20 self-start sm:self-auto">
              <div className="text-right">
                <span className="text-[10px] font-bold text-tertiary uppercase tracking-wider block">Citywide Trust</span>
                <span className="text-xs text-on-surface-variant font-mono">
                  n = {trustData.overall.totalClosures || 0} closures
                </span>
              </div>
              <ClosureTrustBadge
                score={trustData.overall.trustScore}
                total={trustData.overall.totalClosures}
                confirmed={trustData.overall.confirmedClosures}
                rejected={trustData.overall.citizenRejections}
                reopened={trustData.overall.reopenedAfterResolution}
                statusMessage={trustData.overall.statusMessage}
                size="md"
              />
            </div>
          </div>

          {/* Ward Cards Grid */}
          <div>
            <h4 className="text-xs font-bold uppercase tracking-wider text-tertiary mb-3 flex items-center gap-1.5">
              <span className="material-symbols-outlined text-[16px]">location_city</span>
              <span>Per-Ward Closure Verification Quality (No Individual Data)</span>
            </h4>

            {(!trustData.byWard || trustData.byWard.length === 0) ? (
              <div className="p-8 text-center text-xs text-tertiary bg-surface-container-low rounded-xl">
                No ward closure data recorded yet.
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3.5">
                {trustData.byWard.map((w) => (
                  <div
                    key={w.ward}
                    className="p-4 rounded-xl border border-outline-variant/30 bg-surface-container-low/40 hover:bg-surface-container-low transition-all space-y-2.5"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <span className="font-title text-xs font-bold text-on-surface truncate" title={w.ward}>
                        {w.ward}
                      </span>
                      <ClosureTrustBadge
                        score={w.trustScore}
                        total={w.totalClosures}
                        confirmed={w.confirmedClosures}
                        rejected={w.citizenRejections}
                        reopened={w.reopenedAfterResolution}
                        statusMessage={w.statusMessage}
                        size="sm"
                        showLabel={false}
                      />
                    </div>

                    <div className="grid grid-cols-3 gap-1 py-1.5 px-2 bg-surface-container-lowest rounded-lg text-center text-[11px] border border-outline-variant/20">
                      <div>
                        <span className="text-[10px] text-tertiary block">Conf.</span>
                        <span className="font-mono font-semibold text-emerald-600">{w.confirmedClosures}</span>
                      </div>
                      <div>
                        <span className="text-[10px] text-tertiary block">Rej.</span>
                        <span className="font-mono font-semibold text-rose-600">{w.citizenRejections}</span>
                      </div>
                      <div>
                        <span className="text-[10px] text-tertiary block">Reop.</span>
                        <span className="font-mono font-semibold text-amber-600">{w.reopenedAfterResolution}</span>
                      </div>
                    </div>

                    <div className="flex items-center justify-between text-[10px] text-tertiary pt-1">
                      <span>Total sample:</span>
                      <span className="font-mono font-medium text-on-surface">{w.totalClosures} closures</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default PublicMapPage;
