import { useEffect, useRef, useState } from 'react';
import { planTip } from '../../domain/liveTip';
import type { Position } from '../../domain/Recording';

const STEPS = 20; // UPRACE: 20 steps per fix

/**
 * The marker position actually drawn: it glides from the last shown point to each new fix (the UPRACE live tip)
 * instead of jumping once a second. Only this small state changes per step; the route lines are memoised apart.
 */
export function useLiveTip(
  position: Position | undefined,
): Position | undefined {
  const [tip, setTip] = useState<Position | undefined>(position);
  const shown = useRef<Position | undefined>(position);
  const timer = useRef<ReturnType<typeof setInterval> | undefined>(undefined);

  useEffect(() => () => clearInterval(timer.current), []);

  useEffect(() => {
    if (!position) return;
    const from = shown.current;
    const plan = planTip(from, position);
    if (plan.kind === 'ignore') return;
    clearInterval(timer.current);
    if (plan.kind === 'jump' || !from) {
      shown.current = position;
      setTip(position);
      return;
    }
    let step = 0;
    timer.current = setInterval(() => {
      step += 1;
      const t = step / STEPS;
      const next: Position = {
        ...position,
        latitude: from.latitude + (position.latitude - from.latitude) * t,
        longitude: from.longitude + (position.longitude - from.longitude) * t,
        atMs: from.atMs + (position.atMs - from.atMs) * t,
      };
      shown.current = next;
      setTip(next);
      if (step >= STEPS) clearInterval(timer.current);
    }, plan.durationMs / STEPS);
  }, [position]);

  return tip;
}
