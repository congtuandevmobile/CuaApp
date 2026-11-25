import { Injectable } from '@magic-runtime/di';
import { DomainError } from '@/shared/domain/DomainError';
import { HttpClient } from '@/platform/network/HttpClient';
import { HttpError } from '@/platform/network/networkErrors';
import type { UploadResult, WorkoutUploader } from '../domain/ports';
import type { Workout } from '../domain/Workout';

/** The server takes at most 200 per call; smaller batches keep each request short on a mobile network. */
export const UPLOAD_BATCH_SIZE = 100;
const TIMEOUT_MS = 20_000;
const SEND_JSON = {
  accept: 'application/json',
  'content-type': 'application/json',
};

interface ImportResultDto {
  created: number;
  skipped: number;
}

/** One workout as Cua API's import takes it (CuaApp-BE docs/activities.md). No location, no samples. */
export function toImportItem(w: Workout) {
  const durationSec = Math.max(0, w.durationSec);
  return {
    externalId: w.id,
    activityType: w.sportName,
    startedAt: new Date(w.startedAtMs).toISOString(),
    endedAt: new Date(Math.max(w.endedAtMs, w.startedAtMs)).toISOString(),
    durationSec,
    distanceMeters: w.distanceMeters ?? null,
    energyKcal: w.energyKcal ?? null,
    sourceName: w.source.slice(0, 120),
    metadata: { sportId: w.sportId, isManual: w.isManual },
  };
}

/**
 * `WorkoutUploader` over `POST /v1/activities/import`, batch after batch, through the authenticated `HttpClient`.
 * Bodies are never logged.
 */
@Injectable([HttpClient])
export class HttpWorkoutUploader implements WorkoutUploader {
  constructor(private readonly http: HttpClient) {}

  async upload(workouts: readonly Workout[]): Promise<UploadResult> {
    let created = 0;
    let skipped = 0;
    for (let i = 0; i < workouts.length; i += UPLOAD_BATCH_SIZE) {
      const items = workouts.slice(i, i + UPLOAD_BATCH_SIZE).map(toImportItem);
      try {
        const res = await this.http.post<ImportResultDto>(
          '/v1/activities/import',
          JSON.stringify({ source: 'apple_health', items }),
          { headers: SEND_JSON, timeoutMs: TIMEOUT_MS },
        );
        created += res.data.created;
        skipped += res.data.skipped;
      } catch (error) {
        throw toDomainError(error);
      }
    }
    return { created, skipped };
  }
}

function toDomainError(error: unknown): DomainError {
  if (
    error instanceof HttpError &&
    (error.code === 'NETWORK' || error.code === 'TIMEOUT')
  )
    return new DomainError('HEALTH_UPLOAD_NETWORK', 'Cannot reach the server.');
  return new DomainError(
    'HEALTH_UPLOAD_SERVER',
    'The server could not store the workouts.',
  );
}
