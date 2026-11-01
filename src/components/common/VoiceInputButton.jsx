import React, { useState, useRef, useEffect } from 'react';
import { useTranslation } from '../../context/LanguageContext';
import { isSpeechRecognitionSupported, getSpeechLanguage } from '../../utils/triageUtils';

/**
 * Voice Input Button using Web Speech API (ta-IN / en-IN).
 * Strictly hidden when Web Speech API is unsupported in current browser.
 */
export default function VoiceInputButton({ onTranscript, className = '' }) {
  const { language, t, isTamil } = useTranslation();
  const [isListening, setIsListening] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const recognitionRef = useRef(null);

  // Check support once
  const supported = isSpeechRecognitionSupported();

  useEffect(() => {
    return () => {
      if (recognitionRef.current) {
        try {
          recognitionRef.current.abort();
        } catch {
          // Ignore abort on unmount
        }
      }
    };
  }, []);

  // Hidden when Web Speech API is unsupported in current browser
  if (!supported) {
    return null;
  }

  const handleToggleListening = (e) => {
    e.preventDefault();
    setErrorMessage('');

    if (isListening) {
      if (recognitionRef.current) {
        try {
          recognitionRef.current.stop();
        } catch {
          // Ignore stop errors
        }
      }
      setIsListening(false);
      return;
    }

    try {
      const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
      const recognition = new SpeechRecognition();
      recognitionRef.current = recognition;

      recognition.continuous = false;
      recognition.interimResults = false;
      recognition.lang = getSpeechLanguage(language);

      recognition.onstart = () => {
        setIsListening(true);
      };

      recognition.onresult = (event) => {
        if (event.results && event.results[0] && event.results[0][0]) {
          const spokenText = event.results[0][0].transcript;
          if (spokenText && onTranscript) {
            onTranscript(spokenText);
          }
        }
      };

      recognition.onerror = (event) => {
        console.warn('Speech recognition error:', event.error);
        setIsListening(false);
        if (event.error === 'not-allowed') {
          setErrorMessage(isTamil ? 'மைக் அனுமதி மறுக்கப்பட்டது' : 'Microphone permission denied');
        }
      };

      recognition.onend = () => {
        setIsListening(false);
      };

      recognition.start();
    } catch (err) {
      console.warn('Speech recognition start failed:', err);
      setIsListening(false);
    }
  };

  return (
    <div className={`inline-flex items-center gap-2 ${className}`}>
      <button
        type="button"
        onClick={handleToggleListening}
        aria-label={isListening ? t('reportComplaint.voiceButtonListening') : t('reportComplaint.voiceButtonStart')}
        title={isListening ? t('reportComplaint.voiceButtonListening') : `${t('reportComplaint.voiceButtonStart')} (${getSpeechLanguage(language)})`}
        className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all shadow-xs ${
          isListening
            ? 'bg-rose-500 text-white animate-pulse ring-2 ring-rose-400'
            : 'bg-surface-container-low hover:bg-surface-container text-primary-container border border-outline-variant/40'
        }`}
      >
        <span className="material-symbols-outlined text-[16px]">
          {isListening ? 'mic' : 'mic_none'}
        </span>
        <span>
          {isListening ? t('reportComplaint.voiceButtonListening') : t('reportComplaint.voiceButtonStart')}
        </span>
        <span className="text-[10px] uppercase font-mono px-1 py-0.2 rounded bg-black/10">
          {isTamil ? 'ta-IN' : 'en-IN'}
        </span>
      </button>

      {errorMessage && (
        <span className="text-[11px] text-error font-medium">{errorMessage}</span>
      )}
    </div>
  );
}

