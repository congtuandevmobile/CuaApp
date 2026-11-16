import { Component, type PropsWithChildren, useCallback, useEffect, useState } from 'react';
import { type LayoutChangeEvent, View } from 'react-native';
import { StyleSheet } from 'react-native-unistyles';
import { useIsFocused } from '@react-navigation/native';
import type { Hero } from '@/features/hero/domain/Hero';
import { useT } from '@/app/i18n/useT';
import { AppText } from '@/core/presentation/components/AppText';
import { WebGPUHero } from './WebGPUHero';

interface Props {
  hero: Hero | undefined;
  /** Turntable angle in degrees. */
  rotationDeg: number;
  /** Plays the run cycle (a render loop). Use it on the one hero screen, not on small previews. */
  idle?: boolean;
  /** Commit a turntable angle after a swipe. The gesture itself stays local to the scene. */
  onRotate?: (rotationDeg: number) => void;
  /** `false` floats the hero on the screen's ground (the design's hero and closet screens); `true` draws a card. */
  framed?: boolean;
  height?: number;
}

type SceneStatus = 'loading' | 'ready' | 'failed';

interface BoundaryState {
  failed: boolean;
}

/** Prevents a native GPU/context failure from taking down the surrounding navigation tree. */
class SceneErrorBoundary extends Component<PropsWithChildren<{ fallback: string }>, BoundaryState> {
  state: BoundaryState = { failed: false };

  static getDerivedStateFromError(): BoundaryState {
    return { failed: true };
  }

  render() {
    return this.state.failed ? <AppText variant="caption" tone="secondary">{this.props.fallback}</AppText> : this.props.children;
  }
}

/**
 * The seam for the 3D hero: screens pass a `Hero`, never three.js objects. The WebGPU surface exists only while the
 * screen is focused, so at most one renderer (and one model in GPU memory) is alive, and an unfocused tab costs
 * nothing.
 */
export function HeroScene({ hero, rotationDeg, idle, onRotate, framed = true, height = 320 }: Props) {
  const { t } = useT();
  const focused = useIsFocused();
  const [viewport, setViewport] = useState({ width: 0, height: 0 });
  const [status, setStatus] = useState<SceneStatus>('loading');

  const handleLayout = useCallback((event: LayoutChangeEvent) => {
    const { width, height } = event.nativeEvent.layout;
    setViewport((current) => (current.width === width && current.height === height ? current : { width, height }));
  }, []);

  const ready = viewport.width > 0 && viewport.height > 0 && focused;
  // a remounted surface (focus came back) shows the loading hint until its first frame
  useEffect(() => {
    if (!ready) setStatus('loading');
  }, [ready]);
  return (
    <View onLayout={handleLayout} style={[styles.stage, { height }, framed ? styles.framed : null]} accessible accessibilityRole="image" accessibilityLabel={t('hero.scene')}>
      <SceneErrorBoundary fallback={t('hero.unavailable')}>
        {ready ? (
          <WebGPUHero
            // a new surface size needs a new canvas
            key={`${viewport.width}x${viewport.height}`}
            hero={hero}
            rotationDeg={rotationDeg}
            onRotate={onRotate}
            width={viewport.width}
            height={viewport.height}
            idle={Boolean(idle)}
            onStatus={setStatus}
          />
        ) : null}
      </SceneErrorBoundary>
      {status !== 'ready' ? (
        <View style={styles.overlay} pointerEvents="none">
          <AppText variant="caption" tone="secondary">{status === 'failed' ? t('hero.unavailable') : t('hero.loading')}</AppText>
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create((theme) => ({
  stage: { position: 'relative', width: '100%', overflow: 'hidden' },
  framed: {
    borderRadius: theme.radius.xl,
    borderWidth: 1,
    borderColor: theme.colors.stroke.hairline,
    backgroundColor: theme.colors.background.raised,
  },
  overlay: { position: 'absolute', top: 0, right: 0, bottom: 0, left: 0, alignItems: 'center', justifyContent: 'center' },
}));
