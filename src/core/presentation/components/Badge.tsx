import { View } from 'react-native';
import { StyleSheet } from 'react-native-unistyles';
import { AppText } from './AppText';

type Tone = 'success' | 'neutral' | 'brand' | 'danger';

interface Props {
  label: string;
  tone?: Tone;
  /** The leading status dot of the design (`.dot`). */
  dot?: boolean;
}

/** A small status pill (`.badge`): "Connected", "Saved on device", "GPS good". */
export function Badge({ label, tone = 'neutral', dot = false }: Props) {
  styles.useVariants({ tone });
  return (
    <View style={styles.badge}>
      {dot ? <View style={styles.dot} /> : null}
      <AppText variant="caption" style={styles.text}>
        {label}
      </AppText>
    </View>
  );
}

const styles = StyleSheet.create((theme) => ({
  badge: {
    minHeight: 24,
    paddingHorizontal: 10,
    borderRadius: theme.radius.pill,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    variants: {
      tone: {
        success: { backgroundColor: 'rgba(61,220,151,0.18)' },
        neutral: { backgroundColor: 'rgba(255,255,255,0.1)' },
        brand: { backgroundColor: theme.colors.brand.primary },
        danger: { backgroundColor: 'rgba(255,93,108,0.18)' },
      },
    },
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    variants: {
      tone: {
        success: { backgroundColor: theme.colors.status.success },
        neutral: { backgroundColor: theme.colors.text.primary },
        brand: { backgroundColor: theme.colors.text.onBrand },
        danger: { backgroundColor: theme.colors.status.danger },
      },
    },
  },
  text: {
    fontFamily: theme.fonts.bodySemi,
    fontSize: 12,
    lineHeight: 16,
    variants: {
      tone: {
        success: { color: theme.colors.status.success },
        neutral: { color: theme.colors.text.primary },
        brand: { color: theme.colors.text.onBrand },
        danger: { color: theme.colors.status.danger },
      },
    },
  },
}));
