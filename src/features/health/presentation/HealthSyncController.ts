import { inject, injectable } from 'inversiland';
import { action, makeObservable, observable, observableRef, runInAction } from 'mobx';
import { ObserveNewWorkouts, RequestHealthAccess, SyncWorkouts } from '../application/HealthCommands';
import type { Workout } from '../domain/Workout';

export type HealthSyncStatus = 'unavailable' | 'needsAccess' | 'idle' | 'syncing' | 'failed';

/** State and commands of the Apple Health screen. */
@injectable()
export class HealthSyncController {
  status: HealthSyncStatus = 'needsAccess';
  workouts: readonly Workout[] = [];
  lastSyncMs: number | undefined = undefined;
  error: string | undefined = undefined;
  private stopObserving: (() => void) | undefined;

  constructor(
    @inject(RequestHealthAccess) private readonly requestAccess: RequestHealthAccess,
    @inject(SyncWorkouts) private readonly sync: SyncWorkouts,
    @inject(ObserveNewWorkouts) private readonly observe: ObserveNewWorkouts,
  ) {
    makeObservable(this, {
      status: observable,
      workouts: observableRef,
      lastSyncMs: observable,
      error: observable,
    });
  }

  /** Asks for access, then syncs. Safe to press twice (a second press while syncing does nothing). */
  async connect(): Promise<void> {
    if (this.status === 'syncing') return;
    const granted = await this.requestAccess.execute();
    if (!granted) {
      runInAction(() => {
        this.status = 'unavailable';
      });
      return;
    }
    await this.syncNow();
    this.stopObserving ??= this.observe.execute(() => void this.syncNow());
  }

  async syncNow(): Promise<void> {
    if (this.status === 'syncing') return;
    runInAction(() => {
      this.status = 'syncing';
      this.error = undefined;
    });
    try {
      const result = await this.sync.execute();
      runInAction(() => {
        this.workouts = [...result.added, ...this.workouts];
        this.lastSyncMs = result.syncedAtMs;
        this.status = 'idle';
      });
    } catch (error) {
      runInAction(() => {
        this.status = 'failed';
        this.error = error instanceof Error ? error.message : String(error);
      });
    }
  }

  dispose = action(() => {
    this.stopObserving?.();
    this.stopObserving = undefined;
  });
}
