import { module } from 'inversiland';
import { SharedModule } from '@/shared/SharedModule';
import { ObserveNewWorkouts, RequestHealthAccess, SyncWorkouts } from './application/HealthCommands';
import { HealthRepositoryToken, SyncStateRepositoryToken } from './domain/ports';
import { AppleHealthRepository } from './infrastructure/AppleHealthRepository';
import { KeyValueSyncStateRepository } from './infrastructure/KeyValueSyncStateRepository';
import { HealthSyncController } from './presentation/HealthSyncController';

@module({
  imports: [SharedModule],
  providers: [
    { provide: HealthRepositoryToken, useClass: AppleHealthRepository },
    { provide: SyncStateRepositoryToken, useClass: KeyValueSyncStateRepository },
    RequestHealthAccess,
    SyncWorkouts,
    ObserveNewWorkouts,
    HealthSyncController,
  ],
  exports: [HealthSyncController],
})
export class HealthModule {}
