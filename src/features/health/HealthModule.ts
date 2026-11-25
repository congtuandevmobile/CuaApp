import { Module, bind } from '@magic-runtime/di';
import { SharedModule } from '@/shared/SharedModule';
import { ObserveNewWorkouts, RequestHealthAccess, SyncWorkouts } from './application/HealthCommands';
import {
  HealthRepository,
  SyncStateRepository,
  WorkoutUploader,
} from './domain/ports';
import { AppleHealthRepository } from './infrastructure/AppleHealthRepository';
import { HttpWorkoutUploader } from './infrastructure/HttpWorkoutUploader';
import { KeyValueSyncStateRepository } from './infrastructure/KeyValueSyncStateRepository';
import { HealthSyncController } from './presentation/HealthSyncController';

/** Public surface for the app shell: `HealthSyncController`. */
@Module({
  imports: [SharedModule],
  providers: [
    bind(HealthRepository).toClass(AppleHealthRepository),
    bind(SyncStateRepository).toClass(KeyValueSyncStateRepository),
    bind(WorkoutUploader).toClass(HttpWorkoutUploader),
    RequestHealthAccess,
    SyncWorkouts,
    ObserveNewWorkouts,
    HealthSyncController,
  ],
})
export class HealthModule {}
