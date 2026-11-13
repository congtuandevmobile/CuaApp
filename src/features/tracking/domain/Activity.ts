/** A saved recording. */
export interface Activity {
  readonly id: string;
  readonly sportCode: string;
  readonly sportName: string;
  readonly startedAtMs: number;
  readonly durationMs: number;
  readonly distanceMeters: number;
  readonly source: 'cua';
}
