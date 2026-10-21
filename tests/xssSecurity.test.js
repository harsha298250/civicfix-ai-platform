import { test, describe } from 'node:test';
import assert from 'node:assert/strict';

const escapeHtml = (str) => {
  if (str === null || str === undefined) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
};

describe('XSS Security Sanitization Tests (Defect 7)', () => {
  test('Escapes HTML angle brackets to prevent script injection', () => {
    const malicious = '<script>alert("XSS")</script>';
    const sanitized = escapeHtml(malicious);
    assert.equal(sanitized, '&lt;script&gt;alert(&quot;XSS&quot;)&lt;/script&gt;');
    assert.equal(sanitized.includes('<script>'), false);
  });

  test('Escapes img onerror payload', () => {
    const malicious = '<img src=x onerror=alert(1)>';
    const sanitized = escapeHtml(malicious);
    assert.equal(sanitized, '&lt;img src=x onerror=alert(1)&gt;');
    assert.equal(sanitized.includes('<img'), false);
  });

  test('Escapes single and double quotes and ampersands', () => {
    const input = `Road & Bridge "Hazard" 'Critical'`;
    const sanitized = escapeHtml(input);
    assert.equal(sanitized, 'Road &amp; Bridge &quot;Hazard&quot; &#39;Critical&#39;');
  });

  test('Handles null, undefined, numbers and empty strings safely', () => {
    assert.equal(escapeHtml(null), '');
    assert.equal(escapeHtml(undefined), '');
    assert.equal(escapeHtml(''), '');
    assert.equal(escapeHtml(12345), '12345');
  });
});
