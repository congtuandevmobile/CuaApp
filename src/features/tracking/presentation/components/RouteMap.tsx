import { memo, useEffect, useMemo, useRef, useState } from 'react';
import { StyleSheet as RNStyleSheet, View } from 'react-native';
import MapView, { Marker, Polyline, type LatLng } from 'react-native-maps';
import { StyleSheet } from 'react-native-unistyles';
import type { Position, RoutePoint } from '../../domain/Recording';
import { useLiveTip } from './useLiveTip';

interface Props {
  route: readonly RoutePoint[];
  /** The marker. Omitted on the summary (only the line is shown). */
  position?: Position;
  /** Live: the camera follows the marker. Otherwise it frames the whole route once. */
  live?: boolean;
  /** Recording (not paused): the line's live tip follows the gliding marker. */
  running?: boolean;
  /** Space kept clear for overlays (the glass panel), in points. */
  edgePadding?: { top: number; right: number; bottom: number; left: number };
}

const GLOW = 'rgba(200,255,61,0.28)';
const LINE = '#C8FF3D';
/** After the person pans the map, the camera waits this long before following again (UPRACE: 3 s). */
const REFOLLOW_MS = 3000;
const FOLLOW_DELTA = 0.004;

/** One polyline per segment: a pause never draws a straight line across the gap. */
function segmentsOf(route: readonly RoutePoint[]): LatLng[][] {
  const out: LatLng[][] = [];
  let current = Number.NaN;
  for (const p of route) {
    if (p.segment !== current) {
      out.push([]);
      current = p.segment;
    }
    out[out.length - 1]!.push({ latitude: p.latitude, longitude: p.longitude });
  }
  return out.filter((s) => s.length > 1);
}

/** The confirmed route. Memoised on the route array, so the gliding marker never re-renders these polylines. */
const RouteLines = memo(function RouteLines({ route }: { route: readonly RoutePoint[] }) {
  const segments = useMemo(() => segmentsOf(route), [route]);
  return (
    <>
      {segments.map((coords, i) => (
        <Polyline key={`g${i}`} coordinates={coords} strokeColor={GLOW} strokeWidth={14} lineCap="round" lineJoin="round" />
      ))}
      {segments.map((coords, i) => (
        <Polyline key={`l${i}`} coordinates={coords} strokeColor={LINE} strokeWidth={5} lineCap="round" lineJoin="round" zIndex={1} />
      ))}
    </>
  );
});

/** Heading is drawn in 10 degree steps, so the marker view is only redrawn when the direction really changes. */
const HEADING_STEP = 10;

/**
 * The record marker: a volt disc in a white ring, with an arrow pointing the way of travel. Apple Maps ignores the
 * Marker `rotation` prop (Google-only on iOS), so the view itself is rotated; the map is kept north-up for that.
 */
function RecordMarker({ position }: { position: Position }) {
  const heading = position.headingDeg === undefined ? undefined : Math.round(position.headingDeg / HEADING_STEP) * HEADING_STEP;
  // A custom view is snapshotted once; it is re-snapshotted only when the rounded heading changes (not every frame).
  const [tracks, setTracks] = useState(true);
  useEffect(() => {
    setTracks(true);
    const t = setTimeout(() => setTracks(false), 300);
    return () => clearTimeout(t);
  }, [heading]);
  return (
    <Marker
      coordinate={{ latitude: position.latitude, longitude: position.longitude }}
      anchor={{ x: 0.5, y: 0.5 }}
      tracksViewChanges={tracks}
      zIndex={2}
    >
      <View style={[styles.marker, heading !== undefined ? { transform: [{ rotate: `${heading}deg` }] } : null]}>
        {heading !== undefined ? <View style={styles.arrow} /> : null}
        <View style={styles.ring}>
          <View style={styles.dot} />
        </View>
      </View>
    </Marker>
  );
}

/**
 * The record map (Apple Maps on iOS, Google Maps on Android). Coordinates only come from live fixes in memory; nothing
 * here stores or sends them.
 */
export const RouteMap = memo(function RouteMap({ route, position, live = false, running = false, edgePadding }: Props) {
  const map = useRef<MapView>(null);
  const following = useRef(true);
  const refollow = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const tip = useLiveTip(position);
  const last = route[route.length - 1];
  const centred = useRef(false);

  useEffect(() => () => clearTimeout(refollow.current), []);

  const tipRef = useRef(tip);
  tipRef.current = tip;

  // Live: the camera is glued to the GLIDING marker, moved at every interpolation step (UPRACE calls `_onCamera`
  // per step). Each step is a few metres, so an instant `setCamera` reads as one continuous pan; animating the camera
  // separately towards the raw fix made it drift out of step with the marker (the jerky follow).
  useEffect(() => {
    if (!live || !tip || !following.current) return;
    const center = { latitude: tip.latitude, longitude: tip.longitude };
    if (!centred.current) {
      centred.current = true;
      map.current?.animateToRegion({ ...center, latitudeDelta: FOLLOW_DELTA, longitudeDelta: FOLLOW_DELTA }, 0);
    } else {
      map.current?.setCamera({ center });
    }
  }, [live, tip]);

  // Summary: frame the whole route once.
  useEffect(() => {
    if (live || route.length < 2) return;
    map.current?.fitToCoordinates(route as RoutePoint[], { edgePadding: edgePadding ?? { top: 30, right: 30, bottom: 30, left: 30 }, animated: false });
  }, [live, route, edgePadding]);

  return (
    <MapView
      ref={map}
      style={RNStyleSheet.absoluteFill}
      userInterfaceStyle="dark"
      showsUserLocation={false}
      showsPointsOfInterests={false}
      showsCompass={false}
      pitchEnabled={false}
      rotateEnabled={false}
      toolbarEnabled={false}
      mapPadding={edgePadding}
      accessible={false}
      onPanDrag={() => {
        if (!live) return;
        following.current = false;
        clearTimeout(refollow.current);
        refollow.current = setTimeout(() => {
          following.current = true;
          const at = tipRef.current;
          if (at) map.current?.animateCamera({ center: { latitude: at.latitude, longitude: at.longitude } }, { duration: 600 });
        }, REFOLLOW_MS);
      }}
    >
      <RouteLines route={route} />
      {running && last && tip && (tip.segment ?? last.segment) === last.segment ? (
        // The live tip: from the last confirmed point to the gliding marker, so the line grows smoothly.
        <Polyline
          coordinates={[{ latitude: last.latitude, longitude: last.longitude }, { latitude: tip.latitude, longitude: tip.longitude }]}
          strokeColor={LINE}
          strokeWidth={5}
          lineCap="round"
          zIndex={1}
        />
      ) : null}
      {tip ? <RecordMarker position={tip} /> : null}
    </MapView>
  );
});

const styles = StyleSheet.create((theme) => ({
  marker: { width: 56, height: 56, alignItems: 'center', justifyContent: 'center' },
  arrow: {
    position: 'absolute',
    top: 0,
    width: 0,
    height: 0,
    borderLeftWidth: 8,
    borderRightWidth: 8,
    borderBottomWidth: 11,
    borderLeftColor: 'transparent',
    borderRightColor: 'transparent',
    borderBottomColor: theme.colors.brand.primary,
  },
  ring: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    boxShadow: '0 2px 8px rgba(200,255,61,0.45)',
  },
  dot: { width: 20, height: 20, borderRadius: 10, backgroundColor: theme.colors.brand.primary },
}));
