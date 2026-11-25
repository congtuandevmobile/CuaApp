import { Injectable } from '@magic-runtime/di';
import type { UseCase } from '@/shared/application/UseCase';
import { Clock, SessionStatus } from '@/shared/domain/ports';
import {
  HealthRepository,
  SyncStateRepository,
  WorkoutUploader,
  type UploadResult,
} from '../domain/ports';
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
  /** What the server did with them; undefined when nothing was sent (a guest, or nothing new). */
  readonly uploaded: UploadResult | undefined;
  readonly syncedAtMs: number;
}

/**
 * Reads the workouts since the last sync (or the last 90 days) and returns only the NEW ones. Every sport comes
 * through: nothing is filtered by sport here. When signed in, the new ones are uploaded, and only an upload that
 * succeeded moves the sync state forward: a failed or guest sync reads (and sends) the same workouts next time, which
 * the server's dedup makes harmless. After a reinstall the state is empty, so everything is re-sent and the server
 * answers "skipped" for what it already has.
 */
@Injectable([HealthRepository, SyncStateRepository, WorkoutUploader, SessionStatus, Clock])
export class SyncWorkouts implements UseCase<void, Promise<SyncResult>> {
  constructor(
    private readonly health: HealthRepository,
    private readonly state: SyncStateRepository,
    private readonly uploader: WorkoutUploader,
    private readonly session: SessionStatus,
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
    if (!this.session.isSignedIn())
      return { added, uploaded: undefined, syncedAtMs: now };
    const uploaded =
      added.length > 0 ? await this.uploader.upload(added) : undefined;
    this.state.save(now, [...known, ...added.map(w => w.id)]);
    return { added, uploaded, syncedAtMs: now };
  }
}

@Injectable([HealthRepository])
export class ObserveNewWorkouts implements UseCase<() => void, () => void> {
  constructor(private readonly health: HealthRepository) {}

  execute(listener: () => void): () => void {
    return this.health.observeNewWorkouts(listener);
  }
}
