import { useState } from 'react';
import { TextInput, View, type TextInputProps } from 'react-native';
import { StyleSheet, useUnistyles } from 'react-native-unistyles';
import { AppText } from './AppText';
import { Icon, type IconName } from './Icon';

interface Props extends TextInputProps {
  label: string;
  /** Hide the visible label (the input still gets it as its accessible name). */
  hideLabel?: boolean;
  icon?: IconName;
  error?: string;
}

/** `.field`: 56 px, leading icon, volt focus ring. */
export function Field({ label, hideLabel = false, icon, error, onFocus, onBlur, ...rest }: Props) {
  const { theme } = useUnistyles();
  const [focused, setFocused] = useState(false);
  return (
    <View style={styles.wrap}>
      {hideLabel ? null : (
        <AppText variant="caption" tone="secondary" style={styles.label}>
          {label}
        </AppText>
      )}
      <View style={[styles.box, focused && styles.focus, !!error && styles.error]}>
        {icon ? <Icon name={icon} size={18} color={theme.colors.text.tertiary} /> : null}
        <TextInput
          accessibilityLabel={label}
          placeholderTextColor={theme.colors.text.tertiary}
          {...rest}
          onFocus={(e) => {
            setFocused(true);
            onFocus?.(e);
          }}
          onBlur={(e) => {
            setFocused(false);
            onBlur?.(e);
          }}
          style={styles.input}
        />
      </View>
      {error ? (
        <AppText variant="caption" tone="danger">
          {error}
        </AppText>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create((theme) => ({
  wrap: { gap: 6 },
  label: { marginLeft: 4, fontFamily: theme.fonts.bodyMedium },
  box: {
    height: theme.hit.field,
    borderRadius: theme.radius.md,
    paddingHorizontal: theme.spacing(4),
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: 'rgba(255,255,255,0.07)',
    borderWidth: 1,
    borderColor: theme.colors.stroke.glass,
  },
  focus: { borderColor: theme.colors.brand.primary, boxShadow: '0 0 0 3px rgba(200,255,61,0.25)' },
  error: { borderColor: theme.colors.status.danger },
  input: { flex: 1, height: '100%', color: theme.colors.text.primary, ...theme.type.body },
}));
