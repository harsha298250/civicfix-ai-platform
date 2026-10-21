import React, { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import L from 'leaflet';

const escapeHtml = (str) => {
  if (str === null || str === undefined) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
};

const getPriorityColor = (priority) => {
  switch (priority) {
    case 'CRITICAL':
      return '#C63F48';
    case 'HIGH':
      return '#D97706';
    case 'MEDIUM':
      return '#2563EB';
    case 'LOW':
    default:
      return '#137A70';
  }
};

const createComplaintMarkerIcon = (priority = 'HIGH', isSelected = false) => {
  const color = getPriorityColor(priority);
  const size = isSelected ? 40 : 32;
  const ring = isSelected ? 'ring-4 ring-purple-400' : '';

  return L.divIcon({
    className: 'custom-complaint-marker',
    html: `
      <div style="
        background-color: ${color};
        width: ${size}px;
        height: ${size}px;
        border-radius: 50% 50% 50% 0;
        transform: rotate(-45deg);
        display: flex;
        align-items: center;
        justify-content: center;
        border: 2px solid white;
        box-shadow: 0 4px 12px rgba(0,0,0,0.35);
        transition: transform 0.2s;
      ">
        <span class="material-symbols-outlined" style="
          transform: rotate(45deg);
          color: white;
          font-size: ${isSelected ? 20 : 16}px;
          line-height: 1;
        ">${priority === 'CRITICAL' ? 'priority_high' : 'location_on'}</span>
      </div>
    `,
    iconSize: [size, size],
    iconAnchor: [size / 2, size],
    popupAnchor: [0, -size]
  });
};

export const TamilNaduOverviewMap = ({
  complaints = [],
  selectedComplaintId = null,
  onSelectComplaint = null,
  searchedLocation = null,
  height = '100%',
  detailRoutePrefix = '/officer/complaints',
  getDetailUrl = null
}) => {
  const navigate = useNavigate();
  const mapContainerRef = useRef(null);
  const mapInstanceRef = useRef(null);
  const markersGroupRef = useRef(null);
  const searchMarkerRef = useRef(null);

  const [tileError, setTileError] = useState(false);

  // Initialize Map
  useEffect(() => {
    if (!mapContainerRef.current) return;

    if (!mapInstanceRef.current) {
      // Centered on Tamil Nadu
      const map = L.map(mapContainerRef.current, {
        center: [11.1271, 78.6569], // Tamil Nadu geographic center
        zoom: 7,
        zoomControl: true,
        attributionControl: true
      });

      // Standard OpenStreetMap Tile Layer
      const tileLayer = L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
        maxZoom: 19
      });

      tileLayer.on('tileerror', () => {
        setTileError(true);
      });

      tileLayer.addTo(map);

      const markersGroup = L.layerGroup().addTo(map);
      markersGroupRef.current = markersGroup;
      mapInstanceRef.current = map;
    }

    const map = mapInstanceRef.current;

    // Invalidate size on mount and after layout paints
    const timer1 = setTimeout(() => {
      if (map) map.invalidateSize();
    }, 150);

    const timer2 = setTimeout(() => {
      if (map) map.invalidateSize();
    }, 450);

    // Watch for size changes (split view toggling, window resize)
    let resizeObserver = null;
    if (mapContainerRef.current && window.ResizeObserver) {
      resizeObserver = new ResizeObserver(() => {
        if (mapInstanceRef.current) {
          mapInstanceRef.current.invalidateSize();
        }
      });
      resizeObserver.observe(mapContainerRef.current);
    }

    return () => {
      clearTimeout(timer1);
      clearTimeout(timer2);
      if (resizeObserver) resizeObserver.disconnect();
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }
    };
  }, []);

  // Update Markers when complaints or selection changes
  useEffect(() => {
    if (!mapInstanceRef.current || !markersGroupRef.current) return;

    const map = mapInstanceRef.current;
    map.invalidateSize();

    const markersGroup = markersGroupRef.current;
    markersGroup.clearLayers();

    const bounds = [];
    let selectedMarker = null;

    complaints.forEach((c) => {
      const lat = Number(c.location?.coordinates?.lat);
      const lng = Number(c.location?.coordinates?.lng);

      if (!isNaN(lat) && !isNaN(lng) && lat !== 0 && lng !== 0) {
        const isSelected = selectedComplaintId === c.id;
        const marker = L.marker([lat, lng], {
          icon: createComplaintMarkerIcon(c.priority, isSelected),
          zIndexOffset: isSelected ? 1000 : 100
        });

        // Popup HTML
        const safeId = escapeHtml(c.id);
        const safePriority = escapeHtml(c.priority);
        const safeCategory = escapeHtml(c.category || 'Civic Infrastructure');
        const safeTitle = escapeHtml(c.title);
        const safeAddress = escapeHtml(c.location?.address || 'Tamil Nadu');
        const safeStatus = escapeHtml(c.status);
        const priorityColor = getPriorityColor(c.priority);

        const popupContent = document.createElement('div');
        popupContent.className = 'p-1 text-xs font-sans';
        popupContent.innerHTML = `
          <div style="font-family: inherit; min-width: 210px;">
            <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 4px;">
              <span style="font-family: monospace; font-weight: bold; color: #137A70; font-size: 11px;">#${safeId}</span>
              <span style="
                background: ${priorityColor}18;
                color: ${priorityColor};
                padding: 1px 6px;
                border-radius: 9999px;
                font-weight: 700;
                font-size: 10px;
              ">${safePriority}</span>
            </div>
            <div style="font-size: 10px; color: #137A70; font-weight: 700; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 2px;">
              ${safeCategory}
            </div>
            <h4 style="font-weight: 700; color: #18232F; margin: 0 0 4px 0; font-size: 12px; line-height: 1.3;">
              ${safeTitle}
            </h4>
            <p style="color: #667384; font-size: 11px; margin: 0 0 6px 0;">
              📍 ${safeAddress}
            </p>
            <div style="display: flex; align-items: center; justify-content: space-between; padding-top: 5px; border-top: 1px solid #E2E7ED;">
              <span style="font-size: 10px; font-weight: 600; color: #18232F;">
                Status: ${safeStatus}
              </span>
              <button id="inspect-btn-${safeId}" style="
                background-color: #137A70;
                color: white;
                border: none;
                border-radius: 6px;
                padding: 3px 8px;
                font-size: 10px;
                font-weight: 600;
                cursor: pointer;
              ">View Details →</button>
            </div>
          </div>
        `;

        // Wire button event
        marker.bindPopup(popupContent, { maxWidth: 300 });
        marker.on('popupopen', () => {
          const btn = document.getElementById(`inspect-btn-${c.id}`);
          if (btn) {
            btn.onclick = () => {
              const target = getDetailUrl ? getDetailUrl(c) : `${detailRoutePrefix}/${c.id}`;
              navigate(target);
            };
          }
        });

        marker.on('click', () => {
          if (onSelectComplaint) {
            onSelectComplaint(c);
          }
        });

        markersGroup.addLayer(marker);
        bounds.push([lat, lng]);

        if (isSelected) {
          selectedMarker = marker;
        }
      }
    });

    // Fly to selected complaint when changed
    if (selectedComplaintId) {
      const selected = complaints.find((c) => c.id === selectedComplaintId);
      const lat = Number(selected?.location?.coordinates?.lat);
      const lng = Number(selected?.location?.coordinates?.lng);
      if (!isNaN(lat) && !isNaN(lng)) {
        map.flyTo([lat, lng], 14, { duration: 1.0 });
        if (selectedMarker) {
          setTimeout(() => {
            selectedMarker.openPopup();
          }, 350);
        }
      }
    } else if (bounds.length > 0) {
      try {
        map.fitBounds(bounds, { padding: [50, 50], maxZoom: 13 });
      } catch (e) {
        // ignore bound edge cases
      }
    }
  }, [complaints, selectedComplaintId]);

  // Handle external searched location pin
  useEffect(() => {
    if (!mapInstanceRef.current) return;
    const map = mapInstanceRef.current;

    if (searchMarkerRef.current) {
      searchMarkerRef.current.remove();
      searchMarkerRef.current = null;
    }

    if (searchedLocation?.lat && searchedLocation?.lng) {
      const { lat, lng, label } = searchedLocation;
      const searchIcon = L.divIcon({
        className: 'custom-search-marker',
        html: `
          <div style="
            background-color: #8B5CF6;
            width: 36px;
            height: 36px;
            border-radius: 50% 50% 50% 0;
            transform: rotate(-45deg);
            display: flex;
            align-items: center;
            justify-content: center;
            border: 2px solid white;
            box-shadow: 0 4px 14px rgba(139, 92, 246, 0.5);
          ">
            <span class="material-symbols-outlined" style="
              transform: rotate(45deg);
              color: white;
              font-size: 20px;
            ">search</span>
          </div>
        `,
        iconSize: [36, 36],
        iconAnchor: [18, 36]
      });

      const safeLabel = escapeHtml(label || `${lat.toFixed(4)}, ${lng.toFixed(4)}`);
      const marker = L.marker([lat, lng], { icon: searchIcon, zIndexOffset: 2000 })
        .addTo(map)
        .bindPopup(`<b>Searched Location:</b><br/>${safeLabel}`)
        .openPopup();

      searchMarkerRef.current = marker;
      map.flyTo([lat, lng], 15, { duration: 1.2 });
    }
  }, [searchedLocation]);

  return (
    <div
      style={{ height: height || '100%', minHeight: '480px' }}
      className="relative w-full h-full min-h-[480px] flex-1 rounded-2xl overflow-hidden border border-[#E2E7ED] shadow-sm bg-slate-100 flex flex-col"
    >
      <div
        ref={mapContainerRef}
        style={{ height: '100%', width: '100%', minHeight: '480px' }}
        className="w-full h-full min-h-[480px] z-0 flex-1"
      />

      {tileError && (
        <div className="absolute top-3 right-3 bg-amber-600/90 text-white px-3 py-1.5 rounded-lg text-xs font-semibold z-10 shadow">
          Demonstration Tile Server · High Traffic Mode
        </div>
      )}

      {/* Tamil Nadu Watermark */}
      <div className="absolute bottom-3 left-3 bg-white/95 backdrop-blur-xs px-3 py-1.5 rounded-xl text-xs text-[#18232F] border border-[#E2E7ED] z-10 shadow-sm flex items-center gap-2">
        <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
        <span className="font-semibold">Tamil Nadu Geographic Grid</span>
        <span className="text-[#667384] text-[11px] font-mono">({complaints.length} pinpoints)</span>
      </div>
    </div>
  );
};

export default TamilNaduOverviewMap;
