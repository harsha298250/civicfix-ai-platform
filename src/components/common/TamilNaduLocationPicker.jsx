import React, { useEffect, useRef, useState } from 'react';
import L from 'leaflet';
import { geolocationService } from '../../services/geolocationService';

// Leaflet custom pin generator
const createPinIcon = (color = '#137A70', icon = 'location_on') => {
  return L.divIcon({
    className: 'custom-marker',
    html: `
      <div style="
        background-color: ${color};
        width: 34px;
        height: 34px;
        border-radius: 50% 50% 50% 0;
        transform: rotate(-45deg);
        display: flex;
        align-items: center;
        justify-content: center;
        border: 2px solid white;
        box-shadow: 0 4px 10px rgba(0,0,0,0.3);
      ">
        <span class="material-symbols-outlined" style="
          transform: rotate(45deg);
          color: white;
          font-size: 18px;
          line-height: 1;
        ">${icon}</span>
      </div>
    `,
    iconSize: [34, 34],
    iconAnchor: [17, 34],
    popupAnchor: [0, -34]
  });
};

export const TamilNaduLocationPicker = ({
  coordinates = { lat: 13.0827, lng: 80.2707 },
  onLocationSelect,
  accuracyMeters = null,
  height = '320px'
}) => {
  const mapContainerRef = useRef(null);
  const mapInstanceRef = useRef(null);
  const markerRef = useRef(null);
  const circleRef = useRef(null);

  const [tileError, setTileError] = useState(false);
  const [searchPlace, setSearchPlace] = useState('');
  const [searching, setSearching] = useState(false);

  // Tamil Nadu Key Districts for Quick Pan
  const TN_DISTRICTS = [
    { name: 'Chennai', lat: 13.0827, lng: 80.2707, zoom: 13 },
    { name: 'Coimbatore', lat: 11.0168, lng: 76.9558, zoom: 13 },
    { name: 'Madurai', lat: 9.9252, lng: 78.1198, zoom: 13 },
    { name: 'Trichy', lat: 10.7905, lng: 78.7047, zoom: 13 },
    { name: 'Salem', lat: 11.6643, lng: 78.1460, zoom: 13 }
  ];

  useEffect(() => {
    if (!mapContainerRef.current) return;

    if (!mapInstanceRef.current) {
      // Initialize map centered around provided coordinates or Tamil Nadu default
      const initialLat = coordinates?.lat || 13.0827;
      const initialLng = coordinates?.lng || 80.2707;

      const map = L.map(mapContainerRef.current, {
        center: [initialLat, initialLng],
        zoom: 13,
        zoomControl: true,
        attributionControl: true
      });

      // Legitimate OpenStreetMap tile layer
      const tileLayer = L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
        maxZoom: 19
      });

      tileLayer.on('tileerror', () => {
        setTileError(true);
      });

      tileLayer.addTo(map);

      // Add draggable pin
      const marker = L.marker([initialLat, initialLng], {
        icon: createPinIcon('#137A70', 'place'),
        draggable: true
      }).addTo(map);

      marker.on('dragend', (event) => {
        const position = event.target.getLatLng();
        if (onLocationSelect) {
          onLocationSelect({
            lat: Number(position.lat.toFixed(6)),
            lng: Number(position.lng.toFixed(6)),
            source: 'Map Pin Drag'
          });
        }
      });

      // Clicking map moves pin
      map.on('click', (e) => {
        const { lat, lng } = e.latlng;
        marker.setLatLng([lat, lng]);
        if (circleRef.current) {
          circleRef.current.setLatLng([lat, lng]);
        }
        if (onLocationSelect) {
          onLocationSelect({
            lat: Number(lat.toFixed(6)),
            lng: Number(lng.toFixed(6)),
            source: 'Map Click Selection'
          });
        }
      });

      markerRef.current = marker;
      mapInstanceRef.current = map;
    }

    const map = mapInstanceRef.current;

    // Handle invalidation for reliable rendering
    const timer1 = setTimeout(() => {
      if (map) map.invalidateSize();
    }, 150);

    const timer2 = setTimeout(() => {
      if (map) map.invalidateSize();
    }, 450);

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

  // Sync external coordinate updates
  useEffect(() => {
    if (mapInstanceRef.current && markerRef.current && coordinates?.lat && coordinates?.lng) {
      const currentPos = markerRef.current.getLatLng();
      if (currentPos.lat !== coordinates.lat || currentPos.lng !== coordinates.lng) {
        markerRef.current.setLatLng([coordinates.lat, coordinates.lng]);
        mapInstanceRef.current.setView([coordinates.lat, coordinates.lng], mapInstanceRef.current.getZoom());
      }

      // Draw accuracy circle if browser supplied accuracy
      if (accuracyMeters && accuracyMeters > 0) {
        if (circleRef.current) {
          circleRef.current.setLatLng([coordinates.lat, coordinates.lng]);
          circleRef.current.setRadius(accuracyMeters);
        } else {
          circleRef.current = L.circle([coordinates.lat, coordinates.lng], {
            radius: accuracyMeters,
            color: '#137A70',
            fillColor: '#137A70',
            fillOpacity: 0.15,
            weight: 1
          }).addTo(mapInstanceRef.current);
        }
      } else if (circleRef.current) {
        circleRef.current.remove();
        circleRef.current = null;
      }
    }
  }, [coordinates, accuracyMeters]);

  const handleSearchPlace = async (e) => {
    if (e) e.preventDefault();
    if (!searchPlace.trim()) return;

    setSearching(true);
    try {
      const loc = await geolocationService.searchLocation(searchPlace);
      if (loc && loc.lat && loc.lng) {
        if (mapInstanceRef.current && markerRef.current) {
          mapInstanceRef.current.setView([loc.lat, loc.lng], 15);
          markerRef.current.setLatLng([loc.lat, loc.lng]);
          if (circleRef.current) {
            circleRef.current.setLatLng([loc.lat, loc.lng]);
          }
        }
        if (onLocationSelect) {
          onLocationSelect({
            lat: Number(loc.lat.toFixed(6)),
            lng: Number(loc.lng.toFixed(6)),
            source: `Searched: ${searchPlace}`,
            address: loc.streetAddress || loc.displayName
          });
        }
      }
    } catch (err) {
      console.warn('Place search failed', err);
    } finally {
      setSearching(false);
    }
  };

  const handlePanToDistrict = (district) => {
    if (mapInstanceRef.current && markerRef.current) {
      mapInstanceRef.current.setView([district.lat, district.lng], district.zoom);
      markerRef.current.setLatLng([district.lat, district.lng]);
      if (circleRef.current) {
        circleRef.current.setLatLng([district.lat, district.lng]);
      }
      if (onLocationSelect) {
        onLocationSelect({
          lat: district.lat,
          lng: district.lng,
          source: `Quick District Pan (${district.name})`,
          address: `${district.name}, Tamil Nadu`
        });
      }
    }
  };

  return (
    <div className="space-y-2">
      {/* Search Place on Map & Quick District Select */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs">
        <form onSubmit={handleSearchPlace} className="relative flex-1 flex items-center">
          <span className="material-symbols-outlined absolute left-2.5 text-tertiary text-[16px]">
            {searching ? 'sync' : 'search'}
          </span>
          <input
            type="text"
            placeholder="Search Tamil Nadu area, street, landmark..."
            value={searchPlace}
            onChange={(e) => setSearchPlace(e.target.value)}
            className="w-full pl-8 pr-16 py-1.5 bg-surface-container-low rounded-xl text-xs text-on-surface border border-outline-variant/30 focus:border-primary-container focus:outline-none"
          />
          <button
            type="submit"
            disabled={searching}
            className="absolute right-1 px-2.5 py-0.5 rounded-lg bg-primary-container hover:bg-primary text-white font-semibold text-[11px] transition-colors"
          >
            {searching ? '...' : 'Find'}
          </button>
        </form>

        <div className="flex items-center gap-1 shrink-0 overflow-x-auto pb-0.5">
          <span className="text-[10px] text-tertiary font-bold uppercase mr-0.5">Districts:</span>
          {TN_DISTRICTS.map((d, i) => (
            <button
              key={i}
              type="button"
              onClick={() => handlePanToDistrict(d)}
              className="px-2 py-0.5 rounded text-[11px] bg-surface-container-low hover:bg-surface-container text-on-surface font-medium border border-outline-variant/30 transition-colors whitespace-nowrap"
            >
              {d.name}
            </button>
          ))}
        </div>
      </div>

      {/* Map Container */}
      <div className="relative rounded-2xl overflow-hidden border border-outline-variant/40 shadow-inner bg-slate-100">
        <div ref={mapContainerRef} style={{ height }} className="w-full z-0" />

        {tileError && (
          <div className="absolute top-2 right-2 bg-amber-500/90 text-white px-3 py-1 rounded-lg text-xs font-medium z-10 shadow">
            Tile server load high, retrying...
          </div>
        )}

        <div className="absolute bottom-2 left-2 bg-white/90 backdrop-blur-xs px-2.5 py-1 rounded-lg text-[11px] text-[#18232F] font-mono border border-slate-200 z-10 shadow-sm flex items-center gap-2">
          <span>Lat: {coordinates?.lat?.toFixed(5)}°</span>
          <span>Lng: {coordinates?.lng?.toFixed(5)}°</span>
          {accuracyMeters && <span className="text-emerald-700 font-sans font-semibold">±{accuracyMeters}m</span>}
        </div>
      </div>
    </div>
  );
};

export default TamilNaduLocationPicker;
