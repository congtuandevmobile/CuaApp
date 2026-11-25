import type { Locale } from './Locale';
import { token } from '@magic-runtime/di';

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

export const LocalePreferenceRepository = token<LocalePreferenceRepository>(
  'localization.LocalePreferenceRepository',
);
export const DeviceLocaleSource = token<DeviceLocaleSource>(
  'localization.DeviceLocaleSource',
);
