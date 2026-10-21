import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import {
  extractDigits,
  normalizeIndianPhone,
  isValidIndianPhone,
  formatIndianPhone,
  normalizeEmail,
  detectContactType,
  canonicalizeContact
} from '../src/utils/phoneUtils.js';

describe('Phone & Contact Utilities', () => {
  test('extractDigits strips non-digit characters', () => {
    assert.equal(extractDigits('+91 98401 23456'), '919840123456');
    assert.equal(extractDigits('098401-23456'), '09840123456');
    assert.equal(extractDigits(''), '');
    assert.equal(extractDigits(null), '');
  });

  test('normalizeIndianPhone normalizes to canonical +91 format', () => {
    assert.equal(normalizeIndianPhone('9840123456'), '+919840123456');
    assert.equal(normalizeIndianPhone('09840123456'), '+919840123456');
    assert.equal(normalizeIndianPhone('+91 98401 23456'), '+919840123456');
    assert.equal(normalizeIndianPhone('919840123456'), '+919840123456');
    assert.equal(normalizeIndianPhone(''), '');
    assert.equal(normalizeIndianPhone(null), '');
  });

  test('isValidIndianPhone accurately validates Indian 10-digit mobile series', () => {
    assert.equal(isValidIndianPhone('9840123456'), true);
    assert.equal(isValidIndianPhone('+91 98401 23456'), true);
    assert.equal(isValidIndianPhone('8840123456'), true);
    assert.equal(isValidIndianPhone('7840123456'), true);
    assert.equal(isValidIndianPhone('6840123456'), true);

    // Invalid numbers: starts with 1-5 or wrong digit length
    assert.equal(isValidIndianPhone('5840123456'), false);
    assert.equal(isValidIndianPhone('1234567890'), false);
    assert.equal(isValidIndianPhone('984012345'), false); // 9 digits
    assert.equal(isValidIndianPhone('98401234567'), false); // 11 digits
  });

  test('formatIndianPhone provides clean display representation', () => {
    assert.equal(formatIndianPhone('9840123456'), '+91 98401 23456');
    assert.equal(formatIndianPhone('+919840123456'), '+91 98401 23456');
    assert.equal(formatIndianPhone(''), '');
  });

  test('normalizeEmail lowercases and trims email addresses', () => {
    assert.equal(normalizeEmail('  Alex.M@Citizen.ORG  '), 'alex.m@citizen.org');
    assert.equal(normalizeEmail(''), '');
  });

  test('detectContactType detects PHONE vs EMAIL vs UNKNOWN', () => {
    assert.equal(detectContactType('alex.m@citizen.org'), 'EMAIL');
    assert.equal(detectContactType('+91 98401 23456'), 'PHONE');
    assert.equal(detectContactType('9840123456'), 'PHONE');
    assert.equal(detectContactType('invalid_identifier'), 'UNKNOWN');
  });

  test('canonicalizeContact produces uniform format for storage and matching', () => {
    assert.equal(canonicalizeContact(' Alex.M@Citizen.ORG '), 'alex.m@citizen.org');
    assert.equal(canonicalizeContact('98401 23456'), '+919840123456');
  });
});
