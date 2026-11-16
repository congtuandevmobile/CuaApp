import { Module, bind } from '@magic-runtime/di';
import { SharedModule } from '@/shared/SharedModule';
import { ChangeLocale, FollowDeviceLocale, GetLocale } from './application/LocaleCommands';
import { DeviceLocaleSource, LocalePreferenceRepository } from './domain/ports';
import { IntlDeviceLocaleSource } from './infrastructure/IntlDeviceLocaleSource';
import { KeyValueLocalePreferenceRepository } from './infrastructure/KeyValueLocalePreferenceRepository';
import { LocaleController } from './presentation/LocaleController';

/** Public surface for the app shell: `LocaleController`. */
@Module({
  imports: [SharedModule],
  providers: [
    bind(LocalePreferenceRepository).toClass(KeyValueLocalePreferenceRepository),
    bind(DeviceLocaleSource).toClass(IntlDeviceLocaleSource),
    GetLocale,
    ChangeLocale,
    FollowDeviceLocale,
    LocaleController,
  ],
})
export class LocalizationModule {}
