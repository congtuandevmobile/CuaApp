import type { NavigatorScreenParams } from '@react-navigation/native';

export type MainTabParamList = {
  Home: undefined;
  Activity: undefined;
  /** Not a screen: the centre button of the glass tab bar opens the record flow. */
  Record: undefined;
  Hero: undefined;
  Profile: undefined;
};

export type RootStackParamList = {
  Splash: undefined;
  Intro: undefined;
  Welcome: undefined;
  CreateAccount: undefined;
  SignIn: undefined;
  Permissions: undefined;
  CharacterSelect: undefined;
  Main: NavigatorScreenParams<MainTabParamList> | undefined;
  RecordPicker: undefined;
  Recording: undefined;
  Summary: undefined;
  ActivityDetail: { id: string };
  GuestGate: undefined;
  Closet: undefined;
  HealthSync: undefined;
};

declare global {
  namespace ReactNavigation {
    interface RootParamList extends RootStackParamList {}
  }
}
