import { DomainError } from '@/shared/domain/DomainError';
import type { SessionStatus } from '@/shared/domain/ports';
import type {
  Activity,
  ActivityPage,
  RecordedActivity,
} from '../domain/Activity';
import type { ActivityRepository } from '../domain/ports';

/** Test double of Cua API's activity routes: idempotent on clientId, newest first, can go offline. */
export class FakeActivityServer implements ActivityRepository {
  readonly saved: Activity[] = [];
  offline = false;
  saveCalls = 0;
  pageSize = 50;

  async save(r: RecordedActivity): Promise<Activity> {
    this.saveCalls += 1;
    if (this.offline)
      throw new DomainError('ACTIVITY_NETWORK', 'Cannot reach the server.');
    const existing = this.saved.find(a => a.externalId === r.clientId);
    if (existing) return existing;
    const activity: Activity = {
      id: `srv-${this.saved.length + 1}`,
      sportCode: r.sportCode,
      startedAtMs: r.startedAtMs,
      durationMs: r.durationMs,
      distanceMeters: r.distanceMeters,
      source: 'cua',
      externalId: r.clientId,
    };
    this.saved.push(activity);
    return activity;
  }

  async page(cursor?: string): Promise<ActivityPage> {
    if (this.offline)
      throw new DomainError('ACTIVITY_NETWORK', 'Cannot reach the server.');
    const sorted = [...this.saved].sort((a, b) => b.startedAtMs - a.startedAtMs);
    const start = cursor ? Number(cursor) : 0;
    const items = sorted.slice(start, start + this.pageSize);
    const next = start + this.pageSize;
    return { items, nextCursor: next < sorted.length ? String(next) : undefined };
  }

  async byId(id: string): Promise<Activity | undefined> {
    return this.saved.find(a => a.id === id);
  }
}

export class FakeSession implements SessionStatus {
  constructor(public signedIn: boolean) {}
  isSignedIn() {
    return this.signedIn;
  }
}
