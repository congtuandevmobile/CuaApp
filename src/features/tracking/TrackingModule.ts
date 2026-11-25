import { Module, bind } from '@magic-runtime/di';
import { SharedModule } from '@/shared/SharedModule';
import { LiveActivityModule } from '@/features/liveActivity/LiveActivityModule';
import { FinishRecording } from './application/FinishRecording';
import {
  GetActivity,
  ListActivities,
  ListPendingActivities,
  SyncPendingActivities,
} from './application/ActivityHistory';
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
  PendingActivityQueue,
  PositionPreview,
  RecordingService,
} from './domain/ports';
import { GpsTrackingRecordingService } from './infrastructure/GpsTrackingRecordingService';
import { ExpoLocationPositionPreview } from './infrastructure/ExpoLocationPositionPreview';
import { HttpActivityRepository } from './infrastructure/HttpActivityRepository';
import { KeyValueLifetimeDistance } from './infrastructure/KeyValueLifetimeDistance';
import { KeyValuePendingActivityQueue } from './infrastructure/KeyValuePendingActivityQueue';
import { ActivityFeedController } from './presentation/ActivityFeedController';
import { RecordController } from './presentation/RecordController';

/** Public surface for the app shell: `RecordController`, `ActivityFeedController`. */
@Module({
  imports: [SharedModule, LiveActivityModule],
  providers: [
    bind(RecordingService).toClass(GpsTrackingRecordingService),
    bind(PositionPreview).toClass(ExpoLocationPositionPreview),
    // The history lives on Cua API; the device keeps only what is not uploaded yet.
    bind(ActivityRepository).toClass(HttpActivityRepository),
    bind(PendingActivityQueue).toClass(KeyValuePendingActivityQueue),
    bind(LifetimeDistance).toClass(KeyValueLifetimeDistance),
    RequestLocationPermission,
    StartRecording,
    PauseRecording,
    ResumeRecording,
    FinishRecording,
    ObserveRecording,
    ObservePositions,
    WatchPreviewPosition,
    SyncPendingActivities,
    ListPendingActivities,
    ListActivities,
    GetActivity,
    RecordController,
    ActivityFeedController,
  ],
})
export class TrackingModule {}
