import React, { useState, useEffect } from 'react';
import { useTranslation } from '../../context/LanguageContext';

/**
 * Install PWA Button Component
 * Appears ONLY when the browser offers the native 'beforeinstallprompt' event.
 * Strictly hidden if the browser does not support or offer the install prompt.
 */
export default function InstallPwaButton({ className = '' }) {
  const [deferredPrompt, setDeferredPrompt] = useState(null);
  const [isInstallable, setIsInstallable] = useState(false);
  const { isTamil } = useTranslation();

  useEffect(() => {
    const handleBeforeInstallPrompt = (e) => {
      // Prevent browser's default mini-infobar from appearing on mobile
      e.preventDefault();
      setDeferredPrompt(e);
      setIsInstallable(true);
    };

    const handleAppInstalled = () => {
      setIsInstallable(false);
      setDeferredPrompt(null);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    window.addEventListener('appinstalled', handleAppInstalled);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.removeEventListener('appinstalled', handleAppInstalled);
    };
  }, []);

  // Appears ONLY when the browser offers the install prompt
  if (!isInstallable || !deferredPrompt) {
    return null;
  }

  const handleInstallClick = async () => {
    if (!deferredPrompt) return;

    // Show native install prompt
    deferredPrompt.prompt();

    try {
      const { outcome } = await deferredPrompt.userChoice;
      if (outcome === 'accepted') {
        setIsInstallable(false);
        setDeferredPrompt(null);
      }
    } catch (err) {
      console.warn('Install prompt error:', err);
    }
  };

  return (
    <button
      type="button"
      onClick={handleInstallClick}
      data-testid="pwa-install-button"
      aria-label="Install CivicFix AI as a standalone application"
      className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-secondary-container hover:bg-secondary text-white text-xs font-semibold shadow-sm transition-all active:scale-98 animate-fade-in ${className}`}
    >
      <span className="material-symbols-outlined text-[16px]">install_mobile</span>
      <span>{isTamil ? 'செயலியை நிறுவு' : 'Install App'}</span>
    </button>
  );
}

