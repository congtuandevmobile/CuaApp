import type { Activity, ActivityPage, RecordedActivity } from './Activity';
import type {
  LocationPermission,
  Position,
  RecordingSnapshot,
  RecordingSport,
} from './Recording';
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

/**
 * The activity history on Cua API (both sources). Every call needs a signed-in session. Failures are DomainErrors:
 * `ACTIVITY_NETWORK` (offline, timeout) or `ACTIVITY_SERVER`.
 */
export interface ActivityRepository {
  /** Idempotent on `clientId`: a retry returns the stored activity instead of a second one. */
  save(activity: RecordedActivity): Promise<Activity>;
  /** Newest first. Without a cursor: the first page. */
  page(cursor?: string): Promise<ActivityPage>;
  /** Undefined when it does not exist (or is not this user's). */
  byId(id: string): Promise<Activity | undefined>;
}

/**
 * Recordings saved on this device that have not reached the server yet: written BEFORE the upload is tried, removed
 * only once the server confirmed it. A recording is never lost to a network error or to a guest session.
 */
export interface PendingActivityQueue {
  all(): readonly RecordedActivity[];
  add(activity: RecordedActivity): void;
  remove(clientId: string): void;
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

export const PositionPreview = token<PositionPreview>(
  'tracking.PositionPreview',
);
export const RecordingService = token<RecordingService>(
  'tracking.RecordingService',
);
export const ActivityRepository = token<ActivityRepository>(
  'tracking.ActivityRepository',
);
export const PendingActivityQueue = token<PendingActivityQueue>(
  'tracking.PendingActivityQueue',
);
export const LifetimeDistance = token<LifetimeDistance>(
  'tracking.LifetimeDistance',
);
