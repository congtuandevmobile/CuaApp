import { Injectable } from '@magic-runtime/di';
import type { UseCase } from '@/shared/application/UseCase';
import { Clock } from '@/shared/domain/ports';
import { HealthRepository, SyncStateRepository } from '../domain/ports';
import type { Workout } from '../domain/Workout';

const DAY = 86_400_000;
/** How far back the very first sync reads. */
export const FIRST_SYNC_DAYS = 90;

@Injectable([HealthRepository])
export class RequestHealthAccess implements UseCase<void, Promise<boolean>> {
  constructor(private readonly health: HealthRepository) {}

  async execute(): Promise<boolean> {
    return this.health.isAvailable() ? this.health.requestAccess() : false;
  }
}

export interface SyncResult {
  /** Workouts that were not known before this sync, newest first. */
  readonly added: readonly Workout[];
  readonly syncedAtMs: number;
}

/**
 * Reads the workouts since the last sync (or the last 90 days) and returns only the NEW ones. Every sport comes
 * through: nothing is filtered by sport here.
 */
@Injectable([HealthRepository, SyncStateRepository, Clock])
export class SyncWorkouts implements UseCase<void, Promise<SyncResult>> {
  constructor(
    private readonly health: HealthRepository,
    private readonly state: SyncStateRepository,
    private readonly clock: Clock,
  ) {}

  async execute(): Promise<SyncResult> {
    const now = this.clock.nowMs();
    const { lastSyncMs, known } = this.state.get();
    // A small overlap: a workout that finished just before the last sync may have arrived late in the store.
    const from =
      lastSyncMs === undefined ? now - FIRST_SYNC_DAYS * DAY : lastSyncMs - DAY;
    const read = await this.health.readWorkouts(from, now);
    const added = read
      .filter(w => !known.has(w.id))
      .sort((a, b) => b.startedAtMs - a.startedAtMs);
    this.state.save(now, [...known, ...added.map(w => w.id)]);
    return { added, syncedAtMs: now };
  }
}

@Injectable([HealthRepository])
export class ObserveNewWorkouts implements UseCase<() => void, () => void> {
  constructor(private readonly health: HealthRepository) {}

  execute(listener: () => void): () => void {
    return this.health.observeNewWorkouts(listener);
  }
}
