import { inject, injectable } from 'inversiland';
import type { UseCase } from '@/shared/application/UseCase';
import { DomainError } from '@/shared/domain/DomainError';
import { isLocale, resolveLocale, type Locale } from '../domain/Locale';
import {
  DeviceLocaleSourceToken,
  LocalePreferenceRepositoryToken,
  type DeviceLocaleSource,
  type LocalePreferenceRepository,
} from '../domain/ports';

@injectable()
export class GetLocale implements UseCase<void, Locale> {
  constructor(
    @inject(LocalePreferenceRepositoryToken) private readonly preference: LocalePreferenceRepository,
    @inject(DeviceLocaleSourceToken) private readonly device: DeviceLocaleSource,
  ) {}

  execute(): Locale {
    return resolveLocale(this.preference.get(), this.device.tags());
  }
}

@injectable()
export class ChangeLocale implements UseCase<Locale, Locale> {
  constructor(@inject(LocalePreferenceRepositoryToken) private readonly preference: LocalePreferenceRepository) {}

  execute(locale: Locale): Locale {
    if (!isLocale(locale)) throw new DomainError('LOCALE_UNSUPPORTED', `Unsupported language: ${String(locale)}`);
    this.preference.save(locale);
    return locale;
  }
}

/** "Follow the device language" again. */
@injectable()
export class FollowDeviceLocale implements UseCase<void, Locale> {
  constructor(
    @inject(LocalePreferenceRepositoryToken) private readonly preference: LocalePreferenceRepository,
    @inject(DeviceLocaleSourceToken) private readonly device: DeviceLocaleSource,
  ) {}

  execute(): Locale {
    this.preference.clear();
    return resolveLocale(undefined, this.device.tags());
  }
}
