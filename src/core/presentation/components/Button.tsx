import { Pressable, type PressableProps } from 'react-native';
import { StyleSheet } from 'react-native-unistyles';
import { AppText } from './AppText';
import { Icon, type IconName } from './Icon';

type Kind = 'primary' | 'glass' | 'ghost' | 'danger' | 'light';

interface Props extends Omit<PressableProps, 'children'> {
  label: string;
  kind?: Kind;
  size?: 'md' | 'sm';
  icon?: IconName;
  /** Overrides the label colour (the design's mint "Continue as guest", coral "Discard"). */
  textColor?: string;
  /** Stretch to the container's width. */
  block?: boolean;
}

/** `.btn`: 52 px pill (40 px `sm`). `light` is the white "Continue with Apple" button. */
export function Button({ label, kind = 'primary', size = 'md', icon, textColor, block = false, disabled, ...rest }: Props) {
  styles.useVariants({ kind, size });
  const color = textColor ?? labelColor(kind);
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ disabled: !!disabled }}
      disabled={disabled}
      {...rest}
      style={({ pressed }) => [styles.base, block && styles.block, pressed && styles.pressed, disabled && styles.disabled]}
    >
      {icon ? <Icon name={icon} size={size === 'sm' ? 18 : 22} color={color} /> : null}
      <AppText variant="h3" style={[styles.label, { color }]}>
        {label}
      </AppText>
    </Pressable>
  );
}

function labelColor(kind: Kind): string {
  switch (kind) {
    case 'primary':
      return '#0B1300';
    case 'danger':
      return '#1A0508';
    case 'light':
      return '#0B0D14';
    case 'ghost':
      return '#B4BCD0';
    default:
      return '#F4F6FB';
  }
}

const styles = StyleSheet.create((theme) => ({
  base: {
    flexDirection: 'row',
    gap: 8,
    borderRadius: theme.radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
    variants: {
      size: {
        md: { minHeight: theme.hit.button, paddingHorizontal: theme.spacing(6) },
        sm: { minHeight: 44, paddingHorizontal: theme.spacing(4) },
      },
      kind: {
        primary: {
          backgroundColor: theme.colors.brand.primary,
          boxShadow: '0 8px 28px rgba(200,255,61,0.35)',
        },
        glass: { backgroundColor: 'rgba(255,255,255,0.12)', borderWidth: 1, borderColor: theme.colors.stroke.glass },
        ghost: { backgroundColor: 'transparent' },
        danger: { backgroundColor: theme.colors.status.danger },
        light: { backgroundColor: '#FFFFFF' },
      },
    },
  },
  block: { alignSelf: 'stretch' },
  pressed: { opacity: 0.85, transform: [{ scale: 0.98 }] },
  disabled: { opacity: 0.4 },
  label: {
    variants: {
      size: { md: { fontSize: 16, lineHeight: 20 }, sm: { fontSize: 14, lineHeight: 18 } },
    },
  },
}));
