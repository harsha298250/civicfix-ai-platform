import { test, describe, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import {
  mapBackendNotificationToFrontend,
  formatRelativeTime,
  getNotifications,
  getUnreadCount,
  markAsRead,
  markAllAsRead
} from '../src/services/notificationService.js';
import { apiClient } from '../src/services/apiClient.js';

describe('Notification Service Integration & Unit Tests (Phase 5, Stage 5)', () => {
  const originalFetch = globalThis.fetch;
  const originalDocument = globalThis.document;

  beforeEach(() => {
    globalThis.document = {
      cookie: 'XSRF-TOKEN=mock-csrf-token'
    };
  });

  afterEach(() => {
    globalThis.fetch = originalFetch;
    globalThis.document = originalDocument;
  });

  describe('formatRelativeTime', () => {
    test('returns "Just now" for very recent timestamps', () => {
      const now = new Date().toISOString();
      assert.equal(formatRelativeTime(now), 'Just now');
    });

    test('returns minutes ago format for timestamps within an hour', () => {
      const tenMinsAgo = new Date(Date.now() - 10 * 60 * 1000).toISOString();
      assert.equal(formatRelativeTime(tenMinsAgo), '10m ago');
    });

    test('returns hours ago format for timestamps within a day', () => {
      const threeHoursAgo = new Date(Date.now() - 3 * 3600 * 1000).toISOString();
      assert.equal(formatRelativeTime(threeHoursAgo), '3h ago');
    });

    test('returns days ago format for older timestamps', () => {
      const twoDaysAgo = new Date(Date.now() - 2 * 86400 * 1000).toISOString();
      assert.equal(formatRelativeTime(twoDaysAgo), '2d ago');
    });

    test('handles invalid or empty dates gracefully', () => {
      assert.equal(formatRelativeTime(null), 'Recently');
      assert.equal(formatRelativeTime(undefined), 'Recently');
      assert.equal(formatRelativeTime('invalid-date'), 'Recently');
    });
  });

  describe('mapBackendNotificationToFrontend', () => {
    test('accurately maps standard backend notification response', () => {
      const backendNotification = {
        id: 'b819f7f4-8a43-4e4c-b437-d2050f4439c1',
        recipientId: 'a1111111-1111-1111-1111-111111111111',
        complaintId: 'c2222222-2222-2222-2222-222222222222',
        referenceId: 'CF-2026-0042',
        title: 'Work Completed on Pothole',
        message: 'Field technician has submitted resolution evidence.',
        notificationType: 'RESOLUTION_SUBMITTED',
        channel: 'IN_APP',
        severity: 'INFO',
        read: false,
        readAt: null,
        targetUrl: '/officer/verifications?id=c2222222-2222-2222-2222-222222222222',
        createdAt: '2026-10-25T14:30:00Z'
      };

      const mapped = mapBackendNotificationToFrontend(backendNotification);

      assert.equal(mapped.id, 'b819f7f4-8a43-4e4c-b437-d2050f4439c1');
      assert.equal(mapped.complaintId, 'c2222222-2222-2222-2222-222222222222');
      assert.equal(mapped.referenceId, 'CF-2026-0042');
      assert.equal(mapped.title, 'Work Completed on Pothole');
      assert.equal(mapped.message, 'Field technician has submitted resolution evidence.');
      assert.equal(mapped.type, 'RESOLUTION_SUBMITTED');
      assert.equal(mapped.severity, 'info');
      assert.equal(mapped.read, false);
      assert.equal(mapped.is_read, false);
      assert.equal(mapped.link, '/officer/verifications?id=c2222222-2222-2222-2222-222222222222');
      assert.ok(mapped.relativeTime);
    });

    test('generates fallback link when targetUrl is missing but complaintId is present', () => {
      const backendNotification = {
        id: '123',
        complaintId: 'cmp-999',
        title: 'Assigned',
        read: true,
        readAt: '2026-10-25T14:00:00Z',
        createdAt: '2026-10-25T13:00:00Z'
      };

      const mapped = mapBackendNotificationToFrontend(backendNotification);
      assert.equal(mapped.link, '/citizen/complaints/cmp-999');
      assert.equal(mapped.read, true);
      assert.equal(mapped.is_read, true);
    });

    test('normalizes is_read boolean when provided in snake_case', () => {
      const backendNotification = {
        id: '456',
        is_read: true,
        title: 'Status Update'
      };

      const mapped = mapBackendNotificationToFrontend(backendNotification);
      assert.equal(mapped.read, true);
    });
  });

  describe('getNotifications API calls', () => {
    test('fetches paginated notifications and returns mapped items and pagination metadata', async () => {
      const mockPageResponse = {
        content: [
          {
            id: 'n-1',
            title: 'Worker Assigned',
            message: 'Assigned to Ramesh',
            notificationType: 'ASSIGNED',
            severity: 'INFO',
            read: false,
            createdAt: new Date().toISOString()
          },
          {
            id: 'n-2',
            title: 'Resolved',
            message: 'Issue closed',
            notificationType: 'RESOLVED',
            severity: 'LOW',
            read: true,
            createdAt: new Date(Date.now() - 3600000).toISOString()
          }
        ],
        page: 0,
        size: 15,
        totalElements: 2,
        totalPages: 1,
        last: true
      };

      globalThis.fetch = async (url) => {
        assert.ok(url.includes('/api/notifications?page=0&size=15'));
        return {
          ok: true,
          status: 200,
          headers: { get: () => 'application/json' },
          json: async () => mockPageResponse
        };
      };

      const result = await getNotifications({ page: 0, size: 15 });
      assert.equal(result.items.length, 2);
      assert.equal(result.items[0].id, 'n-1');
      assert.equal(result.items[0].read, false);
      assert.equal(result.items[1].read, true);
      assert.equal(result.totalElements, 2);
      assert.equal(result.totalPages, 1);
      assert.equal(result.last, true);
    });

    test('passes unreadOnly=true query param when filter is requested', async () => {
      let requestedUrl = null;
      globalThis.fetch = async (url) => {
        requestedUrl = url;
        return {
          ok: true,
          status: 200,
          headers: { get: () => 'application/json' },
          json: async () => ({ content: [], totalElements: 0, totalPages: 0, last: true })
        };
      };

      await getNotifications({ page: 1, size: 10, unreadOnly: true });
      assert.ok(requestedUrl.includes('page=1'));
      assert.ok(requestedUrl.includes('size=10'));
      assert.ok(requestedUrl.includes('unreadOnly=true'));
    });

    test('strictly propagates 401 Unauthorized without silent fallback', async () => {
      globalThis.fetch = async () => ({
        ok: false,
        status: 401,
        headers: { get: () => 'application/json' },
        json: async () => ({ message: 'Session expired' })
      });

      await assert.rejects(
        async () => {
          await getNotifications();
        },
        (err) => {
          assert.equal(err.status, 401);
          assert.equal(err.message, 'Session expired');
          return true;
        }
      );
    });
  });

  describe('getUnreadCount API calls', () => {
    test('extracts unread count from { count: N } response', async () => {
      globalThis.fetch = async (url) => {
        assert.ok(url.includes('/api/notifications/unread-count'));
        return {
          ok: true,
          status: 200,
          headers: { get: () => 'application/json' },
          json: async () => ({ count: 5 })
        };
      };

      const count = await getUnreadCount();
      assert.equal(count, 5);
    });

    test('handles numeric primitive response directly', async () => {
      globalThis.fetch = async () => ({
        ok: true,
        status: 200,
        headers: { get: () => 'application/json' },
        json: async () => 3
      });

      const count = await getUnreadCount();
      assert.equal(count, 3);
    });

    test('strictly propagates 403 Forbidden without masking', async () => {
      globalThis.fetch = async () => ({
        ok: false,
        status: 403,
        headers: { get: () => 'application/json' },
        json: async () => ({ message: 'Access denied' })
      });

      await assert.rejects(
        async () => {
          await getUnreadCount();
        },
        (err) => {
          assert.equal(err.status, 403);
          return true;
        }
      );
    });
  });

  describe('markAsRead API calls', () => {
    test('calls PATCH /api/notifications/{id}/read and returns mapped notification', async () => {
      let capturedMethod = null;
      let capturedUrl = null;

      globalThis.fetch = async (url, options) => {
        capturedUrl = url;
        capturedMethod = options?.method;
        return {
          ok: true,
          status: 200,
          headers: { get: () => 'application/json' },
          json: async () => ({
            id: 'notif-101',
            title: 'Status Update',
            read: true,
            readAt: '2026-10-25T15:00:00Z'
          })
        };
      };

      const result = await markAsRead('notif-101');
      assert.ok(capturedUrl.includes('/api/notifications/notif-101/read'));
      assert.equal(capturedMethod, 'PATCH');
      assert.equal(result.id, 'notif-101');
      assert.equal(result.read, true);
    });

    test('rejects missing or empty notificationId with 400 Bad Request error', async () => {
      await assert.rejects(
        async () => {
          await markAsRead('');
        },
        (err) => {
          assert.equal(err.status, 400);
          assert.ok(err.message.includes('Notification ID is required'));
          return true;
        }
      );
    });
  });

  describe('markAllAsRead API calls', () => {
    test('calls PATCH /api/notifications/read-all and returns updated count', async () => {
      let capturedMethod = null;
      let capturedUrl = null;

      globalThis.fetch = async (url, options) => {
        capturedUrl = url;
        capturedMethod = options?.method;
        return {
          ok: true,
          status: 200,
          headers: { get: () => 'application/json' },
          json: async () => ({
            message: 'All notifications marked as read',
            updatedCount: 8
          })
        };
      };

      const result = await markAllAsRead();
      assert.ok(capturedUrl.includes('/api/notifications/read-all'));
      assert.equal(capturedMethod, 'PATCH');
      assert.equal(result.updatedCount, 8);
    });
  });
});
