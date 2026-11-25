import { useNavigation } from '@react-navigation/native';
import { observer } from 'mobx-react-lite';
import { useMemo, useState } from 'react';
import { Pressable, ScrollView, SectionList, View } from 'react-native';
import { StyleSheet, useUnistyles } from 'react-native-unistyles';
import { controllers } from '@/app/composition/container';
import { AppText } from '@/core/presentation/components/AppText';
import { Chip } from '@/core/presentation/components/Chip';
import { GlassCard } from '@/core/presentation/components/GlassCard';
import { IconButton } from '@/core/presentation/components/IconButton';
import { Screen } from '@/core/presentation/components/Screen';
import { useT } from '@/app/i18n/useT';
import { startOfDay, startOfWeek, totals } from '../../domain/stats';
import { SportBadge } from '../components/SportBadge';
import { formatDuration } from '../format';

/** One row of the list: a CUA recording, or a workout imported from Apple Health. */
interface Row {
  readonly id: string;
  readonly sportCode: string;
  readonly startedAtMs: number;
  readonly durationMs: number;
  readonly distanceMeters?: number;
  readonly source: 'cua' | 'health';
}

const FILTERS = [
  { key: 'all', codes: undefined },
  { key: 'run', codes: ['running'] },
  { key: 'ride', codes: ['cycling'] },
  { key: 'walk', codes: ['walking', 'hiking'] },
  { key: 'soccer', codes: ['soccer'] },
  { key: 'swim', codes: ['swimming'] },
] as const;

type FilterKey = (typeof FILTERS)[number]['key'];

