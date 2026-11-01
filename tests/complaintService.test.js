import { test, describe, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert/strict';

// Mock localStorage for Node test runner
const storage = new Map();
globalThis.localStorage = {
  getItem: (key) => storage.get(key) || null,
  setItem: (key, val) => storage.set(key, String(val)),
  removeItem: (key) => storage.delete(key),
  clear: () => storage.clear()
};

import {
  complaintService,
  normalizeCategory,
  getProgressPercent,
  mapBackendComplaintToFrontend,
  hasValidCoordinates,
  formatCoordinates
} from '../src/services/complaintService.js';
import { apiClient } from '../src/services/apiClient.js';

describe('ComplaintService Integration Tests (Sprint 3, Step 2)', () => {
  beforeEach(() => {
    storage.clear();
  });

  test('normalizeCategory maps backend categories to friendly UI metadata', () => {
    const roads = normalizeCategory('ROADS');
    assert.equal(roads.id, 'roads');
    assert.equal(roads.name, 'Roads & Potholes');

    const water = normalizeCategory('WATER_SUPPLY');
    assert.equal(water.id, 'water');
    assert.equal(water.name, 'Water & Sanitation Leakage');

    const lights = normalizeCategory('LIGHTING');
    assert.equal(lights.id, 'lighting');
    assert.equal(lights.name, 'Streetlights & Electrical');
  });

  test('getProgressPercent assigns accurate workflow progress milestones', () => {
    assert.equal(getProgressPercent('SUBMITTED'), 10);
    assert.equal(getProgressPercent('UNDER_REVIEW'), 25);
    assert.equal(getProgressPercent('ASSIGNED'), 40);
    assert.equal(getProgressPercent('IN_PROGRESS'), 65);
    assert.equal(getProgressPercent('RESOLUTION_SUBMITTED'), 90);
    assert.equal(getProgressPercent('PENDING_CITIZEN_CONFIRMATION'), 95);
    assert.equal(getProgressPercent('RESOLVED'), 100);
  });

  test('mapBackendComplaintToFrontend maps backend entity to complete frontend contract', () => {
    const backendEntity = {
      id: '3f67a9b1-8487-4cd3-a0bf-330a34dc09ac',
      referenceId: 'CF-2026-67971',
      title: 'Water logging near Roundtana Metro',
      description: 'Severe stagnation blocking pedestrian crossing.',
      category: 'WATER_SUPPLY',
      priority: 'HIGH',
      status: 'SUBMITTED',
      address: '2nd Avenue, Anna Nagar',
      ward: 'Ward 08',
      location: {
        address: '2nd Avenue, Anna Nagar',
        ward: 'Ward 08',
        coordinates: { lat: 13.0845, lng: 80.2155 }
      },
      citizen: {
        id: '00000000-0000-0000-0000-000000000001',
        name: 'Alex Morgan',
        email: 'alex.m@citizen.org',
        phone: '+91 98401 23456'
      },
      assignedOfficer: null,
      assignedWorker: null,
      createdAt: '2026-10-21T21:46:27.117075+05:30',
      updatedAt: '2026-10-21T21:46:27.117075+05:30'
    };

    const mapped = mapBackendComplaintToFrontend(backendEntity);

    assert.equal(mapped.id, 'CF-2026-67971');
    assert.equal(mapped.referenceId, 'CF-2026-67971');
    assert.equal(mapped.backendId, '3f67a9b1-8487-4cd3-a0bf-330a34dc09ac');
    assert.equal(mapped.title, 'Water logging near Roundtana Metro');
    assert.equal(mapped.status, 'SUBMITTED');
    assert.equal(mapped.priority, 'HIGH');
    assert.equal(mapped.categoryId, 'water');
    assert.equal(mapped.location.coordinates.lat, 13.0845);
    assert.equal(mapped.citizen.name, 'Alex Morgan');
    assert.equal(mapped.isLiveBackend, true);
    assert.equal(mapped.progressPercent, 10);
  });

  test('getByCitizen strictly throws 401/403 errors and never silently falls back to mock data', async () => {
    const originalList = apiClient.complaints.list;
    try {
      apiClient.complaints.list = async () => {
        const err = new Error('Unauthorized');
        err.status = 401;
        throw err;
      };

      await assert.rejects(
        async () => {
          await complaintService.getByCitizen('00000000-0000-0000-0000-000000000001', 'alex.m@citizen.org');
        },
        (err) => {
          assert.equal(err.status, 401);
          return true;
        },
        '401 Unauthorized from backend must not be bypassed by mock data'
      );
    } finally {
      apiClient.complaints.list = originalList;
    }
  });

  test('getByCitizen throws clear network error when backend is offline and never falls back to mock data', async () => {
    const originalList = apiClient.complaints.list;
    try {
      apiClient.complaints.list = async () => {
        const err = new Error('Cannot connect to CivicFix backend at http://localhost:8080/api/complaints. Ensure Spring Boot is running.');
        err.status = 0;
        throw err;
      };

      await assert.rejects(
        async () => {
          await complaintService.getByCitizen('00000000-0000-0000-0000-000000000001', 'alex.m@citizen.org');
        },
        (err) => {
          assert.match(err.message, /Cannot connect to CivicFix backend|Cannot reach the server/);
          return true;
        },
        'Network error must be thrown and not fall back to mock data'
      );
    } finally {
      apiClient.complaints.list = originalList;
    }
  });

  test('getAll throws clear network error when backend is offline and never falls back to mock data', async () => {
    const originalList = apiClient.complaints.list;
    try {
      apiClient.complaints.list = async () => {
        const err = new Error('Cannot connect to CivicFix backend at http://localhost:8080/api/complaints. Ensure Spring Boot is running.');
        err.status = 0;
        throw err;
      };

      await assert.rejects(
        async () => {
          await complaintService.getAll();
        },
        (err) => {
          assert.match(err.message, /Cannot connect to CivicFix backend|Cannot reach the server/);
          return true;
        },
        'Network error must be thrown and not fall back to mock data'
      );
    } finally {
      apiClient.complaints.list = originalList;
    }
  });

  test('getById throws clear network error when backend is offline and never falls back to mock data', async () => {
    const originalGetById = apiClient.complaints.getById;
    try {
      apiClient.complaints.getById = async () => {
        const err = new Error('Cannot connect to CivicFix backend at http://localhost:8080/api/complaints/1. Ensure Spring Boot is running.');
        err.status = 0;
        throw err;
      };

      await assert.rejects(
        async () => {
          await complaintService.getById('CF-2026-00124');
        },
        (err) => {
          assert.match(err.message, /Cannot connect to CivicFix backend|Cannot reach the server/);
          return true;
        },
        'Network error must be thrown and not fall back to mock data'
      );
    } finally {
      apiClient.complaints.getById = originalGetById;
    }
  });

  test('getById throws 404 when ticket is not found in database', async () => {
    const originalGetById = apiClient.complaints.getById;
    try {
      apiClient.complaints.getById = async () => {
        const err = new Error('Complaint not found');
        err.status = 404;
        throw err;
      };

      await assert.rejects(
        async () => {
          await complaintService.getById('CF-2026-NONEXISTENT');
        },
        (err) => {
          assert.equal(err.status, 404);
          return true;
        },
        '404 Not Found must be propagated directly'
      );
    } finally {
      apiClient.complaints.getById = originalGetById;
    }
  });

  test('getById merges status history into progressNotes', async () => {
    const originalGetById = apiClient.complaints.getById;
    const originalGetHistory = apiClient.complaints.getHistory;
    try {
      apiClient.complaints.getById = async () => ({
        success: true,
        data: {
          id: 'test-uuid-1',
          referenceId: 'CF-2026-12345',
          title: 'Streetlight out on 2nd Avenue',
          category: 'LIGHTING',
          status: 'UNDER_REVIEW',
          priority: 'MEDIUM'
        }
      });

      apiClient.complaints.getHistory = async () => ({
        success: true,
        data: [
          {
            id: 'hist-1',
            previousStatus: null,
            newStatus: 'SUBMITTED',
            changedByName: 'Alex Morgan',
            notes: 'Citizen intake report.',
            timestamp: '2026-10-21T10:00:00Z'
          },
          {
            id: 'hist-2',
            previousStatus: 'SUBMITTED',
            newStatus: 'UNDER_REVIEW',
            changedByName: 'Elena Vance',
            notes: 'Triage assessment complete.',
            timestamp: '2026-10-21T10:30:00Z'
          }
        ]
      });

      const result = await complaintService.getById('CF-2026-12345');
      assert.equal(result.id, 'CF-2026-12345');
      assert.equal(result.status, 'UNDER_REVIEW');
      assert.equal(result.progressNotes.length, 2);
      assert.equal(result.progressNotes[0].author, 'Alex Morgan');
      assert.equal(result.progressNotes[1].author, 'Elena Vance');
      assert.equal(result.progressNotes[1].status, 'UNDER_REVIEW');
    } finally {
      apiClient.complaints.getById = originalGetById;
      apiClient.complaints.getHistory = originalGetHistory;
    }
  });

  test('create packages files into FormData and preserves backend photos array', async () => {
    const originalCreate = apiClient.complaints.create;
    let capturedBody = null;
    try {
      apiClient.complaints.create = async (body) => {
        capturedBody = body;
        return {
          success: true,
          data: {
            id: 'uuid-complaint-photo-test',
            referenceId: 'CF-2026-99112',
            title: 'Deep crater on School Lane',
            category: 'ROADS',
            status: 'SUBMITTED',
            priority: 'HIGH',
            photos: ['/api/complaints/evidence/files/evidence-uuid-1.jpg']
          }
        };
      };

      // Mock a Blob / File in Node test environment
      const fakeFile = new Blob(['photo-bytes'], { type: 'image/jpeg' });
      fakeFile.name = 'pothole.jpg';

      const result = await complaintService.create({
        title: 'Deep crater on School Lane',
        description: 'Road crater causing issues.',
        category: 'Roads & Potholes',
        categoryId: 'roads',
        files: [fakeFile]
      });

      assert.ok(capturedBody instanceof FormData, 'requestBody must be an instance of FormData when files are provided');
      assert.equal(result.photos.length, 1);
      assert.equal(result.photos[0], '/api/complaints/evidence/files/evidence-uuid-1.jpg');
    } finally {
      apiClient.complaints.create = originalCreate;
    }
  });

  test('create throws clear error when backend is stopped and saves nothing to storage', async () => {
    await assert.rejects(
      async () => {
        await complaintService.create({
          title: 'Damaged storm drain',
          description: 'Broken drain grating on 4th Main Road.',
          category: 'Water & Sanitation Leakage',
          categoryId: 'water'
        });
      },
      (err) => {
        assert.ok(err instanceof Error);
        assert.match(err.message, /Cannot reach the server\. Nothing was saved\./);
        return true;
      },
      'create must reject with clear message when backend is unreachable'
    );

    // Verify localStorage has no new complaint saved
    assert.equal(localStorage.getItem('civicfix_complaints_v2'), null, 'Nothing must be stored in localStorage');
  });

  test('updateStatus throws clear error when backend is unreachable and saves nothing', async () => {
    await assert.rejects(
      async () => {
        await complaintService.updateStatus('CF-2026-11111', 'IN_PROGRESS', { notes: 'Started work' });
      },
      (err) => {
        assert.ok(err instanceof Error);
        assert.match(err.message, /Cannot reach the server\. Nothing was saved\./);
        return true;
      }
    );
  });

  test('assignWorker throws clear error when backend is unreachable and saves nothing', async () => {
    await assert.rejects(
      async () => {
        await complaintService.assignWorker('CF-2026-11111', { id: '00000000-0000-0000-0000-000000000003', name: 'Marcus Chen' });
      },
      (err) => {
        assert.ok(err instanceof Error);
        assert.match(err.message, /Cannot reach the server\. Nothing was saved\./);
        return true;
      }
    );
  });
});

describe('Dynamic Complaint Location Details (Phase 2 Step 2.3)', () => {
  test('hasValidCoordinates accurately validates coordinate formats and bounds', () => {
    assert.equal(hasValidCoordinates({ lat: 13.0850, lng: 80.2101 }), true);
    assert.equal(hasValidCoordinates({ latitude: 13.0850, longitude: 80.2101 }), true);
    assert.equal(hasValidCoordinates({ lat: '13.0850', lng: '80.2101' }), true);
    assert.equal(hasValidCoordinates({ lat: 0, lng: 0 }), true, 'Zero coordinates must be valid');
    assert.equal(hasValidCoordinates({ lat: -33.8688, lng: 151.2093 }), true);
    assert.equal(hasValidCoordinates({ lat: 40.7128, lng: -74.0060 }), true);

    // Missing or invalid
    assert.equal(hasValidCoordinates(null), false);
    assert.equal(hasValidCoordinates(undefined), false);
    assert.equal(hasValidCoordinates({}), false);
    assert.equal(hasValidCoordinates({ lat: null, lng: null }), false);
    assert.equal(hasValidCoordinates({ lat: '', lng: '' }), false);
    assert.equal(hasValidCoordinates({ lat: 'abc', lng: 80 }), false);
    assert.equal(hasValidCoordinates({ lat: 95, lng: 80 }), false, 'Latitude > 90 must be invalid');
    assert.equal(hasValidCoordinates({ lat: 13, lng: 185 }), false, 'Longitude > 180 must be invalid');
  });

  test('formatCoordinates returns standard geographic representation', () => {
    assert.equal(formatCoordinates({ lat: 13.0850, lng: 80.2101 }), '13.0850° N, 80.2101° E');
    assert.equal(formatCoordinates({ lat: -33.8688, lng: 151.2093 }), '33.8688° S, 151.2093° E');
    assert.equal(formatCoordinates({ lat: 40.7128, lng: -74.0060 }), '40.7128° N, 74.0060° W');
    assert.equal(formatCoordinates({ lat: 0, lng: 0 }), '0.0000° N, 0.0000° E');
    assert.equal(formatCoordinates(null), null);
    assert.equal(formatCoordinates({ lat: null, lng: null }), null);
  });

  test('1. Complaint with valid coordinates maps dynamically without fallback tampering', () => {
    const complaintEntity = {
      id: 'uuid-valid-coords',
      referenceId: 'CF-2026-00101',
      title: 'Damaged speed breaker',
      latitude: 12.9716,
      longitude: 77.5946,
      address: 'MG Road, Bengaluru',
      ward: 'Ward 112'
    };

    const mapped = mapBackendComplaintToFrontend(complaintEntity);

    assert.ok(mapped.location.coordinates);
    assert.equal(mapped.location.coordinates.lat, 12.9716);
    assert.equal(mapped.location.coordinates.lng, 77.5946);
    assert.equal(formatCoordinates(mapped.location.coordinates), '12.9716° N, 77.5946° E');
    assert.equal(mapped.location.address, 'MG Road, Bengaluru');
    assert.equal(mapped.location.ward, 'Ward 112');
  });

  test('2. Complaint with missing coordinates leaves coordinates null instead of fabricating defaults', () => {
    const complaintNoCoords = {
      id: 'uuid-no-coords',
      referenceId: 'CF-2026-00102',
      title: 'Streetlight flicker',
      latitude: null,
      longitude: null,
      address: null,
      ward: null
    };

    const mapped = mapBackendComplaintToFrontend(complaintNoCoords);

    assert.equal(mapped.location.coordinates, null, 'Coordinates must be null when backend latitude/longitude are null');
    assert.equal(hasValidCoordinates(mapped.location.coordinates), false);
    assert.equal(formatCoordinates(mapped.location.coordinates), null);
    assert.equal(mapped.location.address, null);
    assert.equal(mapped.location.ward, null);
  });

  test('3. Complaint with valid zero-valued coordinates preserves lat:0 and lng:0', () => {
    const complaintZeroCoords = {
      id: 'uuid-zero-coords',
      referenceId: 'CF-2026-00103',
      title: 'Equatorial buoy marker',
      latitude: 0.0,
      longitude: 0.0,
      address: 'Prime Meridian Intersection',
      ward: 'Maritime Sector 0'
    };

    const mapped = mapBackendComplaintToFrontend(complaintZeroCoords);

    assert.ok(mapped.location.coordinates, 'Zero-valued coordinates must not be treated as null or missing');
    assert.equal(mapped.location.coordinates.lat, 0);
    assert.equal(mapped.location.coordinates.lng, 0);
    assert.equal(hasValidCoordinates(mapped.location.coordinates), true);
    assert.equal(formatCoordinates(mapped.location.coordinates), '0.0000° N, 0.0000° E');
  });

  test('4. Different complaints display their own distinct dynamic locations', () => {
    const c1 = mapBackendComplaintToFrontend({
      id: 'c-1',
      referenceId: 'CF-2026-00001',
      latitude: 13.0827,
      longitude: 80.2707,
      address: 'Poonamallee High Road, Chennai',
      ward: 'Ward 08'
    });

    const c2 = mapBackendComplaintToFrontend({
      id: 'c-2',
      referenceId: 'CF-2026-00002',
      latitude: 11.0168,
      longitude: 76.9558,
      address: 'Avinashi Road, Coimbatore',
      ward: 'Ward 24'
    });

    assert.notEqual(c1.location.address, c2.location.address);
    assert.notEqual(c1.location.coordinates.lat, c2.location.coordinates.lat);
    assert.notEqual(c1.location.coordinates.lng, c2.location.coordinates.lng);
    assert.equal(formatCoordinates(c1.location.coordinates), '13.0827° N, 80.2707° E');
    assert.equal(formatCoordinates(c2.location.coordinates), '11.0168° N, 76.9558° E');
  });

  test('5. Resolution evidence telemetry coordinates map dynamically and accurately', () => {
    const complaintWithEvidenceCoords = {
      id: 'c-evidence-1',
      referenceId: 'CF-2026-00005',
      latitude: 13.0850,
      longitude: 80.2101,
      evidence: [
        {
          id: 'ev-1',
          photoUrl: '/api/complaints/evidence/files/ev-1.jpg',
          evidenceNotes: 'Patching complete',
          latitude: 13.0854,
          longitude: 80.2108,
          createdAt: '2026-10-22T10:00:00Z',
          workerName: 'Marcus Chen'
        }
      ]
    };

    const mapped = mapBackendComplaintToFrontend(complaintWithEvidenceCoords);
    assert.ok(mapped.resolutionEvidence);
    assert.ok(mapped.resolutionEvidence.coordinates);
    assert.equal(mapped.resolutionEvidence.coordinates.lat, 13.0854);
    assert.equal(mapped.resolutionEvidence.coordinates.lng, 80.2108);
    assert.equal(formatCoordinates(mapped.resolutionEvidence.coordinates), '13.0854° N, 80.2108° E');

    const complaintWithoutEvidenceCoords = {
      id: 'c-evidence-2',
      referenceId: 'CF-2026-00006',
      latitude: null,
      longitude: null,
      evidence: [
        {
          id: 'ev-2',
          photoUrl: '/api/complaints/evidence/files/ev-2.jpg',
          evidenceNotes: 'Visual proof',
          latitude: null,
          longitude: null,
          createdAt: '2026-10-22T10:00:00Z',
          workerName: 'Marcus Chen'
        }
      ]
    };

    const mappedNoCoords = mapBackendComplaintToFrontend(complaintWithoutEvidenceCoords);
    assert.ok(mappedNoCoords.resolutionEvidence);
    assert.equal(mappedNoCoords.resolutionEvidence.coordinates, null);
    assert.equal(hasValidCoordinates(mappedNoCoords.resolutionEvidence.coordinates), false);
  });
});

describe('Phase 4 AI Triage & Duplicate Management (ComplaintService)', () => {
  beforeEach(() => {
    storage.clear();
  });

  test('mapBackendComplaintToFrontend maps aiTriage and duplicateOf accurately without fake fallback defaults', () => {
    const complaintWithAi = {
      id: 'ai-c-1',
      referenceId: 'CF-2026-99001',
      title: 'Pothole on 2nd Avenue',
      category: 'ROADS',
      priority: 'HIGH',
      status: 'SUBMITTED',
      version: 2,
      aiTriage: {
        detectedCategory: 'ROADS',
        recommendedPriority: 'CRITICAL',
        confidence: 85.5,
        hazardScore: 'P1 - High Traffic Risk (Bus Route)',
        explanation: 'Lexical analysis detected high-severity road crater keywords.',
        adjudicationStatus: 'PENDING',
        triagedAt: '2026-10-23T10:00:00Z'
      },
      duplicateOf: {
        id: 'master-uuid-1',
        referenceId: 'CF-2026-00010',
        title: 'Master Pothole Report'
      }
    };

    const mapped = mapBackendComplaintToFrontend(complaintWithAi);
    assert.ok(mapped.aiTriage);
    assert.equal(mapped.aiTriage.detectedCategory, 'ROADS');
    assert.equal(mapped.aiTriage.recommendedPriority, 'CRITICAL');
    assert.equal(mapped.aiTriage.confidence, 85.5);
    assert.equal(mapped.aiTriage.hazardScore, 'P1 - High Traffic Risk (Bus Route)');
    assert.equal(mapped.aiTriage.adjudicationStatus, 'PENDING');
    assert.equal(mapped.version, 2);

    assert.ok(mapped.duplicateOf);
    assert.equal(mapped.duplicateOf.referenceId, 'CF-2026-00010');
    assert.equal(mapped.duplicateOf.title, 'Master Pothole Report');

    // Complaint with NO AI triage should have aiTriage null, NEVER fake 96.5% fallback
    const complaintWithoutAi = {
      id: 'ai-c-2',
      referenceId: 'CF-2026-99002',
      title: 'General Maintenance Request',
      category: 'GENERAL',
      priority: 'LOW',
      status: 'SUBMITTED',
      aiTriage: null,
      duplicateOf: null
    };

    const mappedNoAi = mapBackendComplaintToFrontend(complaintWithoutAi);
    assert.equal(mappedNoAi.aiTriage, null);
    assert.equal(mappedNoAi.duplicateOf, null);
  });

  test('complaintService.create returns aiTriage null when backend has not triaged and contains no hardcoded numeric AI literals', async () => {
    const originalCreate = apiClient.complaints.create;
    try {
      apiClient.complaints.create = async () => ({
        data: {
          id: 'mock-uuid-untriaged',
          referenceId: 'CF-2026-12345',
          title: 'Streetlight Broken',
          description: 'Dark alleyway',
          category: 'LIGHTING',
          priority: 'MEDIUM',
          status: 'SUBMITTED',
          aiTriage: null
        }
      });

      const created = await complaintService.create({
        title: 'Streetlight Broken',
        description: 'Dark alleyway',
        category: 'LIGHTING',
        priority: 'MEDIUM'
      });

      assert.equal(created.aiTriage, null, 'aiTriage must be null when backend has not triaged');
      assert.equal(created.slaHoursRemaining, undefined, 'slaHoursRemaining must not exist on complaint');
      assert.equal(typeof created.confidence, 'undefined');
    } finally {
      apiClient.complaints.create = originalCreate;
    }
  });

  test('complaintService.create maps real backend aiTriage fields without slaHoursRemaining', async () => {
    const originalCreate = apiClient.complaints.create;
    try {
      apiClient.complaints.create = async () => ({
        data: {
          id: 'mock-uuid-triaged',
          referenceId: 'CF-2026-54321',
          title: 'Exposed Live Wire',
          description: 'High risk hazard',
          category: 'LIGHTING',
          priority: 'CRITICAL',
          status: 'SUBMITTED',
          aiTriage: {
            detectedCategory: 'LIGHTING',
            recommendedPriority: 'CRITICAL',
            confidence: 88.0,
            hazardScore: 'P1 - Extreme Danger',
            explanation: 'Detected electrical hazard keyword.',
            adjudicationStatus: 'PENDING',
            triagedAt: '2026-10-31T12:00:00Z'
          }
        }
      });

      const created = await complaintService.create({
        title: 'Exposed Live Wire',
        description: 'High risk hazard',
        category: 'LIGHTING',
        priority: 'CRITICAL'
      });

      assert.ok(created.aiTriage);
      assert.equal(created.aiTriage.detectedCategory, 'LIGHTING');
      assert.equal(created.aiTriage.recommendedPriority, 'CRITICAL');
      assert.equal(created.aiTriage.confidence, 88.0);
      assert.equal(created.aiTriage.hazardScore, 'P1 - Extreme Danger');
      assert.equal(created.aiTriage.explanation, 'Detected electrical hazard keyword.');
      assert.equal(created.aiTriage.adjudicationStatus, 'PENDING');
      assert.equal(created.aiTriage.slaHoursRemaining, undefined, 'slaHoursRemaining must not be on aiTriage');
      assert.equal(created.slaHoursRemaining, undefined);
    } finally {
      apiClient.complaints.create = originalCreate;
    }
  });

  test('complaint without triage data renders pending and not a number', () => {
    const untriagedComplaint = {
      id: 'c-untriaged-99',
      referenceId: 'CF-2026-99999',
      aiTriage: null
    };

    // Simulating UI rendering rule for AI triage
    const getTriageStatusDisplay = (c) => {
      if (!c.aiTriage) return 'AI triage pending';
      return c.aiTriage.confidence != null ? `${c.aiTriage.confidence}%` : 'Not available';
    };

    const display = getTriageStatusDisplay(untriagedComplaint);
    assert.equal(display, 'AI triage pending');
    assert.equal(/\d+/.test(display), false, 'Pending triage display must not contain any numbers');

    // Complaint with aiTriage but null confidence also renders "Not available", never a made-up number
    const triagedWithoutScore = {
      id: 'c-triaged-no-score',
      aiTriage: {
        detectedCategory: 'ROADS',
        confidence: null
      }
    };
    const scoreDisplay = getTriageStatusDisplay(triagedWithoutScore);
    assert.equal(scoreDisplay, 'Not available');
    assert.equal(/\d+/.test(scoreDisplay), false, 'Null confidence must not render a number');
  });

  test('adjudicateAiTriage calls apiClient.complaints.adjudicateAiTriage and maps result', async () => {
    const originalAdjudicate = apiClient.complaints.adjudicateAiTriage;
    try {
      let passedId = null;
      let passedPayload = null;
      apiClient.complaints.adjudicateAiTriage = async (id, payload) => {
        passedId = id;
        passedPayload = payload;
        return {
          data: {
            id: 'c-adj-1',
            referenceId: 'CF-2026-00100',
            title: 'Water Leak',
            category: 'WATER_SEWERAGE',
            priority: 'HIGH',
            status: 'UNDER_REVIEW',
            version: 3,
            aiTriage: {
              detectedCategory: 'WATER_SEWERAGE',
              recommendedPriority: 'HIGH',
              confidence: 90.0,
              adjudicationStatus: 'ACCEPTED'
            }
          }
        };
      };

      const result = await complaintService.adjudicateAiTriage('c-adj-1', { action: 'ACCEPT', version: 2 });
      assert.equal(passedId, 'c-adj-1');
      assert.equal(passedPayload.action, 'ACCEPT');
      assert.equal(passedPayload.version, 2);
      assert.equal(result.aiTriage.adjudicationStatus, 'ACCEPTED');
      assert.equal(result.version, 3);
    } finally {
      apiClient.complaints.adjudicateAiTriage = originalAdjudicate;
    }
  });

  test('getDuplicateCandidates calls apiClient.complaints.getDuplicates and returns candidates array', async () => {
    const originalGetDuplicates = apiClient.complaints.getDuplicates;
    try {
      let passedId = null;
      apiClient.complaints.getDuplicates = async (id) => {
        passedId = id;
        return {
          data: [
            {
              id: 'dup-1',
              referenceId: 'CF-2026-00050',
              title: 'Nearby water leakage',
              distanceMeters: 45.2,
              similarityScore: 0.88
            }
          ]
        };
      };

      const candidates = await complaintService.getDuplicateCandidates('c-dup-test');
      assert.equal(passedId, 'c-dup-test');
      assert.equal(candidates.length, 1);
      assert.equal(candidates[0].referenceId, 'CF-2026-00050');
      assert.equal(candidates[0].distanceMeters, 45.2);
    } finally {
      apiClient.complaints.getDuplicates = originalGetDuplicates;
    }
  });

  test('linkDuplicateComplaint calls apiClient.complaints.linkDuplicate and returns mapped entity', async () => {
    const originalLink = apiClient.complaints.linkDuplicate;
    try {
      let captured = null;
      apiClient.complaints.linkDuplicate = async (id, payload) => {
        captured = { id, payload };
        return {
          data: {
            id: 'c-child-1',
            referenceId: 'CF-2026-00099',
            title: 'Duplicate Streetlight report',
            status: 'DUPLICATE',
            version: 4,
            duplicateOf: {
              id: 'c-parent-1',
              referenceId: 'CF-2026-00001',
              title: 'Master Streetlight defect'
            }
          }
        };
      };

      const result = await complaintService.linkDuplicateComplaint('c-child-1', {
        parentComplaintId: 'c-parent-1',
        reason: 'Duplicate confirmed',
        version: 3
      });

      assert.equal(captured.id, 'c-child-1');
      assert.equal(captured.payload.parentComplaintId, 'c-parent-1');
      assert.equal(result.status, 'DUPLICATE');
      assert.equal(result.duplicateOf.referenceId, 'CF-2026-00001');
      assert.equal(result.version, 4);
    } finally {
      apiClient.complaints.linkDuplicate = originalLink;
    }
  });

  test('adjudicateAiTriage propagates HTTP 409 Conflict without swallowing or retrying', async () => {
    const originalAdjudicate = apiClient.complaints.adjudicateAiTriage;
    try {
      apiClient.complaints.adjudicateAiTriage = async () => {
        const err = new Error('Complaint was modified concurrently by another user');
        err.status = 409;
        throw err;
      };

      await assert.rejects(
        async () => {
          await complaintService.adjudicateAiTriage('c-conflict', { action: 'ACCEPT', version: 1 });
        },
        (err) => {
          assert.equal(err.status, 409);
          assert.match(err.message, /modified concurrently/);
          return true;
        }
      );
    } finally {
      apiClient.complaints.adjudicateAiTriage = originalAdjudicate;
    }
  });

  test('linkDuplicateComplaint propagates HTTP 409 Conflict without swallowing or retrying', async () => {
    const originalLink = apiClient.complaints.linkDuplicate;
    try {
      apiClient.complaints.linkDuplicate = async () => {
        const err = new Error('Optimistic lock failure: Record changed');
        err.status = 409;
        throw err;
      };

      await assert.rejects(
        async () => {
          await complaintService.linkDuplicateComplaint('c-conflict-2', { parentComplaintId: 'p-1', version: 1 });
        },
        (err) => {
          assert.equal(err.status, 409);
          assert.match(err.message, /Optimistic lock failure/);
          return true;
        }
      );
    } finally {
      apiClient.complaints.linkDuplicate = originalLink;
    }
  });
});

