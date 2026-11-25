import {
  isLiquidGlassSupported,
  LiquidGlassView,
} from '@callstack/liquid-glass';
import type { PropsWithChildren } from 'react';
import { View, type ViewProps } from 'react-native';
import { StyleSheet } from 'react-native-unistyles';

interface Props extends ViewProps {
  /** Glass reacts to touch (grows, shimmers). For buttons and bars, not for static cards. */
  interactive?: boolean;
  /** `regular` for bars and cards, `clear` over rich content such as the 3D hero. */
  effect?: 'regular' | 'clear';
}

/**
 * The one place that decides how glass is drawn. iOS 26+: a real `UIGlassEffect` (the system liquid glass, which
 * bends and tints what is behind it). Everywhere else (Android, older iOS): a translucent fill with a specular rim, the
 * same look as the design's CSS. Callers only pass layout and shape (`borderRadius`) in `style`.
 */
export function GlassSurface({
  children,
  style,
  interactive,
  effect = 'regular',
  ...rest
}: PropsWithChildren<Props>) {
  if (isLiquidGlassSupported) {
    return (
      <LiquidGlassView
        {...rest}
        effect={effect}
        interactive={interactive}
        colorScheme="dark"
        style={[styles.shape, style]}
      >
        {children}
      </LiquidGlassView>
    );
  }
  return (
    <View {...rest} style={[styles.shape, styles.fallback, style]}>
      {children}
    </View>
  );
}

const styles = StyleSheet.create(theme => ({
  shape: { overflow: 'hidden' },
  fallback: {
    borderWidth: 1,
    borderColor: theme.colors.stroke.glass,
    backgroundColor: theme.isDark
      ? 'rgba(30,36,56,0.72)'
      : 'rgba(255,255,255,0.7)',
  },
}));
