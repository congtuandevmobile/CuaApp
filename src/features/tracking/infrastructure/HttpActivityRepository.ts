import { Injectable } from '@magic-runtime/di';
import { DomainError } from '@/shared/domain/DomainError';
import { HttpClient } from '@/platform/network/HttpClient';
import { HttpError } from '@/platform/network/networkErrors';
import type {
  Activity,
  ActivityPage,
  RecordedActivity,
} from '../domain/Activity';
import type { ActivityRepository } from '../domain/ports';

/** JSON shapes of Cua API (CuaApp-BE docs/activities.md). They never leave this file. */
interface ActivityDto {
  id: string;
  source: 'phone' | 'apple_health';
  externalId: string | null;
  activityType: string;
  startedAt: string;
  endedAt: string;
  durationSec: number;
  distanceMeters: number | null;
}
interface ActivityPageDto {
  activities: ActivityDto[];
  nextCursor: string | null;
}

const PAGE_SIZE = 50;
const TIMEOUT_MS = 10_000;
const SEND_JSON = {
  accept: 'application/json',
  'content-type': 'application/json',
};

/**
 * `ActivityRepository` over Cua API, through the authenticated `HttpClient` (bearer + one refresh on 401). Request and
 * response bodies are never logged: they hold workout data.
 */
@Injectable([HttpClient])
export class HttpActivityRepository implements ActivityRepository {
  constructor(private readonly http: HttpClient) {}

  async save(activity: RecordedActivity): Promise<Activity> {
    const body = {
      clientId: activity.clientId,
      activityType: activity.sportCode,
      startedAt: new Date(activity.startedAtMs).toISOString(),
      endedAt: new Date(activity.endedAtMs).toISOString(),
      durationSec: Math.round(activity.durationMs / 1000),
      distanceMeters: activity.distanceMeters,
    };
    const res = await call(() =>
      this.http.post<{ activity: ActivityDto }>(
        '/v1/activities',
        JSON.stringify(body),
        { headers: SEND_JSON, timeoutMs: TIMEOUT_MS },
      ),
    );
    return toActivity(res.data.activity);
  }

  async page(cursor?: string): Promise<ActivityPage> {
    const query = `limit=${PAGE_SIZE}${
      cursor ? `&cursor=${encodeURIComponent(cursor)}` : ''
    }`;
    const res = await call(() =>
      this.http.get<ActivityPageDto>(`/v1/activities?${query}`, {
        headers: { accept: 'application/json' },
        timeoutMs: TIMEOUT_MS,
      }),
    );
    return {
      items: res.data.activities.map(toActivity),
      nextCursor: res.data.nextCursor ?? undefined,
    };
  }

  async byId(id: string): Promise<Activity | undefined> {
    try {
      const res = await call(() =>
        this.http.get<{ activity: ActivityDto }>(
          `/v1/activities/${encodeURIComponent(id)}`,
          { headers: { accept: 'application/json' }, timeoutMs: TIMEOUT_MS },
        ),
      );
      return toActivity(res.data.activity);
    } catch (error) {
      if (error instanceof DomainError && error.code === 'ACTIVITY_NOT_FOUND')
        return undefined;
      throw error;
    }
  }
}

export function toActivity(dto: ActivityDto): Activity {
  return {
    id: dto.id,
    sportCode: dto.activityType,
    startedAtMs: Date.parse(dto.startedAt),
    durationMs: dto.durationSec * 1000,
    distanceMeters: dto.distanceMeters ?? 0,
    source: dto.source === 'apple_health' ? 'health' : 'cua',
    externalId: dto.externalId ?? undefined,
  };
}

async function call<T>(request: () => Promise<T>): Promise<T> {
  try {
    return await request();
  } catch (error) {
    throw toDomainError(error);
  }
}

/** Transport and server failures become stable domain codes; callers switch on the code, never on HTTP. */
function toDomainError(error: unknown): DomainError {
  if (!(error instanceof HttpError))
    return new DomainError('ACTIVITY_SERVER', 'Unexpected activity error.');
  if (error.code === 'NETWORK' || error.code === 'TIMEOUT')
    return new DomainError('ACTIVITY_NETWORK', 'Cannot reach the server.');
  const status = error.status ?? 0;
  const code = (
    error.response?.data as { error?: { code?: string } } | undefined
  )?.error?.code;
  if (status === 401) return new DomainError('ACTIVITY_UNAUTHORIZED', 'Sign in again.');
  if (status === 404) return new DomainError('ACTIVITY_NOT_FOUND', 'Not found.');
  if (status >= 500 || !code)
    return new DomainError('ACTIVITY_SERVER', 'The server could not answer.');
  return new DomainError(code, 'The server refused the request.');
}
