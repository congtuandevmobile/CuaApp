import { en } from './locales/en';
import { vi } from './locales/vi';
import { errorText, formatKm, formatNumber, humanizeSport, sportName } from './format';
import { i18n, setupI18n } from './i18n';

/** Every dotted key of a translation tree -> its string. */
function flatten(tree: object, prefix = ''): Record<string, string> {
  return Object.entries(tree).reduce<Record<string, string>>((acc, [k, v]) => {
    const key = prefix ? `${prefix}.${k}` : k;
    return typeof v === 'string' ? { ...acc, [key]: v } : { ...acc, ...flatten(v as object, key) };
  }, {});
}
const placeholders = (s: string) => [...s.matchAll(/\{\{(\w+)\}\}/g)].map((m) => m[1]).sort();

describe('translations', () => {
  const english = flatten(en);
  const vietnamese = flatten(vi);

  it('Vietnamese has exactly the keys of English', () => {
    expect(Object.keys(vietnamese).sort()).toEqual(Object.keys(english).sort());
  });
  it('no translation is empty', () => {
    expect(Object.entries(vietnamese).filter(([, v]) => v.trim() === '')).toEqual([]);
  });
  it('every translation keeps the placeholders of the English text', () => {
    const wrong = Object.keys(english).filter((k) => JSON.stringify(placeholders(english[k]!)) !== JSON.stringify(placeholders(vietnamese[k]!)));
    expect(wrong).toEqual([]);
  });
  it('has a message for every error code the domain can raise', () => {
    for (const code of ['AUTH_NAME_REQUIRED', 'AUTH_USERNAME_INVALID', 'AUTH_USERNAME_REQUIRED', 'AUTH_USERNAME_TAKEN', 'AUTH_EMAIL_INVALID', 'AUTH_EMAIL_TAKEN', 'AUTH_PASSWORD_TOO_SHORT', 'AUTH_PASSWORD_REQUIRED', 'AUTH_LOGIN_FAILED', 'AUTH_NETWORK', 'AUTH_SERVER', 'HERO_NAME_REQUIRED', 'HERO_ACCESSORY_LOCKED', 'RECORDING_PERMISSION', 'RECORDING_NOT_DURABLE']) {
      expect(english[`errors.${code}`]).toBeDefined();
      expect(vietnamese[`errors.${code}`]).toBeDefined();
    }
  });
});

describe('runtime', () => {
  afterAll(() => setupI18n('en'));

  it('switches language without a restart, with placeholders', () => {
    setupI18n('en');
    expect(i18n.t('record.start', { sport: 'Soccer' })).toBe('Start Soccer');
    setupI18n('vi');
    expect(i18n.t('record.start', { sport: 'Đá bóng' })).toBe('Bắt đầu Đá bóng');
    expect(i18n.t('home.empty')).toMatch(/nút đỏ/);
  });
  it('shows sports in the current language, and a humanized name for a sport without a row', () => {
    setupI18n('vi');
    expect(sportName('soccer')).toBe('Đá bóng');
    setupI18n('en');
    expect(sportName('soccer')).toBe('Soccer');
    expect(sportName('discSports')).toBe('Disc sports'); // no row: never a raw key
    expect(humanizeSport('highIntensityIntervalTraining')).toBe('High intensity interval training');
  });
  it('turns a stable error code into text, and an unknown code into the generic message', () => {
    setupI18n('vi');
    expect(errorText('AUTH_LOGIN_FAILED')).toBe('Sai tên đăng nhập, email hoặc mật khẩu.');
    expect(errorText('SOMETHING_NEW')).toBe('Đã có lỗi xảy ra. Hãy thử lại.');
    expect(errorText(undefined)).toBeUndefined();
  });
  it('formats numbers for the language (comma in Vietnamese)', () => {
    expect(formatKm(1500, 'en')).toBe('1.50');
    expect(formatKm(1500, 'vi')).toBe('1,50');
    expect(formatKm(12_340, 'vi')).toBe('12,3');
    expect(formatNumber(5, 'en', 0)).toBe('5');
  });
});
