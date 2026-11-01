import React from 'react';
import { useTranslation } from '../../context/LanguageContext';

/**
 * Reusable Language Toggle Component
 * Allows switching between English ('en') and Tamil ('ta').
 * Persists UI preference in localStorage via LanguageContext.
 */
export default function LanguageToggle({ className = '', variant = 'pill' }) {
  const { language, changeLanguage, isTamil } = useTranslation();

  const handleToggle = () => {
    changeLanguage(language === 'en' ? 'ta' : 'en');
  };

  if (variant === 'button') {
    return (
      <button
        type="button"
        onClick={handleToggle}
        aria-label="Toggle language between English and Tamil"
        data-testid="language-toggle"
        className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all ${
          isTamil
            ? 'bg-primary-container text-white border-primary shadow-xs'
            : 'bg-surface-container-low text-on-surface hover:bg-surface-container border-outline-variant/40'
        } ${className}`}
      >
        <span className="material-symbols-outlined text-[16px]">translate</span>
        <span>{isTamil ? 'தமிழ் (TA)' : 'English (EN)'}</span>
      </button>
    );
  }

  // Default compact segmented pill toggle
  return (
    <div
      data-testid="language-toggle"
      role="group"
      aria-label="Language selector"
      className={`inline-flex items-center p-0.5 bg-surface-container-low border border-outline-variant/40 rounded-full text-xs font-semibold select-none ${className}`}
    >
      <button
        type="button"
        onClick={() => changeLanguage('en')}
        data-testid="lang-en"
        aria-pressed={language === 'en'}
        className={`px-2.5 py-1 rounded-full transition-all flex items-center gap-1 ${
          language === 'en'
            ? 'bg-surface-container-lowest text-primary shadow-xs font-bold'
            : 'text-on-surface-variant hover:text-on-surface'
        }`}
      >
        <span>EN</span>
      </button>
      <button
        type="button"
        onClick={() => changeLanguage('ta')}
        data-testid="lang-ta"
        aria-pressed={language === 'ta'}
        className={`px-2.5 py-1 rounded-full transition-all flex items-center gap-1 ${
          language === 'ta'
            ? 'bg-primary-container text-white shadow-xs font-bold'
            : 'text-on-surface-variant hover:text-on-surface'
        }`}
      >
        <span>தமிழ்</span>
      </button>
    </div>
  );
}

