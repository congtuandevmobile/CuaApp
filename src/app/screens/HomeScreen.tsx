import { useNavigation } from '@react-navigation/native';
import { observer } from 'mobx-react-lite';
import { useMemo } from 'react';
import { Pressable, ScrollView, View } from 'react-native';
import { StyleSheet, useUnistyles } from 'react-native-unistyles';
import { controllers } from '@/app/composition/container';
import { levelOf } from '@/features/hero/domain/level';
import { DAILY_GOAL_METERS, dayStreak, startOfDay, startOfWeek, totals, weekDailyMeters } from '@/features/tracking/domain/stats';
import { AppText } from '../../core/presentation/components/AppText';
import { Chip } from '../../core/presentation/components/Chip';
import { GlassCard } from '../../core/presentation/components/GlassCard';
import { Icon } from '../../core/presentation/components/Icon';
import { IconButton } from '../../core/presentation/components/IconButton';
import { ProgressBar } from '../../core/presentation/components/ProgressBar';
import { Rings } from '../../core/presentation/components/Rings';
import { Screen } from '../../core/presentation/components/Screen';
import { greetingKey } from '../i18n/format';
import { useT } from '../i18n/useT';

const DAY_KEYS = ['home.days.mon', 'home.days.tue', 'home.days.wed', 'home.days.thu', 'home.days.fri', 'home.days.sat', 'home.days.sun'] as const;
const ACTIVE_GOAL_MIN = 60;

/** Today ring, streak, the week's bars and the hero's progress. Every number comes from saved activities. */
export const HomeScreen = observer(function HomeScreen() {
  const { t, km } = useT();
  const { theme } = useUnistyles();
  const navigation = useNavigation<any>();
  const heroCtl = controllers.hero();
  const last = controllers.record().lastActivity; // re-render after a recording is saved
  // `last` is read so the observer re-renders when a recording is saved; the list itself is a sync read from storage.
  const activities = useMemo(() => (last === null ? [] : controllers.listActivities().execute()), [last]);
  const now = Date.now();
  const today = totals(activities, startOfDay(now), now + 1);
  const week = totals(activities, startOfWeek(now), now + 1);
  const bars = weekDailyMeters(activities, now);
  const maxBar = Math.max(1, ...bars);
  const todayIndex = (new Date(now).getDay() + 6) % 7;
  const streak = dayStreak(activities, now);
  const level = levelOf(heroCtl.progress.totalKm);
  const activeMin = Math.round(today.durationMs / 60000);

  return (
    <Screen tabBar>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <View>
            <AppText variant="caption" tone="secondary">{t(greetingKey(new Date(now).getHours()))}</AppText>
            <AppText variant="title">{heroCtl.hero?.name ?? t('home.athlete')}</AppText>
          </View>
          <View style={styles.headerActions}>
            <IconButton icon="heart" color={theme.colors.status.danger} label={t('home.healthSync')} onPress={() => navigation.navigate('HealthSync')} />
            <IconButton icon="user" label={t('tabs.profile')} onPress={() => navigation.navigate('Main', { screen: 'Profile' })} />
          </View>
        </View>

        <GlassCard style={styles.todayCard}>
          <View style={styles.ring}>
            <Rings
              size={132}
              rings={[
                { value: today.meters / DAILY_GOAL_METERS, color: theme.colors.brand.primary },
                { value: activeMin / ACTIVE_GOAL_MIN, color: theme.colors.brand.cyan },
              ]}
            />
            <View style={styles.ringLabel}>
              <AppText variant="number" style={styles.ringNumber}>{km(today.meters)}</AppText>
              <AppText variant="caption" tone="tertiary">{t('home.ofGoal', { goal: km(DAILY_GOAL_METERS) })}</AppText>
            </View>
          </View>
          <View style={styles.todayStats}>
            <View>
              <AppText variant="overline" tone="tertiary">{t('home.active')}</AppText>
              <AppText variant="number" style={styles.stat}>
                {activeMin} <AppText variant="caption" tone="secondary">{t('home.min')}</AppText>
              </AppText>
            </View>
            <View>
              <AppText variant="overline" tone="tertiary">{t('home.workouts')}</AppText>
              <AppText variant="number" style={styles.stat}>{today.count}</AppText>
            </View>
          </View>
        </GlassCard>

        <View style={styles.chips}>
          <Chip icon="bolt" iconColor={theme.colors.status.warning} label={t('home.streak', { count: streak })} />
          <Chip icon="spark" iconColor={theme.colors.brand.violet} label={t('hero.level', { level: level.level })} />
        </View>

        <GlassCard style={styles.weekCard}>
          <View style={styles.between}>
            <AppText variant="h3">{t('home.thisWeek')}</AppText>
            <AppText variant="caption" tone="secondary">{km(week.meters)} {t('recording.unitKm')}</AppText>
          </View>
          <View style={styles.bars} accessible accessibilityLabel={t('home.weekA11y', { km: km(week.meters) })}>
            {bars.map((m, i) => (
              <View key={DAY_KEYS[i]} style={styles.barCol}>
                <View style={styles.barTrack}>
                  <View style={[styles.bar, { height: `${Math.max(6, (m / maxBar) * 100)}%`, opacity: i > todayIndex ? 0.3 : m > 0 ? 1 : 0.45 }]} />
                </View>
                <AppText style={styles.day}>{t(DAY_KEYS[i]!)}</AppText>
              </View>
            ))}
          </View>
        </GlassCard>

        <Pressable accessibilityRole="button" onPress={() => navigation.navigate('Main', { screen: 'Hero' })}>
          <GlassCard style={styles.heroCard}>
            <View style={styles.heroAvatar}>
              <Icon name="spark" size={26} color={theme.colors.brand.primary} />
            </View>
            <View style={styles.grow}>
              <AppText variant="h3">{t('home.heroNext', { km: km(level.kmToNext * 1000), level: level.level + 1 })}</AppText>
              <View style={styles.heroBar}>
                <ProgressBar value={level.progress} />
              </View>
            </View>
            <Icon name="chevron" color={theme.colors.text.tertiary} />
          </GlassCard>
        </Pressable>
      </ScrollView>
    </Screen>
  );
});

