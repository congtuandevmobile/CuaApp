import { useTranslation } from 'react-i18next';
import { DEFAULT_LOCALE, isLocale, type Locale } from '@/features/localization/domain/Locale';
import { errorText, formatDateTime, formatKm, sportName } from './format';

/**
 * What a screen needs to speak the current language: `t`, the locale, and the formatters bound to it. Re-renders the
 * screen when the language changes.
 */
export function useT() {
  const { t, i18n } = useTranslation();
  const locale: Locale = isLocale(i18n.language) ? i18n.language : DEFAULT_LOCALE;
  return {
    t,
    locale,
    km: (meters: number) => formatKm(meters, locale),
    dateTime: (ms: number) => formatDateTime(ms, locale),
    sport: sportName,
    error: errorText,
  };
}
