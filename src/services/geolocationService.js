import { apiClient } from './apiClient.js';

export const geolocationService = {
  /**
   * Request device coordinates using the W3C Geolocation API.
   * Resolves with { lat, lng, accuracyMeters, timestamp }
   */
  getCurrentPosition: () => {
    return new Promise((resolve, reject) => {
      if (!navigator.geolocation) {
        reject({
          code: 'UNSUPPORTED',
          message: 'Geolocation is not supported by your browser.'
        });
        return;
      }

      navigator.geolocation.getCurrentPosition(
        (position) => {
          resolve({
            lat: position.coords.latitude,
            lng: position.coords.longitude,
            accuracyMeters: Math.round(position.coords.accuracy),
            timestamp: position.timestamp
          });
        },
        (error) => {
          let reason = 'Unable to retrieve location.';
          if (error.code === error.PERMISSION_DENIED) {
            reason = 'Location permission was denied. You can enter the street address manually.';
          } else if (error.code === error.POSITION_UNAVAILABLE) {
            reason = 'Device position is unavailable. Please check your GPS/Wi-Fi or enter manually.';
          } else if (error.code === error.TIMEOUT) {
            reason = 'Location detection timed out. Please retry or enter manually.';
          }

          reject({
            code: error.code,
            message: reason,
            nativeError: error
          });
        },
        {
          enableHighAccuracy: true,
          timeout: 10000,
          maximumAge: 30000
        }
      );
    });
  },

  /**
   * Reverse geocode coordinates into a human-readable address.
   * Prioritizes backend cached proxy with OSM Nominatim User-Agent compliance.
   * Falls back to direct browser fetch and coordinate string formatting.
   */
  reverseGeocode: async (lat, lng) => {
    // 1. Try backend reverse-geocode proxy first
    try {
      const backendRes = await apiClient.gis.reverseGeocode(lat, lng);
      const data = backendRes?.data || backendRes;
      if (data && data.success) {
        return {
          success: true,
          displayName: data.displayName,
          streetAddress: data.streetAddress,
          cityDistrict: data.cityDistrict,
          city: data.city,
          state: data.state,
          postcode: data.postcode,
          raw: data
        };
      }
    } catch (backendErr) {
      // Backend proxy unavailable or failed, fall through to browser direct fetch
      console.warn('[CivicFix Geocoding] Backend proxy unavailable, using direct fallback:', backendErr.message);
    }

    // 2. Direct browser fetch fallback
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 5000);

    try {
      const response = await fetch(
        `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${lat}&lon=${lng}&zoom=18&addressdetails=1`,
        {
          signal: controller.signal,
          headers: {
            'Accept': 'application/json'
          }
        }
      );
      clearTimeout(timeoutId);

      if (!response.ok) {
        throw new Error(`Reverse geocoding HTTP error ${response.status}`);
      }

      const data = await response.json();
      const addr = data.address || {};

      // Build structured parts
      const road = addr.road || addr.pedestrian || addr.suburb || addr.neighbourhood || '';
      const ward = addr.city_district || addr.suburb || addr.ward || '';
      const city = addr.city || addr.town || addr.village || addr.county || 'Tamil Nadu';
      const state = addr.state || 'Tamil Nadu';
      const postcode = addr.postcode ? ` - ${addr.postcode}` : '';

      const fullStreet = [road, ward, city].filter(Boolean).join(', ') || data.display_name || `${lat.toFixed(5)}, ${lng.toFixed(5)}`;

      return {
        success: true,
        displayName: data.display_name || fullStreet,
        streetAddress: fullStreet,
        cityDistrict: ward || city,
        city: city,
        state: state,
        postcode: addr.postcode || '',
        raw: data
      };
    } catch (err) {
      clearTimeout(timeoutId);
      console.warn('Reverse geocoding fallback triggered:', err.message);
      return {
        success: false,
        displayName: `${lat.toFixed(5)}° N, ${lng.toFixed(5)}° E`,
        streetAddress: `Coordinates: ${lat.toFixed(5)}, ${lng.toFixed(5)}`,
        cityDistrict: 'Tamil Nadu',
        city: 'Tamil Nadu',
        state: 'Tamil Nadu',
        postcode: '',
        error: err.message
      };
    }
  },

  /**
   * Forward geocode place query or address into coordinates.
   * Supports coordinate string parsing ('lat, lng') and Nominatim query search.
   */
  searchLocation: async (query) => {
    if (!query || !query.trim()) return null;

    // Check if query is formatted coordinates like "13.0827, 80.2707"
    const coordMatch = query.trim().match(/^(-?\d+(\.\d+)?)\s*,\s*(-?\d+(\.\d+)?)$/);
    if (coordMatch) {
      const lat = parseFloat(coordMatch[1]);
      const lng = parseFloat(coordMatch[3]);
      return {
        lat,
        lng,
        displayName: `${lat.toFixed(5)}, ${lng.toFixed(5)}`,
        streetAddress: `${lat.toFixed(5)}, ${lng.toFixed(5)}`,
        cityDistrict: 'Tamil Nadu'
      };
    }

    // High-speed localized Tamil Nadu dictionary for guaranteed immediate pin resolution
    const TN_LOCALITY_CACHE = [
      { match: /chettipadu|chettiped|nemam/i, lat: 13.02653, lng: 80.01711, name: 'Chettipadu - Nemam Road, Chennai Metropolitan Area', ward: 'Chennai Metropolitan Area' },
      { match: /anna\s*salai|spencer/i, lat: 13.0604, lng: 80.2642, name: 'Anna Salai, Near Spencer Plaza, Chennai', ward: 'Zone 09, Teynampet' },
      { match: /anna\s*nagar/i, lat: 13.0850, lng: 80.2101, name: 'Anna Nagar, Chennai', ward: 'Zone 08, Anna Nagar' },
      { match: /t\.?\s*nagar|thyagaraya/i, lat: 13.0418, lng: 80.2341, name: 'T. Nagar, Chennai', ward: 'Zone 10, Kodambakkam' },
      { match: /velachery/i, lat: 12.9815, lng: 80.2180, name: 'Velachery, Chennai', ward: 'Zone 13, Velachery' },
      { match: /adyar/i, lat: 13.0012, lng: 80.2565, name: 'Adyar, Chennai', ward: 'Zone 13, Adyar' },
      { match: /guindy/i, lat: 13.0067, lng: 80.2025, name: 'Guindy, Chennai', ward: 'Zone 09, Alandur' },
      { match: /tambaram/i, lat: 12.9249, lng: 80.1000, name: 'Tambaram, Chennai', ward: 'Tambaram Corporation' },
      { match: /mylapore/i, lat: 13.0368, lng: 80.2676, name: 'Mylapore, Chennai', ward: 'Zone 09, Mylapore' },
      { match: /coimbatore|gandhipuram/i, lat: 11.0168, lng: 76.9558, name: 'Gandhipuram, Coimbatore', ward: 'Coimbatore Central' },
      { match: /madurai|goripalayam/i, lat: 9.9252, lng: 78.1198, name: 'Goripalayam, Madurai', ward: 'Madurai North' },
      { match: /trichy|tiruchirappalli/i, lat: 10.7905, lng: 78.7047, name: 'Thillai Nagar, Trichy', ward: 'Trichy West' },
      { match: /salem/i, lat: 11.6643, lng: 78.1460, name: 'Four Roads, Salem', ward: 'Salem Central' },
      { match: /tirunelveli/i, lat: 8.7139, lng: 77.7567, name: 'Palayamkottai, Tirunelveli', ward: 'Tirunelveli' },
      { match: /erode/i, lat: 11.3410, lng: 77.7172, name: 'Brough Road, Erode', ward: 'Erode City' },
      { match: /vellore/i, lat: 12.9165, lng: 79.1325, name: 'Fort Round Road, Vellore', ward: 'Vellore Central' }
    ];

    const cached = TN_LOCALITY_CACHE.find(c => c.match.test(query));
    if (cached) {
      return {
        lat: cached.lat,
        lng: cached.lng,
        displayName: cached.name,
        streetAddress: cached.name,
        cityDistrict: cached.ward
      };
    }

    // Nominatim Forward Geocoding
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 6000);

    try {
      const encoded = encodeURIComponent(`${query.trim()}, Tamil Nadu, India`);
      const response = await fetch(
        `https://nominatim.openstreetmap.org/search?format=jsonv2&q=${encoded}&limit=3&countrycodes=in`,
        {
          signal: controller.signal,
          headers: { 'Accept': 'application/json' }
        }
      );
      clearTimeout(timeoutId);

      if (response.ok) {
        const results = await response.json();
        if (results && results.length > 0) {
          const first = results[0];
          return {
            lat: parseFloat(first.lat),
            lng: parseFloat(first.lon),
            displayName: first.display_name,
            streetAddress: first.display_name.split(',').slice(0, 3).join(', '),
            cityDistrict: 'Tamil Nadu'
          };
        }
      }
    } catch (err) {
      clearTimeout(timeoutId);
      console.warn('Forward geocoding fallback:', err.message);
    }
    return null;
  }
};

export default geolocationService;
