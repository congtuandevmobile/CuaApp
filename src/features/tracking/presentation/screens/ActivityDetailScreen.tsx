import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { observer } from 'mobx-react-lite';
import { View } from 'react-native';
import { StyleSheet } from 'react-native-unistyles';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { controllers } from '@/app/composition/container';
import { AppText } from '@/core/presentation/components/AppText';
import { Backdrop } from '@/core/presentation/components/Backdrop';
import { IconButton } from '@/core/presentation/components/IconButton';
import { useT } from '@/app/i18n/useT';
import type { RootStackParamList } from '@/app/navigation/types';
import { MapBackdrop } from '../components/MapBackdrop';
import { StatCell } from '../components/StatCell';
import { formatDuration, formatPace } from '../format';

/** One saved recording: the map ground, the headline numbers and the derived averages. */
export const ActivityDetailScreen = observer(function ActivityDetailScreen({
  navigation,
  route,
}: NativeStackScreenProps<RootStackParamList, 'ActivityDetail'>) {
  const { t, km, sport, dateTime } = useT();
  const insets = useSafeAreaInsets();
  const a = controllers
    .listActivities()
    .execute()
    .find(x => x.id === route.params.id);
  const pace =
    a && a.distanceMeters > 0
      ? a.durationMs / 1000 / (a.distanceMeters / 1000)
      : undefined;
  const speedKmh =
    a && a.durationMs > 0
      ? a.distanceMeters / 1000 / (a.durationMs / 3_600_000)
      : 0;

  return (
    <View style={styles.root}>
      <Backdrop />
      <View style={styles.map}>
        <MapBackdrop />
      </View>
      <View style={[styles.top, { top: insets.top + 12 }]}>
        <IconButton
          icon="back"
          iconSize={24}
          label={t('common.back')}
          onPress={() => navigation.goBack()}
        />
      </View>
      <View style={styles.body}>
        {a ? (
          <>
            <View>
              <AppText variant="overline" tone="tertiary">
                {dateTime(a.startedAtMs)} · CUA
              </AppText>
              <AppText variant="title" style={styles.title}>
                {sport(a.sportCode)}
              </AppText>
            </View>
            <View style={styles.headline}>
              <AppText variant="number" style={styles.big}>
                {km(a.distanceMeters)}
                <AppText variant="caption" tone="secondary">{` ${t(
                  'recording.unitKm',
                )}`}</AppText>
              </AppText>
              <AppText variant="number" style={styles.big}>
                {formatDuration(a.durationMs)}
              </AppText>
              <AppText variant="number" style={styles.big}>
                {formatPace(pace)}
                <AppText variant="caption" tone="secondary">{` ${t(
                  'recording.unitPerKm',
                )}`}</AppText>
              </AppText>
            </View>
            <View style={styles.grid}>
              <StatCell
                label={t('summary.avgSpeed')}
                value={speedKmh.toFixed(1)}
                unit={t('summary.kmh')}
              />
              <StatCell
                label={t('summary.time')}
                value={formatDuration(a.durationMs)}
              />
            </View>
          </>
        ) : (
          <AppText tone="secondary">{t('activity.missing')}</AppText>
        )}
      </View>
    </View>
  );
});

const styles = StyleSheet.create(theme => ({
  root: { flex: 1, backgroundColor: theme.colors.background.base },
  map: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 0,
    height: 330,
    overflow: 'hidden',
  },
  top: {
    position: 'absolute',
    left: 20,
    right: 20,
    flexDirection: 'row',
    justifyContent: 'space-between',
    zIndex: 3,
  },
  body: {
    position: 'absolute',
    left: 20,
    right: 20,
    top: 250,
    gap: theme.spacing(4),
  },
  title: { fontSize: 30, lineHeight: 36 },
  headline: { flexDirection: 'row', justifyContent: 'space-between' },
  big: { fontSize: 30, lineHeight: 36 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
}));
