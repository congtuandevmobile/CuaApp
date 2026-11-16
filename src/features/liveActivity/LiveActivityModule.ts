import { Module, bind } from '@magic-runtime/di';
import { EndLiveActivity, StartLiveActivity, UpdateLiveActivity } from './application/LiveActivityCommands';
import { LiveActivityPort } from './domain/ports';
import { SdkLiveActivityPort } from './infrastructure/SdkLiveActivityPort';

/** Public surface for other contexts: the `Start/Update/EndLiveActivity` use cases. */
@Module({
  providers: [bind(LiveActivityPort).toClass(SdkLiveActivityPort), StartLiveActivity, UpdateLiveActivity, EndLiveActivity],
})
export class LiveActivityModule {}
