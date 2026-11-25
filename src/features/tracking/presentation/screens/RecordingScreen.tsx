import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { observer } from 'mobx-react-lite';
import { useEffect, useRef, useState } from 'react';
import {
  Animated,
  Easing,
  Pressable,
  StyleSheet as RNStyleSheet,
  View,
} from 'react-native';
import { StyleSheet, useUnistyles } from 'react-native-unistyles';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { controllers } from '@/app/composition/container';
import { AppText } from '@/core/presentation/components/AppText';
import { Badge } from '@/core/presentation/components/Badge';
import { GlassSurface } from '@/core/presentation/components/GlassSurface';
import { Icon } from '@/core/presentation/components/Icon';
import { IconButton } from '@/core/presentation/components/IconButton';
import { useToast } from '@/core/presentation/components/Toast';
import { useT } from '@/app/i18n/useT';
import type { RootStackParamList } from '@/app/navigation/types';
import { paceSecondsPerKm } from '../../domain/Recording';
import { RouteMap } from '../components/RouteMap';
import { SportBadge } from '../components/SportBadge';
import { formatDuration, formatPace } from '../format';

/** How long the finish button must be held: a stray tap in a pocket never ends a run. */
const HOLD_TO_FINISH_MS = 1000;

/**
 * The finish control: hold it for one second. A ring fills while holding (native-driver scale, no JS per frame); a
 * short tap explains itself instead of doing nothing.
 */
function HoldToFinish({
  label,
  hint,
  busy,
  onFinish,
  onTap,
}: {
  label: string;
  hint: string;
  busy: boolean;
  onFinish: () => void;
  onTap: () => void;
}) {
  const { theme } = useUnistyles();
  const fill = useRef(new Animated.Value(0)).current;
  const fired = useRef(false);
  const run = useRef<Animated.CompositeAnimation | undefined>(undefined);
  useEffect(() => () => run.current?.stop(), []);

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityHint={hint}
      accessibilityState={{ busy }}
      disabled={busy}
      delayLongPress={HOLD_TO_FINISH_MS}
      onPressIn={() => {
        fired.current = false;
        run.current = Animated.timing(fill, {
          toValue: 1,
          duration: HOLD_TO_FINISH_MS,
          easing: Easing.linear,
          useNativeDriver: true,
        });
        run.current.start();
      }}
      onPressOut={() => {
        run.current?.stop();
        Animated.timing(fill, {
          toValue: 0,
          duration: 150,
          useNativeDriver: true,
        }).start();
        if (!fired.current) onTap();
      }}
      onLongPress={() => {
        fired.current = true;
        onFinish();
      }}
      // VoiceOver users cannot hold: their activation finishes directly.
      onAccessibilityAction={() => onFinish()}
      style={[styles.side, styles.finish]}
    >
      <Animated.View
        style={[styles.finishFill, { transform: [{ scale: fill }] }]}
      />
      <Icon name="stop" size={24} color={theme.colors.status.danger} />
    </Pressable>
  );
}

const SIGNAL_TONE = {
  unknown: 'neutral',
  poor: 'warning',
  good: 'success',
} as const;

/**
 * The record screen, like UPRACE / Strava: a full-screen map with the person's marker. Before Start it watches the GPS
 * signal and refuses Start (with a toast) until a first fix arrives; while recording it draws the route, one segment
 * per stretch between pauses.
 */
