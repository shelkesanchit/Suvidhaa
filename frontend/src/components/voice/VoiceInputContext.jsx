/**
 * Voice Input Context Provider
 *
 * Provides voice input state and controls across the application.
 * Integrates with the Web Speech API for speech-to-text functionality.
 */

import React, { createContext, useContext, useState, useRef, useCallback, useEffect } from 'react';
import { TranslationContext } from '../../i18n/TranslationContext';

// Language mapping for Web Speech API
const VOICE_LANGUAGES = {
  en: 'en-IN',
  hi: 'hi-IN',
  mr: 'hi-IN', // Marathi uses Hindi recognition with phonetic processing
  ta: 'ta-IN',
  te: 'te-IN',
  bn: 'bn-IN',
  gu: 'gu-IN',
  kn: 'kn-IN',
  ml: 'ml-IN',
  pa: 'pa-IN',
  ur: 'ur-PK',
};

// Voice status constants
export const VOICE_STATUS = {
  IDLE: 'idle',
  LISTENING: 'listening',
  PROCESSING: 'processing',
  ERROR: 'error',
  NOT_SUPPORTED: 'not_supported',
};

// Create context
const VoiceInputContext = createContext(null);

/**
 * Check if Web Speech API is supported
 */
const checkSpeechSupport = () => {
  return !!(
    typeof window !== 'undefined' &&
    (window.SpeechRecognition || window.webkitSpeechRecognition)
  );
};

/**
 * VoiceInputProvider Component
 */
