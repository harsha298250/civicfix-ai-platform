import test, { describe, it } from 'node:test';
import assert from 'node:assert';
import enTranslations from '../src/locales/en.json' with { type: 'json' };
import taTranslations from '../src/locales/ta.json' with { type: 'json' };
import { suggestCategoryFromText, getSpeechLanguage, isSpeechRecognitionSupported } from '../src/utils/triageUtils.js';

describe('Bilingual i18n & Tamil Language Support Tests', () => {

  it('1. Locale dictionary integrity: Both en.json and ta.json are valid and contain core sections', () => {
    const requiredSections = ['common', 'auth', 'status', 'categories', 'citizenDashboard', 'reportComplaint', 'complaints', 'notifications'];
    for (const section of requiredSections) {
      assert.ok(enTranslations[section], `en.json must contain section: ${section}`);
      assert.ok(taTranslations[section], `ta.json must contain section: ${section}`);
    }
  });

  it('2. Status and category translations exist for all canonical keys in both English and Tamil', () => {
    const statuses = [
      'SUBMITTED', 'UNDER_REVIEW', 'ASSIGNED', 'IN_PROGRESS',
      'RESOLUTION_SUBMITTED', 'PENDING_CITIZEN_CONFIRMATION',
      'RESOLVED', 'REWORK_REQUESTED', 'REOPENED', 'REJECTED'
    ];
    for (const s of statuses) {
      assert.ok(enTranslations.status[s], `Missing English status: ${s}`);
      assert.ok(taTranslations.status[s], `Missing Tamil status: ${s}`);
      assert.notStrictEqual(enTranslations.status[s], taTranslations.status[s], `Tamil status for ${s} should not be identical to English`);
    }

    const categories = ['roads', 'lighting', 'water', 'waste', 'traffic', 'parks'];
    for (const c of categories) {
      assert.ok(enTranslations.categories[c], `Missing English category: ${c}`);
      assert.ok(taTranslations.categories[c], `Missing Tamil category: ${c}`);
      assert.notStrictEqual(enTranslations.categories[c], taTranslations.categories[c], `Tamil category for ${c} should not be identical to English`);
    }
  });

  it('3. Fallback mechanism: Missing keys in Tamil gracefully fall back to English dictionary', () => {
    // Simulate translation lookup function
    function translate(key, lang, dicts) {
      const getVal = (obj, p) => p.split('.').reduce((o, i) => (o ? o[i] : undefined), obj);
      const activeVal = getVal(dicts[lang], key);
      if (activeVal !== undefined) return activeVal;
      // Fallback to English
      const fallbackVal = getVal(dicts.en, key);
      if (fallbackVal !== undefined) return fallbackVal;
      return key;
    }

    const dicts = {
      en: enTranslations,
      ta: {
        common: { appName: 'CivicFix' } // Incomplete Tamil dict
      }
    };

    // Key exists in Tamil
    assert.strictEqual(translate('common.appName', 'ta', dicts), 'CivicFix');

    // Key missing in Tamil -> Falls back to English
    assert.strictEqual(translate('common.submit', 'ta', dicts), 'Submit');
    assert.strictEqual(translate('status.RESOLVED', 'ta', dicts), 'Verified Resolved');

    // Key missing everywhere -> Falls back to raw key
    assert.strictEqual(translate('nonexistent.nested.key', 'ta', dicts), 'nonexistent.nested.key');
  });

  it('4. Language toggle switches label outputs correctly', () => {
    // English active
    assert.strictEqual(enTranslations.reportComplaint.pageTitle, 'Report a Municipal Defect');
    assert.strictEqual(enTranslations.common.confirm, 'Confirm');
    assert.strictEqual(enTranslations.auth.signInButton, 'Sign In to Portal');

    // Tamil active
    assert.strictEqual(taTranslations.reportComplaint.pageTitle, 'நகராட்சி குறைபாட்டைப் பதிவு செய்க');
    assert.strictEqual(taTranslations.common.confirm, 'உறுதிப்படுத்து');
    assert.strictEqual(taTranslations.auth.signInButton, 'தளத்தில் உள்நுழையவும்');
  });

  it('5. Web Speech API language configuration resolves ta-IN for Tamil and en-IN for English', () => {
    assert.strictEqual(getSpeechLanguage('ta'), 'ta-IN');
    assert.strictEqual(getSpeechLanguage('en'), 'en-IN');
    assert.strictEqual(getSpeechLanguage(undefined), 'en-IN');
  });

  it('6. Web Speech API support detection safely guards server-side / headless environments', () => {
    // In node environment without window, isSpeechRecognitionSupported must return false without throwing
    assert.strictEqual(isSpeechRecognitionSupported(), false);
  });

  it('7. Tamil text category suggestion: Correctly identifies categories from at least 6 Tamil sample sentences', () => {
    const testCases = [
      {
        text: 'சாலையில் பெரிய குழி உள்ளதால் வாகனங்கள் செல்ல முடியவில்லை',
        expectedCategory: 'roads',
        description: 'Pothole on road in Tamil'
      },
      {
        text: 'குடிநீர் குழாய் உடைந்து தண்ணீர் வீணாக சாலையில் ஓடுகிறது',
        expectedCategory: 'water',
        description: 'Water pipe leak in Tamil'
      },
      {
        text: 'எங்கள் தெருவில் தெருவிளக்கு எரியவில்லை இருட்டாக உள்ளது',
        expectedCategory: 'lighting',
        description: 'Streetlight out in Tamil'
      },
      {
        text: 'தெரு மூலையில் குப்பை தொட்டி நிரம்பி துர்நாற்றம் வீசுகிறது',
        expectedCategory: 'waste',
        description: 'Garbage dump in Tamil'
      },
      {
        text: 'மழைநீர் வடிகால் அடைப்பு ஏற்பட்டு வெள்ளம் போல் நீர் தேங்குகிறது',
        expectedCategory: 'water', // or water/drainage
        description: 'Drainage water overflow in Tamil'
      },
      {
        text: 'பலத்த காற்றால் பெரிய மரக்கிளை முறிந்து விழுந்தது',
        expectedCategory: 'parks',
        description: 'Fallen tree branch in Tamil'
      },
      {
        text: 'பேருந்து நிறுத்தம் நிழற்குடை உடைந்ததால் பயணிகள் மழையில் நனைகிறார்கள்',
        expectedCategory: 'traffic',
        description: 'Bus stop shelter damage in Tamil'
      }
    ];

    for (const tc of testCases) {
      const suggested = suggestCategoryFromText(tc.text);
      assert.strictEqual(
        suggested,
        tc.expectedCategory,
        `Failed for '${tc.description}' ("${tc.text}"): expected '${tc.expectedCategory}', got '${suggested}'`
      );
    }
  });

  it('8. English text category suggestion continues to work seamlessly', () => {
    assert.strictEqual(suggestCategoryFromText('Deep asphalt crater and pothole near main cross'), 'roads');
    assert.strictEqual(suggestCategoryFromText('Arterial water pipeline burst flooding avenue'), 'water');
    assert.strictEqual(suggestCategoryFromText('Streetlight lamppost dark stretch blackout'), 'lighting');
    assert.strictEqual(suggestCategoryFromText('Illegal garbage dumping and stench on corner'), 'waste');
    assert.strictEqual(suggestCategoryFromText('Fallen tree branch blocking walkway in garden'), 'parks');
    assert.strictEqual(suggestCategoryFromText('Bus shelter roof collapsed at depot transit'), 'traffic');
  });

  it('9. Null, empty, and non-civic input returns null safely without throwing', () => {
    assert.strictEqual(suggestCategoryFromText(''), null);
    assert.strictEqual(suggestCategoryFromText(null), null);
    assert.strictEqual(suggestCategoryFromText('Good morning everyone hello world'), null);
  });
});

