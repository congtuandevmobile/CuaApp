import { module } from 'inversiland';
import { AuthModule } from '../../features/auth/AuthModule';
import { HealthModule } from '../../features/health/HealthModule';
import { HeroModule } from '../../features/hero/HeroModule';
import { LiveActivityModule } from '../../features/liveActivity/LiveActivityModule';
import { LocalizationModule } from '../../features/localization/LocalizationModule';
import { TrackingModule } from '../../features/tracking/TrackingModule';

/** The composition root: every bounded context is wired here and nowhere else. */
@module({
  imports: [AuthModule, HeroModule, TrackingModule, HealthModule, LiveActivityModule, LocalizationModule],
})
export class AppModule {}
