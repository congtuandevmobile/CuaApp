import type { Locale } from './Locale';

/** The language the person picked in Settings (absent = follow the device). */
export interface LocalePreferenceRepository {
  get(): Locale | undefined;
  save(locale: Locale): void;
  /** Back to "follow the device". */
  clear(): void;
}

/** The preferred languages of the device, most preferred first (BCP-47 tags such as `vi-VN`). */
export interface DeviceLocaleSource {
  tags(): readonly string[];
}

export const LocalePreferenceRepositoryToken = Symbol.for('localization.LocalePreferenceRepository');
export const DeviceLocaleSourceToken = Symbol.for('localization.DeviceLocaleSource');
