import type { PropsWithChildren } from 'react';
import { View } from 'react-native';
import { StyleSheet } from 'react-native-unistyles';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Backdrop } from './Backdrop';

interface Props {
  /** Leave room for the glass tab bar at the bottom. */
  tabBar?: boolean;
  padded?: boolean;
}

/** The base of every screen: the dark ground, the safe area, the 20 px gutters. */
export function Screen({
  children,
  tabBar,
  padded = true,
}: PropsWithChildren<Props>) {
  const insets = useSafeAreaInsets();
  return (
    <View
      style={[
        styles.root,
        {
          paddingTop: insets.top + 12,
          paddingBottom: tabBar ? 120 : insets.bottom + 16,
        },
        padded && styles.padded,
      ]}
    >
      <Backdrop />
      {children}
    </View>
  );
}

const styles = StyleSheet.create(theme => ({
  root: { flex: 1, backgroundColor: theme.colors.background.base },
  padded: { paddingHorizontal: theme.layout.screenPadding },
}));
