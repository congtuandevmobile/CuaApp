import { DarkTheme, NavigationContainer } from '@react-navigation/native';
import { StatusBar } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { controllers, startContainer } from './composition/container';
import { I18nProvider } from './providers/I18nProvider';
import { setupI18n } from './i18n/i18n';
import { darkTheme } from '../core/presentation/theme/unistyles';
import { RootNavigator } from './navigation/RootNavigator';
import { linking } from './navigation/linking';

// The dependency graph and the language are ready before the first screen renders: no flash of the wrong language.
startContainer();
setupI18n(controllers.locale().init());

/** The navigator's own ground must be the app's, or a white card shows through during transitions. */
const navTheme = { ...DarkTheme, colors: { ...DarkTheme.colors, background: darkTheme.colors.background.base, card: darkTheme.colors.background.base } };

export default function App() {
  return (
    <SafeAreaProvider>
      <I18nProvider>
        <StatusBar barStyle="light-content" />
        <NavigationContainer linking={linking} theme={navTheme}>
          <RootNavigator />
        </NavigationContainer>
      </I18nProvider>
    </SafeAreaProvider>
  );
}
