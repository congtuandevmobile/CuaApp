import { View } from 'react-native';
import Svg, { Path } from 'react-native-svg';
import { StyleSheet } from 'react-native-unistyles';
import { GlassSurface } from '@/core/presentation/components/GlassSurface';
import type { RoutePoint } from '../../domain/Recording';
import { RouteMap } from './RouteMap';
import { SportBadge } from './SportBadge';

/** The map card of the summary: the recorded route on a map, or the grid and the sport when there is no route. */
export function RouteCard({
  sportCode,
  route = [],
  height = 190,
}: {
  sportCode: string;
  route?: readonly RoutePoint[];
  height?: number;
}) {
  if (route.length > 1) {
    return (
      <GlassSurface style={[styles.card, { height }]}>
        <RouteMap route={route} />
      </GlassSurface>
    );
  }
  return (
    <GlassSurface style={[styles.card, { height }]}>
      <Svg
        width="100%"
        height="100%"
        viewBox="0 0 350 190"
        preserveAspectRatio="xMidYMid slice"
        style={StyleSheet.absoluteFill}
      >
        <Path
          d="M0 50h350M0 100h350M0 150h350M70 0v190M140 0v190M210 0v190M280 0v190"
          stroke="rgba(255,255,255,0.06)"
          strokeWidth={1}
        />
      </Svg>
      <View style={styles.center}>
        <SportBadge code={sportCode} size={64} />
      </View>
    </GlassSurface>
  );
}

const styles = StyleSheet.create(() => ({
  card: { borderRadius: 28, backgroundColor: '#0A0E18' },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
}));
