import type { Activity } from './Activity';
import type { LocationPermission, Position, RecordingSnapshot, RecordingSport } from './Recording';
import { token } from '@magic-runtime/di';

/** The recorder. The implementation (native GPS engine, journal on disk, foreground service) is infrastructure. */
export interface RecordingService {
  permission(): LocationPermission;
  requestPermission(): Promise<LocationPermission>;
  start(sport: RecordingSport, sessionId: string): Promise<RecordingSnapshot>;
  pause(): Promise<RecordingSnapshot>;
  resume(): Promise<RecordingSnapshot>;
  /** Resolves only when the result is final (the journal is durable). */
  finish(): Promise<RecordingSnapshot>;
  snapshot(): RecordingSnapshot;
  /** Called about once per second and on every change. Returns the function that stops listening. */
  observe(listener: (snapshot: RecordingSnapshot) => void): () => void;
  /** Every position of the open recording (with its accuracy and segment), for the map. Returns the unsubscribe. */
  observePositions(listener: (position: Position) => void): () => void;
  /** Frees what native persisted for the finished session (it holds coordinates). */
  clearPersisted(): Promise<void>;
}

export interface ActivityRepository {
  all(): readonly Activity[];
  add(activity: Activity): void;
}

/** Lifetime distance; the hero context reads it to unlock accessories. */
export interface LifetimeDistance {
  addMeters(meters: number): void;
}

/**
 * Positions BEFORE a recording starts, to show the person on the map and judge the GPS signal (the tracker only
 * reports positions once started). Never records, never stores.
 */
export interface PositionPreview {
  /** Resolves with the function that stops watching; resolves a no-op when location is not allowed. */
  watch(listener: (position: Position) => void): Promise<() => void>;
}

export const PositionPreview = token<PositionPreview>('tracking.PositionPreview');
export const RecordingService = token<RecordingService>('tracking.RecordingService');
export const ActivityRepository = token<ActivityRepository>('tracking.ActivityRepository');
export const LifetimeDistance = token<LifetimeDistance>('tracking.LifetimeDistance');
