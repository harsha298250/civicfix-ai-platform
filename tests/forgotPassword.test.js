import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');

describe('ForgotPasswordPage Honest Notice Tests', () => {
  const pagePath = path.join(rootDir, 'src/pages/public/ForgotPasswordPage.jsx');
  assert.ok(fs.existsSync(pagePath), 'ForgotPasswordPage.jsx must exist');
  const pageContent = fs.readFileSync(pagePath, 'utf8');

  test('Page contains no form submission that claims success or fake dispatch', () => {
    // Must contain no form element or submit handlers
    assert.ok(!pageContent.includes('<form'), 'ForgotPasswordPage must not contain a form element');
    assert.ok(!pageContent.includes('onSubmit'), 'ForgotPasswordPage must not have onSubmit handlers');
    assert.ok(!pageContent.includes('handleSubmit'), 'ForgotPasswordPage must not define handleSubmit');
    assert.ok(!pageContent.includes('setDispatched'), 'ForgotPasswordPage must not have dispatched state');
    assert.ok(!pageContent.includes('showToast'), 'ForgotPasswordPage must not show fake success/info toasts');
  });

  test('Page contains no invented protocol claims or fake security keywords', () => {
    // Grepping for RFC-7519, Zero-Knowledge, or passkey must return nothing
    assert.ok(!pageContent.includes('RFC-7519'), 'Must not claim RFC-7519');
    assert.ok(!pageContent.toLowerCase().includes('zero-knowledge'), 'Must not claim Zero-Knowledge protocol');
    assert.ok(!pageContent.toLowerCase().includes('passkey'), 'Must not claim single-use cryptographic passkeys');
    assert.ok(!pageContent.includes('recovery link generated'), 'Must not claim recovery link was generated');
  });

  test('Page displays honest notice and directs users to system administrator', () => {
    assert.ok(
      pageContent.includes('Password reset via automated email is not available in this version'),
      'Must contain honest notice about unavailable automated email reset'
    );
    assert.ok(
      pageContent.includes('contact the system administrator'),
      'Must instruct users to contact the system administrator'
    );
  });

  test('Route /forgot-password remains registered and linked from LoginPage', () => {
    const appPath = path.join(rootDir, 'src/App.jsx');
    const appContent = fs.readFileSync(appPath, 'utf8');
    assert.ok(
      appContent.includes('path="/forgot-password"'),
      'App.jsx must retain /forgot-password route'
    );

    const loginPath = path.join(rootDir, 'src/pages/public/LoginPage.jsx');
    const loginContent = fs.readFileSync(loginPath, 'utf8');
    assert.ok(
      loginContent.includes('to="/forgot-password"'),
      'LoginPage.jsx must link to /forgot-password'
    );
  });

  test('Locale dictionaries provide English and Tamil translations for password assistance', () => {
    const enPath = path.join(rootDir, 'src/locales/en.json');
    const taPath = path.join(rootDir, 'src/locales/ta.json');

    const en = JSON.parse(fs.readFileSync(enPath, 'utf8'));
    const ta = JSON.parse(fs.readFileSync(taPath, 'utf8'));

    assert.ok(en.auth.forgotPasswordTitle, 'en.json must define auth.forgotPasswordTitle');
    assert.ok(en.auth.forgotPasswordNotice, 'en.json must define auth.forgotPasswordNotice');
    assert.ok(en.auth.forgotPasswordContact, 'en.json must define auth.forgotPasswordContact');
    assert.ok(en.auth.backToSignIn, 'en.json must define auth.backToSignIn');

    assert.ok(ta.auth.forgotPasswordTitle, 'ta.json must define auth.forgotPasswordTitle');
    assert.ok(ta.auth.forgotPasswordNotice, 'ta.json must define auth.forgotPasswordNotice');
    assert.ok(ta.auth.forgotPasswordContact, 'ta.json must define auth.forgotPasswordContact');
    assert.ok(ta.auth.backToSignIn, 'ta.json must define auth.backToSignIn');
  });
});

