export type RecordingStatus =
  | 'idle'
  | 'running'
  | 'paused'
  | 'finishing'
  | 'finished';
export type GpsQuality =
  | 'unknown'
  | 'good'
  | 'degraded'
  | 'unavailable'
  | 'recovering';
export type LocationPermission =
  | 'granted'
  | 'denied'
  | 'restricted'
  | 'notDetermined'
  | 'servicesDisabled';

/** A sport the person can record. `code` is stable (`running`, `soccer`...); the native engine picks its rules from it. */
export interface RecordingSport {
  readonly code: string;
  readonly name: string;
}

/**
 * What the app shows about the recording. The distance is DECIDED by the native core; this value only carries it
 * (the app never recomputes a distance).
 */
export interface RecordingSnapshot {
  readonly status: RecordingStatus;
  readonly sessionId?: string;
  readonly totalMeters: number;
  /** The workout clock: running legs only, pauses excluded. The headline timer. */
  readonly activeTimeMs: number;
  /** Start to finish, pauses included. */
  readonly elapsedTimeMs: number;
  readonly speedMps?: number;
  readonly gpsQuality: GpsQuality;
  readonly steps: number;
  /** Everything shown has reached the disk. False: a crash now could lose the latest events. */
  readonly durable: boolean;
  /** The native layer cannot record (permission revoked, service refused). Check before showing "recording". */
  readonly failure?: 'permissionDenied' | 'error';
  readonly error?: string;
}

/** One point of the route drawn while recording. Coordinates stay in memory and on the tracker's own journal. */
export interface RoutePoint {
  readonly latitude: number;
  readonly longitude: number;
  /** A pause ends a segment: the line is not drawn across the gap. */
  readonly segment: number;
}

/** One position reading: from the tracker while recording, from the preview watcher before Start. */
export interface Position {
  readonly latitude: number;
  readonly longitude: number;
  readonly accuracyM?: number;
  /** Direction of travel (or of the device), degrees from north. */
  readonly headingDeg?: number;
  readonly atMs: number;
  readonly segment?: number;
}

export const idleRecording: RecordingSnapshot = {
  status: 'idle',
  totalMeters: 0,
  activeTimeMs: 0,
  elapsedTimeMs: 0,
  gpsQuality: 'unknown',
  steps: 0,
  durable: true,
};

/** Seconds per kilometre from a speed in m/s; undefined while standing still or unknown. */
export function paceSecondsPerKm(
  speedMps: number | undefined,
): number | undefined {
  if (speedMps === undefined || speedMps < 0.3) return undefined;
  return 1000 / speedMps;
}

export function isRecording(s: RecordingSnapshot): boolean {
  return s.status === 'running' || s.status === 'paused';
}
