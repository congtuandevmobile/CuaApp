import { createNativeBottomTabNavigator, type NativeBottomTabScreenProps } from '@react-navigation/bottom-tabs/unstable';
import { useFocusEffect } from '@react-navigation/native';
import { observer } from 'mobx-react-lite';
import { useCallback } from 'react';
import { Platform } from 'react-native';
import { useUnistyles } from 'react-native-unistyles';
import { controllers } from '@/app/composition/container';
import { isRecording } from '@/features/tracking/domain/Recording';
import { ActivityScreen } from '@/features/tracking/presentation/screens/ActivityScreen';
import { HeroScreen } from '@/features/hero/presentation/screens/HeroScreen';
import { Screen } from '@/core/presentation/components/Screen';
import { useT } from '../i18n/useT';
import { HomeScreen } from '../screens/HomeScreen';
import { ProfileScreen } from '../screens/ProfileScreen';
import type { MainTabParamList } from './types';

const Tab = createNativeBottomTabNavigator<MainTabParamList>();

type PlaceTab = Exclude<keyof MainTabParamList, 'Record'>;

/**
 * `previous`: the tab the person was on before Record; Record hands the selection back to it on return.
 * `flowOpen`: whether Record has opened the record flow and is waiting for it to close.
 */
const recordTabState: { previous: PlaceTab; flowOpen: boolean } = { previous: 'Home', flowOpen: false };

/**
 * The Record tab drives the record flow from its own focus, so there is exactly one source of truth:
 * - selected (first focus) → open the recording screen; Main loses focus under it, Record stays selected;
 * - focused again (the flow closed: X, minimize or Summary's Done) → give the selection back to the previous tab, so
 *   the liquid-glass indicator travels Record → that tab.
 * Opening from `tabPress` instead raced this focus and closed the flow at once (a nested navigate refocuses Main).
 * The tab itself only shows the app background, for the instant it is visible while the flow slides in or out.
 */
function RecordTab({ navigation }: NativeBottomTabScreenProps<MainTabParamList, 'Record'>) {
  useFocusEffect(
    useCallback(() => {
      if (recordTabState.flowOpen) {
        recordTabState.flowOpen = false;
        navigation.navigate(recordTabState.previous);
        return;
      }
      recordTabState.flowOpen = true;
      // The record screen itself is the pre-start view (map, GPS signal, sport, Start), as in UPRACE / Strava.
      navigation.getParent()?.navigate('Recording');
    }, [navigation]),
  );
  return <Screen>{null}</Screen>;
}

/**
 * The main tabs, drawn by the system: a `UITabBarController` on iOS (liquid glass on iOS 26, with the system minimize
 * on scroll) and a Material navigation bar on Android. Nothing is painted by the app.
 *
 * Record sits in the middle but is not a place: pressing it selects it (the indicator moves there and stays while
 * the record flow is open) and opens the recording screen, or the live recording when one is already open (the icon
 * becomes a stop symbol). Closing the flow returns to the tab it was opened from.
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
      screenListeners={({ route }) => ({
        focus: () => {
          if (route.name !== 'Record') recordTabState.previous = route.name;
        },
      })}
    >
      <Tab.Screen name="Home" component={HomeScreen} options={{ title: t('tabs.home'), tabBarIcon: icon('house.fill') }} />
      <Tab.Screen name="Activity" component={ActivityScreen} options={{ title: t('tabs.activity'), tabBarIcon: icon('figure.run') }} />
      <Tab.Screen
        name="Record"
        component={RecordTab}
        options={{
          title: live ? t('tabs.openRecording') : t('tabs.record'),
          tabBarIcon: Platform.OS === 'ios' ? { type: 'sfSymbol', name: live ? 'stop.circle.fill' : 'record.circle.fill', renderingMode: 'multicolor' } : undefined,
        }}
      />
      <Tab.Screen name="Hero" component={HeroScreen} options={{ title: t('tabs.hero'), tabBarIcon: icon('figure.stand') }} />
      <Tab.Screen name="Profile" component={ProfileScreen} options={{ title: t('tabs.profile'), tabBarIcon: icon('gearshape.fill') }} />
    </Tab.Navigator>
  );
});
