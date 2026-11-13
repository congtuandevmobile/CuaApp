import { inject, injectable } from 'inversiland';
import { KeyValueStoreToken, type KeyValueStore } from '@/shared/domain/ports';
import { isLocale, type Locale } from '../domain/Locale';
import type { LocalePreferenceRepository } from '../domain/ports';

const KEY = 'settings.locale';

@injectable()
export class KeyValueLocalePreferenceRepository implements LocalePreferenceRepository {
  constructor(@inject(KeyValueStoreToken) private readonly store: KeyValueStore) {}

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
