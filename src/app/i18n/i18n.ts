import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import { DEFAULT_LOCALE, type Locale } from '@/features/localization/domain/Locale';
import { en, type Messages } from './locales/en';
import { vi } from './locales/vi';

/** Typed keys: `t('home.empty')` autocompletes, a typo does not compile. */
declare module 'i18next' {
  interface CustomTypeOptions {
    defaultNS: 'translation';
    resources: { translation: Messages };
  }
}

export const resources = { en: { translation: en }, vi: { translation: vi } } as const;

/** Initialises i18n synchronously (the resources are bundled), or just switches language when it already runs. */
export function setupI18n(locale: Locale): typeof i18n {
  if (!i18n.isInitialized) {
    void i18n.use(initReactI18next).init({
      resources,
      lng: locale,
      fallbackLng: DEFAULT_LOCALE,
      interpolation: { escapeValue: false }, // React Native does not render HTML
      returnNull: false,
      initAsync: false,
    });
  } else if (i18n.language !== locale) {
    void i18n.changeLanguage(locale);
  }
  return i18n;
}

export { i18n };