export const RecordingScreen = observer(function RecordingScreen({
  navigation,
}: NativeStackScreenProps<RootStackParamList, 'Recording'>) {
  const { t, km, sport, error } = useT();
  const { theme } = useUnistyles();
  const insets = useSafeAreaInsets();
  const record = controllers.record();
  const [toast, showToast] = useToast();
  const [tip, setTip] = useState(false);
  const [finishing, setFinishing] = useState(false);
  const [starting, setStarting] = useState(false);
  const s = record.snapshot;
  const open = s.status === 'running' || s.status === 'paused';
  const paused = s.status === 'paused';

  useEffect(() => {
    if (!tip) return;
    const timer = setTimeout(() => setTip(false), 2500);
    return () => clearTimeout(timer);
  }, [tip]);

  // Pre-start: ask for location once, then watch the signal while this screen is up and nothing is recording.
  useEffect(() => {
    if (open) return;
    let stop: (() => void) | undefined;
    let cancelled = false;
    void (async () => {
      if (record.permission !== 'granted') await record.askPermission();
      if (cancelled) return;
      stop = await record.startPreview();
      if (cancelled) stop();
    })();
    return () => {
      cancelled = true;
      stop?.();
    };
  }, [open, record]);

  const start = async () => {
    if (
      record.permission !== 'granted' &&
      (await record.askPermission()) !== 'granted'
    ) {
      showToast(error('RECORDING_PERMISSION') ?? '');
      return;
    }
    if (!record.canStart) {
      showToast(error('RECORDING_NO_GPS') ?? '');
      return;
    }
    setStarting(true);
    const ok = await record.start();
    setStarting(false);
    if (!ok && record.errorCode) showToast(error(record.errorCode) ?? '');
  };

  const signalLabel = t(`recording.signal.${record.signal}`);
  const bottomPad = Math.max(insets.bottom, 12) + 16;

  return (
    <View style={styles.root}>
      <RouteMap
        route={record.route}
        position={record.position}
        live
        running={s.status === 'running'}
        edgePadding={{
          top: insets.top + 60,
          right: 20,
          bottom: open ? 380 : 300,
          left: 20,
        }}
      />
      <View
        pointerEvents="none"
        style={[RNStyleSheet.absoluteFill, styles.shade]}
      />
      {toast}

      <View style={[styles.top, { top: insets.top + 12 }]}>
        {open ? (
          <GlassSurface style={styles.pill}>
            <Badge
              dot
              tone={s.gpsQuality === 'good' ? 'success' : 'danger'}
              label={t('recording.gpsBadge', {
                quality: t(`recording.gps.${s.gpsQuality}`),
              })}
            />
          </GlassSurface>
        ) : (
          <IconButton
            icon="close"
            iconSize={22}
            label={t('common.close')}
            onPress={() => navigation.goBack()}
          />
        )}
        {open ? (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={t('recording.minimize')}
            onPress={() => navigation.navigate('Main')}
            hitSlop={8}
          >
            <GlassSurface style={styles.pill}>
              <View style={styles.pillRow}>
                <Icon
                  name="phone"
                  size={18}
                  color={theme.colors.text.primary}
                />
                <AppText variant="caption" style={styles.pillText}>
                  {t('recording.liveActivityOn')}
                </AppText>
              </View>
            </GlassSurface>
          </Pressable>
        ) : null}
      </View>

      {open ? (
        <GlassSurface style={[styles.panel, { bottom: bottomPad }]}>
          {paused ? (
            <View style={styles.pausedHeader}>
              <AppText variant="h3" style={styles.pausedText}>
                {t('recording.pausedHeader')}
              </AppText>
            </View>
          ) : null}
          <View style={styles.panelInner}>
            <View style={styles.center}>
              <AppText
                variant="overline"
                tone={s.failure ? 'danger' : 'tertiary'}
              >
                {s.failure
                  ? t('recording.cannotRecord', {
                      reason: t(`recording.failure.${s.failure}`),
                    })
                  : sport(record.sport.code)}
              </AppText>
              <AppText
                variant="metric"
                style={paused ? styles.timePaused : undefined}
              >
                {formatDuration(s.activeTimeMs)}
              </AppText>
            </View>
            <View style={styles.stats}>
              <View style={styles.center}>
                <AppText variant="number">{km(s.totalMeters)}</AppText>
                <AppText variant="caption" tone="secondary">
                  {t('recording.unitKm')}
                </AppText>
              </View>
              <View style={styles.center}>
                <AppText variant="number">
                  {formatPace(paceSecondsPerKm(s.speedMps))}
                </AppText>
                <AppText variant="caption" tone="secondary">
                  {t('recording.unitPerKm')}
                </AppText>
              </View>
              <View style={styles.center}>
                <AppText variant="number">{s.steps}</AppText>
                <AppText variant="caption" tone="secondary">
                  {t('recording.steps')}
                </AppText>
              </View>
            </View>
            <View style={styles.controls}>
              <View style={styles.side} />
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={
                  paused ? t('recording.resume') : t('recording.pause')
                }
                onPress={() => void (paused ? record.resume() : record.pause())}
                style={({ pressed }) => [
                  styles.big,
                  paused ? styles.bigPaused : styles.bigRunning,
                  pressed && styles.pressed,
                ]}
              >
                <Icon
                  name={paused ? 'play' : 'pause'}
                  size={32}
                  color={paused ? '#1A1000' : '#0B1300'}
                />
              </Pressable>
              <HoldToFinish
                label={t('recording.finish')}
                hint={t('recording.holdHint')}
                busy={finishing}
                onTap={() => setTip(true)}
                onFinish={async () => {
                  setFinishing(true);
                  const ok = await record.finish();
                  setFinishing(false);
                  if (ok) navigation.replace('Summary');
                }}
              />
            </View>
            {record.errorCode ? (
              <AppText variant="caption" tone="danger" style={styles.hint}>
                {error(record.errorCode)}
              </AppText>
            ) : null}
            {finishing ? (
              <AppText variant="caption" tone="secondary" style={styles.hint}>
                {t('recording.finishing')}
              </AppText>
            ) : (
              <AppText
                variant="caption"
                tone={tip ? 'brand' : 'tertiary'}
                style={styles.hint}
              >
                {t('recording.holdHint')}
              </AppText>
            )}
          </View>
        </GlassSurface>
      ) : (
        <View style={[styles.prestart, { bottom: bottomPad }]}>
          <View
            style={[
              styles.signal,
              styles[`signal_${SIGNAL_TONE[record.signal]}`],
            ]}
            accessibilityLiveRegion="polite"
          >
            <View
              style={[
                styles.signalDot,
                styles[`dot_${SIGNAL_TONE[record.signal]}`],
              ]}
            />
            <AppText variant="caption" style={styles.signalText}>
              {signalLabel}
            </AppText>
          </View>
          <GlassSurface style={styles.panel2}>
            <View style={styles.prestartInner}>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={t('recording.chooseSport', {
                  sport: sport(record.sport.code),
                })}
                onPress={() => navigation.navigate('RecordPicker')}
                style={styles.sportRow}
              >
                <SportBadge code={record.sport.code} />
                <View style={styles.grow}>
                  <AppText variant="overline" tone="tertiary">
                    {t('recording.sport')}
                  </AppText>
                  <AppText variant="h3">{sport(record.sport.code)}</AppText>
                </View>
                <Icon name="chevron" color={theme.colors.text.tertiary} />
              </Pressable>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={t('recording.start')}
                accessibilityState={{
                  disabled: !record.canStart,
                  busy: starting,
                }}
                disabled={starting}
                onPress={() => void start()}
                style={({ pressed }) => [
                  styles.startBtn,
                  !record.canStart && styles.startBtnWaiting,
                  pressed && styles.pressed,
                ]}
              >
                <AppText variant="h3" style={styles.startText}>
                  {starting ? t('recording.starting') : t('recording.start')}
                </AppText>
              </Pressable>
            </View>
          </GlassSurface>
        </View>
      )}
    </View>
  );
});

