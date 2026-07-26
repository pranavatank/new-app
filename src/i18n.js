import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import * as Localization from 'expo-localization';

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

// BUG FIX: getLocales() returns full BCP-47 tags like "gu-IN", "en-US", "en-IN".
// i18next resources are keyed as just "gu" / "en".
// We must strip the region suffix, then verify it's a supported language.
const getDeviceLanguage = () => {
  try {
    const locales = Localization.getLocales();
    const tag = locales?.[0]?.languageTag || 'en';       // e.g. "gu-IN"
    const code = tag.split('-')[0].toLowerCase();         // "gu"
    return SUPPORTED_LANGUAGES[code] ? code : 'en';       // fallback to en
  } catch {
    return 'en';
  }
};

// initialLanguage is resolved once at module init — synchronous, no race.
export const initialLanguage = getDeviceLanguage();

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
