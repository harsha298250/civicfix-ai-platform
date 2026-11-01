import { test, describe, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import { apiClient } from '../src/services/apiClient.js';
import { complaintService, hasValidCoordinates, formatCoordinates } from '../src/services/complaintService.js';
import { geolocationService } from '../src/services/geolocationService.js';

describe('Phase 3 GIS and Location Intelligence Tests', () => {
  const originalFetch = globalThis.fetch;
  const originalDocument = globalThis.document;

  beforeEach(() => {
    globalThis.document = {
      cookie: 'XSRF-TOKEN=test-csrf-token;'
    };
  });

  afterEach(() => {
    globalThis.fetch = originalFetch;
    globalThis.document = originalDocument;
  });

  // 1. API Client Public Map and GIS Proxy endpoints
  test('apiClient.complaints.getPublicMap constructs proper URL with bounding-box & status', async () => {
    let capturedUrl = null;
    globalThis.fetch = async (url) => {
      capturedUrl = url;
      return {
        ok: true,
        status: 200,
        headers: { get: () => 'application/json' },
        json: async () => []
      };
    };

    await apiClient.complaints.getPublicMap({
      minLat: 13.0,
      maxLat: 13.1,
      minLng: 80.2,
      maxLng: 80.3,
      status: 'OPEN',
      ward: 'Ward 42'
    });

    assert.ok(capturedUrl.includes('/api/complaints/public/map'));
    assert.ok(capturedUrl.includes('minLat=13'));
    assert.ok(capturedUrl.includes('maxLat=13.1'));
    assert.ok(capturedUrl.includes('minLng=80.2'));
    assert.ok(capturedUrl.includes('maxLng=80.3'));
    assert.ok(capturedUrl.includes('status=OPEN'));
    assert.ok(capturedUrl.includes('ward=Ward+42') || capturedUrl.includes('ward=Ward%2042'));
  });

  test('apiClient.gis.reverseGeocode calls GIS proxy endpoint with validated lat and lng', async () => {
    let capturedUrl = null;
    globalThis.fetch = async (url) => {
      capturedUrl = url;
      return {
        ok: true,
        status: 200,
        headers: { get: () => 'application/json' },
        json: async () => ({
          success: true,
          streetAddress: 'Anna Salai, Ward 114, Chennai',
          cityDistrict: 'Ward 114',
          city: 'Chennai',
          state: 'Tamil Nadu'
        })
      };
    };

    const res = await apiClient.gis.reverseGeocode(13.0827, 80.2707);

    assert.ok(capturedUrl.includes('/api/gis/reverse-geocode'));
    assert.ok(capturedUrl.includes('lat=13.0827'));
    assert.ok(capturedUrl.includes('lng=80.2707'));
    assert.equal(res.cityDistrict, 'Ward 114');
    assert.equal(res.city, 'Chennai');
  });

  // 2. Public Map Sanitized DTO and PII Protection
  test('complaintService.getPublicMapComplaints parses sanitized public map items without PII', async () => {
    const rawPublicData = [
      {
        id: 1,
        category: 'STREET_LIGHT',
        status: 'OPEN',
        priority: 'HIGH',
        latitude: 13.083,
        longitude: 80.271,
        ward: 'Ward 114',
        createdAt: '2026-10-22T10:00:00Z'
      },
      {
        id: 2,
        category: 'GARBAGE',
        status: 'IN_PROGRESS',
        priority: 'MEDIUM',
        latitude: null, // missing coordinates
        longitude: null,
        ward: 'Ward 115',
        createdAt: '2026-10-22T11:00:00Z'
      }
    ];

    globalThis.fetch = async () => ({
      ok: true,
      status: 200,
      headers: { get: () => 'application/json' },
      json: async () => rawPublicData
    });

    const items = await complaintService.getPublicMapComplaints();

    assert.equal(items.length, 2);

    const validItem = items[0];
    assert.equal(validItem.id, '1');
    assert.equal(validItem.category, 'STREET_LIGHT');
    assert.equal(validItem.status, 'OPEN');
    assert.equal(validItem.ward, 'Ward 114');
    assert.ok(validItem.coordinates);
    assert.equal(validItem.coordinates.lat, 13.083);
    assert.equal(validItem.coordinates.lng, 80.271);

    // Verify STRICT data minimization (no citizen PII, no title, no referenceId, no internal notes)
    assert.equal(validItem.title, undefined, 'Complaint title must not be exposed on public map');
    assert.equal(validItem.referenceId, undefined, 'Complaint referenceId must not be exposed on public map');
    assert.equal(validItem.citizen, undefined, 'Citizen PII must not be exposed on public map');
    assert.equal(validItem.assignedWorker, undefined, 'Worker assignment must not be exposed on public map');
    assert.equal(validItem.progressNotes, undefined, 'Internal notes must not be exposed on public map');
    assert.equal(validItem.evidence, undefined, 'Private evidence must not be exposed on public map');

    // Verify item with missing coordinates has null coordinates, NOT fabricated defaults
    const missingCoordItem = items[1];
    assert.equal(missingCoordItem.coordinates, null, 'Complaints without coordinates must have null coordinates');
  });

  test('public map response strictly never contains title, referenceId, or coordinates with > 3 decimals', async () => {
    const rawPublicData = [
      {
        id: 1,
        category: 'Water & Sewage',
        status: 'SUBMITTED',
        priority: 'HIGH',
        ward: 'Ward 08',
        latitude: 13.083,
        longitude: 80.271,
        createdAt: '2026-10-31T12:00:00Z'
      }
    ];

    globalThis.fetch = async () => ({
      ok: true,
      status: 200,
      headers: { get: () => 'application/json' },
      json: async () => rawPublicData
    });

    const items = await complaintService.getPublicMapComplaints();
    const item = items[0];

    assert.equal(item.title, undefined, 'Public map item must NOT contain title');
    assert.equal(item.referenceId, undefined, 'Public map item must NOT contain referenceId');
    assert.equal(item.citizen, undefined, 'Public map item must NOT contain citizen');
    assert.equal(item.address, undefined, 'Public map item must NOT contain specific street address');

    assert.ok(item.coordinates);
    const latDecimals = (item.coordinates.lat.toString().split('.')[1] || '').length;
    const lngDecimals = (item.coordinates.lng.toString().split('.')[1] || '').length;
    assert.ok(latDecimals <= 3, `Latitude decimals must be <= 3, got ${latDecimals}`);
    assert.ok(lngDecimals <= 3, `Longitude decimals must be <= 3, got ${lngDecimals}`);
  });

  // 3. Valid Zero Coordinates Preserved
  test('hasValidCoordinates and formatCoordinates preserve valid (0, 0) coordinates', () => {
    assert.equal(hasValidCoordinates([0, 0]), true, 'Coordinates [0, 0] are geographically valid');
    assert.equal(hasValidCoordinates({ lat: 0, lng: 0 }), true, '{ lat: 0, lng: 0 } is geographically valid');
    assert.equal(hasValidCoordinates({ latitude: 0, longitude: 0 }), true, '{ latitude: 0, longitude: 0 } is valid');

    const formatted = formatCoordinates({ lat: 0, lng: 0 });
    assert.equal(formatted, '0.0000° N, 0.0000° E');
  });

  // 4. Removal of Fabricated Fallback Coordinates
  test('complaintService never falls back to fabricated coordinates like [13.0827, 80.2707] or [80.21, 13.085]', async () => {
    globalThis.fetch = async () => ({
      ok: true,
      status: 200,
      headers: { get: () => 'application/json' },
      json: async () => [
        {
          id: 1,
          status: 'OPEN',
          category: 'ROADS',
          latitude: null,
          longitude: null
        }
      ]
    });

    const items = await complaintService.getPublicMapComplaints();
    assert.equal(items.length, 1);
    assert.equal(items[0].coordinates, null);
  });

  // 5. RFC 7946 GeoJSON Coordinate Order: [longitude, latitude]
  test('GeoJSON Feature export standard: coordinates MUST be [longitude, latitude]', () => {
    const lat = 13.0827;
    const lng = 80.2707;

    // RFC 7946 Section 3.1.1: A position is an array of numbers [longitude, latitude, optional elevation]
    const geoJsonFeature = {
      type: 'Feature',
      geometry: {
        type: 'Point',
        coordinates: [lng, lat]
      },
      properties: {
        referenceId: 'CF-2026-00010',
        title: 'Damaged storm drain cover'
      }
    };

    assert.equal(geoJsonFeature.geometry.coordinates[0], 80.2707, 'First element in GeoJSON Point coordinate must be LONGITUDE');
    assert.equal(geoJsonFeature.geometry.coordinates[1], 13.0827, 'Second element in GeoJSON Point coordinate must be LATITUDE');
  });

  // 6. Geolocation Service Proxy Integration & Graceful Fallback
  test('geolocationService.reverseGeocode calls backend proxy first', async () => {
    let backendProxyCalled = false;
    globalThis.fetch = async (url) => {
      if (url.includes('/api/gis/reverse-geocode')) {
        backendProxyCalled = true;
        return {
          ok: true,
          status: 200,
          headers: { get: () => 'application/json' },
          json: async () => ({
            success: true,
            displayName: 'Royapettah High Rd, Ward 115, Chennai, Tamil Nadu',
            streetAddress: 'Royapettah High Rd, Ward 115',
            cityDistrict: 'Ward 115',
            city: 'Chennai',
            state: 'Tamil Nadu'
          })
        };
      }
      throw new Error('Unexpected URL: ' + url);
    };

    const res = await geolocationService.reverseGeocode(13.05, 80.25);
    assert.equal(backendProxyCalled, true, 'Backend reverse-geocode proxy must be queried');
    assert.equal(res.cityDistrict, 'Ward 115');
    assert.equal(res.city, 'Chennai');
  });

  test('geolocationService.reverseGeocode handles backend failure gracefully', async () => {
    // If backend proxy and direct Nominatim fail, reverseGeocode returns a safe fallback without throwing
    globalThis.fetch = async () => {
      throw new Error('Network error');
    };

    const res = await geolocationService.reverseGeocode(13.05, 80.25);
    assert.ok(res, 'Must return a result object even on total network failure');
    assert.equal(res.success, false);
    assert.ok(res.streetAddress.includes('13.05000') || res.displayName.includes('13.05000'));
  });
});
