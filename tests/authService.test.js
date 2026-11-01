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

import { authService } from '../src/services/authService.js';
import { INITIAL_USERS } from '../src/services/mockData.js';
import { apiClient } from '../src/services/apiClient.js';

describe('AuthService Server-Authoritative Tests', () => {
  beforeEach(() => {
    storage.clear();
    authService.setCurrentUser(null);
  });

  test('Unauthenticated visitor session returns null instead of Alex Morgan', () => {
    const currentUser = authService.getCurrentUser();
    assert.equal(currentUser, null, 'Unauthenticated visitor must not be auto-logged in as Alex Morgan');
  });

  test('Logout clears session so getCurrentUser returns null', async () => {
    authService.setCurrentUser(INITIAL_USERS[0]);
    assert.ok(authService.getCurrentUser(), 'User session should exist after setCurrentUser');

    await authService.logout();
    assert.equal(authService.getCurrentUser(), null, 'User session must be null after logout');
  });

  test('With backend stopped, login fails with clear server unreachable error and saves nothing', async () => {
    // Backend is not running on port 8080 during unit tests
    await assert.rejects(
      async () => {
        await authService.login('alex.m@citizen.org', 'CivicSecure#2026!');
      },
      (err) => {
        assert.ok(err instanceof Error);
        assert.match(err.message, /Cannot reach the server\. Nothing was saved\./);
        return true;
      },
      'Login must reject with clear message when backend is unreachable'
    );

    // Verify nothing was saved in session or storage
    assert.equal(authService.getCurrentUser(), null, 'Current user must remain null when login fails');
    assert.equal(localStorage.getItem('civicfix_current_user_v1'), null, 'No user should be saved in localStorage');
  });

  test('With backend stopped, registerCitizen fails with clear server unreachable error and saves nothing', async () => {
    const uniqueEmail = `test.citizen.${Date.now()}@chennaicivic.in`;

    await assert.rejects(
      async () => {
        await authService.registerCitizen({
          name: 'Kavitha R',
          email: uniqueEmail,
          phone: '+91 98401 99999',
          ward: 'Ward 08',
          password: 'SecurePass#2026'
        });
      },
      (err) => {
        assert.ok(err instanceof Error);
        assert.match(err.message, /Cannot reach the server\. Nothing was saved\./);
        return true;
      },
      'Registration must reject with clear message when backend is unreachable'
    );

    // Verify nothing was saved
    assert.equal(authService.getCurrentUser(), null, 'No session should be active after failed registration');
    assert.equal(localStorage.getItem('civicfix_current_user_v1'), null, 'No user record should be created in localStorage');
  });

  test('checkSession rejects and does not treat cached user as logged in when server is unreachable', async () => {
    // Simulate legacy cached user in memory
    authService.setCurrentUser(INITIAL_USERS[0]);
    assert.ok(authService.getCurrentUser());

    await assert.rejects(
      async () => {
        await authService.checkSession();
      },
      (err) => {
        assert.ok(err.isServerUnreachable);
        assert.match(err.message, /Cannot reach the server/);
        return true;
      },
      'checkSession must reject when server cannot be reached'
    );

    // Active user must be cleared (never treat cached user as logged in)
    assert.equal(authService.getCurrentUser(), null, 'Session must be cleared on server unreachable');
  });

  test('When backend confirms login, user is returned and session is set', async () => {
    const originalLogin = apiClient.auth.login;
    try {
      apiClient.auth.login = async () => ({
        success: true,
        data: {
          id: '00000000-0000-0000-0000-000000000001',
          name: 'Alex Morgan',
          email: 'alex.m@citizen.org',
          role: 'CITIZEN'
        }
      });

      const user = await authService.login('alex.m@citizen.org', 'ValidPass123!');
      assert.equal(user.name, 'Alex Morgan');
      assert.equal(user.role, 'CITIZEN');
      assert.equal(user.isLiveBackend, true);
      assert.equal(authService.getCurrentUser()?.name, 'Alex Morgan');
    } finally {
      apiClient.auth.login = originalLogin;
    }
  });

  test('Backend 401/403 credentials error is propagated without mock fallback', async () => {
    const originalLogin = apiClient.auth.login;
    try {
      apiClient.auth.login = async () => {
        const err = new Error('Invalid credentials. Please verify your email or mobile number and password.');
        err.status = 401;
        throw err;
      };

      await assert.rejects(
        async () => {
          await authService.login('alex.m@citizen.org', 'WrongPass!');
        },
        (err) => {
          assert.match(err.message, /Invalid credentials/);
          return true;
        }
      );
      assert.equal(authService.getCurrentUser(), null);
    } finally {
      apiClient.auth.login = originalLogin;
    }
  });

  test('Backend 429 lockout error is propagated with friendly message and saves nothing', async () => {
    const originalLogin = apiClient.auth.login;
    try {
      apiClient.auth.login = async () => {
        const err = new Error('Too many requests. Please wait 60 seconds before trying again.');
        err.status = 429;
        err.retryAfter = 60;
        throw err;
      };

      await assert.rejects(
        async () => {
          await authService.login('alex.m@citizen.org', 'WrongPass!');
        },
        (err) => {
          assert.match(err.message, /Too many requests/);
          assert.match(err.message, /60 seconds/);
          return true;
        }
      );
      assert.equal(authService.getCurrentUser(), null, 'Locked out user must not be logged in');
    } finally {
      apiClient.auth.login = originalLogin;
    }
  });

  test('Registration completes in one step against backend without simulated OTP', async () => {
    const originalRegister = apiClient.auth.register;
    let capturedPayload = null;
    try {
      apiClient.auth.register = async (payload) => {
        capturedPayload = payload;
        return {
          success: true,
          data: {
            id: '11111111-2222-3333-4444-555555555555',
            name: payload.name,
            email: payload.email,
            phone: payload.phone,
            role: 'CITIZEN',
            ward: payload.ward,
            accountStatus: 'ACTIVE'
          }
        };
      };

      const registered = await authService.registerCitizen({
        name: 'Lakshmi Narayanan',
        email: 'lakshmi.n@chennaicivic.in',
        phone: '+91 98401 23456',
        ward: 'Ward 08',
        password: 'SecurePass#2026!'
      });

      assert.equal(registered.name, 'Lakshmi Narayanan');
      assert.equal(registered.role, 'CITIZEN');
      assert.equal(registered.isLiveBackend, true);
      assert.equal(capturedPayload.name, 'Lakshmi Narayanan');
      assert.equal(capturedPayload.email, 'lakshmi.n@chennaicivic.in');
      assert.equal(authService.getCurrentUser()?.name, 'Lakshmi Narayanan');
    } finally {
      apiClient.auth.register = originalRegister;
    }
  });

  test('Simulated client-side OTP functions are removed from authService', () => {
    // Note: Simulated OTP was removed because client-side generation without server validation
    // provides no genuine security and is misleading to citizens.
    assert.equal(typeof authService.requestRegistrationOtp, 'undefined');
    assert.equal(typeof authService.verifyRegistrationOtp, 'undefined');
    assert.equal(typeof authService.sendRegistrationOtp, 'undefined');
  });

  test('Backend 409 duplicate registration conflict is propagated directly', async () => {
    const originalRegister = apiClient.auth.register;
    try {
      apiClient.auth.register = async () => {
        const err = new Error('An account is already registered with this email address.');
        err.status = 409;
        throw err;
      };

      await assert.rejects(
        async () => {
          await authService.registerCitizen({
            name: 'Lakshmi Narayanan',
            email: 'existing@chennaicivic.in',
            phone: '+91 98401 23456',
            ward: 'Ward 08',
            password: 'SecurePass#2026!'
          });
        },
        (err) => {
          assert.match(err.message, /already registered/);
          return true;
        }
      );
    } finally {
      apiClient.auth.register = originalRegister;
    }
  });
});
