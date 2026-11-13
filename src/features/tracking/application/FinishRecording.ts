import { inject, injectable } from 'inversiland';
import type { UseCase } from '@/shared/application/UseCase';
import { DomainError } from '@/shared/domain/DomainError';
import { IdGeneratorToken, type IdGenerator } from '@/shared/domain/ports';
import type { Activity } from '../domain/Activity';
import type { RecordingSport } from '../domain/Recording';
import {
  ActivityRepositoryToken,
  LifetimeDistanceToken,
  RecordingServiceToken,
  type ActivityRepository,
  type LifetimeDistance,
  type RecordingService,
} from '../domain/ports';

export interface FinishRecordingInput {
  sport: RecordingSport;
  startedAtMs: number;
}

/**
 * Ends the recording and saves it. The save happens only after native says the result is FINAL and durable; a
 * recording that could not be made durable is reported, not silently stored.
 */
@injectable()
export class FinishRecording implements UseCase<FinishRecordingInput, Promise<Activity>> {
  constructor(
    @inject(RecordingServiceToken) private readonly recorder: RecordingService,
    @inject(ActivityRepositoryToken) private readonly activities: ActivityRepository,
    @inject(LifetimeDistanceToken) private readonly lifetime: LifetimeDistance,
    @inject(IdGeneratorToken) private readonly ids: IdGenerator,
  ) {}

  async execute({ sport, startedAtMs }: FinishRecordingInput): Promise<Activity> {
    const final = await this.recorder.finish();
    if (final.status !== 'finished') throw new DomainError('RECORDING_NOT_FINAL', 'The recording did not finish.');
    if (!final.durable) throw new DomainError('RECORDING_NOT_DURABLE', 'The recording could not be written to disk.');
    const activity: Activity = {
      id: `act-${this.ids.next()}`,
      sportCode: sport.code,
      sportName: sport.name,
      startedAtMs,
      durationMs: final.activeTimeMs,
      distanceMeters: final.totalMeters,
      source: 'cua',
    };
    this.activities.add(activity);
    this.lifetime.addMeters(final.totalMeters);
    await this.recorder.clearPersisted();
    return activity;
  }
}
