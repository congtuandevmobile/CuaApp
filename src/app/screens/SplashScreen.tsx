import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useEffect } from 'react';
import { View } from 'react-native';
import Animated, { cancelAnimation, Easing, interpolate, useAnimatedStyle, useSharedValue, withRepeat, withTiming } from 'react-native-reanimated';
import { StyleSheet } from 'react-native-unistyles';
import { controllers } from '@/app/composition/container';
import { AppText } from '../../core/presentation/components/AppText';
import { Backdrop } from '../../core/presentation/components/Backdrop';
import { LogoTile } from '../../core/presentation/components/LogoTile';
import { useT } from '../i18n/useT';
import type { RootStackParamList } from '../navigation/types';

type Props = NativeStackScreenProps<RootStackParamList, 'Splash'>;

const BAR_WIDTH = 140;

/** Restores the session and the hero, then routes: first launch -> Intro, no hero yet -> choose one, else the app. */
export function SplashScreen({ navigation }: Readonly<Props>) {
  const { t } = useT();
  const pop = useSharedValue(0);
  const load = useSharedValue(0);

  useEffect(() => {
    const session = controllers.auth().restore();
    const hero = controllers.hero().load();
    const next = !session ? 'Intro' : !hero ? 'CharacterSelect' : 'Main';
    const timer = setTimeout(() => navigation.replace(next), 900);
    return () => clearTimeout(timer);
  }, [navigation]);

  // Shared values keep animation updates on the UI thread without per-frame React renders.
  useEffect(() => {
    pop.value = withTiming(1, { duration: 600, easing: Easing.bezier(0.2, 0.8, 0.2, 1) });
    load.value = withRepeat(withTiming(1, { duration: 1400, easing: Easing.bezier(0.4, 0, 0.2, 1) }), -1);
    return () => {
      cancelAnimation(pop);
      cancelAnimation(load);
    };
  }, [pop, load]);

  const logoStyle = useAnimatedStyle(() => ({
    opacity: pop.value,
    transform: [{ scale: interpolate(pop.value, [0, 1], [0.6, 1]) }],
  }));
  // Grows from the left edge: scaleX around the centre, shifted by half the missing width.
  const fillStyle = useAnimatedStyle(() => ({
    transform: [
      { translateX: interpolate(load.value, [0, 1], [-BAR_WIDTH / 2, 0]) },
      { scaleX: load.value },
    ],
  }));

  return (
    <View style={styles.root}>
      <Backdrop />
      <Animated.View style={logoStyle}>
        <LogoTile size={132} />
      </Animated.View>
      <View style={styles.words}>
        <AppText variant="display" style={styles.wordmark}>
          CUA
        </AppText>
        <AppText tone="secondary">{t('splash.tagline')}</AppText>
      </View>
      <View style={styles.footer}>
        <View style={styles.bar}>
          <Animated.View style={[styles.fill, fillStyle]} />
        </View>
        <AppText variant="caption" tone="tertiary">
          {t('splash.loading')}
        </AppText>
      </View>
    </View>
  );
}

const styles = StyleSheet.create((theme) => ({
  root: { flex: 1, backgroundColor: theme.colors.background.base, alignItems: 'center', justifyContent: 'center', gap: theme.spacing(7) },
  words: { alignItems: 'center', gap: theme.spacing(2) },
  wordmark: { fontSize: 48, lineHeight: 52, letterSpacing: 3.8 },
  footer: { position: 'absolute', bottom: 64, alignItems: 'center', gap: theme.spacing(3) },
  bar: { width: BAR_WIDTH, height: 4, borderRadius: 2, overflow: 'hidden', backgroundColor: theme.colors.stroke.hairline },
  fill: { width: BAR_WIDTH, height: 4, borderRadius: 2, backgroundColor: theme.colors.brand.primary },
}));
