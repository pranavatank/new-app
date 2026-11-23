import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';

import en from './locales/en.json';
import gu from './locales/gu.json';

export const SUPPORTED_LANGUAGES = {
  en: { label: 'English', nativeLabel: 'English', flag: '🇬🇧' },
  gu: { label: 'Gujarati', nativeLabel: 'ગુજરાતી', flag: '🇮🇳' },
};

const resources = {
  en: { translation: en },
  gu: { translation: gu },
};

export const initialLanguage = 'gu';

i18n
  .use(initReactI18next)
  .init({
    resources,
    lng: initialLanguage,
    fallbackLng: 'en',
    interpolation: { escapeValue: false },
    // CRITICAL: synchronous init — prevents useTranslation() from racing
    // against async init in production APK (i18next v25+).
    initImmediate: false,
    // CRITICAL: never throw a Suspense Promise — no <Suspense> boundary exists.
    react: { useSuspense: false },
  });

// Call this to change language at runtime and have react-i18next re-render.
export const setAppLanguage = (langCode) => {
  if (SUPPORTED_LANGUAGES[langCode]) {
    i18n.changeLanguage(langCode);
  }
};

export default i18n;
