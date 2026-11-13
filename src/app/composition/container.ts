import { Inversiland, getModuleContainer, type Newable } from 'inversiland';
import { AppModule } from './AppModule';
import { AuthController } from '../../features/auth/presentation/AuthController';
import { HealthSyncController } from '../../features/health/presentation/HealthSyncController';
import { HeroController } from '../../features/hero/presentation/HeroController';
import { LocaleController } from '../../features/localization/presentation/LocaleController';
import { ListActivities } from '../../features/tracking/application/ListActivities';
import { RecordController } from '../../features/tracking/presentation/RecordController';

const runtimeState = globalThis as typeof globalThis & {
  __cuaAppInversilandStarted?: boolean;
};

let started = runtimeState.__cuaAppInversilandStarted === true;

/** Boots the dependency graph once. Controllers are singletons: one state per screen family, shared by navigation. */
export function startContainer(): void {
  if (started) return;
  Inversiland.options.defaultScope = 'Singleton';
  Inversiland.options.logLevel = 'none';
  Inversiland.run(AppModule);
  started = true;
  runtimeState.__cuaAppInversilandStarted = true;
}

export function resolve<T>(type: Newable<T>): T {
  startContainer();
  return getModuleContainer(AppModule).get(type);
}

export const controllers = {
  auth: () => resolve(AuthController),
  hero: () => resolve(HeroController),
  record: () => resolve(RecordController),
  health: () => resolve(HealthSyncController),
  locale: () => resolve(LocaleController),
  listActivities: () => resolve(ListActivities),
};
