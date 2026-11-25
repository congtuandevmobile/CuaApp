import { Pressable, type PressableProps, type ViewStyle } from 'react-native';
import { StyleSheet, useUnistyles } from 'react-native-unistyles';
import { Icon, type IconName } from './Icon';

interface Props extends Omit<PressableProps, 'children' | 'style'> {
  icon: IconName;
  /** Required: an icon-only control needs an accessible name. */
  label: string;
  size?: number;
  iconSize?: number;
  color?: string;
  style?: ViewStyle;
}

/** The round glass button of the design (`.icon-btn`): 44 px, a translucent fill and a hairline rim. */
export function IconButton({
  icon,
  label,
  size = 44,
  iconSize = 18,
  color,
  style,
  ...rest
}: Readonly<Props>) {
  const { theme } = useUnistyles();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      hitSlop={size < 44 ? (44 - size) / 2 : undefined}
      {...rest}
      style={({ pressed }) => [
        styles.base,
        { width: size, height: size, borderRadius: size / 2 },
        pressed && styles.pressed,
        style,
      ]}
    >
      <Icon
        name={icon}
        size={iconSize}
        color={color ?? theme.colors.text.primary}
      />
    </Pressable>
  );
}

const styles = StyleSheet.create(theme => ({
  base: {
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: theme.colors.stroke.glass,
    backgroundColor: theme.isDark
      ? 'rgba(255,255,255,0.12)'
      : 'rgba(255,255,255,0.7)',
  },
  pressed: { opacity: 0.8, transform: [{ scale: 0.96 }] },
}));
