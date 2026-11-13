/**
 * A workout read from the platform's health store. The sport keeps BOTH its stable id and its name: a sport newer than
 * the app arrives as `unknown` with its real id, so it is never folded into another sport.
 */
export interface Workout {
  readonly id: string;
  readonly sportId: number;
  readonly sportName: string;
  readonly startedAtMs: number;
  readonly endedAtMs: number;
  readonly durationSec: number;
  readonly distanceMeters?: number;
  readonly energyKcal?: number;
  readonly source: string;
  readonly isManual: boolean;
}
