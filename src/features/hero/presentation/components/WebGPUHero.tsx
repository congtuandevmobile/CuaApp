import { useEffect, useMemo, useRef, useState } from 'react';
import { PanResponder, PixelRatio, View, type ViewStyle } from 'react-native';
import { Canvas, type CanvasRef } from 'react-native-webgpu';
import type { Slot } from '@/features/hero/domain/accessories';
import {
  defaultEquipment,
  type Equipment,
  type Gender,
} from '@/features/hero/domain/Hero';
import { HeroRenderer } from './hero3d/HeroRenderer';

interface Props {
  gender: Gender;
  skinTone: number;
  equipment: Equipment | undefined;
  width: number;
  height: number;
  /** Rest angle in degrees: a swipe turns the hero, releasing eases it back here. */
  rotationDeg: number;
  /** Show one worn item alone (item preview) instead of the whole hero. */
  focus?: Slot;
  /** Plays the run cycle (continuous loop). Off: a still pose, rendered only when something changes. */
  idle?: boolean;
  /** Reports the first rendered model, or a load/GPU failure (the scene then shows its fallback). */
  onStatus?: (status: 'loading' | 'ready' | 'failed') => void;
}

/** Degrees of turn per pixel of horizontal drag: a full-width swipe (~340 px) is about one full turn. */
const DEG_PER_PX = 1;
/** Bounded device pixel ratio: 3x phones render at 2x, a third fewer pixels for no visible loss at this size. */
const MAX_DPR = 2;
/** Horizontal movement before a touch becomes a turn. */
const DRAG_SLOP_PX = 4;

/**
 * The WebGPU canvas of the hero. React owns the native surface and forwards props; all three.js state lives in one
 * `HeroRenderer`, created when the canvas is laid out and disposed on unmount.
 */
export function WebGPUHero({
  gender,
  skinTone,
  equipment: worn,
  width,
  height,
  rotationDeg,
  focus,
  idle = false,
  onStatus,
}: Props) {
  const canvasRef = useRef<CanvasRef>(null);
  const [renderer, setRenderer] = useState<HeroRenderer>();
  const latestRotation = useRef(rotationDeg);
  const dragging = useRef(false);
  const restRotation = useRef(rotationDeg);
  restRotation.current = rotationDeg;
  const onStatusRef = useRef(onStatus);
  onStatusRef.current = onStatus;

  useEffect(() => {
    // Without WebGPU three would fall back to WebGL, which has no surface on React Native: show the fallback instead.
    onStatusRef.current?.('loading'); // a new canvas (first mount, new size) starts without a model
    const hasGPU =
      typeof navigator !== 'undefined' &&
      Boolean((navigator as { gpu?: unknown }).gpu);
    const context = hasGPU ? canvasRef.current?.getContext('webgpu') : null;
    if (!context) {
      onStatusRef.current?.('failed');
      return;
    }
    const dpr = Math.min(PixelRatio.get(), MAX_DPR);
    const canvas = context.canvas as unknown as {
      width: number;
      height: number;
    };
    canvas.width = Math.round(width * dpr);
    canvas.height = Math.round(height * dpr);
    const instance = new HeroRenderer(context, canvas.width, canvas.height);
    instance.setRotation(latestRotation.current, false);
    setRenderer(instance);
    return () => {
      setRenderer(undefined);
      instance.dispose();
    };
    // The surface size is fixed for a renderer: a new size means a new canvas (HeroScene remounts on layout change).
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const equipment = useMemo(
    () => worn ?? defaultEquipment(gender),
    [worn, gender],
  );
  useEffect(() => {
    if (!renderer) return;
    renderer.setLook({ gender, skinTone, equipment }).then(
      placed => {
        if (placed) onStatusRef.current?.('ready');
      },
      (error: unknown) => {
        if (__DEV__)
          console.warn('[WebGPUHero] hero model failed to load', error);
        onStatusRef.current?.('failed');
      },
    );
  }, [renderer, gender, skinTone, equipment]);

  useEffect(() => {
    renderer?.setPlaying(idle);
  }, [renderer, idle]);

  useEffect(() => {
    renderer?.setFocus(focus);
  }, [renderer, focus]);

  useEffect(() => {
    if (dragging.current) return;
    latestRotation.current = rotationDeg;
    renderer?.setRotation(rotationDeg, false);
  }, [renderer, rotationDeg]);

  const rendererRef = useRef(renderer);
  rendererRef.current = renderer;
  /**
   * The drag is read by a PanResponder in screen pixels and written straight to the renderer: no React render per move.
   * On release the hero (or the previewed item) eases back to the rest angle: the turn is a look, not a setting.
   */
  const pan = useMemo(() => {
    let start = 0;
    const end = () => {
      if (!dragging.current) return;
      dragging.current = false;
      latestRotation.current = restRotation.current;
      rendererRef.current?.setRotation(restRotation.current, false);
    };
    return PanResponder.create({
      // horizontal swipes only: taps and vertical moves stay with whatever is around the stage
      onMoveShouldSetPanResponderCapture: (_, g) =>
        Math.abs(g.dx) > DRAG_SLOP_PX && Math.abs(g.dx) > Math.abs(g.dy),
      onPanResponderTerminationRequest: () => false,
      onPanResponderGrant: () => {
        dragging.current = true;
        // a grab while the hero is still easing back starts from the angle on screen, not from the rest angle
        start = rendererRef.current?.currentDeg() ?? latestRotation.current;
      },
      onPanResponderMove: (_, gesture) => {
        latestRotation.current = start + gesture.dx * DEG_PER_PX;
        rendererRef.current?.setRotation(latestRotation.current, true);
      },
      onPanResponderRelease: end,
      onPanResponderTerminate: end,
    });
  }, []);

  const style = canvasStyle(width, height);
  return (
    <View style={style} {...pan.panHandlers}>
      {/* Transparent: the renderer configures the surface with premultiplied alpha, so the screen shows through. */}
      <Canvas ref={canvasRef} style={style} />
    </View>
  );
}

const canvasStyle = (width: number, height: number): ViewStyle => ({
  flex: 0,
  width,
  height,
});
