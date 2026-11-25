import { Injectable } from '@magic-runtime/di';
import type { UseCase } from '@/shared/application/UseCase';
import { DomainError } from '@/shared/domain/DomainError';
import { IdGenerator } from '@/shared/domain/ports';
import {
  pendingActivity,
  type Activity,
  type RecordedActivity,
} from '../domain/Activity';
import type { RecordingSport } from '../domain/Recording';
import {
  LifetimeDistance,
  PendingActivityQueue,
  RecordingService,
} from '../domain/ports';
import { SyncPendingActivities } from './ActivityHistory';

export interface FinishRecordingInput {
  sport: RecordingSport;
  startedAtMs: number;
}

/**
 * Ends the recording and saves it. The save happens only after native says the result is FINAL and durable; a
 * recording that could not be made durable is reported, not silently stored. The result goes to the on-device queue
 * first (never lost), then the upload starts in the background: finishing never waits for the network.
 */
@Injectable([
  RecordingService,
  PendingActivityQueue,
  SyncPendingActivities,
  LifetimeDistance,
  IdGenerator,
])
export class FinishRecording
  implements UseCase<FinishRecordingInput, Promise<Activity>>
{
  constructor(
    private readonly recorder: RecordingService,
    private readonly pending: PendingActivityQueue,
    private readonly syncPending: SyncPendingActivities,
    private readonly lifetime: LifetimeDistance,
    private readonly ids: IdGenerator,
  ) {}

  async execute({
    sport,
    startedAtMs,
  }: FinishRecordingInput): Promise<Activity> {
    const final = await this.recorder.finish();
    if (final.status !== 'finished')
      throw new DomainError(
        'RECORDING_NOT_FINAL',
        'The recording did not finish.',
      );
    if (!final.durable)
      throw new DomainError(
        'RECORDING_NOT_DURABLE',
        'The recording could not be written to disk.',
      );
    const recorded: RecordedActivity = {
      // The idempotency key: made once here, reused by every upload retry.
      clientId: `act-${this.ids.next()}`,
      sportCode: sport.code,
      startedAtMs,
      endedAtMs: startedAtMs + Math.max(final.elapsedTimeMs, final.activeTimeMs),
      durationMs: final.activeTimeMs,
      distanceMeters: final.totalMeters,
    };
    this.pending.add(recorded);
    this.lifetime.addMeters(final.totalMeters);
    await this.recorder.clearPersisted();
    void this.syncPending.execute();
    return pendingActivity(recorded);
  }
}
