import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { CreateAccountScreen } from '@/features/auth/presentation/screens/CreateAccountScreen';
import { GuestGateScreen } from '@/features/auth/presentation/screens/GuestGateScreen';
import { SignInScreen } from '@/features/auth/presentation/screens/SignInScreen';
import { WelcomeScreen } from '@/features/auth/presentation/screens/WelcomeScreen';
import { HealthSyncScreen } from '@/features/health/presentation/screens/HealthSyncScreen';
import { CharacterSelectScreen } from '@/features/hero/presentation/screens/CharacterSelectScreen';
import { ClosetScreen } from '@/features/hero/presentation/screens/ClosetScreen';
import { ActivityDetailScreen } from '@/features/tracking/presentation/screens/ActivityDetailScreen';
import { RecordingScreen } from '@/features/tracking/presentation/screens/RecordingScreen';
import { RecordPickerScreen } from '@/features/tracking/presentation/screens/RecordPickerScreen';
import { SummaryScreen } from '@/features/tracking/presentation/screens/SummaryScreen';
import { IntroScreen } from '../screens/IntroScreen';
import { PermissionsScreen } from '../screens/PermissionsScreen';
import { SplashScreen } from '../screens/SplashScreen';
import { MainTabs } from './MainTabs';
import type { RootStackParamList } from './types';

const Stack = createNativeStackNavigator<RootStackParamList>();

export function RootNavigator() {
  return (
    <Stack.Navigator
      initialRouteName="Splash"
      screenOptions={{ headerShown: false, animation: 'fade' }}
    >
      <Stack.Screen name="Splash" component={SplashScreen} />
      <Stack.Screen name="Intro" component={IntroScreen} />
      <Stack.Screen name="Welcome" component={WelcomeScreen} />
      <Stack.Screen
        name="CreateAccount"
        component={CreateAccountScreen}
        options={{ animation: 'slide_from_right' }}
      />
      <Stack.Screen
        name="SignIn"
        component={SignInScreen}
        options={{ animation: 'slide_from_right' }}
      />
      <Stack.Screen
        name="Permissions"
        component={PermissionsScreen}
        options={{ gestureEnabled: false }}
      />
      <Stack.Screen
        name="CharacterSelect"
        component={CharacterSelectScreen}
        options={{ gestureEnabled: false }}
      />
      <Stack.Screen
        name="Main"
        component={MainTabs}
        options={{ gestureEnabled: false }}
      />
      <Stack.Screen
        name="RecordPicker"
        component={RecordPickerScreen}
        options={{
          presentation: 'transparentModal',
          animation: 'slide_from_bottom',
        }}
      />
      <Stack.Screen
        name="Recording"
        component={RecordingScreen}
        options={{ gestureEnabled: false, animation: 'slide_from_bottom' }}
      />
      <Stack.Screen
        name="Summary"
        component={SummaryScreen}
        options={{ gestureEnabled: false }}
      />
      <Stack.Screen
        name="ActivityDetail"
        component={ActivityDetailScreen}
        options={{ animation: 'slide_from_right' }}
      />
      <Stack.Screen
        name="GuestGate"
        component={GuestGateScreen}
        options={{
          presentation: 'transparentModal',
          animation: 'slide_from_bottom',
        }}
      />
      <Stack.Screen
        name="Closet"
        component={ClosetScreen}
        options={{ animation: 'slide_from_right', gestureEnabled: false }}
      />
      <Stack.Screen
        name="HealthSync"
        component={HealthSyncScreen}
        options={{ animation: 'slide_from_right' }}
      />
    </Stack.Navigator>
  );
}
