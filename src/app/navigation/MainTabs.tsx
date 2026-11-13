import { createNativeBottomTabNavigator } from '@react-navigation/bottom-tabs/unstable';
import { observer } from 'mobx-react-lite';
import { Platform } from 'react-native';
import { useUnistyles } from 'react-native-unistyles';
import { controllers } from '@/app/composition/container';
import { isRecording } from '@/features/tracking/domain/Recording';
import { ActivityScreen } from '@/features/tracking/presentation/screens/ActivityScreen';
import { HeroScreen } from '@/features/hero/presentation/screens/HeroScreen';
import { useT } from '../i18n/useT';
import { HomeScreen } from '../screens/HomeScreen';
import { ProfileScreen } from '../screens/ProfileScreen';
import type { MainTabParamList } from './types';

const Tab = createNativeBottomTabNavigator<MainTabParamList>();

/**
 * The main tabs, drawn by the system: a `UITabBarController` on iOS (liquid glass on iOS 26, with the system minimize
 * on scroll) and a Material navigation bar on Android. Nothing is painted by the app.
 *
 * Record sits in the middle but is not a place: pressing it opens the sport picker, or the live
 * recording when one is already open (the icon becomes a stop symbol).
 */
export const MainTabs = observer(function MainTabs() {
  const { t } = useT();
  const { theme } = useUnistyles();
  const live = isRecording(controllers.record().snapshot);
  const icon = (name: 'house.fill' | 'figure.run' | 'figure.stand' | 'gearshape.fill' | 'record.circle.fill' | 'stop.circle.fill') =>
    Platform.OS === 'ios' ? ({ type: 'sfSymbol', name } as const) : undefined;

  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: theme.colors.brand.primary,
        tabBarMinimizeBehavior: 'onScrollDown',
      }}
    >
      <Tab.Screen name="Home" component={HomeScreen} options={{ title: t('tabs.home'), tabBarIcon: icon('house.fill') }} />
      <Tab.Screen name="Activity" component={ActivityScreen} options={{ title: t('tabs.activity'), tabBarIcon: icon('figure.run') }} />
      <Tab.Screen
        name="Record"
        component={HomeScreen}
        options={{
          // Never selected: native reports the press (`tabPress`) and keeps the current tab on screen.
          tabBarSelectionEnabled: false,
          title: live ? t('tabs.openRecording') : t('tabs.record'),
          tabBarIcon: Platform.OS === 'ios' ? { type: 'sfSymbol', name: live ? 'stop.circle.fill' : 'record.circle.fill', renderingMode: 'multicolor' } : undefined,
        }}
        listeners={({ navigation }) => ({
          tabPress: () => {
            // The record screen itself is the pre-start view (map, GPS signal, sport, Start), as in UPRACE / Strava.
            navigation.getParent()?.navigate('Recording');
          },
        })}
      />
      <Tab.Screen name="Hero" component={HeroScreen} options={{ title: t('tabs.hero'), tabBarIcon: icon('figure.stand') }} />
      <Tab.Screen name="Profile" component={ProfileScreen} options={{ title: t('tabs.profile'), tabBarIcon: icon('gearshape.fill') }} />
    </Tab.Navigator>
  );
});
