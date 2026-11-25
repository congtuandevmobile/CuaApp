import { View } from 'react-native';
import { StyleSheet, useUnistyles } from 'react-native-unistyles';
import { Icon } from '@/core/presentation/components/Icon';
import { sportStyle } from '../sportStyle';

/** `.sport`: a 44 px rounded square in the sport's colour with its glyph. */
export function SportBadge({
  code,
  size = 44,
}: {
  code: string;
  size?: number;
}) {
  const { theme } = useUnistyles();
  const { key, icon } = sportStyle(code);
  const ink = key === 'swim' ? '#FFFFFF' : '#0B1300';
  return (
    <View
      style={[
        styles.badge,
        {
          width: size,
          height: size,
          borderRadius: size * 0.32,
          backgroundColor: theme.colors.sport[key],
        },
      ]}
    >
      <Icon name={icon} size={size * 0.55} color={ink} />
    </View>
  );
}

const styles = StyleSheet.create(() => ({
  badge: { alignItems: 'center', justifyContent: 'center' },
}));
