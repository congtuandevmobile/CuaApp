import { View } from 'react-native';
import { StyleSheet } from 'react-native-unistyles';
import { AppText } from '@/core/presentation/components/AppText';
import { GlassSurface } from '@/core/presentation/components/GlassSurface';

/** One metric tile (`.cell`): overline label, big number, small unit. */
export function StatCell({ label, value, unit }: { label: string; value: string; unit?: string }) {
  return (
    <GlassSurface style={styles.cell}>
      <View style={styles.inner}>
        <AppText variant="overline" tone="tertiary">{label}</AppText>
        <AppText variant="number">
          {value}
          {unit ? <AppText variant="caption" tone="secondary">{` ${unit}`}</AppText> : null}
        </AppText>
      </View>
    </GlassSurface>
  );
}

const styles = StyleSheet.create(() => ({
  cell: { flexBasis: '47%', flexGrow: 1, borderRadius: 20 },
  inner: { paddingVertical: 14, paddingHorizontal: 16, gap: 4 },
}));
