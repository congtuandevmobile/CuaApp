import { Module, bind } from '@magic-runtime/di';
import { SharedModule } from '@/shared/SharedModule';
import { ObserveNewWorkouts, RequestHealthAccess, SyncWorkouts } from './application/HealthCommands';
import { HealthRepository, SyncStateRepository } from './domain/ports';
import { AppleHealthRepository } from './infrastructure/AppleHealthRepository';
import { KeyValueSyncStateRepository } from './infrastructure/KeyValueSyncStateRepository';
import { HealthSyncController } from './presentation/HealthSyncController';

/** Public surface for the app shell: `HealthSyncController`. */
@Module({
  imports: [SharedModule],
  providers: [
    bind(HealthRepository).toClass(AppleHealthRepository),
    bind(SyncStateRepository).toClass(KeyValueSyncStateRepository),
    RequestHealthAccess,
    SyncWorkouts,
    ObserveNewWorkouts,
    HealthSyncController,
  ],
})
export class HealthModule {}
