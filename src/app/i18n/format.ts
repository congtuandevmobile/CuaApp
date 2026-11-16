import type { Locale } from '@/features/localization/domain/Locale';
import { i18n } from './i18n';

/** Numbers and dates are formatted for the language shown (`1,5` in Vietnamese, `1.5` in English). */
export function formatNumber(value: number, locale: Locale, fractionDigits: number): string {
  try {
    return new Intl.NumberFormat(locale, { minimumFractionDigits: fractionDigits, maximumFractionDigits: fractionDigits }).format(value);
  } catch {
    return value.toFixed(fractionDigits); // an engine without Intl still shows a correct number
  }
}

/** 2 decimals under 10 km, 1 above (`0,52` / `12,3`). */
export function formatKm(meters: number, locale: Locale): string {
  const km = meters / 1000;
  return formatNumber(km, locale, km < 10 ? 2 : 1);
}

export function formatDateTime(ms: number, locale: Locale): string {
  try {
    return new Intl.DateTimeFormat(locale, { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(ms));
  } catch {
    return new Date(ms).toLocaleString();
  }
}

/** `soccer` -> `Soccer`, `americanFootball` -> `American football`: the label of a sport that has no translation. */
export function humanizeSport(code: string): string {
  const spaced = code.replace(/([a-z])([A-Z])/g, '$1 $2').toLowerCase();
  return spaced.charAt(0).toUpperCase() + spaced.slice(1);
}

/** The name of a sport in the current language; a sport without a translation shows its humanized name, never a key. */
export function sportName(code: string): string {
  const key = `sports.${code}`;
  return i18n.exists(key) ? i18n.t(key as 'sports.other') : humanizeSport(code);
}

/** Translates a stable error code (`AUTH_USERNAME_INVALID`); unknown codes fall back to the generic message. */
export function errorText(code: string | undefined): string | undefined {
  if (!code) return undefined;
  const key = `errors.${code}`;
  return i18n.exists(key) ? i18n.t(key as 'errors.UNKNOWN') : i18n.t('errors.UNKNOWN');
}

/**
 * The name of an accessory in the current language: `accessories.<slot>.<gender>.<id>` when the item looks different
 * per body (hair styles), else `accessories.<slot>.<id>`, else the catalog name.
 */
export function accessoryName(slot: string, id: string, fallback: string, gender?: string): string {
  const gendered = gender ? `accessories.${slot}.${gender}.${id}` : undefined;
  if (gendered && i18n.exists(gendered)) return i18n.t(gendered as 'accessories.shoes.daily');
  const key = `accessories.${slot}.${id}`;
  return i18n.exists(key) ? i18n.t(key as 'accessories.shoes.daily') : fallback;
}

export function greetingKey(hour: number): 'home.morning' | 'home.afternoon' | 'home.evening' {
  return hour < 12 ? 'home.morning' : hour < 18 ? 'home.afternoon' : 'home.evening';
}
