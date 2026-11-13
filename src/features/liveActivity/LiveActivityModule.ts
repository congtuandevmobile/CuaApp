import { module } from 'inversiland';
import { EndLiveActivity, StartLiveActivity, UpdateLiveActivity } from './application/LiveActivityCommands';
import { LiveActivityPortToken } from './domain/ports';
import { SdkLiveActivityPort } from './infrastructure/SdkLiveActivityPort';

@module({
  providers: [{ provide: LiveActivityPortToken, useClass: SdkLiveActivityPort }, StartLiveActivity, UpdateLiveActivity, EndLiveActivity],
  exports: [StartLiveActivity, UpdateLiveActivity, EndLiveActivity],
})
export class LiveActivityModule {}
