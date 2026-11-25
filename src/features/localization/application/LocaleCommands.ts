import { Injectable } from '@magic-runtime/di';
import type { UseCase } from '@/shared/application/UseCase';
import { DomainError } from '@/shared/domain/DomainError';
import { isLocale, resolveLocale, type Locale } from '../domain/Locale';
import {
  DeviceLocaleSource,
  LocalePreferenceRepository,
} from '../domain/ports';

@Injectable([LocalePreferenceRepository, DeviceLocaleSource])
export class GetLocale implements UseCase<void, Locale> {
  constructor(
    private readonly preference: LocalePreferenceRepository,
    private readonly device: DeviceLocaleSource,
  ) {}

  execute(): Locale {
    return resolveLocale(this.preference.get(), this.device.tags());
  }
}

@Injectable([LocalePreferenceRepository])
export class ChangeLocale implements UseCase<Locale, Locale> {
  constructor(private readonly preference: LocalePreferenceRepository) {}

  execute(locale: Locale): Locale {
    if (!isLocale(locale))
      throw new DomainError(
        'LOCALE_UNSUPPORTED',
        `Unsupported language: ${String(locale)}`,
      );
    this.preference.save(locale);
    return locale;
  }
}

/** "Follow the device language" again. */
@Injectable([LocalePreferenceRepository, DeviceLocaleSource])
export class FollowDeviceLocale implements UseCase<void, Locale> {
  constructor(
    private readonly preference: LocalePreferenceRepository,
    private readonly device: DeviceLocaleSource,
  ) {}

  execute(): Locale {
    this.preference.clear();
    return resolveLocale(undefined, this.device.tags());
  }
}
