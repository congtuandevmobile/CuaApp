import type { PropsWithChildren } from 'react';
import type { ViewProps } from 'react-native';
import { StyleSheet } from 'react-native-unistyles';
import { GlassSurface } from './GlassSurface';

/** A glass card: padding and radius over `GlassSurface` (system liquid glass on iOS 26, a translucent fill elsewhere). */
export function GlassCard({
  children,
  style,
  ...rest
}: PropsWithChildren<ViewProps>) {
  return (
    <GlassSurface {...rest} style={[styles.card, style]}>
      {children}
    </GlassSurface>
  );
}

const styles = StyleSheet.create(theme => ({
  card: { borderRadius: theme.radius.xl, padding: theme.spacing(5) },
}));
