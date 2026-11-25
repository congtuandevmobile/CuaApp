import { Injectable } from '@magic-runtime/di';
import { KeyValueStore } from '@/shared/domain/ports';
import { isLocale, type Locale } from '../domain/Locale';
import type { LocalePreferenceRepository } from '../domain/ports';

const KEY = 'settings.locale';

@Injectable([KeyValueStore])
export class KeyValueLocalePreferenceRepository
  implements LocalePreferenceRepository
{
  constructor(private readonly store: KeyValueStore) {}

  get(): Locale | undefined {
    const value = this.store.getString(KEY);
    return isLocale(value) ? value : undefined; // an unknown stored value (a removed language) means "follow the device"
  }

  save(locale: Locale): void {
    this.store.setString(KEY, locale);
  }

  clear(): void {
    this.store.remove(KEY);
  }
}