export function VoiceInputProvider({ children }) {
  // Get translation context for language sync
  const translationContext = useContext(TranslationContext);
  const uiLanguage = translationContext?.language || 'en';

  // State
  const [status, setStatus] = useState(VOICE_STATUS.IDLE);
  const [isSupported, setIsSupported] = useState(true);
  const [transcript, setTranscript] = useState('');
  const [interimTranscript, setInterimTranscript] = useState('');
  const [error, setError] = useState(null);
  const [voiceLanguage, setVoiceLanguage] = useState(uiLanguage);
  const [activeInputId, setActiveInputId] = useState(null);

  // Refs
  const recognitionRef = useRef(null);
  const callbackRef = useRef(null);
  const timeoutRef = useRef(null);
  const retryCountRef = useRef(0);
  const maxRetries = 3;

  // Initialize speech recognition
  useEffect(() => {
    const supported = checkSpeechSupport();
    setIsSupported(supported);

    if (!supported) {
      setStatus(VOICE_STATUS.NOT_SUPPORTED);
      console.warn('Voice Input: Web Speech API is not supported in this browser');
      return;
    }

    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    const recognition = new SpeechRecognition();

    // Configure recognition
    recognition.continuous = false;
    recognition.interimResults = true;
    recognition.maxAlternatives = 3;
    recognition.lang = VOICE_LANGUAGES[voiceLanguage] || 'en-IN';

    // Event handlers
    recognition.onstart = () => {
      setStatus(VOICE_STATUS.LISTENING);
      setError(null);
      setInterimTranscript('');
      retryCountRef.current = 0;
    };

    recognition.onresult = (event) => {
      let finalTranscript = '';
      let interim = '';

      for (let i = event.resultIndex; i < event.results.length; i++) {
        const result = event.results[i];
        if (result.isFinal) {
          finalTranscript += result[0].transcript;
        } else {
          interim += result[0].transcript;
        }
      }

      setInterimTranscript(interim);

      if (finalTranscript) {
        setTranscript(finalTranscript);
        setStatus(VOICE_STATUS.PROCESSING);

        // Call the callback with the result
        if (callbackRef.current) {
          callbackRef.current(finalTranscript.trim());
        }

        // Reset after a short delay
        setTimeout(() => {
          setStatus(VOICE_STATUS.IDLE);
          setInterimTranscript('');
        }, 500);
      }
    };

    recognition.onerror = (event) => {
      console.error('Voice Input Error:', event.error);

      let errorMessage = '';
      switch (event.error) {
        case 'no-speech':
          errorMessage = 'No speech detected. Please try again.';
          break;
        case 'audio-capture':
          errorMessage = 'Microphone not found. Please check your device.';
          break;
        case 'not-allowed':
          errorMessage = 'Microphone access denied. Please allow microphone access.';
          break;
        case 'network':
          errorMessage = 'Network error. Please check your connection.';
          break;
        case 'aborted':
          // User cancelled, not an error
          setStatus(VOICE_STATUS.IDLE);
          return;
        default:
          errorMessage = 'Voice input error. Please try again.';
      }

      setError(errorMessage);
      setStatus(VOICE_STATUS.ERROR);

      // Auto-clear error after 3 seconds
      setTimeout(() => {
        setError(null);
        setStatus(VOICE_STATUS.IDLE);
      }, 3000);
    };

    recognition.onend = () => {
      // Clear any pending timeout
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
        timeoutRef.current = null;
      }

      // Only set to idle if not already processing or in error state
      if (status === VOICE_STATUS.LISTENING) {
        setStatus(VOICE_STATUS.IDLE);
      }
    };

    recognitionRef.current = recognition;

    // Cleanup
    return () => {
      if (recognitionRef.current) {
        try {
          recognitionRef.current.abort();
        } catch (e) {
          // Ignore errors during cleanup
        }
      }
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  // Update language when voiceLanguage changes
  useEffect(() => {
    if (recognitionRef.current && isSupported) {
      recognitionRef.current.lang = VOICE_LANGUAGES[voiceLanguage] || 'en-IN';
    }
  }, [voiceLanguage, isSupported]);

  // Sync voice language with UI language
  useEffect(() => {
    if (uiLanguage && uiLanguage !== voiceLanguage) {
      setVoiceLanguage(uiLanguage);
    }
  }, [uiLanguage]);

  /**
   * Start listening for voice input
   */
  const startListening = useCallback((callback, inputId = null) => {
    if (!isSupported || !recognitionRef.current) {
      setError('Voice input is not supported in this browser.');
      return false;
    }

    // If already listening, just update callback and continue
    if (status === VOICE_STATUS.LISTENING) {
      console.log('[Voice] Already listening, updating callback...');
      callbackRef.current = callback;
      return true;
    }

    // Store the callback
    callbackRef.current = callback;
    setActiveInputId(inputId);
    setTranscript('');
    setInterimTranscript('');

    try {
      recognitionRef.current.start();

      // Auto-stop after 30 seconds of silence (increased for accessibility mode)
      timeoutRef.current = setTimeout(() => {
        if (status === VOICE_STATUS.LISTENING) {
          stopListening();
          setError('No speech detected. Please try again.');
          setTimeout(() => setError(null), 3000);
        }
      }, 30000);

      return true;
    } catch (err) {
      // Handle "already started" error gracefully
      if (err.name === 'InvalidStateError' && err.message.includes('already started')) {
        console.log('[Voice] Recognition already running, using existing session');
        callbackRef.current = callback;
        return true;
      }
      console.error('Failed to start voice recognition:', err);
      setError('Failed to start voice input. Please try again.');
      setStatus(VOICE_STATUS.ERROR);
      setTimeout(() => {
        setError(null);
        setStatus(VOICE_STATUS.IDLE);
      }, 3000);
      return false;
    }
  }, [isSupported, status]);

  /**
   * Stop listening
   */
  const stopListening = useCallback(() => {
    if (recognitionRef.current) {
      try {
        recognitionRef.current.stop();
      } catch (err) {
        // Ignore errors when stopping
      }
    }

    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }

    setStatus(VOICE_STATUS.IDLE);
    setActiveInputId(null);
    setInterimTranscript('');
  }, []);

  /**
   * Toggle listening state
   */
  const toggleListening = useCallback((callback, inputId = null) => {
    if (status === VOICE_STATUS.LISTENING) {
      stopListening();
      return false;
    } else {
      return startListening(callback, inputId);
    }
  }, [status, startListening, stopListening]);

  /**
   * Change voice language
   */
  const changeVoiceLanguage = useCallback((langCode) => {
    setVoiceLanguage(langCode);
    if (recognitionRef.current && isSupported) {
      recognitionRef.current.lang = VOICE_LANGUAGES[langCode] || 'en-IN';
    }
  }, [isSupported]);

  /**
   * Clear error
   */
  const clearError = useCallback(() => {
    setError(null);
    if (status === VOICE_STATUS.ERROR) {
      setStatus(VOICE_STATUS.IDLE);
    }
  }, [status]);

  // Context value
  const value = {
    // State
    status,
    isSupported,
    isListening: status === VOICE_STATUS.LISTENING,
    isProcessing: status === VOICE_STATUS.PROCESSING,
    transcript,
    interimTranscript,
    error,
    voiceLanguage,
    activeInputId,

    // Actions
    startListening,
    stopListening,
    toggleListening,
    changeVoiceLanguage,
    clearError,

    // Constants
    VOICE_STATUS,
    VOICE_LANGUAGES,
  };

  return (
    <VoiceInputContext.Provider value={value}>
      {children}
    </VoiceInputContext.Provider>
  );
}

/**
 * Hook to use voice input context
 */
export function useVoiceInputContext() {
  const context = useContext(VoiceInputContext);
  if (!context) {
    throw new Error('useVoiceInputContext must be used within VoiceInputProvider');
  }
  return context;
}

export default VoiceInputContext;
