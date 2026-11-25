import { Injectable } from '@magic-runtime/di';
import type { UseCase } from '@/shared/application/UseCase';
import { DomainError } from '@/shared/domain/DomainError';
import { IdGenerator } from '@/shared/domain/ports';
import type {
  LocationPermission,
  Position,
  RecordingSnapshot,
  RecordingSport,
} from '../domain/Recording';
import { PositionPreview, RecordingService } from '../domain/ports';

@Injectable([RecordingService])
export class RequestLocationPermission
  implements UseCase<void, Promise<LocationPermission>>
{
  constructor(private readonly recorder: RecordingService) {}

  execute(): Promise<LocationPermission> {
    return this.recorder.requestPermission();
  }
}

/** Starts a recording. Refuses without the location permission: no half-started session is ever left behind. */
@Injectable([RecordingService, IdGenerator])
export class StartRecording
  implements UseCase<RecordingSport, Promise<RecordingSnapshot>>
{
  constructor(
    private readonly recorder: RecordingService,
    private readonly ids: IdGenerator,
  ) {}

  async execute(sport: RecordingSport): Promise<RecordingSnapshot> {
    const permission = this.recorder.permission();
    if (permission !== 'granted') {
      throw new DomainError(
        'RECORDING_PERMISSION',
        `Location permission: ${permission}`,
      );
    }
    return this.recorder.start(sport, `rec-${this.ids.next()}`);
  }
}

@Injectable([RecordingService])
export class PauseRecording
  implements UseCase<void, Promise<RecordingSnapshot>>
{
  constructor(private readonly recorder: RecordingService) {}

  execute(): Promise<RecordingSnapshot> {
    return this.recorder.pause();
  }
}

@Injectable([RecordingService])
export class ResumeRecording
  implements UseCase<void, Promise<RecordingSnapshot>>
{
  constructor(private readonly recorder: RecordingService) {}

  execute(): Promise<RecordingSnapshot> {
    return this.recorder.resume();
  }
}

@Injectable([RecordingService])
export class ObserveRecording
  implements UseCase<(s: RecordingSnapshot) => void, () => void>
{
  constructor(private readonly recorder: RecordingService) {}

  execute(listener: (s: RecordingSnapshot) => void): () => void {
    return this.recorder.observe(listener);
  }
}

@Injectable([RecordingService])
export class ObservePositions
  implements UseCase<(p: Position) => void, () => void>
{
  constructor(private readonly recorder: RecordingService) {}

  execute(listener: (p: Position) => void): () => void {
    return this.recorder.observePositions(listener);
  }
}

/** Before Start: where the person is and how good the signal is. Only when location is already allowed. */
@Injectable([RecordingService, PositionPreview])
export class WatchPreviewPosition
  implements UseCase<(p: Position) => void, Promise<() => void>>
{
  constructor(
    private readonly recorder: RecordingService,
    private readonly preview: PositionPreview,
  ) {}

  async execute(listener: (p: Position) => void): Promise<() => void> {
    if (this.recorder.permission() !== 'granted') return () => undefined;
    return this.preview.watch(listener);
  }
}
