import { Injectable } from '@magic-runtime/di';
import type { UseCase } from '@/shared/application/UseCase';
import { DomainError } from '@/shared/domain/DomainError';
import { SessionStatus } from '@/shared/domain/ports';
import {
  mergeNewestFirst,
  pendingActivity,
  type Activity,
  type ActivityPage,
} from '../domain/Activity';
import { ActivityRepository, PendingActivityQueue } from '../domain/ports';

/**
 * Uploads the recordings waiting on the device, oldest first. Single flight: a call while one runs joins it. Never
 * rejects: what could not be uploaded stays queued for the next try (the server dedups on `clientId`).
 */
@Injectable([PendingActivityQueue, ActivityRepository, SessionStatus])
export class SyncPendingActivities implements UseCase<void, Promise<number>> {
  private running: Promise<number> | undefined;

  constructor(
    private readonly queue: PendingActivityQueue,
    private readonly remote: ActivityRepository,
    private readonly session: SessionStatus,
  ) {}

  /** Resolves with how many were uploaded now. */
  execute(): Promise<number> {
    this.running ??= this.run().finally(() => {
      this.running = undefined;
    });
    return this.running;
  }

  private async run(): Promise<number> {
    if (!this.session.isSignedIn()) return 0;
    let uploaded = 0;
    const waiting = [...this.queue.all()].sort(
      (a, b) => a.startedAtMs - b.startedAtMs,
    );
    for (const recorded of waiting) {
      try {
        await this.remote.save(recorded);
        this.queue.remove(recorded.clientId);
        uploaded += 1;
      } catch (error) {
        // Offline: the next ones would fail the same way. A refusal of one item must not block the others.
        if (error instanceof DomainError && error.code === 'ACTIVITY_NETWORK')
          break;
      }
    }
    return uploaded;
  }
}

/** What is on the device right now, without the network: for the first frame and for guests. */
@Injectable([PendingActivityQueue])
export class ListPendingActivities implements UseCase<void, Activity[]> {
  constructor(private readonly queue: PendingActivityQueue) {}

  execute(): Activity[] {
    return mergeNewestFirst(this.queue.all().map(pendingActivity));
  }
}

/**
 * One page of the history, newest first. The first page first uploads what is pending, then shows the server's
 * history with whatever is still pending merged in. A guest sees the device's recordings only.
 */
@Injectable([
  ActivityRepository,
  PendingActivityQueue,
  SyncPendingActivities,
  SessionStatus,
])
export class ListActivities
  implements UseCase<string | undefined, Promise<ActivityPage>>
{
  constructor(
    private readonly remote: ActivityRepository,
    private readonly queue: PendingActivityQueue,
    private readonly syncPending: SyncPendingActivities,
    private readonly session: SessionStatus,
  ) {}

  async execute(cursor?: string): Promise<ActivityPage> {
    const first = cursor === undefined;
    if (first) await this.syncPending.execute();
    const pending = first ? this.queue.all().map(pendingActivity) : [];
    if (!this.session.isSignedIn()) return { items: mergeNewestFirst(pending) };
    const page = await this.remote.page(cursor);
    return {
      items: mergeNewestFirst(pending, page.items),
      nextCursor: page.nextCursor,
    };
  }
}

/** One activity by id: a pending recording on the device, or the server's. */
@Injectable([ActivityRepository, PendingActivityQueue, SessionStatus])
export class GetActivity
  implements UseCase<string, Promise<Activity | undefined>>
{
  constructor(
    private readonly remote: ActivityRepository,
    private readonly queue: PendingActivityQueue,
    private readonly session: SessionStatus,
  ) {}

  async execute(id: string): Promise<Activity | undefined> {
    const local = this.queue.all().find(r => r.clientId === id);
    if (local) return pendingActivity(local);
    return this.session.isSignedIn() ? this.remote.byId(id) : undefined;
  }
}
