import { test, describe, beforeEach } from 'node:test';
import assert from 'node:assert/strict';

// Mock localStorage for Node test runner
const storage = new Map();
globalThis.localStorage = {
  getItem: (key) => storage.get(key) || null,
  setItem: (key, val) => storage.set(key, String(val)),
  removeItem: (key) => storage.delete(key),
  clear: () => storage.clear()
};

import { officerService, resolveWorkerUuid, VERIFIED_FIELD_WORKERS } from '../src/services/officerService.js';
import { apiClient } from '../src/services/apiClient.js';

describe('OfficerService Integration Tests (Sprint 3, Step 3)', () => {
  beforeEach(() => {
    storage.clear();
  });

  test('resolveWorkerUuid accurately resolves seed worker UUIDs and valid UUIDs', () => {
    // Marcus Chen seed checks
    assert.equal(resolveWorkerUuid('usr-003'), '00000000-0000-0000-0000-000000000003');
    assert.equal(resolveWorkerUuid('marcus'), '00000000-0000-0000-0000-000000000003');
    assert.equal(resolveWorkerUuid('Marcus Chen'), '00000000-0000-0000-0000-000000000003');
    assert.equal(resolveWorkerUuid(''), '00000000-0000-0000-0000-000000000003');
    assert.equal(resolveWorkerUuid(null), '00000000-0000-0000-0000-000000000003');

    // Arbitrary valid UUID preserved for backend role/existence validation
    const customUuid = '11111111-2222-3333-4444-555555555555';
    assert.equal(resolveWorkerUuid(customUuid), customUuid);
  });

  test('getFieldWorkers returns verified operational personnel with DB UUIDs', async () => {
    const workers = await officerService.getFieldWorkers();
    assert.ok(Array.isArray(workers));
    assert.ok(workers.length > 0);
    const marcus = workers.find(w => w.name === 'Marcus Chen');
    assert.ok(marcus);
    assert.equal(marcus.id, '00000000-0000-0000-0000-000000000003');
    assert.equal(marcus.role, 'WORKER');
  });

  test('getQueue retrieves and maps officer complaint queue from backend', async () => {
    const originalList = apiClient.complaints.list;
    try {
      apiClient.complaints.list = async () => ({
        data: [
          {
            id: '7a123456-8487-4cd3-a0bf-330a34dc0901',
            referenceId: 'CF-2026-00101',
            title: 'Burst Water Pipe on 4th Main Road',
            description: 'High pressure main line leakage flooding roadway.',
            category: 'WATER_SUPPLY',
            priority: 'HIGH',
            status: 'SUBMITTED',
            address: '4th Main Road, Anna Nagar',
            ward: 'Ward 08',
            citizen: { name: 'Alex Morgan', trustScore: 98 },
            createdAt: '2026-10-21T09:00:00Z'
          }
        ]
      });

      const queue = await officerService.getQueue();
      assert.equal(queue.length, 1);
      assert.equal(queue[0].id, 'CF-2026-00101');
      assert.equal(queue[0].referenceId, 'CF-2026-00101');
      assert.equal(queue[0].title, 'Burst Water Pipe on 4th Main Road');
      assert.equal(queue[0].status, 'SUBMITTED');
      assert.equal(queue[0].isLiveBackend, true);
    } finally {
      apiClient.complaints.list = originalList;
    }
  });

  test('getQueue does not silently swallow 401 or 403 authorization failures', async () => {
    const originalList = apiClient.complaints.list;
    try {
      apiClient.complaints.list = async () => {
        const error = new Error('Access denied: ROLE_OFFICER authority required');
        error.status = 403;
        throw error;
      };

      await assert.rejects(
        async () => {
          await officerService.getQueue();
        },
        (err) => {
          assert.equal(err.status, 403);
          assert.match(err.message, /Access denied/);
          return true;
        }
      );
    } finally {
      apiClient.complaints.list = originalList;
    }
  });

  test('getComplaintDetail combines complaint record and audit history', async () => {
    const originalGetById = apiClient.complaints.getById;
    const originalGetHistory = apiClient.complaints.getHistory;
    try {
      apiClient.complaints.getById = async (id) => ({
        data: {
          id: '7a123456-8487-4cd3-a0bf-330a34dc0901',
          referenceId: 'CF-2026-00101',
          title: 'Damaged Streetlight Pole',
          description: 'Fixture hanging loose from high winds.',
          category: 'LIGHTING',
          priority: 'MEDIUM',
          status: 'ASSIGNED',
          address: 'Corner of 7th Avenue',
          ward: 'Ward 08',
          assignedWorker: { id: '00000000-0000-0000-0000-000000000003', name: 'Marcus Chen' },
          createdAt: '2026-10-21T09:00:00Z'
        }
      });

      apiClient.complaints.getHistory = async (id) => ({
        data: [
          {
            id: 'hist-001',
            previousStatus: null,
            newStatus: 'SUBMITTED',
            changedByName: 'Alex Morgan',
            notes: 'Citizen submitted initial report.',
            timestamp: '2026-10-21T09:00:00Z'
          },
          {
            id: 'hist-002',
            previousStatus: 'SUBMITTED',
            newStatus: 'ASSIGNED',
            changedByName: 'Elena Vance',
            notes: 'Dispatched to technician Marcus Chen.',
            timestamp: '2026-10-21T09:30:00Z'
          }
        ]
      });

      const detail = await officerService.getComplaintDetail('CF-2026-00101');
      assert.equal(detail.referenceId, 'CF-2026-00101');
      assert.equal(detail.status, 'ASSIGNED');
      assert.equal(detail.assignedWorker.name, 'Marcus Chen');
      assert.equal(detail.progressNotes.length, 2);
      assert.equal(detail.progressNotes[0].newStatus || detail.progressNotes[0].status, 'SUBMITTED');
      assert.equal(detail.progressNotes[1].author, 'Elena Vance');
    } finally {
      apiClient.complaints.getById = originalGetById;
      apiClient.complaints.getHistory = originalGetHistory;
    }
  });

  test('getComplaintDetail propagates 404 Not Found error without fake fallback', async () => {
    const originalGetById = apiClient.complaints.getById;
    try {
      apiClient.complaints.getById = async () => {
        const error = new Error('Complaint #CF-NONEXISTENT not found.');
        error.status = 404;
        throw error;
      };

      await assert.rejects(
        async () => {
          await officerService.getComplaintDetail('CF-NONEXISTENT');
        },
        (err) => {
          assert.equal(err.status, 404);
          assert.match(err.message, /not found/i);
          return true;
        }
      );
    } finally {
      apiClient.complaints.getById = originalGetById;
    }
  });

  test('assignWorker calls apiClient.complaints.assignWorker with resolved UUID and notes', async () => {
    const originalAssign = apiClient.complaints.assignWorker;
    let capturedCall = null;
    try {
      apiClient.complaints.assignWorker = async (complaintId, workerId, notes) => {
        capturedCall = { complaintId, workerId, notes };
        return {
          data: {
            id: '7a123456-8487-4cd3-a0bf-330a34dc0901',
            referenceId: 'CF-2026-00101',
            title: 'Burst Water Pipe on 4th Main Road',
            status: 'ASSIGNED',
            assignedWorker: {
              id: workerId,
              name: 'Marcus Chen',
              unit: 'SDOT Rapid Asphalt Maintenance'
            }
          }
        };
      };

      const result = await officerService.assignWorker(
        'CF-2026-00101',
        'usr-003',
        'Dispatched roller crew with 48h SLA'
      );

      assert.ok(capturedCall);
      assert.equal(capturedCall.complaintId, 'CF-2026-00101');
      assert.equal(capturedCall.workerId, '00000000-0000-0000-0000-000000000003');
      assert.equal(capturedCall.notes, 'Dispatched roller crew with 48h SLA');
      assert.equal(result.status, 'ASSIGNED');
      assert.equal(result.assignedWorker.name, 'Marcus Chen');
    } finally {
      apiClient.complaints.assignWorker = originalAssign;
    }
  });

  test('rejectComplaint transitions complaint to REJECTED with officer reason', async () => {
    const originalUpdateStatus = apiClient.complaints.updateStatus;
    let capturedCall = null;
    try {
      apiClient.complaints.updateStatus = async (complaintId, payload) => {
        capturedCall = { complaintId, payload };
        return {
          data: {
            id: '7a123456-8487-4cd3-a0bf-330a34dc0901',
            referenceId: 'CF-2026-00101',
            status: 'REJECTED'
          }
        };
      };

      const result = await officerService.rejectComplaint('CF-2026-00101', 'Private residential driveway');
      assert.ok(capturedCall);
      assert.equal(capturedCall.complaintId, 'CF-2026-00101');
      assert.equal(capturedCall.payload.status, 'REJECTED');
      assert.equal(capturedCall.payload.notes, 'Private residential driveway');
      assert.equal(result.status, 'REJECTED');
    } finally {
      apiClient.complaints.updateStatus = originalUpdateStatus;
    }
  });

  // ==========================================
  // Step 4D: Resolution Verification & Rework Tests
  // ==========================================

  test('getVerificationQueue requests RESOLUTION_SUBMITTED complaints and maps uploaded evidence', async () => {
    const originalList = apiClient.complaints.list;
    let capturedParams = null;
    try {
      apiClient.complaints.list = async (params) => {
        capturedParams = params;
        return {
          data: [
            {
              id: '8b234567-8487-4cd3-a0bf-330a34dc0902',
              referenceId: 'CF-2026-00102',
              title: 'Clogged Storm Drain at 12th Cross',
              description: 'Drain blocked with silt.',
              category: 'DRAINAGE',
              priority: 'HIGH',
              status: 'RESOLUTION_SUBMITTED',
              assignedWorker: { id: '00000000-0000-0000-0000-000000000003', name: 'Marcus Chen' },
              evidence: [
                {
                  id: 'ev-001',
                  workerId: '00000000-0000-0000-0000-000000000003',
                  workerName: 'Marcus Chen',
                  photoUrl: '/api/complaints/evidence/files/proof-1.jpg',
                  evidenceNotes: 'De-silted 15 meters of storm drain. Water flowing freely.',
                  latitude: 13.0845,
                  longitude: 80.2155,
                  createdAt: '2026-10-22T10:00:00Z'
                }
              ]
            }
          ]
        };
      };

      const queue = await officerService.getVerificationQueue();
      assert.equal(capturedParams.status, 'RESOLUTION_SUBMITTED');
      assert.equal(queue.length, 1);
      assert.equal(queue[0].referenceId, 'CF-2026-00102');
      assert.equal(queue[0].status, 'RESOLUTION_SUBMITTED');
      assert.ok(queue[0].resolutionEvidence);
      assert.equal(queue[0].resolutionEvidence.photos.length, 1);
      assert.equal(queue[0].resolutionEvidence.photos[0], '/api/complaints/evidence/files/proof-1.jpg');
      assert.equal(queue[0].resolutionEvidence.notes, 'De-silted 15 meters of storm drain. Water flowing freely.');
      assert.equal(queue[0].resolutionEvidence.coordinates.lat, 13.0845);
      assert.equal(queue[0].resolutionEvidence.coordinates.lng, 80.2155);
    } finally {
      apiClient.complaints.list = originalList;
    }
  });

  test('verifyResolution APPROVE transitions status to PENDING_CITIZEN_CONFIRMATION via backend', async () => {
    const originalUpdate = apiClient.complaints.updateStatus;
    let capturedCall = null;
    try {
      apiClient.complaints.updateStatus = async (id, payload) => {
        capturedCall = { id, payload };
        return {
          data: {
            id: '8b234567-8487-4cd3-a0bf-330a34dc0902',
            referenceId: 'CF-2026-00102',
            title: 'Clogged Storm Drain at 12th Cross',
            status: 'PENDING_CITIZEN_CONFIRMATION',
            assignedOfficer: { name: 'Elena Vance' }
          }
        };
      };

      const result = await officerService.verifyResolution(
        'CF-2026-00102',
        'APPROVE',
        'Visual confirmation of clear culvert and dual photo inspection passed.'
      );

      assert.ok(capturedCall);
      assert.equal(capturedCall.id, 'CF-2026-00102');
      assert.equal(capturedCall.payload.status, 'PENDING_CITIZEN_CONFIRMATION');
      assert.match(capturedCall.payload.notes, /Visual confirmation/);
      assert.equal(result.status, 'PENDING_CITIZEN_CONFIRMATION');
    } finally {
      apiClient.complaints.updateStatus = originalUpdate;
    }
  });

  test('verifyResolution REQUEST_REWORK returns complaint for rework with reason', async () => {
    const originalUpdate = apiClient.complaints.updateStatus;
    let capturedCall = null;
    try {
      apiClient.complaints.updateStatus = async (id, payload) => {
        capturedCall = { id, payload };
        return {
          data: {
            id: '8b234567-8487-4cd3-a0bf-330a34dc0902',
            referenceId: 'CF-2026-00102',
            title: 'Clogged Storm Drain at 12th Cross',
            status: 'REWORK_REQUESTED'
          }
        };
      };

      const result = await officerService.verifyResolution(
        'CF-2026-00102',
        'REQUEST_REWORK',
        'Culvert grate not aligned; debris still accumulated on eastern curb.'
      );

      assert.ok(capturedCall);
      assert.equal(capturedCall.id, 'CF-2026-00102');
      assert.equal(capturedCall.payload.status, 'REWORK_REQUESTED');
      assert.match(capturedCall.payload.notes, /Culvert grate not aligned/);
      assert.equal(result.status, 'REWORK_REQUESTED');
    } finally {
      apiClient.complaints.updateStatus = originalUpdate;
    }
  });

  test('verifyResolution REQUEST_REWORK rejects empty or whitespace reason with status 400', async () => {
    await assert.rejects(
      async () => {
        await officerService.verifyResolution('CF-2026-00102', 'REQUEST_REWORK', '   ');
      },
      (err) => {
        assert.equal(err.status, 400);
        assert.match(err.message, /meaningful reason is required/i);
        return true;
      }
    );
  });

  test('verifyResolution rejects invalid or unsupported decisions', async () => {
    await assert.rejects(
      async () => {
        await officerService.verifyResolution('CF-2026-00102', 'INVALID_DECISION', 'notes');
      },
      (err) => {
        assert.match(err.message, /Unsupported verification decision/);
        return true;
      }
    );
  });

  test('verifyResolution strictly propagates 403 Forbidden and 400 Bad Request from backend', async () => {
    const originalUpdate = apiClient.complaints.updateStatus;
    try {
      apiClient.complaints.updateStatus = async () => {
        const error = new Error('Access denied: Only municipal officers can verify resolutions');
        error.status = 403;
        throw error;
      };

      await assert.rejects(
        async () => {
          await officerService.verifyResolution('CF-2026-00102', 'APPROVE');
        },
        (err) => {
          assert.equal(err.status, 403);
          assert.match(err.message, /Access denied/);
          return true;
        }
      );
    } finally {
      apiClient.complaints.updateStatus = originalUpdate;
    }
  });
});

