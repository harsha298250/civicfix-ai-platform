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

import { authService, isDemoModeEnabled } from '../src/services/authService.js';

describe('Demo Mode & Persona Switcher Gating Tests', () => {
  const originalEnvValue = process.env.VITE_DEMO_MODE;

  beforeEach(() => {
    storage.clear();
    delete process.env.VITE_DEMO_MODE;
  });

  afterEach(() => {
    if (originalEnvValue !== undefined) {
      process.env.VITE_DEMO_MODE = originalEnvValue;
    } else {
      delete process.env.VITE_DEMO_MODE;
    }
  });

  test('isDemoModeEnabled returns false by default when VITE_DEMO_MODE is unset', () => {
    delete process.env.VITE_DEMO_MODE;
    assert.equal(isDemoModeEnabled(), false, 'Demo mode must be disabled by default');
  });

  test('isDemoModeEnabled returns false when VITE_DEMO_MODE is "false"', () => {
    process.env.VITE_DEMO_MODE = 'false';
    assert.equal(isDemoModeEnabled(), false, 'Demo mode must be disabled when explicitly set to false');
  });

  test('authService.switchRole is blocked and throws clear error when demo mode is off', () => {
    delete process.env.VITE_DEMO_MODE;
    assert.equal(authService.getCurrentUser(), null);

    assert.throws(
      () => {
        authService.switchRole('ADMIN');
      },
      (err) => {
        assert.ok(err instanceof Error);
        assert.match(err.message, /Demo mode is disabled\. Role switching is not permitted\./);
        return true;
      },
      'switchRole must throw when demo mode is disabled'
    );

    // Ensure session was NOT mutated
    assert.equal(authService.getCurrentUser(), null, 'Current user must not change when switchRole is blocked');
  });

  test('authService.switchRole succeeds only when VITE_DEMO_MODE is "true"', () => {
    process.env.VITE_DEMO_MODE = 'true';
    assert.equal(isDemoModeEnabled(), true, 'Demo mode must be active when set to true');

    const adminUser = authService.switchRole('ADMIN');
    assert.ok(adminUser, 'Admin persona should be returned');
    assert.equal(adminUser.role, 'ADMIN');
    assert.equal(adminUser.email, 'priya.sharma@admin.metro.gov');
    assert.equal(authService.getCurrentUser()?.role, 'ADMIN');

    // Switch to WORKER
    const workerUser = authService.switchRole('WORKER');
    assert.equal(workerUser.role, 'WORKER');
    assert.equal(authService.getCurrentUser()?.role, 'WORKER');
  });

  test('Reverting VITE_DEMO_MODE immediately blocks further role switching', () => {
    // Enable demo mode
    process.env.VITE_DEMO_MODE = 'true';
    authService.switchRole('OFFICER');
    assert.equal(authService.getCurrentUser()?.role, 'OFFICER');

    // Disable demo mode
    process.env.VITE_DEMO_MODE = 'false';
    assert.throws(
      () => {
        authService.switchRole('ADMIN');
      },
      /Demo mode is disabled/,
      'Must re-block role switching when environment flag is turned off'
    );

    // Current user remains the previously active officer, not admin
    assert.equal(authService.getCurrentUser()?.role, 'OFFICER');
  });
});
