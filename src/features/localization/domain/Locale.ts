/** The languages the app is translated into. Add a language and its file in `src/app/i18n/locales`. */
export const SUPPORTED_LOCALES = ['en', 'vi'] as const;
export type Locale = (typeof SUPPORTED_LOCALES)[number];

export const DEFAULT_LOCALE: Locale = 'en';

/** A language is always shown in its own name (never translated): a person who cannot read the current language can find theirs. */
export const NATIVE_NAMES: Readonly<Record<Locale, string>> = {
  en: 'English',
  vi: 'Tiếng Việt',
};

export const isLocale = (value: string | undefined): value is Locale =>
  SUPPORTED_LOCALES.some(l => l === value);

/** `vi-VN` / `vi_VN` / `VI` -> `vi`; anything that is not a supported language -> undefined. */
export function toSupportedLocale(tag: string): Locale | undefined {
  const language = tag.split(/[-_]/)[0]?.toLowerCase();
  return isLocale(language) ? language : undefined;
}

/**
 * Which language to show: the person's own choice wins; otherwise the first device language that is supported;
 * otherwise the default.
 */
export function resolveLocale(
  preference: Locale | undefined,
  deviceTags: readonly string[],
): Locale {
  if (preference) return preference;
  for (const tag of deviceTags) {
    const match = toSupportedLocale(tag);
    if (match) return match;
  }
  return DEFAULT_LOCALE;
}
