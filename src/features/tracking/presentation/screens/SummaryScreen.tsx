import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { observer } from 'mobx-react-lite';
import { View } from 'react-native';
import { StyleSheet, useUnistyles } from 'react-native-unistyles';
import { controllers } from '@/app/composition/container';
import { AppText } from '@/core/presentation/components/AppText';
import { Badge } from '@/core/presentation/components/Badge';
import { Button } from '@/core/presentation/components/Button';
import { GlassCard } from '@/core/presentation/components/GlassCard';
import { Icon } from '@/core/presentation/components/Icon';
import { Screen } from '@/core/presentation/components/Screen';
import { isGuest } from '@/features/auth/domain/Session';
import { levelOf } from '@/features/hero/domain/level';
import { useT } from '@/app/i18n/useT';
import type { RootStackParamList } from '@/app/navigation/types';
import { RouteCard } from '../components/RouteCard';
import { StatCell } from '../components/StatCell';
import { formatDuration, formatPace } from '../format';

export const SummaryScreen = observer(function SummaryScreen({ navigation }: NativeStackScreenProps<RootStackParamList, 'Summary'>) {
  const { t, km, sport } = useT();
  const { theme } = useUnistyles();
  const record = controllers.record();
  const a = record.lastActivity;
  const level = levelOf(controllers.hero().progress.totalKm);
  const session = controllers.auth().session;
  const speedKmh = a && a.durationMs > 0 ? a.distanceMeters / 1000 / (a.durationMs / 3_600_000) : 0;
  const pace = a && a.distanceMeters > 0 ? a.durationMs / 1000 / (a.distanceMeters / 1000) : undefined;

  const done = () => {
    navigation.replace('Main');
    if (session && isGuest(session)) navigation.navigate('GuestGate');
  };

  return (
    <Screen>
      <View style={styles.content}>
        <View style={styles.header}>
          <View style={styles.grow}>
            <AppText variant="overline" tone="tertiary">{a ? t('summary.when', { sport: sport(a.sportCode) }) : ''}</AppText>
            <AppText variant="title">{t('summary.title')}</AppText>
          </View>
          <Badge dot tone="success" label={t('summary.saved')} />
        </View>
        <RouteCard sportCode={a?.sportCode ?? 'running'} route={record.route} />
        <View style={styles.grid}>
          <StatCell label={t('summary.distance')} value={a ? km(a.distanceMeters) : '—'} unit={t('recording.unitKm')} />
          <StatCell label={t('summary.time')} value={a ? formatDuration(a.durationMs) : '—'} />
          <StatCell label={t('summary.avgPace')} value={formatPace(pace)} unit={t('recording.unitPerKm')} />
          <StatCell label={t('summary.avgSpeed')} value={speedKmh.toFixed(1)} unit={t('summary.kmh')} />
        </View>
        <GlassCard style={styles.xp}>
          <View style={styles.xpIcon}>
            <Icon name="spark" size={26} color={theme.colors.brand.primary} />
          </View>
          <View style={styles.grow}>
            <AppText variant="h3">{t('hero.level', { level: level.level })}</AppText>
            <AppText variant="caption" style={styles.xpText}>{t('home.heroNext', { km: km(level.kmToNext * 1000), level: level.level + 1 })}</AppText>
          </View>
        </GlassCard>
      </View>
      <Button block label={t('common.done')} onPress={done} />
    </Screen>
  );
});

const styles = StyleSheet.create((theme) => ({
  content: { flex: 1, gap: theme.spacing(4) },
  header: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', gap: theme.spacing(3) },
  grow: { flex: 1 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  xp: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing(3),
    borderRadius: theme.radius.lg,
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderColor: 'rgba(200,255,61,0.5)',
    experimental_backgroundImage: 'linear-gradient(135deg, rgba(200,255,61,0.22), rgba(200,255,61,0.04))',
  },
  xpIcon: { width: 56, height: 56, borderRadius: 18, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(11,19,0,0.35)' },
  xpText: { color: theme.colors.text.primary },
}));
