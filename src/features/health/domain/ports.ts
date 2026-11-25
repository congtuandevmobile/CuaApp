import type { Workout } from './Workout';
import { token } from '@magic-runtime/di';

export interface HealthRepository {
  isAvailable(): boolean;
  requestAccess(): Promise<boolean>;
  readWorkouts(fromMs: number, toMs: number): Promise<readonly Workout[]>;
  /** Calls the listener when the store gets a new workout. Returns the function that stops. */
  observeNewWorkouts(listener: () => void): () => void;
}

/** Outcome of sending workouts to Cua API. `skipped`: the server already had them (re-sync after a reinstall). */
export interface UploadResult {
  readonly created: number;
  readonly skipped: number;
}

/**
 * Sends imported workouts to the server, in batches. Idempotent: the server dedups on the workout UUID, then on
 * sport + start/end, so sending a workout twice stores it once. Failures are DomainErrors (`HEALTH_UPLOAD_NETWORK`,
 * `HEALTH_UPLOAD_SERVER`); batches already sent stay stored.
 */
export interface WorkoutUploader {
  upload(workouts: readonly Workout[]): Promise<UploadResult>;
}

export interface SyncState {
  lastSyncMs: number | undefined;
  known: ReadonlySet<string>;
}

export interface SyncStateRepository {
  get(): SyncState;
  save(lastSyncMs: number, ids: readonly string[]): void;
}

export const HealthRepository = token<HealthRepository>(
  'health.HealthRepository',
);
export const WorkoutUploader = token<WorkoutUploader>(
  'health.WorkoutUploader',
);
export const SyncStateRepository = token<SyncStateRepository>(
  'health.SyncStateRepository',
);
