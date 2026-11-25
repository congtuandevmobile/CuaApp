import { Module, bind } from '@magic-runtime/di';
import { SharedModule } from '@/shared/SharedModule';
import { LiveActivityModule } from '@/features/liveActivity/LiveActivityModule';
import { FinishRecording } from './application/FinishRecording';
import { ListActivities } from './application/ListActivities';
import {
  ObserveRecording,
  ObservePositions,
  PauseRecording,
  RequestLocationPermission,
  ResumeRecording,
  StartRecording,
  WatchPreviewPosition,
} from './application/RecordingCommands';
import {
  ActivityRepository,
  LifetimeDistance,
  PositionPreview,
  RecordingService,
} from './domain/ports';
import { GpsTrackingRecordingService } from './infrastructure/GpsTrackingRecordingService';
import { ExpoLocationPositionPreview } from './infrastructure/ExpoLocationPositionPreview';
import { KeyValueActivityRepository } from './infrastructure/KeyValueActivityRepository';
import { RecordController } from './presentation/RecordController';

/** Public surface for the app shell: `RecordController`, `ListActivities`. */
@Module({
  imports: [SharedModule, LiveActivityModule],
  providers: [
    bind(RecordingService).toClass(GpsTrackingRecordingService),
    bind(PositionPreview).toClass(ExpoLocationPositionPreview),
    // One repository instance answers to both ports (the container keys singletons by class).
    bind(ActivityRepository).toClass(KeyValueActivityRepository),
    bind(LifetimeDistance).toClass(KeyValueActivityRepository),
    RequestLocationPermission,
    StartRecording,
    PauseRecording,
    ResumeRecording,
    FinishRecording,
    ObserveRecording,
    ObservePositions,
    WatchPreviewPosition,
    ListActivities,
    RecordController,
  ],
})
export class TrackingModule {}
