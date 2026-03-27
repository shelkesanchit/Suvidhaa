import React, { createContext, useState, useEffect, useCallback, useMemo } from 'react';
import { SUPPORTED_LANGUAGES, preloadCommonStrings } from './translationService';

const LANGUAGE_KEY = 'suvidha_language';
const DEFAULT_LANG = 'en';

// Create context
export const TranslationContext = createContext(null);

/**
 * Get saved language from localStorage
 */
function getSavedLanguage() {
  try {
    const saved = localStorage.getItem(LANGUAGE_KEY);
    if (saved && SUPPORTED_LANGUAGES.find(l => l.code === saved)) {
      return saved;
    }
  } catch (e) {
    console.warn('Failed to get saved language:', e);
  }
  return DEFAULT_LANG;
}

/**
 * Save language to localStorage
 */
function saveLanguage(lang) {
  try {
    localStorage.setItem(LANGUAGE_KEY, lang);
  } catch (e) {
    console.warn('Failed to save language:', e);
  }
}

/**
 * Translation Provider - Wraps the app and provides language state
 */
export function TranslationProvider({ children }) {
  const [language, setLanguage] = useState(getSavedLanguage);
  const [isLoading, setIsLoading] = useState(false);
  const [version, setVersion] = useState(0);

  // Get language details
  const languageDetails = useMemo(() => {
    return SUPPORTED_LANGUAGES.find(l => l.code === language) || SUPPORTED_LANGUAGES[0];
  }, [language]);

  // Change language function
  const changeLanguage = useCallback(async (newLang) => {
    if (newLang === language) return;

    const langExists = SUPPORTED_LANGUAGES.find(l => l.code === newLang);
    if (!langExists) {
      console.warn('Language not supported:', newLang);
      return;
    }

    setIsLoading(true);

    try {
      // Save to localStorage immediately
      saveLanguage(newLang);

      // Preload common strings for faster initial translation
      if (newLang !== 'en') {
        await preloadCommonStrings(newLang);
      }

      // Update state
      setLanguage(newLang);
      setVersion(v => v + 1);

      // Update HTML lang attribute
      document.documentElement.lang = newLang;
    } catch (error) {
      console.error('Language change failed:', error);
    } finally {
      setIsLoading(false);
    }
  }, [language]);

  // Set HTML lang on mount
  useEffect(() => {
    document.documentElement.lang = language;
  }, []);

  // Context value
  const value = useMemo(() => ({
    language,
    languageDetails,
    supportedLanguages: SUPPORTED_LANGUAGES,
    changeLanguage,
    isLoading,
    isEnglish: language === 'en',
    version,
  }), [language, languageDetails, changeLanguage, isLoading, version]);

  return (
    <TranslationContext.Provider value={value}>
      {children}
    </TranslationContext.Provider>
  );
}

export default TranslationProvider;
