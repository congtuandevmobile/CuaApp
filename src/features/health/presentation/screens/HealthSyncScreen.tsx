import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { observer } from 'mobx-react-lite';
import { useEffect, useMemo, useRef } from 'react';
import { Animated, Easing, ScrollView, View } from 'react-native';
import Svg, { Circle, Path } from 'react-native-svg';
import { StyleSheet, useUnistyles } from 'react-native-unistyles';
import { controllers } from '@/app/composition/container';
import { AppText } from '@/core/presentation/components/AppText';
import { Badge } from '@/core/presentation/components/Badge';
import { Button } from '@/core/presentation/components/Button';
import { GlassCard } from '@/core/presentation/components/GlassCard';
import { Icon } from '@/core/presentation/components/Icon';
import { IconButton } from '@/core/presentation/components/IconButton';
import { Screen } from '@/core/presentation/components/Screen';
import { useT } from '@/app/i18n/useT';
import type { RootStackParamList } from '@/app/navigation/types';

/** The spinning arc around the heart: native-driver rotation while syncing, still otherwise. */
function SyncDial({ spinning }: { spinning: boolean }) {
  const { theme } = useUnistyles();
  const turn = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    if (!spinning) return;
    const loop = Animated.loop(Animated.timing(turn, { toValue: 1, duration: 2400, easing: Easing.linear, useNativeDriver: true }));
    loop.start();
    return () => {
      loop.stop();
      turn.setValue(0);
    };
  }, [spinning, turn]);
  const rotate = turn.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '360deg'] });
  return (
    <View style={styles.dial}>
      <Animated.View style={[StyleSheet.absoluteFill, { transform: [{ rotate }] }]}>
        <Svg width={96} height={96} viewBox="0 0 96 96">
          <Circle cx={48} cy={48} r={44} fill="none" stroke="rgba(255,255,255,0.12)" strokeWidth={5} />
          <Path d="M48 4a44 44 0 0 1 44 44" fill="none" stroke={theme.colors.brand.primary} strokeWidth={5} strokeLinecap="round" />
        </Svg>
      </Animated.View>
      <Icon name="heart" size={40} color={theme.colors.status.danger} />
    </View>
  );
}

export const HealthSyncScreen = observer(function HealthSyncScreen({ navigation }: NativeStackScreenProps<RootStackParamList, 'HealthSync'>) {
  const { t, sport, dateTime } = useT();
  const health = controllers.health();
  const connected = health.status === 'idle' || health.status === 'syncing';

  /** How each sport arrives: its name and stable HealthKit id, one row per sport. */
  const mapping = useMemo(() => {
    const seen = new Map<string, number>();
    for (const w of health.workouts) if (!seen.has(w.sportName)) seen.set(w.sportName, w.sportId);
    return [...seen.entries()].slice(0, 6);
  }, [health.workouts]);

  const headline =
    health.status === 'syncing'
      ? t('health.syncing')
      : health.status === 'unavailable'
        ? t('health.unavailable')
        : health.status === 'needsAccess'
          ? t('health.notConnected')
          : health.status === 'failed'
            ? t('health.failed')
            : t('health.workoutsCount', { count: health.workouts.length });

  return (
    <Screen>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.top}>
          <IconButton icon="back" iconSize={24} label={t('common.back')} onPress={() => navigation.goBack()} />
          {connected ? <Badge dot tone="success" label={t('common.connected')} /> : null}
        </View>
        <View>
          <AppText variant="title">{t('health.title')}</AppText>
          <AppText tone="secondary">{t('health.subtitle')}</AppText>
        </View>
        <GlassCard style={styles.card}>
          <SyncDial spinning={health.status === 'syncing'} />
          <AppText variant="h2" style={styles.center}>{headline}</AppText>
          <AppText variant="caption" tone="secondary">
            {health.lastSyncMs ? t('health.lastSync', { when: dateTime(health.lastSyncMs) }) : t('health.neverSynced')}
          </AppText>
        </GlassCard>
        {mapping.length > 0 ? (
          <View style={styles.mapping}>
            <AppText variant="overline" tone="tertiary">{t('health.mapping')}</AppText>
            {mapping.map(([name, id]) => (
              <View key={name} style={styles.mp}>
                <AppText variant="caption" tone="secondary" style={styles.grow}>{sport(name)}</AppText>
                <AppText style={styles.mono}>{`${name} · ${id}`}</AppText>
              </View>
            ))}
          </View>
        ) : null}
      </ScrollView>
      <View style={styles.footer}>
        <Button
          block
          kind={health.status === 'needsAccess' ? 'primary' : 'glass'}
          label={health.status === 'syncing' ? t('health.syncing') : health.status === 'needsAccess' ? t('health.connect') : t('health.syncNow')}
          disabled={health.status === 'syncing' || health.status === 'unavailable'}
          onPress={() => void (health.status === 'needsAccess' ? health.connect() : health.syncNow())}
        />
        <AppText variant="caption" tone="tertiary" style={styles.center}>{t('health.readOnly')}</AppText>
      </View>
    </Screen>
  );
});

const styles = StyleSheet.create((theme) => ({
  content: { gap: theme.spacing(4), paddingBottom: theme.spacing(6) },
  top: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  card: { alignItems: 'center', gap: theme.spacing(3), paddingVertical: 26 },
  dial: { width: 96, height: 96, alignItems: 'center', justifyContent: 'center' },
  center: { textAlign: 'center' },
  mapping: { gap: theme.spacing(2) },
  mp: { flexDirection: 'row', alignItems: 'center', gap: theme.spacing(2), paddingVertical: 10, paddingHorizontal: 14, borderRadius: 16, backgroundColor: 'rgba(255,255,255,0.06)' },
  grow: { flex: 1 },
  mono: { fontFamily: theme.fonts.mono, fontSize: 12, lineHeight: 16, color: theme.colors.brand.cyan },
  footer: { gap: theme.spacing(2) },
}));
