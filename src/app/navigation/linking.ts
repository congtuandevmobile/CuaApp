import type { LinkingOptions } from '@react-navigation/native';
import type { RootStackParamList } from './types';

/** `cua://record` (the lock-screen Live Activity and the Android notification open it) lands on the recording. */
export const linking: LinkingOptions<RootStackParamList> = {
  prefixes: ['cua://'],
  config: { screens: { Recording: 'record' } },
};
