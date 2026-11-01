import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');

describe('Progressive Web App (PWA) & Offline Shell Validation Tests', () => {

  test('Public PWA static assets and icons exist and have non-zero size', () => {
    const requiredFiles = [
      'public/pwa-192x192.png',
      'public/pwa-512x512.png',
      'public/maskable-icon-512x512.png',
      'public/apple-touch-icon.png',
      'public/favicon.svg',
      'public/offline.html',
      'public/fonts/fonts.css'
    ];

    for (const relPath of requiredFiles) {
      const fullPath = path.join(rootDir, relPath);
      assert.ok(fs.existsSync(fullPath), `Asset ${relPath} must exist in project`);
      const stat = fs.statSync(fullPath);
      assert.ok(stat.size > 0, `Asset ${relPath} must not be empty`);
    }
  });

  test('Local fonts bundle exists and covers Material Symbols, Inter, JetBrains Mono, and Noto Sans Tamil', () => {
    const fontsCssPath = path.join(rootDir, 'public/fonts/fonts.css');
    const cssContent = fs.readFileSync(fontsCssPath, 'utf8');

    assert.ok(cssContent.includes('Material Symbols Outlined'), 'fonts.css must define Material Symbols Outlined');
    assert.ok(cssContent.includes("'Inter'"), 'fonts.css must define Inter font family');
    assert.ok(cssContent.includes("'JetBrains Mono'"), 'fonts.css must define JetBrains Mono font family');
    assert.ok(cssContent.includes("'Noto Sans Tamil'"), 'fonts.css must define Noto Sans Tamil font family');

    const fontsDir = path.join(rootDir, 'public/fonts');
    const fontFiles = fs.readdirSync(fontsDir).filter(f => f.endsWith('.woff2'));
    assert.ok(fontFiles.length >= 10, 'All required font woff2 files must be stored locally in public/fonts');

    // Extract all url(/fonts/...) paths from fonts.css and ensure each referenced file exists on disk
    const urlMatches = [...cssContent.matchAll(/url\(\/fonts\/([^)]+\.woff2)\)/g)];
    assert.ok(urlMatches.length > 0, 'fonts.css must reference local woff2 files');
    for (const match of urlMatches) {
      const fontFilename = match[1];
      const fontFilePath = path.join(fontsDir, fontFilename);
      assert.ok(fs.existsSync(fontFilePath), `Referenced font file ${fontFilename} must exist on disk`);
      assert.ok(fs.statSync(fontFilePath).size > 0, `Font file ${fontFilename} must not be empty`);
    }
  });

  test('index.html uses local fonts and has no external Google Font CDN dependencies', () => {
    const indexPath = path.join(rootDir, 'index.html');
    const indexHtml = fs.readFileSync(indexPath, 'utf8');

    assert.ok(!indexHtml.includes('fonts.googleapis.com'), 'index.html must not link to fonts.googleapis.com');
    assert.ok(!indexHtml.includes('fonts.gstatic.com'), 'index.html must not preconnect to fonts.gstatic.com');
    assert.ok(indexHtml.includes('/fonts/fonts.css'), 'index.html must reference local /fonts/fonts.css');
    assert.ok(indexHtml.includes('theme-color'), 'index.html must specify theme-color meta tag');
    assert.ok(indexHtml.includes('#137A70'), 'index.html theme-color must match municipal teal #137A70');
  });

  test('vite.config.js configures VitePWA with strict NetworkOnly API policy and standalone manifest', () => {
    const configPath = path.join(rootDir, 'vite.config.js');
    const configContent = fs.readFileSync(configPath, 'utf8');

    assert.ok(configContent.includes('VitePWA'), 'vite.config.js must import and use VitePWA plugin');
    assert.ok(configContent.includes("name: 'CivicFix'"), 'Manifest must configure name CivicFix');
    assert.ok(configContent.includes("short_name: 'CivicFix'"), 'Manifest must configure short_name CivicFix');
    assert.ok(configContent.includes("display: 'standalone'"), 'Manifest display mode must be standalone');
    assert.ok(configContent.includes("theme_color: '#137A70'"), 'Manifest theme_color must be #137A70');
    assert.ok(configContent.includes("background_color: '#f8f9ff'"), 'Manifest background_color must be #f8f9ff');

    // Caching rules
    assert.ok(configContent.includes("handler: 'NetworkOnly'"), 'API calls must be strictly NetworkOnly');
    assert.ok(configContent.includes("navigateFallbackDenylist"), 'navigateFallbackDenylist must be configured');
    assert.ok(configContent.includes("/^\\/api\\//"), 'API paths must be excluded from navigate fallback');
  });

  test('offline.html provides clear municipal offline explanation without cached mutations', () => {
    const offlinePath = path.join(rootDir, 'public/offline.html');
    const offlineHtml = fs.readFileSync(offlinePath, 'utf8').toLowerCase();

    assert.ok(offlineHtml.includes('civicfix'), 'offline.html must present CivicFix brand');
    assert.ok(offlineHtml.includes('network unavailable') || offlineHtml.includes('offline'), 'offline.html must present offline notice');
    assert.ok(
      offlineHtml.includes('municipal audit integrity') || offlineHtml.includes('offline data creation'),
      'offline.html must state that offline mutations/sessions are restricted for audit integrity'
    );
  });

  test('PWA UI components exist in project structure', () => {
    const components = [
      'src/components/common/InstallPwaButton.jsx',
      'src/components/common/OfflineScreen.jsx',
      'src/components/common/ReloadPrompt.jsx'
    ];

    for (const compPath of components) {
      const fullPath = path.join(rootDir, compPath);
      assert.ok(fs.existsSync(fullPath), `${compPath} component must exist`);
    }
  });

  test('docs/DEPLOYMENT_CHECKLIST.md documents mandatory HTTPS requirements for PWA service workers', () => {
    const docPath = path.join(rootDir, 'docs/DEPLOYMENT_CHECKLIST.md');
    assert.ok(fs.existsSync(docPath), 'docs/DEPLOYMENT_CHECKLIST.md must exist');
    const docContent = fs.readFileSync(docPath, 'utf8');
    assert.ok(docContent.includes('HTTPS'), 'Checklist must document HTTPS requirement');
    assert.ok(docContent.includes('Service Worker') || docContent.includes('PWA'), 'Checklist must document Service Worker/PWA secure context');
  });
});