const styles = StyleSheet.create((theme) => ({
  content: { gap: theme.spacing(4), paddingBottom: theme.spacing(10) },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  headerActions: { flexDirection: 'row', gap: theme.spacing(2) },
  todayCard: { flexDirection: 'row', alignItems: 'center', gap: theme.spacing(4) },
  ring: { width: 132, height: 132 },
  ringLabel: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, alignItems: 'center', justifyContent: 'center' },
  ringNumber: { fontSize: 24, lineHeight: 26 },
  todayStats: { flex: 1, gap: theme.spacing(3) },
  stat: { fontSize: 22, lineHeight: 26 },
  chips: { flexDirection: 'row', gap: theme.spacing(2) },
  weekCard: { borderRadius: theme.radius.lg, paddingVertical: 14, paddingHorizontal: 16, gap: theme.spacing(3) },
  between: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  bars: { flexDirection: 'row', gap: theme.spacing(2), height: 96 },
  barCol: { flex: 1, alignItems: 'center', gap: 6 },
  barTrack: { flex: 1, width: '100%', justifyContent: 'flex-end' },
  bar: { width: '100%', borderRadius: 10, experimental_backgroundImage: 'linear-gradient(180deg, #C8FF3D, rgba(200,255,61,0.25))' },
  day: { fontFamily: theme.fonts.bodyMedium, fontSize: 11, lineHeight: 14, color: theme.colors.text.tertiary },
  heroCard: { flexDirection: 'row', alignItems: 'center', gap: theme.spacing(3), borderRadius: theme.radius.lg, paddingVertical: 14, paddingHorizontal: 16 },
  heroAvatar: { width: 56, height: 56, borderRadius: 18, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(155,140,255,0.25)' },
  grow: { flex: 1 },
  heroBar: { marginTop: theme.spacing(2) },
}));
