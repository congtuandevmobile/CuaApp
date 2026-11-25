import { StyleSheet as RNStyleSheet, View } from 'react-native';
import { StyleSheet } from 'react-native-unistyles';

type Glow = readonly [number, number, number, number];

const rgba = ([r, g, b, a]: Glow, alpha = a) => `rgba(${r},${g},${b},${alpha})`;

/** One soft light: a radial gradient that fades to the same colour at 0 alpha (no grey fringe). */
const light = (glow: Glow, where: string, size: string, stop: number) =>
  `radial-gradient(ellipse ${size} at ${where}, ${rgba(glow)} 0%, ${rgba(
    glow,
    0,
  )} ${stop}%)`;

/**
 * The ground of every screen: the base colour with three soft lights (violet top-left, cyan right, volt bottom), the
 * same recipe as the design's `.scr`. It is a plain View with a CSS-like gradient: no native module, no extra layer.
 */
export function Backdrop() {
  return (
    <View
      pointerEvents="none"
      style={[RNStyleSheet.absoluteFill, styles.ground]}
    />
  );
}

const styles = StyleSheet.create(theme => {
  const { violet, cyan, volt } = theme.colors.glow;
  return {
    ground: {
      backgroundColor: theme.colors.background.base,
      experimental_backgroundImage: [
        light(violet, '0% 0%', '120% 55%', 62),
        light(cyan, '100% 22%', '90% 45%', 62),
        light(volt, '50% 112%', '110% 45%', 60),
      ].join(', '),
    },
  };
});
