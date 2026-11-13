import { reaction } from 'mobx';
import { useEffect, type PropsWithChildren } from 'react';
import { I18nextProvider } from 'react-i18next';
import { controllers } from '@/app/composition/container';
import { i18n, setupI18n } from '../i18n/i18n';

/**
 * Keeps i18n in step with the language the person chose: change it anywhere (`controllers.locale().choose('vi')`) and
 * every screen re-renders in the new language. The first language is set synchronously in `App.tsx`, before any screen.
 */
export function I18nProvider({ children }: Readonly<PropsWithChildren>) {
  useEffect(() => reaction(() => controllers.locale().locale, (locale) => setupI18n(locale)), []);
  return <I18nextProvider i18n={i18n}>{children}</I18nextProvider>;
}
