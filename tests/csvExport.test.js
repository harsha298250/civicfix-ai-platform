import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { escapeCsvCell, formatAuditLogsToCsv } from '../src/utils/csvExport.js';

describe('CSV Escaping and Export Utility', () => {
  describe('escapeCsvCell', () => {
    test('handles null and undefined by returning an empty string', () => {
      assert.equal(escapeCsvCell(null), '');
      assert.equal(escapeCsvCell(undefined), '');
    });

    test('returns simple strings without alteration', () => {
      assert.equal(escapeCsvCell('ACTIVE'), 'ACTIVE');
      assert.equal(escapeCsvCell('12345'), '12345');
      assert.equal(escapeCsvCell('Ward 08 Anna Nagar'), 'Ward 08 Anna Nagar');
    });

    test('escapes strings containing commas by enclosing in quotes', () => {
      assert.equal(escapeCsvCell('Chennai, Tamil Nadu'), '"Chennai, Tamil Nadu"');
    });

    test('escapes strings containing quotes by doubling quotes and enclosing in quotes', () => {
      assert.equal(escapeCsvCell('Pothole near "KFC"'), '"Pothole near ""KFC"""');
    });

    test('escapes strings containing newlines by enclosing in quotes', () => {
      assert.equal(escapeCsvCell('Line 1\nLine 2'), '"Line 1\nLine 2"');
      assert.equal(escapeCsvCell('Line 1\r\nLine 2'), '"Line 1\r\nLine 2"');
    });

    test('neutralizes CSV formula injection prefix characters (=, +, -, @)', () => {
      assert.equal(escapeCsvCell('=CMD|/C calc!A0'), "'=CMD|/C calc!A0");
      assert.equal(escapeCsvCell('+SUM(A1:A10)'), "'+SUM(A1:A10)");
      assert.equal(escapeCsvCell('-100'), "'-100");
      assert.equal(escapeCsvCell('@evil'), "'@evil");
    });
  });

  describe('formatAuditLogsToCsv', () => {
    test('generates a CSV with UTF-8 BOM and correct headers for empty logs', () => {
      const csv = formatAuditLogsToCsv([]);
      assert.equal(csv.startsWith('\uFEFF'), true);
      assert.equal(
        csv.includes('Timestamp,Event ID,Actor Name,Actor Role,Actor ID,Action,Target Type,Target ID,Status,IP Address,Details'),
        true
      );
    });

    test('correctly maps audit log fields and escapes complex content', () => {
      const logs = [
        {
          id: 'log-1',
          createdAt: '2026-11-01T10:00:00Z',
          actorName: 'Priya Sharma, Admin',
          actorRole: 'ADMIN',
          actorId: 'admin-uuid-1',
          action: 'STAFF_ACCOUNT_CREATED',
          targetType: 'USER',
          targetId: 'user-uuid-2',
          status: 'SUCCESS',
          ipAddress: '127.0.0.1',
          details: 'Provisioned officer with note: "Immediate deployment"\nSector 4'
        }
      ];

      const csv = formatAuditLogsToCsv(logs);
      assert.equal(csv.startsWith('\uFEFF'), true);

      const lines = csv.replace('\uFEFF', '').split('\r\n');
      assert.equal(lines.length, 2);

      // Check that actor with comma is quoted
      assert.equal(lines[1].includes('"Priya Sharma, Admin"'), true);

      // Check that details with quotes and newline is properly quoted and doubled
      assert.equal(lines[1].includes('"Provisioned officer with note: ""Immediate deployment""\nSector 4"'), true);
    });
  });
});
