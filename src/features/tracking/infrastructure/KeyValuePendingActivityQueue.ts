import { Injectable } from '@magic-runtime/di';
import { KeyValueStore } from '@/shared/domain/ports';
import type { RecordedActivity } from '../domain/Activity';
import type { PendingActivityQueue } from '../domain/ports';

const QUEUE = 'tracking.pendingActivities';
/** Where the app kept its whole history before activities moved to the server. Read once, then removed. */
const LEGACY_HISTORY = 'tracking.activities';

interface LegacyActivity {
  id?: unknown;
  sportCode?: unknown;
  startedAtMs?: unknown;
  durationMs?: unknown;
  distanceMeters?: unknown;
}

/**
 * The upload queue in the key-value store (MMKV). Holds only recordings the server has not confirmed; the history
 * itself lives on the server. On first use it adopts the old on-device history, so upgrading uploads it once (the
 * old ids become the idempotency keys, so a second adoption could not duplicate anything either).
 */
@Injectable([KeyValueStore])
export class KeyValuePendingActivityQueue implements PendingActivityQueue {
  private cache: RecordedActivity[] | undefined;

  constructor(private readonly store: KeyValueStore) {}

  all(): readonly RecordedActivity[] {
    if (this.cache) return this.cache;
    const queued = parse<RecordedActivity[]>(this.store.getString(QUEUE)) ?? [];
    const legacy = adoptLegacy(this.store.getString(LEGACY_HISTORY));
    const known = new Set(queued.map(r => r.clientId));
    this.cache = [...queued, ...legacy.filter(r => !known.has(r.clientId))];
    if (legacy.length > 0 || this.store.getString(LEGACY_HISTORY) !== undefined) {
      this.persist();
      this.store.remove(LEGACY_HISTORY);
    }
    return this.cache;
  }

  add(activity: RecordedActivity): void {
    if (this.all().some(r => r.clientId === activity.clientId)) return;
    this.cache = [...this.all(), activity];
    this.persist();
  }

  remove(clientId: string): void {
    this.cache = this.all().filter(r => r.clientId !== clientId);
    this.persist();
  }

  private persist(): void {
    if (!this.cache || this.cache.length === 0) this.store.remove(QUEUE);
    else this.store.setString(QUEUE, JSON.stringify(this.cache));
  }
}

function parse<T>(raw: string | undefined): T | undefined {
  if (!raw) return undefined;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return undefined;
  }
}

function adoptLegacy(raw: string | undefined): RecordedActivity[] {
  const list = parse<LegacyActivity[]>(raw);
  if (!Array.isArray(list)) return [];
  return list.flatMap(a => {
    if (
      typeof a.id !== 'string' ||
      typeof a.sportCode !== 'string' ||
      typeof a.startedAtMs !== 'number' ||
      typeof a.durationMs !== 'number'
    )
      return [];
    const distance = typeof a.distanceMeters === 'number' ? a.distanceMeters : 0;
    return [
      {
        clientId: a.id,
        sportCode: a.sportCode,
        startedAtMs: a.startedAtMs,
        // The old history kept no end: moving time is the closest honest value.
        endedAtMs: a.startedAtMs + a.durationMs,
        durationMs: a.durationMs,
        distanceMeters: distance,
      },
    ];
  });
}
