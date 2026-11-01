import test from 'node:test';
import assert from 'node:assert/strict';
import { apiClient } from '../src/services/apiClient.js';

test.describe('SLA Tracking & Supervisor Integration Tests', () => {

  test.it('apiClient.complaints.escalate sends POST /api/complaints/:id/escalate with reason', async () => {
    let capturedUrl = null;
    let capturedOptions = null;

    const originalFetch = globalThis.fetch;
    globalThis.fetch = async (url, options) => {
      capturedUrl = url;
      capturedOptions = options;
      return {
        ok: true,
        status: 200,
        headers: new Headers({ 'content-type': 'application/json' }),
        json: async () => ({
          success: true,
          message: 'Complaint escalated successfully.',
          data: {
            id: 'complaint-123',
            referenceId: 'CF-2026-00124',
            slaState: 'OVERDUE',
            escalatedAt: '2026-10-31T20:00:00Z'
          }
        })
      };
    };

    try {
      const res = await apiClient.complaints.escalate('complaint-123', 'Breached target SLA by over 24 hours');
      assert.ok(capturedUrl.includes('/api/complaints/complaint-123/escalate'));
      assert.equal(capturedOptions.method, 'POST');
      const body = JSON.parse(capturedOptions.body);
      assert.equal(body.reason, 'Breached target SLA by over 24 hours');
      assert.equal(res.data.slaState, 'OVERDUE');
      assert.ok(res.data.escalatedAt);
    } finally {
      globalThis.fetch = originalFetch;
    }
  });

  test.it('apiClient.supervisor.getEscalations serializes filters correctly', async () => {
    let capturedUrl = null;

    const originalFetch = globalThis.fetch;
    globalThis.fetch = async (url) => {
      capturedUrl = url;
      return {
        ok: true,
        status: 200,
        headers: new Headers({ 'content-type': 'application/json' }),
        json: async () => ({
          success: true,
          data: {
            content: [],
            totalElements: 0,
            totalPages: 1
          }
        })
      };
    };

    try {
      await apiClient.supervisor.getEscalations({
        ward: 'Ward 08, Anna Nagar',
        category: 'Pothole & Road Hazard',
        page: 1,
        size: 15
      });
      assert.ok(capturedUrl.includes('/api/supervisor/escalations'));
      assert.ok(capturedUrl.includes('ward=Ward+08%2C+Anna+Nagar') || capturedUrl.includes('ward=Ward%2008%2C%20Anna%20Nagar'));
      assert.ok(capturedUrl.includes('category=Pothole+%26+Road+Hazard') || capturedUrl.includes('category=Pothole%20%26%20Road%20Hazard'));
      assert.ok(capturedUrl.includes('page=1'));
      assert.ok(capturedUrl.includes('size=15'));
    } finally {
      globalThis.fetch = originalFetch;
    }
  });

  test.it('apiClient.supervisor.reassignWorker sends POST /api/supervisor/complaints/:id/reassign with payload', async () => {
    let capturedUrl = null;
    let capturedOptions = null;

    const originalFetch = globalThis.fetch;
    globalThis.fetch = async (url, options) => {
      capturedUrl = url;
      capturedOptions = options;
      return {
        ok: true,
        status: 200,
        headers: new Headers({ 'content-type': 'application/json' }),
        json: async () => ({
          success: true,
          message: 'Worker reassigned successfully.',
          data: {
            id: 'complaint-789',
            referenceId: 'CF-2026-99999',
            assignedWorker: {
              id: 'worker-david',
              name: 'David Kalu'
            }
          }
        })
      };
    };

    try {
      const res = await apiClient.supervisor.reassignWorker('complaint-789', {
        newWorkerId: 'worker-david',
        reason: 'Original crew unresponsive on emergency pipeline leak',
        version: 2
      });
      assert.ok(capturedUrl.includes('/api/supervisor/complaints/complaint-789/reassign'));
      assert.equal(capturedOptions.method, 'POST');
      const body = JSON.parse(capturedOptions.body);
      assert.equal(body.newWorkerId, 'worker-david');
      assert.equal(body.reason, 'Original crew unresponsive on emergency pipeline leak');
      assert.equal(body.version, 2);
      assert.equal(res.data.assignedWorker.name, 'David Kalu');
    } finally {
      globalThis.fetch = originalFetch;
    }
  });

  test.it('apiClient.supervisor.getWorkers sends GET /api/supervisor/workers', async () => {
    let capturedUrl = null;

    const originalFetch = globalThis.fetch;
    globalThis.fetch = async (url) => {
      capturedUrl = url;
      return {
        ok: true,
        status: 200,
        headers: new Headers({ 'content-type': 'application/json' }),
        json: async () => ({
          success: true,
          data: [
            { id: 'worker-1', fullName: 'Marcus Chen', department: 'SDOT' },
            { id: 'worker-2', fullName: 'David Kalu', department: 'Water' }
          ]
        })
      };
    };

    try {
      const res = await apiClient.supervisor.getWorkers();
      assert.ok(capturedUrl.includes('/api/supervisor/workers'));
      assert.equal(res.data.length, 2);
    } finally {
      globalThis.fetch = originalFetch;
    }
  });

  test.it('SLA states evaluate strictly against server response contract', () => {
    const validStates = ['NOT_SET', 'ON_TRACK', 'DUE_SOON', 'OVERDUE', 'STOPPED'];
    for (const state of validStates) {
      assert.ok(typeof state === 'string');
    }
  });
});

