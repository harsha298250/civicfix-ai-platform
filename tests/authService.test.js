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

describe('AuthService Stabilization Tests', () => {
  beforeEach(() => {
    storage.clear();
  });

  test('Defect 5: Unauthenticated visitor session returns null instead of Alex Morgan', () => {
    // When localStorage is empty, getCurrentUser() MUST return null
    const currentUser = authService.getCurrentUser();
    assert.equal(currentUser, null, 'Unauthenticated visitor must not be auto-logged in as Alex Morgan');
  });

  test('Defect 5: Logout clears session so getCurrentUser returns null', () => {
    authService.setCurrentUser(INITIAL_USERS[0]);
    assert.ok(authService.getCurrentUser(), 'User session should exist after setCurrentUser');

    authService.logout();
    assert.equal(authService.getCurrentUser(), null, 'User session must be null after logout');
  });

  test('Defect 3: Registering citizen via email with no phone does not collide with Alex Morgan', async () => {
    const uniqueEmail = `subramanian.test.${Date.now()}@chennaicivic.in`;
    const registered = await authService.registerCitizen({
      name: 'Dr. Subramanian',
      email: uniqueEmail,
      phone: '',
      ward: 'Ward 08, Anna Nagar, Chennai',
      password: 'CustomSecurePass#999'
    });

    assert.ok(registered.id, 'Registered user should have an ID');
    assert.equal(registered.email, uniqueEmail);
    assert.equal(registered.phone, '', 'Phone should be empty string, NOT Alex Morgan phone');
    assert.notEqual(registered.phone, '+91 98401 23456', 'Must not default to Alex Morgan phone number');
  });

  test('Defect 4: Seed demo accounts accept the universal demo password', async () => {
    const seedUser = await authService.login('alex.m@citizen.org', 'CivicSecure#2026!');
    assert.equal(seedUser.id, 'usr-001');
    assert.equal(seedUser.email, 'alex.m@citizen.org');
  });

  test('Defect 4: Registered citizen with custom password REJECTS universal demo password', async () => {
    const customPass = 'UniqueSecret123!';
    const uniqueEmail = `ravi.kumar.${Date.now()}@chennai.org`;
    const uniquePhone = `+91 979${String(Date.now()).slice(-7)}`;
    await authService.registerCitizen({
      name: 'Ravi Kumar',
      email: uniqueEmail,
      phone: uniquePhone,
      ward: 'Ward 04',
      password: customPass
    });

    // Attempt login with universal demo password - MUST FAIL
    await assert.rejects(
      async () => {
        await authService.login(uniqueEmail, 'CivicSecure#2026!');
      },
      (err) => {
        assert.ok(
          /Incorrect password|Invalid credentials/i.test(err.message),
          `Expected password rejection message, got: ${err.message}`
        );
        return true;
      },
      'Universal demo password bypass should be blocked for accounts with custom passwords'
    );

    // Login with the actual custom password - MUST SUCCEED
    const successUser = await authService.login('ravi.kumar@chennai.org', customPass);
    assert.equal(successUser.name, 'Ravi Kumar');
  });
});
