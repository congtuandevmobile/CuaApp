import { inject, injectable } from 'inversiland';
import type { UseCase } from '@/shared/application/UseCase';
import { DomainError } from '@/shared/domain/DomainError';
import { IdGeneratorToken, type IdGenerator } from '@/shared/domain/ports';
import type { LocationPermission, Position, RecordingSnapshot, RecordingSport } from '../domain/Recording';
import { PositionPreviewToken, RecordingServiceToken, type PositionPreview, type RecordingService } from '../domain/ports';

@injectable()
export class RequestLocationPermission implements UseCase<void, Promise<LocationPermission>> {
  constructor(@inject(RecordingServiceToken) private readonly recorder: RecordingService) {}

  execute(): Promise<LocationPermission> {
    return this.recorder.requestPermission();
  }
}

/** Starts a recording. Refuses without the location permission: no half-started session is ever left behind. */
@injectable()
export class StartRecording implements UseCase<RecordingSport, Promise<RecordingSnapshot>> {
  constructor(
    @inject(RecordingServiceToken) private readonly recorder: RecordingService,
    @inject(IdGeneratorToken) private readonly ids: IdGenerator,
  ) {}

  async execute(sport: RecordingSport): Promise<RecordingSnapshot> {
    const permission = this.recorder.permission();
    if (permission !== 'granted') {
      throw new DomainError('RECORDING_PERMISSION', `Location permission: ${permission}`);
    }
    return this.recorder.start(sport, `rec-${this.ids.next()}`);
  }
}

@injectable()
export class PauseRecording implements UseCase<void, Promise<RecordingSnapshot>> {
  constructor(@inject(RecordingServiceToken) private readonly recorder: RecordingService) {}

  execute(): Promise<RecordingSnapshot> {
    return this.recorder.pause();
  }
}

@injectable()
export class ResumeRecording implements UseCase<void, Promise<RecordingSnapshot>> {
  constructor(@inject(RecordingServiceToken) private readonly recorder: RecordingService) {}

  execute(): Promise<RecordingSnapshot> {
    return this.recorder.resume();
  }
}

@injectable()
export class ObserveRecording implements UseCase<(s: RecordingSnapshot) => void, () => void> {
  constructor(@inject(RecordingServiceToken) private readonly recorder: RecordingService) {}

  execute(listener: (s: RecordingSnapshot) => void): () => void {
    return this.recorder.observe(listener);
  }
}

@injectable()
export class ObservePositions implements UseCase<(p: Position) => void, () => void> {
  constructor(@inject(RecordingServiceToken) private readonly recorder: RecordingService) {}

  execute(listener: (p: Position) => void): () => void {
    return this.recorder.observePositions(listener);
  }
}

/** Before Start: where the person is and how good the signal is. Only when location is already allowed. */
@injectable()
export class WatchPreviewPosition implements UseCase<(p: Position) => void, Promise<() => void>> {
  constructor(
    @inject(RecordingServiceToken) private readonly recorder: RecordingService,
    @inject(PositionPreviewToken) private readonly preview: PositionPreview,
  ) {}

  async execute(listener: (p: Position) => void): Promise<() => void> {
    if (this.recorder.permission() !== 'granted') return () => undefined;
    return this.preview.watch(listener);
  }
}
