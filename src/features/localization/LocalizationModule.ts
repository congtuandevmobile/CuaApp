import { module } from 'inversiland';
import { SharedModule } from '@/shared/SharedModule';
import { ChangeLocale, FollowDeviceLocale, GetLocale } from './application/LocaleCommands';
import { DeviceLocaleSourceToken, LocalePreferenceRepositoryToken } from './domain/ports';
import { IntlDeviceLocaleSource } from './infrastructure/IntlDeviceLocaleSource';
import { KeyValueLocalePreferenceRepository } from './infrastructure/KeyValueLocalePreferenceRepository';
import { LocaleController } from './presentation/LocaleController';

@module({
  imports: [SharedModule],
  providers: [
    { provide: LocalePreferenceRepositoryToken, useClass: KeyValueLocalePreferenceRepository },
    { provide: DeviceLocaleSourceToken, useClass: IntlDeviceLocaleSource },
    GetLocale,
    ChangeLocale,
    FollowDeviceLocale,
    LocaleController,
  ],
  exports: [LocaleController],
})
export class LocalizationModule {}
