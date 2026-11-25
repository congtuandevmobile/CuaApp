import { useCallback, useEffect, useRef, useState } from 'react';
import { AccessibilityInfo, Animated, View } from 'react-native';
import { StyleSheet } from 'react-native-unistyles';
import { AppText } from './AppText';

/**
 * A short message that fades in above the content and goes away by itself (the UPRACE `AppToast`). Native-driver
 * opacity only. Screen readers get it announced.
 */
export function useToast(): [
  node: React.ReactNode,
  show: (message: string) => void,
] {
  const [message, setMessage] = useState<string | undefined>(undefined);
  const opacity = useRef(new Animated.Value(0)).current;
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  useEffect(() => () => clearTimeout(timer.current), []);

  const show = useCallback(
    (text: string) => {
      setMessage(text);
      AccessibilityInfo.announceForAccessibility(text);
      clearTimeout(timer.current);
      Animated.timing(opacity, {
        toValue: 1,
        duration: 160,
        useNativeDriver: true,
      }).start();
      timer.current = setTimeout(() => {
        Animated.timing(opacity, {
          toValue: 0,
          duration: 220,
          useNativeDriver: true,
        }).start(() => setMessage(undefined));
      }, 2200);
    },
    [opacity],
  );

  const node = message ? (
    <Animated.View pointerEvents="none" style={[styles.wrap, { opacity }]}>
      <View style={styles.toast}>
        <AppText variant="caption" style={styles.text}>
          {message}
        </AppText>
      </View>
    </Animated.View>
  ) : null;
  return [node, show];
}

const styles = StyleSheet.create((theme, rt) => ({
  wrap: {
    position: 'absolute',
    left: 20,
    right: 20,
    top: rt.insets.top + 64,
    alignItems: 'center',
    zIndex: 10,
  },
  toast: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: theme.radius.pill,
    backgroundColor: 'rgba(255,93,108,0.95)',
    boxShadow: '0 8px 24px rgba(0,0,0,0.35)',
  },
  text: {
    color: '#1A0508',
    fontFamily: theme.fonts.bodySemi,
    textAlign: 'center',
  },
}));