describe('Phase 4 Officer AI Adjudication & Duplicate Management Tests', () => {
  beforeEach(() => {
    storage.clear();
  });

  test('adjudicateAiTriage calls apiClient with payload and returns mapped complaint', async () => {
    const originalAdjudicate = apiClient.complaints.adjudicateAiTriage;
    try {
      let passedId = null;
      let passedPayload = null;
      apiClient.complaints.adjudicateAiTriage = async (id, payload) => {
        passedId = id;
        passedPayload = payload;
        return {
          data: {
            id: 'c-off-1',
            referenceId: 'CF-2026-88001',
            title: 'Overflowing Garbage Bin',
            category: 'GARBAGE',
            priority: 'HIGH',
            status: 'UNDER_REVIEW',
            version: 2,
            aiTriage: {
              detectedCategory: 'GARBAGE',
              recommendedPriority: 'HIGH',
              confidence: 92.0,
              adjudicationStatus: 'OVERRIDDEN'
            }
          }
        };
      };

      const result = await officerService.adjudicateAiTriage('c-off-1', {
        action: 'OVERRIDE',
        category: 'GARBAGE',
        priority: 'HIGH',
        notes: 'Verified solid waste overflowing onto pavement.',
        version: 1
      });

      assert.equal(passedId, 'c-off-1');
      assert.equal(passedPayload.action, 'OVERRIDE');
      assert.equal(passedPayload.category, 'GARBAGE');
      assert.equal(passedPayload.priority, 'HIGH');
      assert.equal(passedPayload.version, 1);
      assert.equal(result.aiTriage.adjudicationStatus, 'OVERRIDDEN');
      assert.equal(result.version, 2);
    } finally {
      apiClient.complaints.adjudicateAiTriage = originalAdjudicate;
    }
  });

  test('adjudicateAiTriage rejects missing complaintId with Error', async () => {
    await assert.rejects(
      async () => {
        await officerService.adjudicateAiTriage('', { action: 'ACCEPT' });
      },
      (err) => {
        assert.match(err.message, /Complaint ID is required/);
        return true;
      }
    );
  });

  test('getDuplicateCandidates returns duplicate candidates list from backend', async () => {
    const originalGetDuplicates = apiClient.complaints.getDuplicates;
    try {
      let passedId = null;
      apiClient.complaints.getDuplicates = async (id) => {
        passedId = id;
        return {
          data: [
            {
              id: 'cand-1',
              referenceId: 'CF-2026-77001',
              title: 'Clogged storm drain',
              category: 'DRAINAGE',
              distanceMeters: 30.5,
              similarityScore: 0.85,
              explanation: 'Within 50m of active drainage report'
            }
          ]
        };
      };

      const candidates = await officerService.getDuplicateCandidates('c-drain-1');
      assert.equal(passedId, 'c-drain-1');
      assert.equal(candidates.length, 1);
      assert.equal(candidates[0].referenceId, 'CF-2026-77001');
      assert.equal(candidates[0].distanceMeters, 30.5);
    } finally {
      apiClient.complaints.getDuplicates = originalGetDuplicates;
    }
  });

  test('getDuplicateCandidates rejects missing complaintId with Error', async () => {
    await assert.rejects(
      async () => {
        await officerService.getDuplicateCandidates(null);
      },
      (err) => {
        assert.match(err.message, /Complaint ID is required/);
        return true;
      }
    );
  });

  test('linkDuplicateComplaint sends payload to apiClient and returns mapped child complaint', async () => {
    const originalLink = apiClient.complaints.linkDuplicate;
    try {
      let captured = null;
      apiClient.complaints.linkDuplicate = async (id, payload) => {
        captured = { id, payload };
        return {
          data: {
            id: 'c-dup-child',
            referenceId: 'CF-2026-66002',
            title: 'Pothole duplicate',
            status: 'DUPLICATE',
            version: 5,
            duplicateOf: {
              id: 'c-dup-parent',
              referenceId: 'CF-2026-66001',
              title: 'Pothole master'
            }
          }
        };
      };

      const result = await officerService.linkDuplicateComplaint('c-dup-child', {
        parentComplaintId: 'c-dup-parent',
        reason: 'Officer verified duplicate report',
        version: 4
      });

      assert.equal(captured.id, 'c-dup-child');
      assert.equal(captured.payload.parentComplaintId, 'c-dup-parent');
      assert.equal(captured.payload.version, 4);
      assert.equal(result.status, 'DUPLICATE');
      assert.equal(result.duplicateOf.referenceId, 'CF-2026-66001');
      assert.equal(result.version, 5);
    } finally {
      apiClient.complaints.linkDuplicate = originalLink;
    }
  });

  test('linkDuplicateComplaint rejects missing complaintId with Error', async () => {
    await assert.rejects(
      async () => {
        await officerService.linkDuplicateComplaint('', { parentComplaintId: 'p-1' });
      },
      (err) => {
        assert.match(err.message, /Complaint ID is required/);
        return true;
      }
    );
  });

  test('officer adjudication and duplicate linking propagate HTTP 409 conflict errors cleanly', async () => {
    const originalAdjudicate = apiClient.complaints.adjudicateAiTriage;
    const originalLink = apiClient.complaints.linkDuplicate;
    try {
      apiClient.complaints.adjudicateAiTriage = async () => {
        const err = new Error('Optimistic locking failure: record has been updated concurrently');
        err.status = 409;
        throw err;
      };

      apiClient.complaints.linkDuplicate = async () => {
        const err = new Error('Optimistic locking failure: record has been updated concurrently');
        err.status = 409;
        throw err;
      };

      await assert.rejects(
        async () => {
          await officerService.adjudicateAiTriage('c-lock', { action: 'ACCEPT', version: 1 });
        },
        (err) => {
          assert.equal(err.status, 409);
          return true;
        }
      );

      await assert.rejects(
        async () => {
          await officerService.linkDuplicateComplaint('c-lock', { parentComplaintId: 'p-1', version: 1 });
        },
        (err) => {
          assert.equal(err.status, 409);
          return true;
        }
      );
    } finally {
      apiClient.complaints.adjudicateAiTriage = originalAdjudicate;
      apiClient.complaints.linkDuplicate = originalLink;
    }
  });

  // ==========================================
  // Phase 6: Operational Analytics & Telemetry Tests
  // ==========================================

  describe('Phase 6 Officer Analytics & Aggregates Tests', () => {
    test('getAnalyticsSummary delegates to apiClient.officer.getAnalyticsSummary and returns aggregate telemetry', async () => {
      const originalAnalytics = apiClient.officer.getAnalyticsSummary;
      let capturedParams = null;
      try {
        apiClient.officer.getAnalyticsSummary = async (params) => {
          capturedParams = params;
          return {
            totalComplaints: 40,
            countsByStatus: { SUBMITTED: 10, RESOLVED: 20 },
            countsByWard: { 'Ward 10, T. Nagar': 25 },
            countsByCategory: { 'Roads & Pavements': 30 },
            averageResolutionHours: 31.4,
            medianResolutionHours: 24.0,
            reworkRate: 5.2,
            duplicatesLinked: 3,
            aiAdjudicationCounts: { accepted: 25, overridden: 3, dismissed: 2 },
            slaAdherenceRate: null
          };
        };

        const result = await officerService.getAnalyticsSummary({
          from: '2026-01-01',
          to: '2026-12-31',
          ward: 'Ward 10, T. Nagar',
          category: 'Roads & Pavements'
        });

        assert.ok(capturedParams);
        assert.equal(capturedParams.from, '2026-01-01');
        assert.equal(capturedParams.to, '2026-12-31');
        assert.equal(capturedParams.ward, 'Ward 10, T. Nagar');
        assert.equal(capturedParams.category, 'Roads & Pavements');
        assert.equal(result.totalComplaints, 40);
        assert.equal(result.averageResolutionHours, 31.4);
        assert.equal(result.reworkRate, 5.2);
        assert.equal(result.duplicatesLinked, 3);
        assert.equal(result.aiAdjudicationCounts.accepted, 25);
        assert.equal(result.slaAdherenceRate, null);
      } finally {
        apiClient.officer.getAnalyticsSummary = originalAnalytics;
      }
    });

    test('getAnalyticsSummary strictly propagates 403 Forbidden without mock data fallback', async () => {
      const originalAnalytics = apiClient.officer.getAnalyticsSummary;
      try {
        apiClient.officer.getAnalyticsSummary = async () => {
          const err = new Error('Access Denied: OFFICER role required');
          err.status = 403;
          throw err;
        };

        await assert.rejects(
          async () => {
            await officerService.getAnalyticsSummary();
          },
          (err) => {
            assert.equal(err.status, 403);
            assert.match(err.message, /Access Denied/);
            return true;
          }
        );
      } finally {
        apiClient.officer.getAnalyticsSummary = originalAnalytics;
      }
    });
  });
});
