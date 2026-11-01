import React, { useState, useEffect } from 'react';
import { useTranslation } from '../../context/LanguageContext';

/**
 * In-App Offline Guardian
 * Displays a friendly offline screen when network connectivity drops.
 * Enforces requirement: Do NOT re-introduce offline data creation or cached sessions.
 */
export default function OfflineScreen() {
  const [isOnline, setIsOnline] = useState(() => {
    return typeof window !== 'undefined' && typeof window.navigator !== 'undefined'
      ? window.navigator.onLine
      : true;
  });

  const { isTamil } = useTranslation();

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  if (isOnline) {
    return null;
  }

  return (
    <div
      role="alert"
      data-testid="offline-screen"
      className="fixed inset-0 z-50 bg-background/95 backdrop-blur-md flex flex-col items-center justify-center p-4 sm:p-6"
    >
      <div className="bg-surface-container-lowest border border-outline-variant/40 rounded-2xl p-6 sm:p-8 max-w-md w-full shadow-xl text-center space-y-5 animate-fade-in">
        <div className="w-14 h-14 rounded-2xl bg-rose-100 text-rose-700 flex items-center justify-center mx-auto shadow-xs">
          <span className="material-symbols-outlined text-[32px]">wifi_off</span>
        </div>

        <div className="space-y-1.5">
          <span className="px-2.5 py-0.5 rounded-full bg-secondary-fixed text-on-secondary-fixed text-[10px] font-bold uppercase tracking-wider">
            {isTamil ? 'ஆஃப்லைன் பாதுகாப்பு' : 'Offline Protection Active'}
          </span>
          <h2 className="text-xl sm:text-2xl font-bold text-on-surface">
            {isTamil ? 'இணைய இணைப்பு துண்டிக்கப்பட்டது' : 'Network Connection Unavailable'}
          </h2>
          <p className="text-xs text-on-surface-variant leading-relaxed">
            {isTamil
              ? 'நகராட்சி சேவையகங்களுடன் பாதுகாப்பாக இணைக்கவும், குறைபாடுகளை பதிவு செய்யவும், அதிகாரிகளின் தீர்வு சான்றுகளை ஆய்வு செய்யவும் நேரடி இணைய இணைப்பு தேவைப்படுகிறது.'
              : 'CivicFix requires an active internet connection to communicate securely with municipal servers, submit new defect reports, and verify resolution evidence.'}
          </p>
        </div>

        <div className="p-3.5 bg-surface-container-low rounded-xl text-left text-xs border border-outline-variant/30 text-on-surface-variant space-y-1">
          <div className="flex items-center gap-1.5 text-on-surface font-semibold">
            <span className="material-symbols-outlined text-[16px] text-primary">verified_user</span>
            <span>{isTamil ? 'நகராட்சி தணிக்கை ஒருமைப்பாடு' : 'Municipal Audit Integrity'}</span>
          </div>
          <p className="text-[11px] text-tertiary leading-relaxed">
            {isTamil
              ? 'தவறான பதிவுகள் மற்றும் போலி தரவுகள் சேர்வதைத் தவிர்க்க ஆஃப்லைன் தரவு உருவாக்கம் மற்றும் கேச் செய்யப்பட்ட அமர்வுகள் முடக்கப்பட்டுள்ளன.'
              : 'Offline data creation and cached resident sessions are strictly disabled to prevent stale tickets and unverified dispatch telemetry.'}
          </p>
        </div>

        <button
          type="button"
          onClick={() => {
            if (typeof window !== 'undefined') {
              if (window.navigator.onLine) {
                setIsOnline(true);
              } else {
                window.location.reload();
              }
            }
          }}
          className="w-full py-2.5 px-4 rounded-xl bg-primary-container hover:bg-primary text-white text-xs font-semibold shadow-sm transition-all flex items-center justify-center gap-2"
        >
          <span className="material-symbols-outlined text-[18px]">refresh</span>
          <span>{isTamil ? 'இணைப்பை மீண்டும் சரிபார்க்கவும்' : 'Check Connection & Retry'}</span>
        </button>
      </div>
    </div>
  );
}

