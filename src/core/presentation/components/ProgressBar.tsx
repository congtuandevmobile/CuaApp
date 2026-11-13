import { View } from 'react-native';
import { StyleSheet } from 'react-native-unistyles';

interface Props {
  /** 0..1, clamped. */
  value: number;
  color?: string;
  height?: number;
}

/** The thin progress bar of the design (`.bar`). */
export function ProgressBar({ value, color, height = 6 }: Props) {
  const pct = `${Math.round(Math.min(1, Math.max(0, value)) * 100)}%` as const;
  return (
    <View style={[styles.track, { height, borderRadius: height / 2 }]}>
      <View style={[styles.fill, { width: pct, borderRadius: height / 2 }, color ? { backgroundColor: color } : null]} />
    </View>
  );
}

const styles = StyleSheet.create((theme) => ({
  track: { width: '100%', overflow: 'hidden', backgroundColor: 'rgba(255,255,255,0.12)' },
  fill: { height: '100%', backgroundColor: theme.colors.brand.primary },
}));
