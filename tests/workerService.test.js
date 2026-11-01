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

import { workerService } from '../src/services/workerService.js';
import { apiClient } from '../src/services/apiClient.js';

describe('WorkerService Integration Tests (Sprint 3, Step 4A)', () => {
  beforeEach(() => {
    storage.clear();
  });

  test('getAssignedTasks retrieves and maps worker task list from backend', async () => {
    const originalList = apiClient.complaints.list;
    try {
      apiClient.complaints.list = async (params) => ({
        data: [
          {
            id: '8b234567-9598-5de4-b1cf-441b45ed1002',
            referenceId: 'CF-2026-51943',
            title: 'Dangerous Pothole on 3rd Avenue',
            description: 'Large pothole in right lane causing vehicle wheel rim damage.',
            category: 'ROADS',
            priority: 'HIGH',
            status: 'ASSIGNED',
            address: '3rd Avenue, Anna Nagar East, Chennai',
            ward: 'Ward 08',
            assignedWorker: {
              id: '00000000-0000-0000-0000-000000000003',
              name: 'Marcus Chen',
              department: 'SDOT Rapid Asphalt Maintenance'
            },
            assignedOfficer: {
              id: '00000000-0000-0000-0000-000000000002',
              name: 'Elena Vance'
            },
            createdAt: '2026-10-22T08:00:00Z'
          }
        ]
      });

      const tasks = await workerService.getAssignedTasks();
      assert.equal(tasks.length, 1);
      assert.equal(tasks[0].id, 'CF-2026-51943');
      assert.equal(tasks[0].referenceId, 'CF-2026-51943');
      assert.equal(tasks[0].title, 'Dangerous Pothole on 3rd Avenue');
      assert.equal(tasks[0].status, 'ASSIGNED');
      assert.equal(tasks[0].assignedWorker.name, 'Marcus Chen');
      assert.equal(tasks[0].isLiveBackend, true);
      assert.equal(tasks[0].dataSource, 'POSTGRESQL_BACKEND');
    } finally {
      apiClient.complaints.list = originalList;
    }
  });

  test('getAssignedTasks passes status and category query params to apiClient', async () => {
    const originalList = apiClient.complaints.list;
    let capturedParams = null;
    try {
      apiClient.complaints.list = async (params) => {
        capturedParams = params;
        return { data: [] };
      };

      const tasks = await workerService.getAssignedTasks({ status: 'ASSIGNED', category: 'ROADS' });
      assert.ok(capturedParams);
      assert.equal(capturedParams.status, 'ASSIGNED');
      assert.equal(capturedParams.category, 'ROADS');
      assert.equal(tasks.length, 0);
    } finally {
      apiClient.complaints.list = originalList;
    }
  });

  test('getAssignedTasks strictly propagates 401 and 403 errors without falling back to mock data', async () => {
    const originalList = apiClient.complaints.list;
    try {
      apiClient.complaints.list = async () => {
        const error = new Error('Access denied: ROLE_WORKER authority required');
        error.status = 403;
        throw error;
      };

      await assert.rejects(
        async () => {
          await workerService.getAssignedTasks();
        },
        (err) => {
          assert.equal(err.status, 403);
          assert.match(err.message, /ROLE_WORKER/);
          return true;
        }
      );
    } finally {
      apiClient.complaints.list = originalList;
    }
  });

  test('getAssignedTasks handles empty task list gracefully', async () => {
    const originalList = apiClient.complaints.list;
    try {
      apiClient.complaints.list = async () => ({
        data: []
      });

      const tasks = await workerService.getAssignedTasks();
      assert.ok(Array.isArray(tasks));
      assert.equal(tasks.length, 0);
    } finally {
      apiClient.complaints.list = originalList;
    }
  });

  test('getTaskDetail retrieves work order specification and merges status audit history', async () => {
    const originalGetById = apiClient.complaints.getById;
    const originalGetHistory = apiClient.complaints.getHistory;
    try {
      apiClient.complaints.getById = async (id) => ({
        data: {
          id: '8b234567-9598-5de4-b1cf-441b45ed1002',
          referenceId: 'CF-2026-51943',
          title: 'Dangerous Pothole on 3rd Avenue',
          description: 'Large pothole in right lane causing vehicle wheel rim damage.',
          category: 'ROADS',
          priority: 'HIGH',
          status: 'ASSIGNED',
          address: '3rd Avenue, Anna Nagar East',
          ward: 'Ward 08',
          assignedWorker: {
            id: '00000000-0000-0000-0000-000000000003',
            name: 'Marcus Chen',
            department: 'SDOT Rapid Asphalt Maintenance'
          },
          assignedOfficer: {
            id: '00000000-0000-0000-0000-000000000002',
            name: 'Elena Vance'
          },
          createdAt: '2026-10-22T08:00:00Z'
        }
      });

      apiClient.complaints.getHistory = async (id) => ({
        data: [
          {
            id: 'hist-001',
            previousStatus: null,
            newStatus: 'SUBMITTED',
            changedByName: 'Alex Morgan',
            notes: 'Citizen filed initial civic report.',
            timestamp: '2026-10-22T08:00:00Z'
          },
          {
            id: 'hist-002',
            previousStatus: 'SUBMITTED',
            newStatus: 'ASSIGNED',
            changedByName: 'Elena Vance',
            notes: 'Dispatched Marcus Chen with Rapid Asphalt Compactor Rig (48h SLA).',
            timestamp: '2026-10-22T08:30:00Z'
          }
        ]
      });

      const detail = await workerService.getTaskDetail('CF-2026-51943');
      assert.equal(detail.referenceId, 'CF-2026-51943');
      assert.equal(detail.status, 'ASSIGNED');
      assert.equal(detail.assignedWorker.name, 'Marcus Chen');
      assert.equal(detail.assignedOfficer.name, 'Elena Vance');
      assert.equal(detail.progressNotes.length, 2);
      assert.equal(detail.progressNotes[0].status, 'SUBMITTED');
      assert.equal(detail.progressNotes[1].author, 'Elena Vance');
      assert.match(detail.progressNotes[1].note, /Rapid Asphalt Compactor Rig/);
    } finally {
      apiClient.complaints.getById = originalGetById;
      apiClient.complaints.getHistory = originalGetHistory;
    }
  });

  test('getTaskDetail rejects empty or whitespace taskId with HTTP 400', async () => {
    await assert.rejects(
      async () => {
        await workerService.getTaskDetail('');
      },
      (err) => {
        assert.equal(err.status, 400);
        assert.match(err.message, /Task ID or Reference is required/);
        return true;
      }
    );

    await assert.rejects(
      async () => {
        await workerService.getTaskDetail('   ');
      },
      (err) => {
        assert.equal(err.status, 400);
        return true;
      }
    );
  });

  test('getTaskDetail propagates 404 Not Found error without fake fallback or first-task default', async () => {
    const originalGetById = apiClient.complaints.getById;
    try {
      apiClient.complaints.getById = async () => {
        const error = new Error('Complaint #CF-NONEXISTENT not found.');
        error.status = 404;
        throw error;
      };

      await assert.rejects(
        async () => {
          await workerService.getTaskDetail('CF-NONEXISTENT');
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

  test('getTaskDetail propagates 403 Forbidden when task is not assigned to the worker', async () => {
    const originalGetById = apiClient.complaints.getById;
    try {
      apiClient.complaints.getById = async () => {
        const error = new Error('Workers may only access repair orders assigned to their crew.');
        error.status = 403;
        throw error;
      };

      await assert.rejects(
        async () => {
          await workerService.getTaskDetail('CF-2026-99999');
        },
        (err) => {
          assert.equal(err.status, 403);
          assert.match(err.message, /Workers may only access repair orders assigned to their crew/);
          return true;
        }
      );
    } finally {
      apiClient.complaints.getById = originalGetById;
    }
  });

  // Sprint 3, Step 4B Tests: Worker Status Transitions & Progress Tracking
  test('startWork transitions complaint status to IN_PROGRESS via apiClient.complaints.updateStatus', async () => {
    const originalUpdateStatus = apiClient.complaints.updateStatus;
    const originalGetById = apiClient.complaints.getById;
    const originalGetHistory = apiClient.complaints.getHistory;
    let capturedCall = null;
    try {
      apiClient.complaints.updateStatus = async (id, payload) => {
        capturedCall = { id, payload };
        return { success: true };
      };

      apiClient.complaints.getById = async (id) => ({
        data: {
          id: '8b234567-9598-5de4-b1cf-441b45ed1002',
          referenceId: id,
          title: 'Dangerous Pothole on 3rd Avenue',
          status: 'IN_PROGRESS',
          assignedWorker: { id: '00000000-0000-0000-0000-000000000003', name: 'Marcus Chen' }
        }
      });

      apiClient.complaints.getHistory = async (id) => ({
        data: [
          {
            id: 'h-1',
            previousStatus: 'ASSIGNED',
            newStatus: 'IN_PROGRESS',
            changedByName: 'Marcus Chen',
            notes: 'Technician arrived on site and initiated work perimeter.',
            createdAt: '2026-10-22T09:00:00Z'
          }
        ]
      });

      const result = await workerService.startWork('CF-2026-51943', 'Technician arrived on site.');
      assert.ok(capturedCall);
      assert.equal(capturedCall.id, 'CF-2026-51943');
      assert.equal(capturedCall.payload.status, 'IN_PROGRESS');
      assert.equal(capturedCall.payload.notes, 'Technician arrived on site.');
      assert.equal(result.status, 'IN_PROGRESS');
      assert.equal(result.progressNotes.length, 1);
      assert.equal(result.progressNotes[0].author, 'Marcus Chen');
    } finally {
      apiClient.complaints.updateStatus = originalUpdateStatus;
      apiClient.complaints.getById = originalGetById;
      apiClient.complaints.getHistory = originalGetHistory;
    }
  });

  test('startWork strictly propagates 400 when task transition is rejected by backend', async () => {
    const originalUpdateStatus = apiClient.complaints.updateStatus;
    try {
      apiClient.complaints.updateStatus = async () => {
        const err = new Error('Complaint is already in status: IN_PROGRESS');
        err.status = 400;
        throw err;
      };

      await assert.rejects(
        async () => {
          await workerService.startWork('CF-2026-51943');
        },
        (err) => {
          assert.equal(err.status, 400);
          assert.match(err.message, /already in status/);
          return true;
        }
      );
    } finally {
      apiClient.complaints.updateStatus = originalUpdateStatus;
    }
  });

  test('startWork strictly propagates 403 when task is not assigned to the worker', async () => {
    const originalUpdateStatus = apiClient.complaints.updateStatus;
    try {
      apiClient.complaints.updateStatus = async () => {
        const err = new Error('Only the assigned field worker or an officer can mark tasks IN_PROGRESS.');
        err.status = 403;
        throw err;
      };

      await assert.rejects(
        async () => {
          await workerService.startWork('CF-2026-UNASSIGNED');
        },
        (err) => {
          assert.equal(err.status, 403);
          assert.match(err.message, /assigned field worker/);
          return true;
        }
      );
    } finally {
      apiClient.complaints.updateStatus = originalUpdateStatus;
    }
  });

  test('addProgressNote appends operational progress note via apiClient.complaints.addNote', async () => {
    const originalAddNote = apiClient.complaints.addNote;
    const originalGetById = apiClient.complaints.getById;
    const originalGetHistory = apiClient.complaints.getHistory;
    let capturedCall = null;
    try {
      apiClient.complaints.addNote = async (id, note) => {
        capturedCall = { id, note };
        return { success: true };
      };

      apiClient.complaints.getById = async (id) => ({
        data: {
          id: '8b234567-9598-5de4-b1cf-441b45ed1002',
          referenceId: id,
          title: 'Dangerous Pothole on 3rd Avenue',
          status: 'IN_PROGRESS'
        }
      });

      apiClient.complaints.getHistory = async (id) => ({
        data: [
          {
            id: 'h-2',
            previousStatus: 'IN_PROGRESS',
            newStatus: 'IN_PROGRESS',
            changedByName: 'Marcus Chen',
            notes: 'Sub-base layer compacted with plate tamper.',
            createdAt: '2026-10-22T09:30:00Z'
          }
        ]
      });

      const result = await workerService.addProgressNote('CF-2026-51943', 'Sub-base layer compacted with plate tamper.');
      assert.ok(capturedCall);
      assert.equal(capturedCall.id, 'CF-2026-51943');
      assert.equal(capturedCall.note, 'Sub-base layer compacted with plate tamper.');
      assert.equal(result.progressNotes.length, 1);
      assert.equal(result.progressNotes[0].note, 'Sub-base layer compacted with plate tamper.');
    } finally {
      apiClient.complaints.addNote = originalAddNote;
      apiClient.complaints.getById = originalGetById;
      apiClient.complaints.getHistory = originalGetHistory;
    }
  });

  test('addProgressNote rejects empty progress note with HTTP 400', async () => {
    await assert.rejects(
      async () => {
        await workerService.addProgressNote('CF-2026-51943', '');
      },
      (err) => {
        assert.equal(err.status, 400);
        assert.match(err.message, /cannot be empty/);
        return true;
      }
    );
  });

  test('reportBlocker formats and appends blocker reason to operational history', async () => {
    const originalAddNote = apiClient.complaints.addNote;
    const originalGetById = apiClient.complaints.getById;
    const originalGetHistory = apiClient.complaints.getHistory;
    let capturedCall = null;
    try {
      apiClient.complaints.addNote = async (id, note) => {
        capturedCall = { id, note };
        return { success: true };
      };

      apiClient.complaints.getById = async (id) => ({
        data: {
          id: '8b234567-9598-5de4-b1cf-441b45ed1002',
          referenceId: id,
          title: 'Dangerous Pothole on 3rd Avenue',
          status: 'IN_PROGRESS'
        }
      });

      apiClient.complaints.getHistory = async (id) => ({
        data: []
      });

      await workerService.reportBlocker('CF-2026-51943', 'Underground Gas Conduit Conflict');
      assert.ok(capturedCall);
      assert.equal(capturedCall.id, 'CF-2026-51943');
      assert.match(capturedCall.note, /BLOCKER REPORTED: Underground Gas Conduit Conflict/);
    } finally {
      apiClient.complaints.addNote = originalAddNote;
      apiClient.complaints.getById = originalGetById;
      apiClient.complaints.getHistory = originalGetHistory;
    }
  });

  // --- Step 4C: Repair Evidence Submission Tests ---

  test('submitEvidence sends FormData to apiClient.complaints.submitEvidence and returns updated task', async () => {
    const originalSubmitEvidence = apiClient.complaints.submitEvidence;
    const originalGetById = apiClient.complaints.getById;
    const originalGetHistory = apiClient.complaints.getHistory;
    let capturedId = null;
    let capturedFormData = null;

    try {
      apiClient.complaints.submitEvidence = async (id, formData) => {
        capturedId = id;
        capturedFormData = formData;
        return { success: true };
      };

      apiClient.complaints.getById = async (id) => ({
        data: {
          id: '8b234567-9598-5de4-b1cf-441b45ed1002',
          referenceId: id,
          title: 'Dangerous Pothole on 3rd Avenue',
          status: 'RESOLUTION_SUBMITTED',
          evidence: [
            {
              id: 'ev-1',
              photoUrl: '/api/complaints/evidence/files/evidence-123.jpg',
              evidenceNotes: 'Bitumen aggregate compacted flush.',
              latitude: 13.0850,
              longitude: 80.2100
            }
          ]
        }
      });

      apiClient.complaints.getHistory = async (id) => ({
        data: [
          {
            id: 'h-3',
            previousStatus: 'IN_PROGRESS',
            newStatus: 'RESOLUTION_SUBMITTED',
            notes: 'Bitumen aggregate compacted flush.',
            timestamp: '2026-10-22T10:00:00Z'
          }
        ]
      });

      const fakeFile = { name: 'after_paving.jpg', size: 1024, type: 'image/jpeg' };
      const result = await workerService.submitEvidence('CF-2026-51943', {
        notes: 'Bitumen aggregate compacted flush.',
        files: [fakeFile],
        latitude: 13.0850,
        longitude: 80.2100,
        accuracy: 12.0,
        deviceReported: true
      });

      assert.equal(capturedId, 'CF-2026-51943');
      assert.ok(capturedFormData instanceof FormData);
      assert.equal(capturedFormData.get('notes'), 'Bitumen aggregate compacted flush.');
      assert.equal(capturedFormData.get('latitude'), '13.085');
      assert.equal(capturedFormData.get('longitude'), '80.21');
      assert.equal(capturedFormData.get('accuracy'), '12');
      assert.equal(capturedFormData.get('deviceReported'), 'true');
      assert.equal(result.status, 'RESOLUTION_SUBMITTED');
    } finally {
      apiClient.complaints.submitEvidence = originalSubmitEvidence;
      apiClient.complaints.getById = originalGetById;
      apiClient.complaints.getHistory = originalGetHistory;
    }
  });

  test('submitEvidence rejects empty taskId with HTTP 400', async () => {
    await assert.rejects(
      async () => {
        await workerService.submitEvidence('', { notes: 'Done', files: [{}] });
      },
      (err) => {
        assert.equal(err.status, 400);
        assert.match(err.message, /Task ID is required/);
        return true;
      }
    );
  });

  test('submitEvidence rejects empty notes with HTTP 400', async () => {
    await assert.rejects(
      async () => {
        await workerService.submitEvidence('CF-2026-51943', { notes: '   ', files: [{}] });
      },
      (err) => {
        assert.equal(err.status, 400);
        assert.match(err.message, /narrative notes are required/);
        return true;
      }
    );
  });

  test('submitEvidence rejects empty files array with HTTP 400', async () => {
    await assert.rejects(
      async () => {
        await workerService.submitEvidence('CF-2026-51943', { notes: 'Completed.', files: [] });
      },
      (err) => {
        assert.equal(err.status, 400);
        assert.match(err.message, /photograph is required/);
        return true;
      }
    );
  });

  test('submitEvidence strictly propagates 403 Forbidden when worker is unauthorized', async () => {
    const originalSubmitEvidence = apiClient.complaints.submitEvidence;
    try {
      apiClient.complaints.submitEvidence = async () => {
        const err = new Error('Only the assigned technician can submit repair evidence.');
        err.status = 403;
        throw err;
      };

      await assert.rejects(
        async () => {
          await workerService.submitEvidence('CF-2026-51943', {
            notes: 'Attempted submit.',
            files: [{ name: 'test.jpg' }]
          });
        },
        (err) => {
          assert.equal(err.status, 403);
          assert.match(err.message, /assigned technician/);
          return true;
        }
      );
    } finally {
      apiClient.complaints.submitEvidence = originalSubmitEvidence;
    }
  });

  test('submitEvidence strictly propagates 400 Bad Request when task is not IN_PROGRESS', async () => {
    const originalSubmitEvidence = apiClient.complaints.submitEvidence;
    try {
      apiClient.complaints.submitEvidence = async () => {
        const err = new Error('Task cannot be transitioned to RESOLUTION_SUBMITTED from status: ASSIGNED. Allowed previous status: IN_PROGRESS.');
        err.status = 400;
        throw err;
      };

      await assert.rejects(
        async () => {
          await workerService.submitEvidence('CF-2026-51943', {
            notes: 'Premature submit.',
            files: [{ name: 'test.jpg' }]
          });
        },
        (err) => {
          assert.equal(err.status, 400);
          assert.match(err.message, /Allowed previous status: IN_PROGRESS/);
          return true;
        }
      );
    } finally {
      apiClient.complaints.submitEvidence = originalSubmitEvidence;
    }
  });

  test('getEvidence retrieves resolution evidence records via apiClient.complaints.getEvidence', async () => {
    const originalGetEvidence = apiClient.complaints.getEvidence;
    try {
      apiClient.complaints.getEvidence = async (id) => ({
        data: [
          {
            id: 'ev-1',
            workerName: 'Marcus Chen',
            photoUrl: '/api/complaints/evidence/files/evidence-uuid1.jpg',
            evidenceNotes: 'Bitumen compacted.',
            createdAt: '2026-10-22T10:00:00Z'
          }
        ]
      });

      const evidenceList = await workerService.getEvidence('CF-2026-51943');
      assert.ok(Array.isArray(evidenceList));
      assert.equal(evidenceList.length, 1);
      assert.equal(evidenceList[0].workerName, 'Marcus Chen');
      assert.equal(evidenceList[0].photoUrl, '/api/complaints/evidence/files/evidence-uuid1.jpg');
    } finally {
      apiClient.complaints.getEvidence = originalGetEvidence;
    }
  });
});
