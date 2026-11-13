import { Inversiland } from 'inversiland';
import { AuthController } from '@/features/auth/presentation/AuthController';
import { HealthSyncController } from '@/features/health/presentation/HealthSyncController';
import { HeroController } from '@/features/hero/presentation/HeroController';
import { RecordController } from '@/features/tracking/presentation/RecordController';
import { controllers, resolve, startContainer } from '../app/composition/container';

/** The composition root builds under Babel (decorators + metadata) and gives one controller per kind. */
describe('dependency container', () => {
  beforeAll(() => startContainer());
  afterAll(() => Inversiland.reset());

  it('resolves every controller with its whole dependency tree', () => {
    expect(resolve(AuthController)).toBeInstanceOf(AuthController);
    expect(resolve(HeroController)).toBeInstanceOf(HeroController);
    expect(resolve(RecordController)).toBeInstanceOf(RecordController);
    expect(resolve(HealthSyncController)).toBeInstanceOf(HealthSyncController);
  });

  it('shares one instance of each controller (the state follows the user across screens)', () => {
    expect(controllers.hero()).toBe(controllers.hero());
    expect(controllers.record()).toBe(controllers.record());
  });
});
