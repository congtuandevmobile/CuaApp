import type { Position } from './Recording';

/** Great-circle distance in metres (haversine). */
export function distanceMeters(
  a: { latitude: number; longitude: number },
  b: { latitude: number; longitude: number },
): number {
  const r = 6_371_000;
  const rad = (d: number) => (d * Math.PI) / 180;
  const dLat = rad(b.latitude - a.latitude);
  const dLng = rad(b.longitude - a.longitude);
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(rad(a.latitude)) *
      Math.cos(rad(b.latitude)) *
      Math.sin(dLng / 2) ** 2;
  return 2 * r * Math.asin(Math.sqrt(h));
}

/** A jump this large is shown at once (re-acquired signal, teleport), not glided over. */
export const SNAP_JUMP_M = 50;
const MIN_MOVE_M = 3;

export type TipPlan =
  | { readonly kind: 'jump' }
  | { readonly kind: 'ignore' }
  | { readonly kind: 'glide'; readonly durationMs: number };

/**
 * How the marker gets from the last shown point to a new fix (UPRACE `RecordMapController._onLocation`): jump on a big
 * gap, ignore moves inside the fix's own accuracy (jitter), otherwise glide over about the time between the fixes.
 */
export function planTip(from: Position | undefined, to: Position): TipPlan {
  if (!from) return { kind: 'jump' };
  const d = distanceMeters(from, to);
  if (!Number.isFinite(d) || d > SNAP_JUMP_M) return { kind: 'jump' };
  if (d <= Math.max(MIN_MOVE_M, to.accuracyM ?? 0)) return { kind: 'ignore' };
  const dt = to.atMs - from.atMs;
  const durationMs = Math.min(
    3000,
    Math.max(500, Number.isFinite(dt) && dt > 0 ? dt : 1000),
  );
  return { kind: 'glide', durationMs };
}
