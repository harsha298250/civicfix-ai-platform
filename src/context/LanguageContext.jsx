import React, { createContext, useContext, useState, useEffect, useCallback, useMemo } from 'react';
import enTranslations from '../locales/en.json';
import taTranslations from '../locales/ta.json';

const LANGUAGE_STORAGE_KEY = 'civicfix_language';
const DEFAULT_LANGUAGE = 'en';

const TRANSLATION_RESOURCES = {
  en: enTranslations,
  ta: taTranslations,
};

const LanguageContext = createContext(null);

/**
 * Traverses a nested object by dot-separated path (e.g. 'auth.loginTitle')
 */
function getNestedValue(obj, path) {
  if (!obj || typeof obj !== 'object') return undefined;
  const segments = path.split('.');
  let current = obj;
  for (const segment of segments) {
    if (current && typeof current === 'object' && segment in current) {
      current = current[segment];
    } else {
      return undefined;
    }
  }
  return typeof current === 'string' ? current : undefined;
}

/**
 * Replaces {{param}} template placeholders with matching values
 */
function interpolate(template, params) {
  if (!params || typeof params !== 'object') return template;
  return template.replace(/\{\{\s*(\w+)\s*\}\}/g, (match, key) => {
    return params[key] !== undefined ? String(params[key]) : match;
  });
}

/**
 * Lightweight Zero-Dependency i18n Provider
 * Why this lightweight setup instead of full external bundles:
 * 1. Zero bundle bloat (under 2KB vs 50KB+ for react-i18next + i18next).
 * 2. Synchronous initialization from localStorage prevents flash of untranslated content (FOUC).
 * 3. Graceful English fallback guaranteed for any untranslated key.
 * 4. Drop-in useTranslation() hook interface compatible with standard conventions.
 */
export function LanguageProvider({ children }) {
  const [language, setLanguageState] = useState(() => {
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        const saved = window.localStorage.getItem(LANGUAGE_STORAGE_KEY);
        if (saved === 'ta' || saved === 'en') {
          return saved;
        }
      }
    } catch {
      // Storage access blocked or unavailable
    }
    return DEFAULT_LANGUAGE;
  });

  const changeLanguage = useCallback((newLang) => {
    const validLang = newLang === 'ta' ? 'ta' : 'en';
    setLanguageState(validLang);
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        window.localStorage.setItem(LANGUAGE_STORAGE_KEY, validLang);
      }
      if (typeof document !== 'undefined') {
        document.documentElement.lang = validLang;
      }
    } catch {
      // Ignore localStorage write failures
    }
  }, []);

  useEffect(() => {
    if (typeof document !== 'undefined') {
      document.documentElement.lang = language;
    }
  }, [language]);

  const t = useCallback((key, params) => {
    if (!key) return '';

    // 1. Look up in active language
    const activeDict = TRANSLATION_RESOURCES[language];
    let translation = getNestedValue(activeDict, key);

    // 2. Fall back to English if missing in active language
    if (translation === undefined && language !== 'en') {
      const fallbackDict = TRANSLATION_RESOURCES.en;
      translation = getNestedValue(fallbackDict, key);
    }

    // 3. Fall back to the key itself if missing everywhere
    if (translation === undefined) {
      translation = key;
    }

    // 4. Interpolate variables (e.g. {{name}})
    return interpolate(translation, params);
  }, [language]);

  const contextValue = useMemo(() => ({
    language,
    changeLanguage,
    t,
    isTamil: language === 'ta',
  }), [language, changeLanguage, t]);

  return (
    <LanguageContext.Provider value={contextValue}>
      {children}
    </LanguageContext.Provider>
  );
}

/**
 * Hook to access translations, current language, and switcher
 */
export function useTranslation() {
  const context = useContext(LanguageContext);
  if (!context) {
    // Graceful fallback when rendered outside Provider (e.g. unit tests)
    const fallbackT = (key, params) => {
      const val = getNestedValue(TRANSLATION_RESOURCES.en, key) || key;
      return interpolate(val, params);
    };
    return {
      language: DEFAULT_LANGUAGE,
      changeLanguage: () => {},
      t: fallbackT,
      isTamil: false,
    };
  }
  return context;
}

export const useLanguage = useTranslation;

