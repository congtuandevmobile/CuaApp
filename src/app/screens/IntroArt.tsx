import { View } from 'react-native';
import Svg, { Circle, Defs, G, LinearGradient, Path, Stop } from 'react-native-svg';
import { StyleSheet } from 'react-native-unistyles';
import { AppText } from '../../core/presentation/components/AppText';
import { GlassSurface } from '../../core/presentation/components/GlassSurface';
import { useT } from '../i18n/useT';

const ROUTE = 'M40 320C70 250 40 200 100 180S190 230 210 150 270 90 296 60';

/** Slide 1: a GPS route on a faint grid (design `02-Intro`, slide 1). */
function RouteArt() {
  return (
    <Svg width={330} height={380} viewBox="0 0 330 380">
      <Defs>
        <LinearGradient id="introRoute" x1="0" y1="1" x2="1" y2="0">
          <Stop offset="0" stopColor="#4FD8FF" />
          <Stop offset="1" stopColor="#C8FF3D" />
        </LinearGradient>
      </Defs>
      <Path d="M0 70h330M0 150h330M0 230h330M0 310h330M60 0v380M150 0v380M240 0v380" stroke="rgba(255,255,255,0.07)" strokeWidth={1} />
      <Path d={ROUTE} fill="none" stroke="url(#introRoute)" strokeWidth={14} strokeLinecap="round" opacity={0.25} />
      <Path d={ROUTE} fill="none" stroke="url(#introRoute)" strokeWidth={5} strokeLinecap="round" />
      <Circle cx={296} cy={60} r={11} fill="#C8FF3D" />
      <Circle cx={296} cy={60} r={20} fill="none" stroke="#C8FF3D" strokeOpacity={0.4} />
    </Svg>
  );
}

/** Slide 2: three activity rings + the Apple Health chip. */
function RingsArt({ health }: { health: string }) {
  const ring = (r: number, color: string, dash: number, circ: number) => (
    <G key={r}>
      <Circle cx={120} cy={120} r={r} fill="none" stroke="rgba(255,255,255,0.1)" strokeWidth={16} />
      <Circle cx={120} cy={120} r={r} fill="none" stroke={color} strokeWidth={16} strokeLinecap="round" strokeDasharray={`${dash} ${circ}`} />
    </G>
  );
  return (
    <View style={styles.center}>
      <Svg width={260} height={260} viewBox="0 0 240 240" style={styles.rotated}>
        {ring(100, '#C8FF3D', 470, 628)}
        {ring(74, '#4FD8FF', 320, 465)}
        {ring(48, '#FF5D6C', 190, 302)}
      </Svg>
      <GlassSurface style={styles.chip}>
        <View style={styles.chipInner}>
          <Svg width={16} height={16} viewBox="0 0 24 24">
            <Path d="M12 21s-7-4.5-9-9a5 5 0 0 1 9-3 5 5 0 0 1 9 3c-2 4.5-9 9-9 9z" fill="none" stroke="#FF5D6C" strokeWidth={2} strokeLinejoin="round" />
          </Svg>
          <AppText variant="caption">{health}</AppText>
        </View>
      </GlassSurface>
    </View>
  );
}

/**
 * Slide 3: a stylised hero silhouette. The real 3D hero lives behind `HeroScene`; the intro must not spin up a GL
 * canvas just for an illustration, so this is plain SVG.
 */
function HeroArt() {
  return (
    <Svg width={330} height={380} viewBox="0 0 330 380">
      <Defs>
        <LinearGradient id="introHero" x1="0" y1="1" x2="1" y2="0">
          <Stop offset="0" stopColor="#C8FF3D" />
          <Stop offset="1" stopColor="#4FD8FF" />
        </LinearGradient>
      </Defs>
      <Circle cx={165} cy={190} r={100} fill="rgba(155,140,255,0.45)" />
      <Path d="M130 120a35 35 0 0 1 70 0" fill="none" stroke="#C8FF3D" strokeWidth={9} strokeLinecap="round" />
      <Circle cx={165} cy={128} r={30} fill="#F4F6FB" />
      <Path d="M120 290c0-45 20-85 45-85s45 40 45 85" fill="url(#introHero)" />
      <Path d="M122 224l-26 46M208 224l26 46" stroke="url(#introHero)" strokeWidth={16} strokeLinecap="round" />
      <Path d="M145 300l-10 40M185 300l10 40" stroke="#C8FF3D" strokeWidth={18} strokeLinecap="round" />
      <Circle cx={96} cy={274} r={10} fill="#4FD8FF" />
    </Svg>
  );
}

export function IntroArt({ page }: { page: 0 | 1 | 2 }) {
  const { t } = useT();
  return (
    <GlassSurface style={styles.card} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
      {page === 0 ? <RouteArt /> : page === 1 ? <RingsArt health={t('intro.appleHealth')} /> : <HeroArt />}
    </GlassSurface>
  );
}

const styles = StyleSheet.create((theme) => ({
  card: { width: 330, height: 380, borderRadius: 36, alignSelf: 'center', alignItems: 'center', justifyContent: 'center' },
  center: { width: 330, height: 380, alignItems: 'center', justifyContent: 'center' },
  rotated: { transform: [{ rotate: '-90deg' }] },
  chip: { position: 'absolute', right: 18, top: 20, borderRadius: theme.radius.pill },
  chipInner: { flexDirection: 'row', alignItems: 'center', gap: theme.spacing(2), paddingVertical: 8, paddingHorizontal: 14 },
}));
