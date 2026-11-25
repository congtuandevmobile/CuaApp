import { useState } from 'react';
import { Pressable, TextInput, View, type TextInputProps } from 'react-native';
import { StyleSheet, useUnistyles } from 'react-native-unistyles';
import { AppText } from './AppText';
import { Icon, type IconName } from './Icon';

interface Props extends TextInputProps {
  label: string;
  /** Hide the visible label (the input still gets it as its accessible name). */
  hideLabel?: boolean;
  icon?: IconName;
  error?: string;
  /**
   * With `secureTextEntry`: an eye button at the end that shows / hides the text. The two labels are the button's
   * accessible names (translated by the screen: core has no i18n).
   */
  reveal?: { readonly show: string; readonly hide: string };
}

/** `.field`: 56 px, leading icon, volt focus ring. */
export function Field({
  label,
  hideLabel = false,
  icon,
  error,
  reveal,
  secureTextEntry,
  onFocus,
  onBlur,
  ...rest
}: Readonly<Props>) {
  const { theme } = useUnistyles();
  const [focused, setFocused] = useState(false);
  const [revealed, setRevealed] = useState(false);
  const canReveal = !!reveal && !!secureTextEntry;
  return (
    <View style={styles.wrap}>
      {hideLabel ? null : (
        <AppText variant="caption" tone="secondary" style={styles.label}>
          {label}
        </AppText>
      )}
      <View
        style={[styles.box, focused && styles.focus, !!error && styles.error]}
      >
        {icon ? (
          <Icon name={icon} size={18} color={theme.colors.text.tertiary} />
        ) : null}
        <TextInput
          accessibilityLabel={label}
          placeholderTextColor={theme.colors.text.tertiary}
          {...rest}
          secureTextEntry={secureTextEntry && !revealed}
          onFocus={e => {
            setFocused(true);
            onFocus?.(e);
          }}
          onBlur={e => {
            setFocused(false);
            onBlur?.(e);
          }}
          style={styles.input}
        />
        {canReveal ? (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={revealed ? reveal.hide : reveal.show}
            onPress={() => setRevealed(v => !v)}
            style={styles.reveal}
          >
            {/* Eye = tap to show; eye crossed out = tap to hide. */}
            <Icon
              name={revealed ? 'eyeOff' : 'eye'}
              size={20}
              color={
                revealed
                  ? theme.colors.text.primary
                  : theme.colors.text.tertiary
              }
            />
          </Pressable>
        ) : null}
      </View>
      {error ? (
        <AppText variant="caption" tone="danger">
          {error}
        </AppText>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create(theme => ({
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
  focus: {
    borderColor: theme.colors.brand.primary,
    boxShadow: '0 0 0 3px rgba(200,255,61,0.25)',
  },
  error: { borderColor: theme.colors.status.danger },
  /**
   * Font and size of `type.body` but NO lineHeight: on a single-line iOS TextInput a lineHeight pushes the text below
   * the vertical centre. No vertical padding either; Android centres with textAlignVertical.
   */
  input: {
    flex: 1,
    height: '100%',
    color: theme.colors.text.primary,
    fontFamily: theme.type.body.fontFamily,
    fontSize: theme.type.body.fontSize,
    paddingVertical: 0,
    textAlignVertical: 'center',
  },
  /** 44 × 44 hit target inside the 56 px field; pulled into the right padding so the text keeps its width. */
  reveal: {
    width: 44,
    height: 44,
    marginRight: -theme.spacing(2),
    alignItems: 'center',
    justifyContent: 'center',
  },
}));
