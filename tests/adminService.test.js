import { test, describe, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import { adminService } from '../src/services/adminService.js';
import { apiClient } from '../src/services/apiClient.js';

describe('Admin Service and API Client Tests', () => {
  const originalFetch = globalThis.fetch;
  const originalDocument = globalThis.document;

  beforeEach(() => {
    globalThis.document = {
      cookie: 'XSRF-TOKEN=test-csrf-token-admin'
    };
  });

  afterEach(() => {
    globalThis.fetch = originalFetch;
    globalThis.document = originalDocument;
  });

  test('adminService interface exposes all required methods', () => {
    assert.equal(typeof adminService.getDashboardSummary, 'function');
    assert.equal(typeof adminService.getUsers, 'function');
    assert.equal(typeof adminService.getUserById, 'function');
    assert.equal(typeof adminService.createStaff, 'function');
    assert.equal(typeof adminService.updateUserStatus, 'function');
    assert.equal(typeof adminService.getAuditLogs, 'function');
    assert.equal(typeof adminService.getSlaPolicies, 'function');
    assert.equal(typeof adminService.getDemoStatus, 'function');
    assert.equal(typeof adminService.resetDemoData, 'function');
  });

  test('getDashboardSummary calls GET /admin/dashboard/summary and returns counts', async () => {
    let capturedUrl = null;
    let capturedOptions = null;

    globalThis.fetch = async (url, options) => {
      capturedUrl = url;
      capturedOptions = options;
      return {
        ok: true,
        status: 200,
        headers: { get: () => 'application/json' },
        json: async () => ({
          usersByRole: { ADMIN: 1, OFFICER: 2, WORKER: 5, CITIZEN: 32 },
          complaintsByStatus: { SUBMITTED: 10, RESOLVED: 5 },
          auditEventsLast24h: 18,
          totalUsers: 40,
          totalComplaints: 15,
          pendingApprovalCount: 0
        })
      };
    };

    const res = await adminService.getDashboardSummary();
    assert.ok(capturedUrl.includes('/admin/dashboard/summary'));
    assert.equal(capturedOptions.method, 'GET');
    assert.equal(res.totalUsers, 40);
    assert.equal(res.auditEventsLast24h, 18);
    assert.equal(res.usersByRole.ADMIN, 1);
  });

  test('getUsers serializes query parameters correctly', async () => {
    let capturedUrl = null;

    globalThis.fetch = async (url) => {
      capturedUrl = url;
      return {
        ok: true,
        status: 200,
        headers: { get: () => 'application/json' },
        json: async () => ({
          content: [
            { id: 'u1', name: 'Officer Test', email: 'officer@metro.gov', role: 'OFFICER', status: 'ACTIVE' }
          ],
          totalElements: 1,
          totalPages: 1
        })
      };
    };

    const res = await adminService.getUsers({
      page: 1,
      size: 10,
      role: 'OFFICER',
      status: 'ACTIVE',
      search: 'Vance'
    });

    assert.ok(capturedUrl.includes('/admin/users'));
    assert.ok(capturedUrl.includes('page=1'));
    assert.ok(capturedUrl.includes('size=10'));
    assert.ok(capturedUrl.includes('role=OFFICER'));
    assert.ok(capturedUrl.includes('status=ACTIVE'));
    assert.ok(capturedUrl.includes('search=Vance'));
    assert.equal(res.content.length, 1);
    assert.equal(res.content[0].email, 'officer@metro.gov');
  });

  test('getUserById retrieves user by UUID without password hash', async () => {
    let capturedUrl = null;

    globalThis.fetch = async (url) => {
      capturedUrl = url;
      return {
        ok: true,
        status: 200,
        headers: { get: () => 'application/json' },
        json: async () => ({
          id: '5a48d3f4-94b8-4b00-af8b-ff1e4a049ddc',
          name: 'Priya Sharma',
          email: 'admin@civicfix.local',
          role: 'ADMIN',
          status: 'ACTIVE'
        })
      };
    };

    const user = await adminService.getUserById('5a48d3f4-94b8-4b00-af8b-ff1e4a049ddc');
    assert.ok(capturedUrl.includes('/admin/users/5a48d3f4-94b8-4b00-af8b-ff1e4a049ddc'));
    assert.equal(user.name, 'Priya Sharma');
    assert.equal(user.passwordHash, undefined);
  });

  test('createStaff sends POST /admin/users with validated temporary password', async () => {
    let capturedUrl = null;
    let capturedOptions = null;

    globalThis.fetch = async (url, options) => {
      capturedUrl = url;
      capturedOptions = options;
      return {
        ok: true,
        status: 201,
        headers: { get: () => 'application/json' },
        json: async () => ({
          id: 'new-worker-id',
          name: 'Suresh Kumar',
          email: 'suresh.kumar@civicfix.local',
          role: 'WORKER',
          department: 'Public Works & Sanitation',
          status: 'ACTIVE'
        })
      };
    };

    const newStaff = await adminService.createStaff({
      name: 'Suresh Kumar',
      email: 'suresh.kumar@civicfix.local',
      role: 'WORKER',
      department: 'Public Works & Sanitation',
      temporaryPassword: 'TempPassword@2026'
    });

    assert.ok(capturedUrl.includes('/admin/users'));
    assert.equal(capturedOptions.method, 'POST');
    assert.equal(capturedOptions.headers['X-XSRF-TOKEN'], 'test-csrf-token-admin');
    const sentBody = JSON.parse(capturedOptions.body);
    assert.equal(sentBody.name, 'Suresh Kumar');
    assert.equal(sentBody.temporaryPassword, 'TempPassword@2026');
    assert.equal(newStaff.id, 'new-worker-id');
  });

  test('updateUserStatus sends PATCH /admin/users/:id/status', async () => {
    let capturedUrl = null;
    let capturedOptions = null;

    globalThis.fetch = async (url, options) => {
      capturedUrl = url;
      capturedOptions = options;
      return {
        ok: true,
        status: 200,
        headers: { get: () => 'application/json' },
        json: async () => ({
          id: 'target-user-id',
          name: 'Target User',
          status: 'SUSPENDED'
        })
      };
    };

    const updated = await adminService.updateUserStatus('target-user-id', 'SUSPENDED', 'Policy infraction');
    assert.ok(capturedUrl.includes('/admin/users/target-user-id/status'));
    assert.equal(capturedOptions.method, 'PATCH');
    const sentBody = JSON.parse(capturedOptions.body);
    assert.equal(sentBody.status, 'SUSPENDED');
    assert.equal(sentBody.reason, 'Policy infraction');
    assert.equal(updated.status, 'SUSPENDED');
  });

  test('getAuditLogs serializes filters and returns paged logs', async () => {
    let capturedUrl = null;

    globalThis.fetch = async (url) => {
      capturedUrl = url;
      return {
        ok: true,
        status: 200,
        headers: { get: () => 'application/json' },
        json: async () => ({
          content: [
            {
              id: 'log-1',
              action: 'USER_CREATED',
              actorName: 'Priya Sharma',
              details: 'Created staff member'
            }
          ],
          totalElements: 1
        })
      };
    };

    const logs = await adminService.getAuditLogs({
      action: 'USER_CREATED',
      actor: 'Priya',
      startDate: '2026-10-01T00:00:00.000Z'
    });

    assert.ok(capturedUrl.includes('/admin/audit-logs'));
    assert.ok(capturedUrl.includes('action=USER_CREATED'));
    assert.ok(capturedUrl.includes('actor=Priya'));
    assert.ok(capturedUrl.includes('startDate='));
    assert.equal(logs.content.length, 1);
  });

  test('admin actions handle 403 Forbidden with clear error message', async () => {
    globalThis.fetch = async () => ({
      ok: false,
      status: 403,
      headers: { get: () => 'application/json' },
      json: async () => ({ message: 'Access Denied: ADMIN role required' })
    });

    await assert.rejects(
      async () => {
        await adminService.getDashboardSummary();
      },
      (err) => {
        assert.equal(err.status, 403);
        assert.ok(err.message.includes('Access Denied'));
        return true;
      }
    );
  });

  test('getSlaPolicies calls GET /admin/sla-policies and returns policy list', async () => {
    let capturedUrl = null;
    globalThis.fetch = async (url) => {
      capturedUrl = url;
      return {
        ok: true,
        status: 200,
        headers: { get: () => 'application/json' },
        json: async () => ([
          { id: 1, category: 'ROADS', priority: 'CRITICAL', hours: 12 },
          { id: 2, category: 'ROADS', priority: 'HIGH', hours: 24 }
        ])
      };
    };

    const policies = await adminService.getSlaPolicies();
    assert.ok(capturedUrl.includes('/admin/sla-policies'));
    assert.equal(policies.length, 2);
    assert.equal(policies[0].category, 'ROADS');
    assert.equal(policies[0].hours, 12);
  });

  test('getDemoStatus calls GET /admin/demo/status and returns availability', async () => {
    let capturedUrl = null;
    globalThis.fetch = async (url) => {
      capturedUrl = url;
      return {
        ok: true,
        status: 200,
        headers: { get: () => 'application/json' },
        json: async () => ({ available: true })
      };
    };

    const res = await adminService.getDemoStatus();
    assert.ok(capturedUrl.includes('/admin/demo/status'));
    assert.equal(res.available, true);
  });
});

