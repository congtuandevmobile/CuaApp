import { injectable } from 'inversiland';
import type { DeviceLocaleSource } from '../domain/ports';

/**
 * The device language through `Intl` (Hermes implements it on iOS and Android), so no extra native module is needed.
 * It reports the language the OS gives this app; per-app language settings of the OS are honoured by the platform.
 */
@injectable()
export class IntlDeviceLocaleSource implements DeviceLocaleSource {
  tags(): readonly string[] {
    try {
      const tag = Intl.DateTimeFormat().resolvedOptions().locale;
      return tag ? [tag] : [];
    } catch {
      return [];
    }
  }
}
