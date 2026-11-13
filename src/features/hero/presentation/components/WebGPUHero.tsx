import { useEffect, useMemo, useRef, useState } from 'react';
import { PanResponder, PixelRatio, View, type ViewStyle } from 'react-native';
import { Canvas, type CanvasRef } from 'react-native-webgpu';
import type { Hero } from '@/features/hero/domain/Hero';
import { DEFAULT_EQUIPMENT } from '@/features/hero/domain/Hero';
import { HeroRenderer } from './hero3d/HeroRenderer';

interface Props {
  hero: Hero | undefined;
  width: number;
  height: number;
  /** Turntable angle in degrees. */
  rotationDeg: number;
  onRotate?: (rotationDeg: number) => void;
  /** Plays the run cycle (continuous loop). Off: a still pose, rendered only when something changes. */
  idle?: boolean;
  /** Reports the first rendered model, or a load/GPU failure (the scene then shows its fallback). */
  onStatus?: (status: 'ready' | 'failed') => void;
}

/** Degrees of turn per pixel of horizontal drag: a full-width swipe (~340 px) is about one full turn. */
const DEG_PER_PX = 1;
/** Bounded device pixel ratio: 3x phones render at 2x, a third fewer pixels for no visible loss at this size. */
const MAX_DPR = 2;

/**
 * The WebGPU canvas of the hero. React owns the native surface and forwards props; all three.js state lives in one
 * `HeroRenderer`, created when the canvas is laid out and disposed on unmount.
 */
export function WebGPUHero({ hero, width, height, rotationDeg, onRotate, idle = false, onStatus }: Props) {
  const canvasRef = useRef<CanvasRef>(null);
  const [renderer, setRenderer] = useState<HeroRenderer>();
  const latestRotation = useRef(rotationDeg);
  const dragging = useRef(false);
  const onRotateRef = useRef(onRotate);
  onRotateRef.current = onRotate;
  const onStatusRef = useRef(onStatus);
  onStatusRef.current = onStatus;

  useEffect(() => {
    const context = canvasRef.current?.getContext('webgpu');
    if (!context) {
      onStatusRef.current?.('failed');
      return;
    }
    const dpr = Math.min(PixelRatio.get(), MAX_DPR);
    const canvas = context.canvas as unknown as { width: number; height: number };
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

  const gender = hero?.gender ?? 'male';
  const skinTone = hero?.skinTone ?? 1;
  const equipment = hero?.equipment ?? DEFAULT_EQUIPMENT;
  useEffect(() => {
    if (!renderer) return;
    renderer.setLook({ gender, skinTone, equipment }).then(
      () => onStatusRef.current?.('ready'),
      () => onStatusRef.current?.('failed'),
    );
  }, [renderer, gender, skinTone, equipment]);

  useEffect(() => {
    renderer?.setPlaying(idle);
  }, [renderer, idle]);

  useEffect(() => {
    if (dragging.current) return;
    latestRotation.current = rotationDeg;
    renderer?.setRotation(rotationDeg, false);
  }, [renderer, rotationDeg]);

  const rendererRef = useRef(renderer);
  rendererRef.current = renderer;
  /**
   * The drag is read by a PanResponder in screen pixels and written straight to the renderer: no React render per move.
   * The controller is told once, on release.
   */
  const pan = useMemo(() => {
    let start = 0;
    const end = () => {
      if (!dragging.current) return;
      dragging.current = false;
      rendererRef.current?.setRotation(latestRotation.current, false);
      onRotateRef.current?.(latestRotation.current);
    };
    return PanResponder.create({
      onStartShouldSetPanResponderCapture: () => true,
      onMoveShouldSetPanResponderCapture: () => true,
      onPanResponderTerminationRequest: () => false,
      onPanResponderGrant: () => {
        dragging.current = true;
        start = latestRotation.current;
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

const canvasStyle = (width: number, height: number): ViewStyle => ({ flex: 0, width, height });
