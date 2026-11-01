import { describe, it, beforeEach, mock } from 'node:test';
import assert from 'node:assert/strict';
import { apiClient } from '../src/services/apiClient.js';
import { officerService } from '../src/services/officerService.js';

describe('Closure Trust Score Service & Client Tests', () => {
  beforeEach(() => {
    // Reset global fetch mock
    globalThis.fetch = mock.fn();
  });

  it('apiClient.officer.getClosureTrustScores serializes query parameters correctly', async () => {
    let capturedUrl = '';
    globalThis.fetch = mock.fn(async (url) => {
      capturedUrl = url;
      return {
        ok: true,
        headers: new Headers({ 'content-type': 'application/json' }),
        json: async () => ({
          from: '2026-01-01',
          to: '2026-12-31',
          overall: {
            confirmedClosures: 8,
            citizenRejections: 1,
            reopenedAfterResolution: 1,
            totalClosures: 10,
            trustScore: 80.0,
            statusMessage: 'Calculated'
          },
          byWard: [],
          byOfficer: []
        })
      };
    });

    const res = await apiClient.officer.getClosureTrustScores({
      from: '2026-01-01',
      to: '2026-12-31',
      ward: 'Ward 10, T. Nagar'
    });

    assert.ok(capturedUrl.includes('/officer/analytics/trust'));
    assert.ok(capturedUrl.includes('from=2026-01-01'));
    assert.ok(capturedUrl.includes('to=2026-12-31'));
    assert.ok(capturedUrl.includes('ward=Ward+10%2C+T.+Nagar'));
    assert.equal(res.overall.trustScore, 80.0);
    assert.equal(res.overall.totalClosures, 10);
  });

  it('apiClient.complaints.getPublicTrustScores calls GET /complaints/public/trust without credentials', async () => {
    let capturedUrl = '';
    globalThis.fetch = mock.fn(async (url) => {
      capturedUrl = url;
      return {
        ok: true,
        headers: new Headers({ 'content-type': 'application/json' }),
        json: async () => ({
          from: '2026-10-01',
          to: '2026-10-31',
          overall: {
            confirmedClosures: 5,
            citizenRejections: 0,
            reopenedAfterResolution: 0,
            totalClosures: 5,
            trustScore: 100.0,
            statusMessage: 'Calculated'
          },
          byWard: [
            {
              ward: 'Ward 08, Anna Nagar',
              confirmedClosures: 5,
              citizenRejections: 0,
              reopenedAfterResolution: 0,
              totalClosures: 5,
              trustScore: 100.0,
              statusMessage: 'Calculated'
            }
          ]
        })
      };
    });

    const res = await apiClient.complaints.getPublicTrustScores({
      from: '2026-10-01',
      to: '2026-10-31'
    });

    assert.ok(capturedUrl.includes('/complaints/public/trust'));
    assert.ok(capturedUrl.includes('from=2026-10-01'));
    assert.ok(capturedUrl.includes('to=2026-10-31'));
    assert.equal(res.overall.trustScore, 100.0);
    assert.equal(res.byWard.length, 1);
    assert.equal(res.byOfficer, undefined, 'Public transparency must strictly omit officer data');
  });

  it('officerService.getClosureTrustScores delegates to apiClient.officer.getClosureTrustScores', async () => {
    globalThis.fetch = mock.fn(async () => ({
      ok: true,
      headers: new Headers({ 'content-type': 'application/json' }),
      json: async () => ({
        overall: {
          confirmedClosures: 4,
          citizenRejections: 1,
          reopenedAfterResolution: 0,
          totalClosures: 5,
          trustScore: 80.0,
          statusMessage: 'Calculated'
        },
        byWard: [],
        byOfficer: []
      })
    }));

    const res = await officerService.getClosureTrustScores({ ward: 'Ward 13, Adyar' });
    assert.ok(res.overall);
    assert.equal(res.overall.trustScore, 80.0);
    assert.equal(res.overall.totalClosures, 5);
  });

  it('officerService.getPublicClosureTrustScores delegates to apiClient.complaints.getPublicTrustScores', async () => {
    globalThis.fetch = mock.fn(async () => ({
      ok: true,
      headers: new Headers({ 'content-type': 'application/json' }),
      json: async () => ({
        overall: {
          confirmedClosures: 2,
          citizenRejections: 1,
          reopenedAfterResolution: 0,
          totalClosures: 3,
          trustScore: null,
          statusMessage: 'Not enough data (< 5 closures)'
        },
        byWard: []
      })
    }));

    const res = await officerService.getPublicClosureTrustScores();
    assert.ok(res.overall);
    assert.equal(res.overall.trustScore, null);
    assert.equal(res.overall.statusMessage, 'Not enough data (< 5 closures)');
  });

  it('Trust Score formula matches manual calculation and threshold rules', () => {
    const calc = (confirmed, rejected, reopened) => {
      const total = confirmed + rejected + reopened;
      if (total < 5) return { score: null, message: 'Not enough data (< 5 closures)' };
      const score = Math.round((confirmed * 100.0 / total) * 10) / 10;
      return { score, message: 'Calculated' };
    };

    // 8 confirmed, 1 rejected, 1 reopened (total 10) = 80.0%
    const c1 = calc(8, 1, 1);
    assert.equal(c1.score, 80.0);
    assert.equal(c1.message, 'Calculated');

    // 4 confirmed, 1 rejected, 0 reopened (total 5) = 80.0%
    const c2 = calc(4, 1, 0);
    assert.equal(c2.score, 80.0);
    assert.equal(c2.message, 'Calculated');

    // 5 confirmed, 0 rejected, 0 reopened (total 5) = 100.0%
    const c3 = calc(5, 0, 0);
    assert.equal(c3.score, 100.0);
    assert.equal(c3.message, 'Calculated');

    // 2 confirmed, 1 rejected, 0 reopened (total 3 < 5) = null
    const c4 = calc(2, 1, 0);
    assert.equal(c4.score, null);
    assert.equal(c4.message, 'Not enough data (< 5 closures)');

    // 0 confirmed, 0 rejected, 0 reopened (total 0 < 5) = null
    const c5 = calc(0, 0, 0);
    assert.equal(c5.score, null);
    assert.equal(c5.message, 'Not enough data (< 5 closures)');
  });
});

