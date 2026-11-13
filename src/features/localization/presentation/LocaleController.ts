import { inject, injectable } from 'inversiland';
import { action, makeObservable, observable } from 'mobx';
import { ChangeLocale, FollowDeviceLocale, GetLocale } from '../application/LocaleCommands';
import { DEFAULT_LOCALE, type Locale } from '../domain/Locale';

/** The language in use. The i18n instance follows `locale` (see `I18nProvider`); nothing else needs to know how. */
@injectable()
export class LocaleController {
  locale: Locale = DEFAULT_LOCALE;
  /** True when the person chose a language; false when the app follows the device. */
  chosen = false;

  constructor(
    @inject(GetLocale) private readonly getLocale: GetLocale,
    @inject(ChangeLocale) private readonly changeLocale: ChangeLocale,
    @inject(FollowDeviceLocale) private readonly followDevice: FollowDeviceLocale,
  ) {
    makeObservable(this, { locale: observable, chosen: observable, init: action, choose: action, useDeviceLanguage: action });
  }

  init(): Locale {
    this.locale = this.getLocale.execute();
    return this.locale;
  }

  choose(locale: Locale): void {
    this.locale = this.changeLocale.execute(locale);
    this.chosen = true;
  }

  useDeviceLanguage(): void {
    this.locale = this.followDevice.execute();
    this.chosen = false;
  }
}
