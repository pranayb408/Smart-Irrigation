import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';

import en from './locales/en.json';
import hi from './locales/hi.json';
import mr from './locales/mr.json';
import gu from './locales/gu.json';

export const SUPPORTED_LANGUAGES = [
  { code: 'en', label: 'English', nativeName: 'English', flag: '🇬🇧' },
  { code: 'hi', label: 'Hindi', nativeName: 'हिन्दी', flag: '🇮🇳' },
  { code: 'mr', label: 'Marathi', nativeName: 'मराठी', flag: '🇮🇳' },
  { code: 'gu', label: 'Gujarati', nativeName: 'ગુજરાતી', flag: '🇮🇳' },
];

const savedLanguage = typeof window !== 'undefined'
  ? localStorage.getItem('agrisense_language') || localStorage.getItem('i18nextLng') || 'en'
  : 'en';

const validLanguage = ['en', 'hi', 'mr', 'gu'].includes(savedLanguage) ? savedLanguage : 'en';

i18n
  .use(initReactI18next)
  .init({
    resources: {
      en: { translation: en },
      hi: { translation: hi },
      mr: { translation: mr },
      gu: { translation: gu },
    },
    lng: validLanguage,
    fallbackLng: 'en',
    interpolation: {
      escapeValue: false, // React already escapes values
    },
    react: {
      useSuspense: false,
    },
  });

export const changeLanguage = (langCode) => {
  if (['en', 'hi', 'mr', 'gu'].includes(langCode)) {
    i18n.changeLanguage(langCode);
    try {
      localStorage.setItem('agrisense_language', langCode);
      document.documentElement.lang = langCode;
    } catch {
      // ignore storage errors
    }
  }
};

export default i18n;

