import type { PropsWithChildren } from 'react';
import { View, type ViewStyle } from 'react-native';
import { StyleSheet } from 'react-native-unistyles';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

/** The bottom sheet surface of the design (`.sheet` + `.grab`). Layout only: presenting it is the navigator's job. */
export function Sheet({
  children,
  style,
}: PropsWithChildren<{ style?: ViewStyle }>) {
  const insets = useSafeAreaInsets();
  return (
    <View
      style={[
        styles.sheet,
        { paddingBottom: Math.max(insets.bottom, 16) + 16 },
        style,
      ]}
    >
      <View style={styles.grab} />
      {children}
    </View>
  );
}

const styles = StyleSheet.create(theme => ({
  sheet: {
    borderTopLeftRadius: 36,
    borderTopRightRadius: 36,
    paddingTop: 12,
    paddingHorizontal: theme.layout.screenPadding,
    gap: theme.spacing(4),
    borderTopWidth: 1,
    borderColor: theme.colors.stroke.glass,
    experimental_backgroundImage: theme.isDark
      ? 'linear-gradient(180deg, rgba(40,46,70,0.97), rgba(14,17,28,0.99))'
      : 'linear-gradient(180deg, rgba(255,255,255,0.98), rgba(244,246,251,1))',
  },
  grab: {
    alignSelf: 'center',
    width: 40,
    height: 5,
    borderRadius: 3,
    backgroundColor: 'rgba(255,255,255,0.3)',
    marginBottom: 4,
  },
}));
