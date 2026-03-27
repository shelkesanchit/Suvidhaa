import { useContext, useState, useEffect, useCallback, useRef } from 'react';
import { TranslationContext } from './TranslationContext';
import { translate, translateSync, getCachedTranslation } from './translationService';

/**
 * Hook to access translation context
 */
export function useLanguage() {
  const context = useContext(TranslationContext);
  if (!context) {
    throw new Error('useLanguage must be used within TranslationProvider');
  }
  return context;
}

/**
 * Hook for translation functions
 */
export function useTranslation() {
  const context = useContext(TranslationContext);
  if (!context) {
    throw new Error('useTranslation must be used within TranslationProvider');
  }

  const { language, isEnglish, version } = context;

  // Synchronous translate (uses cache, returns original if not cached)
  const t = useCallback((text) => {
    if (!text || isEnglish) return text;
    return translateSync(text, language);
  }, [language, isEnglish]);

  // Async translate
  const translateAsync = useCallback(async (text) => {
    if (!text || isEnglish) return text;
    return translate(text, language);
  }, [language, isEnglish]);

  return {
    t,
    translateAsync,
    language,
    isEnglish,
    version,
    ...context,
  };
}

/**
 * Hook that returns translated text (updates when translation is ready)
 */
export function useTranslatedText(text) {
  const { language, isEnglish, version } = useLanguage();
  const [translated, setTranslated] = useState(text);
  const mountedRef = useRef(true);

  useEffect(() => {
    mountedRef.current = true;
    return () => { mountedRef.current = false; };
  }, []);

  useEffect(() => {
    if (!text || isEnglish) {
      setTranslated(text);
      return;
    }

    // Check cache first
    const cached = getCachedTranslation(text, language);
    if (cached) {
      setTranslated(cached);
      return;
    }

    // Start with original
    setTranslated(text);

    // Translate async
    translate(text, language).then((result) => {
      if (mountedRef.current && result) {
        setTranslated(result);
      }
    });
  }, [text, language, isEnglish, version]);

  return translated;
}

/**
 * Hook that returns translated texts array
 */
export function useTranslatedTexts(texts) {
  const { language, isEnglish, version } = useLanguage();
  const [translated, setTranslated] = useState(texts);
  const mountedRef = useRef(true);

  useEffect(() => {
    mountedRef.current = true;
    return () => { mountedRef.current = false; };
  }, []);

  useEffect(() => {
    if (!texts || !texts.length || isEnglish) {
      setTranslated(texts);
      return;
    }

    // Translate all
    Promise.all(texts.map(t => translate(t, language))).then((results) => {
      if (mountedRef.current) {
        setTranslated(results);
      }
    });
  }, [texts, language, isEnglish, version]);

  return translated;
}

export default useTranslation;
