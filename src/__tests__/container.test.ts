import { bind } from '@magic-runtime/di';
import { AuthController } from '@/features/auth/presentation/AuthController';
import { HealthSyncController } from '@/features/health/presentation/HealthSyncController';
import { HeroController } from '@/features/hero/presentation/HeroController';
import { LocaleController } from '@/features/localization/presentation/LocaleController';
import { ListActivities } from '@/features/tracking/application/ListActivities';
import { ActivityRepository, LifetimeDistance } from '@/features/tracking/domain/ports';
import { RecordController } from '@/features/tracking/presentation/RecordController';
import { KeyValueStore } from '@/shared/domain/ports';
import { controllers, createContainer, resolve, startContainer } from '../app/composition/container';

/** The composition root builds under Babel (legacy decorators, no metadata) and gives one controller per kind. */
describe('dependency container', () => {
  it('validates the whole graph when it is created (no missing provider, cycle or ambiguous port)', () => {
    expect(() => createContainer()).not.toThrow();
  });

  it('resolves every controller with its whole dependency tree', () => {
    expect(resolve(AuthController)).toBeInstanceOf(AuthController);
    expect(resolve(HeroController)).toBeInstanceOf(HeroController);
    expect(resolve(RecordController)).toBeInstanceOf(RecordController);
    expect(resolve(HealthSyncController)).toBeInstanceOf(HealthSyncController);
    expect(resolve(LocaleController)).toBeInstanceOf(LocaleController);
    expect(resolve(ListActivities)).toBeInstanceOf(ListActivities);
  });

  it('shares one instance of each controller (the state follows the user across screens)', () => {
    expect(startContainer()).toBe(startContainer());
    expect(controllers.hero()).toBe(controllers.hero());
    expect(controllers.record()).toBe(controllers.record());
  });

  it('answers both tracking ports with one repository instance', () => {
    const container = createContainer();
    expect(container.get(ActivityRepository)).toBe(container.get(LifetimeDistance));
  });

  it('lets a test replace an adapter for everything built on it', () => {
    const values = new Map<string, string>();
    const fakeStore: KeyValueStore = {
      getString: (key) => values.get(key),
      setString: (key, value) => {
        values.set(key, value);
      },
      remove: (key) => {
        values.delete(key);
      },
    };
    const container = createContainer([bind(KeyValueStore).toValue(fakeStore)]);
    container.get(LifetimeDistance).addMeters(1500);
    expect(values.get('progress.totalKm')).toBe('1.5');
  });
});
