import React, { useEffect, useRef, useState } from 'react';
import L from 'leaflet';
import { hasValidCoordinates, formatCoordinates } from '../../services/complaintService';

const getPriorityColor = (priority) => {
  switch (priority) {
    case 'CRITICAL': return '#C63F48';
    case 'HIGH': return '#D97706';
    case 'MEDIUM': return '#2563EB';
    case 'LOW':
    default: return '#137A70';
  }
};

const createMiniPinIcon = (priority = 'MEDIUM') => {
  const color = getPriorityColor(priority);
  return L.divIcon({
    className: 'custom-mini-marker',
    html: `
      <div style="
        background-color: ${color};
        width: 28px;
        height: 28px;
        border-radius: 50% 50% 50% 0;
        transform: rotate(-45deg);
        display: flex;
        align-items: center;
        justify-content: center;
        border: 2px solid white;
        box-shadow: 0 3px 8px rgba(0,0,0,0.3);
      ">
        <span class="material-symbols-outlined" style="
          transform: rotate(45deg);
          color: white;
          font-size: 14px;
          line-height: 1;
        ">location_on</span>
      </div>
    `,
    iconSize: [28, 28],
    iconAnchor: [14, 28],
    popupAnchor: [0, -28]
  });
};

export const LocationMiniMap = ({
  coordinates,
  address,
  ward,
  priority = 'MEDIUM',
  height = '180px',
  zoom = 14
}) => {
  const mapContainerRef = useRef(null);
  const mapInstanceRef = useRef(null);
  const [tileError, setTileError] = useState(false);

  const isValid = hasValidCoordinates(coordinates);
  const lat = isValid ? (coordinates.lat !== undefined ? Number(coordinates.lat) : Number(coordinates.latitude)) : null;
  const lng = isValid ? (coordinates.lng !== undefined ? Number(coordinates.lng) : Number(coordinates.longitude)) : null;

  useEffect(() => {
    if (!isValid || !mapContainerRef.current) return;

    if (!mapInstanceRef.current) {
      const map = L.map(mapContainerRef.current, {
        center: [lat, lng],
        zoom,
        zoomControl: false,
        attributionControl: false,
        dragging: false,
        touchZoom: false,
        scrollWheelZoom: false,
        doubleClickZoom: false,
        boxZoom: false
      });

      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        maxZoom: 19
      }).on('tileerror', () => {
        setTileError(true);
      }).addTo(map);

      L.marker([lat, lng], {
        icon: createMiniPinIcon(priority)
      }).addTo(map);

      mapInstanceRef.current = map;
    } else {
      mapInstanceRef.current.setView([lat, lng], zoom);
    }

    const timer = setTimeout(() => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.invalidateSize();
      }
    }, 200);

    return () => {
      clearTimeout(timer);
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }
    };
  }, [isValid, lat, lng, priority, zoom]);

  if (!isValid) {
    return (
      <div
        style={{ height }}
        className="w-full rounded-xl bg-surface-container-low border border-outline-variant/30 flex flex-col items-center justify-center p-4 text-center space-y-1.5"
      >
        <span className="material-symbols-outlined text-tertiary text-[24px]">location_off</span>
        <span className="text-xs font-semibold text-on-surface">Location Unavailable</span>
        <p className="text-[11px] text-tertiary max-w-xs leading-tight">
          {address ? `Street: ${address}` : 'No geographic coordinates or street location recorded.'}
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-1">
      <div
        style={{ height }}
        className="relative w-full rounded-xl overflow-hidden border border-outline-variant/30 shadow-inner bg-slate-100"
      >
        <div ref={mapContainerRef} style={{ height: '100%', width: '100%' }} />

        {tileError && (
          <div className="absolute top-1 right-1 bg-amber-500/90 text-white px-2 py-0.5 rounded text-[10px] z-10">
            Tile offline
          </div>
        )}

        <div className="absolute bottom-1.5 left-1.5 bg-white/90 backdrop-blur-xs px-2 py-0.5 rounded text-[10px] text-[#18232F] font-mono border border-slate-200 z-10 shadow-xs">
          {formatCoordinates({ lat, lng })}
        </div>
      </div>
    </div>
  );
};

export default LocationMiniMap;