const styles = StyleSheet.create(theme => ({
  root: { flex: 1, backgroundColor: '#080B13' },
  shade: {
    experimental_backgroundImage:
      'linear-gradient(180deg, rgba(8,11,19,0.6), rgba(8,11,19,0) 22%, rgba(8,11,19,0) 45%, rgba(8,11,19,0.85) 75%)',
  },
  top: {
    position: 'absolute',
    left: 20,
    right: 20,
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  pill: {
    minHeight: 36,
    borderRadius: theme.radius.pill,
    justifyContent: 'center',
    paddingHorizontal: 6,
  },
  pillRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 8,
  },
  pillText: {
    color: theme.colors.text.primary,
    fontFamily: theme.fonts.bodySemi,
  },
  panel: { position: 'absolute', left: 12, right: 12, borderRadius: 40 },
  pausedHeader: {
    backgroundColor: theme.colors.status.warning,
    paddingVertical: 10,
    alignItems: 'center',
  },
  pausedText: { color: '#1A1000' },
  prestart: { position: 'absolute', left: 12, right: 12, gap: 10 },
  signal: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    alignSelf: 'center',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: theme.radius.pill,
  },
  signal_neutral: { backgroundColor: 'rgba(91,140,255,0.25)' },
  signal_warning: { backgroundColor: 'rgba(255,184,77,0.28)' },
  signal_success: { backgroundColor: 'rgba(61,220,151,0.28)' },
  signalDot: { width: 8, height: 8, borderRadius: 4 },
  dot_neutral: { backgroundColor: theme.colors.status.info },
  dot_warning: { backgroundColor: theme.colors.status.warning },
  dot_success: { backgroundColor: theme.colors.status.success },
  signalText: {
    color: theme.colors.text.primary,
    fontFamily: theme.fonts.bodySemi,
  },
  panel2: { borderRadius: 32 },
  prestartInner: { padding: 16, gap: 14 },
  sportRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    minHeight: 56,
  },
  grow: { flex: 1 },
  startBtn: {
    height: 60,
    borderRadius: theme.radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: theme.colors.brand.primary,
    boxShadow: '0 8px 28px rgba(200,255,61,0.35)',
  },
  startBtnWaiting: { opacity: 0.45, boxShadow: 'none' },
  startText: { color: '#0B1300', fontSize: 18 },
  panelInner: {
    paddingVertical: 24,
    paddingHorizontal: 20,
    gap: theme.spacing(4),
  },
  center: { alignItems: 'center', gap: 4 },
  timePaused: { color: theme.colors.status.warning },
  stats: { flexDirection: 'row', justifyContent: 'space-around' },
  controls: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 8,
  },
  side: { width: 56, height: 56, borderRadius: 28 },
  big: {
    width: 88,
    height: 88,
    borderRadius: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  bigRunning: {
    backgroundColor: theme.colors.brand.primary,
    boxShadow: '0 8px 28px rgba(200,255,61,0.35)',
  },
  bigPaused: { backgroundColor: theme.colors.status.warning },
  pressed: { transform: [{ scale: 0.96 }] },
  finish: {
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    borderWidth: 1,
    backgroundColor: 'rgba(255,93,108,0.22)',
    borderColor: 'rgba(255,93,108,0.6)',
  },
  finishFill: {
    position: 'absolute',
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: 'rgba(255,93,108,0.45)',
  },
  hint: { textAlign: 'center' },
}));
