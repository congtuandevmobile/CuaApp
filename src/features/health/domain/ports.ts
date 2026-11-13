import type { Workout } from './Workout';

export interface HealthRepository {
  isAvailable(): boolean;
  requestAccess(): Promise<boolean>;
  readWorkouts(fromMs: number, toMs: number): Promise<readonly Workout[]>;
  /** Calls the listener when the store gets a new workout. Returns the function that stops. */
  observeNewWorkouts(listener: () => void): () => void;
}

export interface SyncState {
  lastSyncMs: number | undefined;
  known: ReadonlySet<string>;
}

export interface SyncStateRepository {
  get(): SyncState;
  save(lastSyncMs: number, ids: readonly string[]): void;
}

export const HealthRepositoryToken = Symbol.for('health.HealthRepository');
export const SyncStateRepositoryToken = Symbol.for('health.SyncStateRepository');
