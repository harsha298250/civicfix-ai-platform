import { test, describe, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import { getApiBaseUrl, getCookie, apiRequest, apiClient } from '../src/services/apiClient.js';

describe('API Client Adapter Tests', () => {
  const originalFetch = globalThis.fetch;
  const originalDocument = globalThis.document;

  beforeEach(() => {
    // Setup document mock for cookie parsing
    globalThis.document = {
      cookie: 'XSRF-TOKEN=test-csrf-token-12345; other_cookie=xyz'
    };
  });

  afterEach(() => {
    globalThis.fetch = originalFetch;
    globalThis.document = originalDocument;
  });

  test('getApiBaseUrl resolves correctly', () => {
    const url = getApiBaseUrl();
    assert.ok(url, 'Base URL must be non-empty string');
    assert.ok(url.includes('/api') || url.startsWith('http'), 'Base URL must point to API endpoint');
  });

  test('getCookie parses cookies from document.cookie', () => {
    assert.equal(getCookie('XSRF-TOKEN'), 'test-csrf-token-12345');
    assert.equal(getCookie('other_cookie'), 'xyz');
    assert.equal(getCookie('nonexistent'), null);
  });

  test('apiRequest attaches X-XSRF-TOKEN on POST requests', async () => {
    let capturedUrl = null;
    let capturedOptions = null;

    globalThis.fetch = async (url, options) => {
      capturedUrl = url;
      capturedOptions = options;
      return {
        ok: true,
        status: 200,
        headers: {
          get: (h) => (h.toLowerCase() === 'content-type' ? 'application/json' : null)
        },
        json: async () => ({ success: true, message: 'OK' })
      };
    };

    const result = await apiRequest('/test-endpoint', {
      method: 'POST',
      body: { key: 'value' }
    });

    assert.ok(capturedUrl.includes('/test-endpoint'));
    assert.equal(capturedOptions.method, 'POST');
    assert.equal(capturedOptions.headers['X-XSRF-TOKEN'], 'test-csrf-token-12345');
    assert.equal(capturedOptions.headers['Content-Type'], 'application/json');
    assert.equal(capturedOptions.credentials, 'include');
    assert.equal(result.success, true);
  });

  test('apiRequest does not attach X-XSRF-TOKEN on GET requests', async () => {
    let capturedOptions = null;

    globalThis.fetch = async (url, options) => {
      capturedOptions = options;
      return {
        ok: true,
        status: 200,
        headers: {
          get: (h) => (h.toLowerCase() === 'content-type' ? 'application/json' : null)
        },
        json: async () => ({ status: 'UP' })
      };
    };

    await apiRequest('/health');
    assert.equal(capturedOptions.method, 'GET');
    assert.equal(capturedOptions.headers['X-XSRF-TOKEN'], undefined);
  });

  test('apiRequest throws structured error with HTTP status when response is not ok', async () => {
    globalThis.fetch = async () => ({
      ok: false,
      status: 401,
      headers: {
        get: (h) => (h.toLowerCase() === 'content-type' ? 'application/json' : null)
      },
      json: async () => ({ message: 'Unauthorized session' })
    });

    await assert.rejects(
      async () => {
        await apiRequest('/auth/me');
      },
      (err) => {
        assert.equal(err.status, 401);
        assert.equal(err.message, 'Unauthorized session');
        return true;
      }
    );
  });

  test('apiRequest transforms connection failure into actionable offline error', async () => {
    globalThis.fetch = async () => {
      const connErr = new TypeError('fetch failed');
      connErr.cause = { code: 'ECONNREFUSED' };
      throw connErr;
    };

    await assert.rejects(
      async () => {
        await apiRequest('/health');
      },
      (err) => {
        assert.equal(err.status, 0);
        assert.ok(err.message.includes('Cannot connect to CivicFix backend'));
        return true;
      }
    );
  });

  test('apiClient interface exposes all required modules', () => {
    assert.equal(typeof apiClient.checkHealth, 'function');
    assert.equal(typeof apiClient.auth.login, 'function');
    assert.equal(typeof apiClient.auth.logout, 'function');
    assert.equal(typeof apiClient.auth.register, 'function');
    assert.equal(typeof apiClient.auth.getCurrentUser, 'function');
    assert.equal(typeof apiClient.complaints.create, 'function');
    assert.equal(typeof apiClient.complaints.list, 'function');
    assert.equal(typeof apiClient.complaints.getById, 'function');
    assert.equal(typeof apiClient.complaints.getHistory, 'function');
    assert.equal(typeof apiClient.notifications.list, 'function');
    assert.equal(typeof apiClient.notifications.getUnreadCount, 'function');
    assert.equal(typeof apiClient.notifications.markAsRead, 'function');
    assert.equal(typeof apiClient.notifications.markAllAsRead, 'function');
    assert.equal(typeof apiClient.officer.getAnalyticsSummary, 'function');
    assert.equal(typeof apiClient.admin.resetDemoData, 'function');
  });

  test('apiClient.officer.getAnalyticsSummary serializes query parameters correctly', async () => {
    let capturedUrl = null;
    globalThis.fetch = async (url) => {
      capturedUrl = url;
      return {
        ok: true,
        status: 200,
        headers: { get: () => 'application/json' },
        json: async () => ({ totalComplaints: 0 })
      };
    };

    await apiClient.officer.getAnalyticsSummary({
      from: '2026-01-01',
      to: '2026-12-31',
      ward: 'Ward 10, T. Nagar',
      category: 'Roads'
    });

    assert.ok(capturedUrl.includes('/officer/analytics/summary'));
    assert.ok(capturedUrl.includes('from=2026-01-01'));
    assert.ok(capturedUrl.includes('to=2026-12-31'));
    assert.ok(capturedUrl.includes('ward=Ward+10%2C+T.+Nagar'));
    assert.ok(capturedUrl.includes('category=Roads'));
  });

  test('apiRequest handles HTTP 429 Too Many Requests cleanly with Retry-After and never retries in a loop', async () => {
    let callCount = 0;
    globalThis.fetch = async () => {
      callCount++;
      return {
        ok: false,
        status: 429,
        headers: {
          get: (h) => {
            if (h.toLowerCase() === 'content-type') return 'application/json';
            if (h.toLowerCase() === 'retry-after') return '60';
            return null;
          }
        },
        json: async () => ({
          status: 429,
          error: 'Too Many Requests',
          message: 'Account temporarily locked due to multiple failed login attempts.',
          retryAfterSeconds: 60
        })
      };
    };

    await assert.rejects(
      async () => {
        await apiRequest('/auth/login', { method: 'POST', body: { identifier: 'user@test.org', password: 'bad' } });
      },
      (err) => {
        assert.equal(err.status, 429);
        assert.equal(err.retryAfter, 60);
        assert.ok(err.message.includes('Too many requests. Please wait 60 seconds before trying again.'));
        return true;
      }
    );

    // Verify it never looped or automatically retried
    assert.equal(callCount, 1, 'HTTP 429 must be handled once without auto-retrying in a loop');
  });
});
