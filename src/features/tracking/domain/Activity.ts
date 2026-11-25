export type ActivitySource = 'cua' | 'health';

export interface Activity {
  readonly id: string;
  readonly sportCode: string;
  readonly startedAtMs: number;
  readonly durationMs: number;
  readonly distanceMeters: number;
  readonly source: ActivitySource;
  readonly externalId?: string;
  readonly pending?: boolean;
}

export interface RecordedActivity {
  readonly clientId: string;
  readonly sportCode: string;
  readonly startedAtMs: number;
  readonly endedAtMs: number;
  readonly durationMs: number;
  readonly distanceMeters: number;
}

export interface ActivityPage {
  readonly items: readonly Activity[];
  readonly nextCursor?: string;
}

export function pendingActivity(r: RecordedActivity): Activity {
  return {
    id: r.clientId,
    sportCode: r.sportCode,
    startedAtMs: r.startedAtMs,
    durationMs: r.durationMs,
    distanceMeters: r.distanceMeters,
    source: 'cua',
    externalId: r.clientId,
    pending: true,
  };
}

export function mergeNewestFirst(
  ...lists: ReadonlyArray<readonly Activity[]>
): Activity[] {
  const byKey = new Map<string, Activity>();
  for (const a of lists.flat()) {
    const key = a.externalId ? `${a.source}:${a.externalId}` : `id:${a.id}`;
    const seen = byKey.get(key);
    if (!seen || (seen.pending && !a.pending)) byKey.set(key, a);
  }
  return [...byKey.values()].sort((a, b) => b.startedAtMs - a.startedAtMs);
}
