import { Text, type TextProps } from 'react-native';
import { StyleSheet } from 'react-native-unistyles';

type Variant = 'display' | 'title' | 'h2' | 'h3' | 'body' | 'caption' | 'overline' | 'metric' | 'number';
type Tone = 'primary' | 'secondary' | 'tertiary' | 'brand' | 'danger';

interface Props extends TextProps {
  variant?: Variant;
  tone?: Tone;
}

/** Every text in the app goes through this: the type scale and the tone come from the theme, never from literals. */
export function AppText({ variant = 'body', tone = 'primary', style, ...rest }: Readonly<Props>) {
  styles.useVariants({ variant, tone });
  return <Text {...rest} style={[styles.text, style]} />;
}

const styles = StyleSheet.create((theme) => ({
  text: {
    color: theme.colors.text.primary,
    variants: {
      variant: {
        display: { ...theme.type.display },
        title: { ...theme.type.title },
        h2: { ...theme.type.h2 },
        h3: { ...theme.type.h3 },
        body: { ...theme.type.body },
        caption: { ...theme.type.caption },
        overline: { ...theme.type.overline },
        metric: { ...theme.type.metric },
        number: { ...theme.type.number },
      },
      tone: {
        primary: { color: theme.colors.text.primary },
        secondary: { color: theme.colors.text.secondary },
        tertiary: { color: theme.colors.text.tertiary },
        brand: { color: theme.colors.brand.primary },
        danger: { color: theme.colors.status.danger },
      },
    },
  },
}));
