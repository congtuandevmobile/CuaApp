import type { Workout } from './Workout';
import { token } from '@magic-runtime/di';

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

export const HealthRepository = token<HealthRepository>('health.HealthRepository');
export const SyncStateRepository = token<SyncStateRepository>('health.SyncStateRepository');
