import { module } from 'inversiland';
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
import { ActivityRepositoryToken, LifetimeDistanceToken, PositionPreviewToken, RecordingServiceToken } from './domain/ports';
import { GpsTrackingRecordingService } from './infrastructure/GpsTrackingRecordingService';
import { ExpoLocationPositionPreview } from './infrastructure/ExpoLocationPositionPreview';
import { KeyValueActivityRepository } from './infrastructure/KeyValueActivityRepository';
import { RecordController } from './presentation/RecordController';

@module({
  imports: [SharedModule, LiveActivityModule],
  providers: [
    { provide: RecordingServiceToken, useClass: GpsTrackingRecordingService },
    { provide: PositionPreviewToken, useClass: ExpoLocationPositionPreview },
    { provide: ActivityRepositoryToken, useClass: KeyValueActivityRepository },
    { provide: LifetimeDistanceToken, useClass: KeyValueActivityRepository }, // stateless over the store: two instances are fine
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
  exports: [RecordController, ListActivities],
})
export class TrackingModule {}
