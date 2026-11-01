import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { apiClient } from '../src/services/apiClient.js';
import { COMPLAINT_STATUS, STATUS_META } from '../src/constants/statusConstants.js';
import { getProgressPercent } from '../src/services/complaintService.js';
import { officerService } from '../src/services/officerService.js';

describe('Citizen Confirmation and Reopen Flow Tests (Phase A2)', () => {

  test('COMPLAINT_STATUS and STATUS_META define PENDING_CITIZEN_CONFIRMATION', () => {
    assert.equal(COMPLAINT_STATUS.PENDING_CITIZEN_CONFIRMATION, 'PENDING_CITIZEN_CONFIRMATION');
    const meta = STATUS_META.PENDING_CITIZEN_CONFIRMATION;
    assert.ok(meta, 'STATUS_META must include PENDING_CITIZEN_CONFIRMATION');
    assert.equal(meta.label, 'Awaiting Citizen Confirmation');
    assert.ok(meta.icon);
    assert.ok(meta.badgeClass);
  });

  test('getProgressPercent maps PENDING_CITIZEN_CONFIRMATION to 95%', () => {
    assert.equal(getProgressPercent('PENDING_CITIZEN_CONFIRMATION'), 95);
    assert.equal(getProgressPercent('RESOLUTION_SUBMITTED'), 90);
    assert.equal(getProgressPercent('RESOLVED'), 100);
  });

  test('apiClient.complaints.confirmResolution sends POST /api/complaints/:id/confirm-resolution', async () => {
    const originalFetch = globalThis.fetch;
    let captured = null;
    try {
      globalThis.fetch = async (url, options) => {
        captured = { url, options };
        return {
          ok: true,
          status: 200,
          headers: new Headers({ 'content-type': 'application/json' }),
          json: async () => ({
            success: true,
            message: 'Resolution confirmed successfully.',
            data: {
              id: 'c1234567-0000-0000-0000-000000000001',
              referenceId: 'CF-2026-99991',
              status: 'RESOLVED',
              confirmationSource: 'CITIZEN',
              confirmedAt: '2026-10-31T20:00:00Z'
            }
          })
        };
      };

      const res = await apiClient.complaints.confirmResolution('c1234567-0000-0000-0000-000000000001', {
        version: 3
      });

      assert.ok(captured);
      assert.match(captured.url, /\/api\/complaints\/c1234567-0000-0000-0000-000000000001\/confirm-resolution$/);
      assert.equal(captured.options.method, 'POST');
      assert.deepEqual(JSON.parse(captured.options.body), { version: 3 });
      assert.equal(res.data.status, 'RESOLVED');
      assert.equal(res.data.confirmationSource, 'CITIZEN');
    } finally {
      globalThis.fetch = originalFetch;
    }
  });

  test('apiClient.complaints.rejectResolution sends JSON when no photo is provided', async () => {
    const originalFetch = globalThis.fetch;
    let captured = null;
    try {
      globalThis.fetch = async (url, options) => {
        captured = { url, options };
        return {
          ok: true,
          status: 200,
          headers: new Headers({ 'content-type': 'application/json' }),
          json: async () => ({
            success: true,
            message: 'Resolution rejected. Complaint has been reopened and escalated.',
            data: {
              id: 'c1234567-0000-0000-0000-000000000001',
              referenceId: 'CF-2026-99991',
              status: 'REOPENED',
              reopenCount: 1,
              escalatedAt: '2026-10-31T20:05:00Z'
            }
          })
        };
      };

      const res = await apiClient.complaints.rejectResolution(
        'c1234567-0000-0000-0000-000000000001',
        { reason: 'Pothole was only partially filled and is sinking again.', version: 3 }
      );

      assert.ok(captured);
      assert.match(captured.url, /\/api\/complaints\/c1234567-0000-0000-0000-000000000001\/reject-resolution$/);
      assert.equal(captured.options.method, 'POST');
      const body = JSON.parse(captured.options.body);
      assert.equal(body.reason, 'Pothole was only partially filled and is sinking again.');
      assert.equal(body.version, 3);
      assert.equal(res.data.status, 'REOPENED');
      assert.equal(res.data.reopenCount, 1);
    } finally {
      globalThis.fetch = originalFetch;
    }
  });

  test('apiClient.complaints.rejectResolution sends FormData when photo is attached', async () => {
    const originalFetch = globalThis.fetch;
    let captured = null;
    try {
      globalThis.fetch = async (url, options) => {
        captured = { url, options };
        return {
          ok: true,
          status: 200,
          headers: new Headers({ 'content-type': 'application/json' }),
          json: async () => ({
            success: true,
            data: {
              id: 'c1234567-0000-0000-0000-000000000001',
              status: 'REOPENED'
            }
          })
        };
      };

      const fakeFile = new Blob(['fake image bytes'], { type: 'image/jpeg' });
      await apiClient.complaints.rejectResolution(
        'c1234567-0000-0000-0000-000000000001',
        { reason: 'Water leak persists after repair.', version: 2 },
        fakeFile
      );

      assert.ok(captured);
      assert.equal(captured.options.method, 'POST');
      assert.ok(captured.options.body instanceof FormData);
      assert.equal(captured.options.body.get('reason'), 'Water leak persists after repair.');
      assert.equal(captured.options.body.get('version'), '2');
    } finally {
      globalThis.fetch = originalFetch;
    }
  });

  test('officerService.verifyResolution APPROVE targets PENDING_CITIZEN_CONFIRMATION', async () => {
    const originalUpdate = apiClient.complaints.updateStatus;
    let capturedCall = null;
    try {
      apiClient.complaints.updateStatus = async (id, payload) => {
        capturedCall = { id, payload };
        return {
          data: {
            id: 'c1234567-0000-0000-0000-000000000001',
            status: 'PENDING_CITIZEN_CONFIRMATION'
          }
        };
      };

      const result = await officerService.verifyResolution('c1234567-0000-0000-0000-000000000001', 'APPROVE');
      assert.ok(capturedCall);
      assert.equal(capturedCall.payload.status, 'PENDING_CITIZEN_CONFIRMATION');
      assert.equal(result.status, 'PENDING_CITIZEN_CONFIRMATION');
    } finally {
      apiClient.complaints.updateStatus = originalUpdate;
    }
  });

});

