import { InMemoryKeyValueStore } from '@/shared/testing/fakes';
import {
  DEFAULT_LOCALE,
  isLocale,
  resolveLocale,
  toSupportedLocale,
} from '../domain/Locale';
import { KeyValueLocalePreferenceRepository } from '../infrastructure/KeyValueLocalePreferenceRepository';
import { LocaleController } from '../presentation/LocaleController';
import { ChangeLocale, FollowDeviceLocale, GetLocale } from './LocaleCommands';

function setup(deviceTags: string[]) {
  const store = new InMemoryKeyValueStore();
  const preference = new KeyValueLocalePreferenceRepository(store);
  const device = { tags: () => deviceTags };
  const controller = new LocaleController(
    new GetLocale(preference, device),
    new ChangeLocale(preference),
    new FollowDeviceLocale(preference, device),
  );
  return { store, preference, controller };
}

describe('resolveLocale', () => {
  it.each([
    ['vi-VN', 'vi'],
    ['vi_VN', 'vi'],
    ['VI', 'vi'],
    ['en-GB', 'en'],
    ['fr-FR', undefined],
    ['', undefined],
  ])('maps the device tag %s to %s', (tag, expected) => {
    expect(toSupportedLocale(tag)).toBe(expected);
  });

  it('the person’s choice wins over the device', () => {
    expect(resolveLocale('en', ['vi-VN'])).toBe('en');
  });
  it('uses the first SUPPORTED device language, else the default', () => {
    expect(resolveLocale(undefined, ['fr-FR', 'vi-VN'])).toBe('vi');
    expect(resolveLocale(undefined, ['ja-JP'])).toBe(DEFAULT_LOCALE);
    expect(resolveLocale(undefined, [])).toBe(DEFAULT_LOCALE);
  });
  it('isLocale rejects anything else', () => {
    expect(isLocale('vi')).toBe(true);
    expect(isLocale('fr')).toBe(false);
    expect(isLocale(undefined)).toBe(false);
  });
});

describe('LocaleController', () => {
  it('follows a Vietnamese device until the person chooses', () => {
    const { controller, preference } = setup(['vi-VN']);
    expect(controller.init()).toBe('vi');
    expect(controller.chosen).toBe(false);
    controller.choose('en');
    expect(controller.locale).toBe('en');
    expect(controller.chosen).toBe(true);
    expect(preference.get()).toBe('en'); // survives a restart
  });
  it('goes back to the device language', () => {
    const { controller, preference } = setup(['vi-VN']);
    controller.choose('en');
    controller.useDeviceLanguage();
    expect(controller.locale).toBe('vi');
    expect(preference.get()).toBeUndefined();
  });
  it('drops a stored language the app no longer supports', () => {
    const { store, controller } = setup(['en-US']);
    store.setString('settings.locale', 'fr');
    expect(controller.init()).toBe('en');
  });
});
