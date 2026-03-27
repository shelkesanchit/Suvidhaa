// i18n module exports
export { TranslationProvider, TranslationContext } from './TranslationContext';
export { LanguageSelector, FloatingLanguageSelector, useLanguage } from './LanguageSelector';
export { TranslatedText, T, withTranslation } from './TranslatedText';
export { AutoTranslator } from './AutoTranslator';
export {
  useTranslation,
  useTranslatedText,
  useTranslatedTexts,
} from './useTranslation';
export {
  translate,
  translateBatch,
  translateSync,
  getCachedTranslation,
  clearCache,
  getLanguageByCode,
  preloadCommonStrings,
  SUPPORTED_LANGUAGES,
} from './translationService';
