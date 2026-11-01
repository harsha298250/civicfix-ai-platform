import React from 'react';
import { useRegisterSW } from 'virtual:pwa-register/react';
import { useTranslation } from '../../context/LanguageContext';

/**
 * Service Worker Reload Prompt
 * Appears when an updated service worker has been fetched and is waiting to activate.
 */
export default function ReloadPrompt() {
  const { isTamil } = useTranslation();

  const {
    needRefresh: [needRefresh, setNeedRefresh],
    updateServiceWorker,
  } = useRegisterSW({
    onRegistered(r) {
      if (r) {
        // Poll for updates every hour if desired
        setInterval(() => {
          r.update().catch(() => {});
        }, 60 * 60 * 1000);
      }
    },
    onRegisterError(error) {
      console.warn('SW registration error:', error);
    },
  });

  if (!needRefresh) {
    return null;
  }

  return (
    <div
      role="alert"
      data-testid="pwa-update-prompt"
      className="fixed bottom-5 left-5 z-50 bg-[#151D26] text-white p-4 rounded-2xl shadow-2xl border border-primary/40 flex flex-col sm:flex-row items-start sm:items-center gap-3.5 max-w-md animate-fade-in"
    >
      <div className="w-10 h-10 rounded-xl bg-primary-container text-white flex items-center justify-center shrink-0">
        <span className="material-symbols-outlined text-[20px]">system_update</span>
      </div>

      <div className="flex-1 min-w-0">
        <h4 className="text-xs font-bold text-white">
          {isTamil ? 'புதிய பதிப்பு கிடைக்கிறது' : 'Update Available'}
        </h4>
        <p className="text-[11px] text-gray-300 leading-snug">
          {isTamil
            ? 'CivicFix தளத்தின் புதிய பதிப்பு தயாராக உள்ளது. புதுப்பிக்க மீண்டும் ஏற்றவும்.'
            : 'A new version of CivicFix is ready. Reload to apply the latest municipal features.'}
        </p>
      </div>

      <div className="flex items-center gap-2 self-end sm:self-auto shrink-0">
        <button
          type="button"
          onClick={() => updateServiceWorker(true)}
          className="px-3 py-1.5 rounded-lg bg-primary-container hover:bg-primary text-white text-xs font-bold transition-all shadow-xs"
        >
          {isTamil ? 'புதுப்பிக்க' : 'Reload & Update'}
        </button>
        <button
          type="button"
          onClick={() => setNeedRefresh(false)}
          className="px-2.5 py-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-gray-300 text-xs font-semibold transition-colors"
        >
          {isTamil ? 'மூடு' : 'Dismiss'}
        </button>
      </div>
    </div>
  );
}