export const ActivityScreen = observer(function ActivityScreen() {
  const { t, km, sport, locale } = useT();
  const { theme } = useUnistyles();
  const navigation = useNavigation<any>();
  const [filter, setFilter] = useState<FilterKey>('all');
  const last = controllers.record().lastActivity; // re-render when an activity was just saved
  const workouts = controllers.health().workouts;

  const rows = useMemo<Row[]>(() => {
    const own: Row[] = (
      last === null ? [] : controllers.listActivities().execute()
    ).map(a => ({ ...a, source: 'cua' as const }));
    const imported: Row[] = workouts.map(w => ({
      id: `hk-${w.id}`,
      sportCode: w.sportName, // already the lower camel case HealthKit name
      startedAtMs: w.startedAtMs,
      durationMs: w.durationSec * 1000,
      distanceMeters: w.distanceMeters,
      source: 'health' as const,
    }));
    return [...own, ...imported].sort((a, b) => b.startedAtMs - a.startedAtMs);
  }, [last, workouts]);

  const codes = FILTERS.find(f => f.key === filter)?.codes as
    | readonly string[]
    | undefined;
  const visible = codes ? rows.filter(r => codes.includes(r.sportCode)) : rows;
  const now = Date.now();
  const week = totals(
    visible.map(r => ({
      id: r.id,
      sportCode: r.sportCode,
      sportName: '',
      startedAtMs: r.startedAtMs,
      durationMs: r.durationMs,
      distanceMeters: r.distanceMeters ?? 0,
      source: 'cua',
    })),
    startOfWeek(now),
    now + 1,
  );

  const sections = useMemo(() => {
    const today = startOfDay(Date.now());
    const groups = new Map<number, Row[]>();
    for (const r of visible) {
      const d = startOfDay(r.startedAtMs);
      groups.set(d, [...(groups.get(d) ?? []), r]);
    }
    const dayTitle = (d: number) =>
      d === today
        ? t('activity.today')
        : d === today - 86_400_000
        ? t('activity.yesterday')
        : new Intl.DateTimeFormat(locale, {
            weekday: 'long',
            day: 'numeric',
            month: 'short',
          }).format(new Date(d));
    return [...groups.entries()].map(([d, data]) => ({
      title: dayTitle(d),
      data,
    }));
  }, [visible, locale, t]);

  const time = (ms: number) =>
    new Intl.DateTimeFormat(locale, {
      hour: '2-digit',
      minute: '2-digit',
    }).format(new Date(ms));

  return (
    <Screen tabBar>
      <View style={styles.header}>
        <AppText variant="title">{t('activity.title')}</AppText>
        <IconButton
          icon="sync"
          label={t('home.healthSync')}
          onPress={() => navigation.navigate('HealthSync')}
        />
      </View>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.filters}
        contentContainerStyle={styles.filtersRow}
      >
        {FILTERS.map(f => (
          <Chip
            key={f.key}
            label={t(`activity.filters.${f.key}`)}
            on={filter === f.key}
            onPress={() => setFilter(f.key)}
          />
        ))}
      </ScrollView>
      <GlassCard style={styles.week}>
        <View>
          <AppText variant="overline" tone="tertiary">
            {t('home.thisWeek')}
          </AppText>
          <AppText variant="number">
            {km(week.meters)}{' '}
            <AppText variant="caption" tone="secondary">
              {t('recording.unitKm')}
            </AppText>
          </AppText>
        </View>
        <View style={styles.right}>
          <AppText variant="overline" tone="tertiary">
            {t('activity.time')}
          </AppText>
          <AppText variant="number">{formatDuration(week.durationMs)}</AppText>
        </View>
        <View style={styles.right}>
          <AppText variant="overline" tone="tertiary">
            {t('home.workouts')}
          </AppText>
          <AppText variant="number">{week.count}</AppText>
        </View>
      </GlassCard>
      <SectionList
        sections={sections}
        keyExtractor={r => r.id}
        stickySectionHeadersEnabled={false}
        contentContainerStyle={styles.list}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={
          <AppText tone="secondary">{t('activity.empty')}</AppText>
        }
        renderSectionHeader={({ section }) => (
          <AppText variant="overline" tone="tertiary" style={styles.section}>
            {section.title}
          </AppText>
        )}
        renderItem={({ item }) => (
          <Pressable
            accessibilityRole="button"
            disabled={item.source !== 'cua'}
            onPress={() =>
              navigation.navigate('ActivityDetail', { id: item.id })
            }
          >
            <GlassCard style={styles.row}>
              <SportBadge code={item.sportCode} />
              <View style={styles.grow}>
                <AppText variant="h3">{sport(item.sportCode)}</AppText>
                <AppText variant="caption" tone="secondary">
                  {time(item.startedAtMs)} · {formatDuration(item.durationMs)}
                </AppText>
              </View>
              <View style={styles.right}>
                <AppText variant="number" style={styles.rowNumber}>
                  {item.distanceMeters
                    ? `${km(item.distanceMeters)} ${t('recording.unitKm')}`
                    : formatDuration(item.durationMs)}
                </AppText>
                <View
                  style={[
                    styles.src,
                    item.source === 'health' && styles.srcHealth,
                  ]}
                >
                  <AppText
                    style={[
                      styles.srcText,
                      {
                        color:
                          item.source === 'health'
                            ? '#FF9AA3'
                            : theme.colors.text.secondary,
                      },
                    ]}
                  >
                    {item.source === 'health'
                      ? t('activity.sourceHealth')
                      : 'CUA'}
                  </AppText>
                </View>
              </View>
            </GlassCard>
          </Pressable>
        )}
      />
    </Screen>
  );
});

const styles = StyleSheet.create(theme => ({
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  filters: {
    flexGrow: 0,
    marginTop: theme.spacing(4),
    marginRight: -theme.layout.screenPadding,
  },
  filtersRow: {
    gap: theme.spacing(2),
    paddingRight: theme.layout.screenPadding,
  },
  week: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    borderRadius: theme.radius.lg,
    paddingVertical: 14,
    paddingHorizontal: 16,
    marginTop: theme.spacing(4),
  },
  right: { alignItems: 'flex-end', gap: 4 },
  list: {
    gap: theme.spacing(3),
    paddingTop: theme.spacing(2),
    paddingBottom: theme.spacing(10),
  },
  section: { marginTop: theme.spacing(2) },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    borderRadius: theme.radius.lg,
    paddingVertical: 12,
    paddingHorizontal: 16,
  },
  grow: { flex: 1 },
  rowNumber: { fontSize: 20, lineHeight: 24 },
  src: {
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: theme.radius.pill,
    backgroundColor: 'rgba(255,255,255,0.1)',
  },
  srcHealth: { backgroundColor: 'rgba(255,93,108,0.16)' },
  srcText: {
    fontFamily: theme.fonts.bodySemi,
    fontSize: 10,
    lineHeight: 12,
    letterSpacing: 0.4,
  },
}));
