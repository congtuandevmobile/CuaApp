import { Pressable, View } from 'react-native';
import { StyleSheet, useUnistyles } from 'react-native-unistyles';
import { AppText } from './AppText';
import { Icon, type IconName } from './Icon';

interface Props {
  label: string;
  on?: boolean;
  icon?: IconName;
  iconColor?: string;
  /** Without `onPress` the chip is a static label (no button role). */
  onPress?: () => void;
}

/** A pill (`.chip`): a filter, a toggle or a stat. Selected = volt fill with ink text. */
export function Chip({ label, on = false, icon, iconColor, onPress }: Props) {
  const { theme } = useUnistyles();
  const content = (
    <>
      {icon ? <Icon name={icon} size={18} color={on ? theme.colors.text.onBrand : (iconColor ?? theme.colors.text.secondary)} /> : null}
      <AppText variant="caption" style={[styles.label, on && styles.labelOn]}>
        {label}
      </AppText>
    </>
  );
  if (!onPress) return <View style={[styles.chip, on && styles.on]}>{content}</View>;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ selected: on }}
      hitSlop={4}
      onPress={onPress}
      style={({ pressed }) => [styles.chip, on && styles.on, pressed && styles.pressed]}
    >
      {content}
    </Pressable>
  );
}

const styles = StyleSheet.create((theme) => ({
  chip: {
    minHeight: 40,
    paddingHorizontal: 14,
    borderRadius: theme.radius.pill,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(255,255,255,0.07)',
    borderWidth: 1,
    borderColor: theme.colors.stroke.hairline,
  },
  on: { backgroundColor: theme.colors.brand.primary, borderColor: 'transparent' },
  pressed: { opacity: 0.85 },
  label: { fontFamily: theme.fonts.bodyMedium, fontSize: 14, lineHeight: 20, color: theme.colors.text.secondary },
  labelOn: { fontFamily: theme.fonts.bodySemi, color: theme.colors.text.onBrand },
}));
