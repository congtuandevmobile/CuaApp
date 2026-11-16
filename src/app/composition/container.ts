import { Container, type ContainerOptions, type ExplicitProvider, type Token, type TokenValue } from '@magic-runtime/di';
import { AppModule } from './AppModule';
import { AuthController } from '../../features/auth/presentation/AuthController';
import { HealthSyncController } from '../../features/health/presentation/HealthSyncController';
import { HeroController } from '../../features/hero/presentation/HeroController';
import { LocaleController } from '../../features/localization/presentation/LocaleController';
import { ListActivities } from '../../features/tracking/application/ListActivities';
import { RecordController } from '../../features/tracking/presentation/RecordController';

/** What the app passes to `Container.create`. Building it constructs nothing (every edge is a class or a factory). */
export const containerOptions: ContainerOptions = { modules: [AppModule] };

/**
 * A container over the whole app graph. `create` validates every edge (missing provider, cycle, ambiguous port) before
 * it returns and constructs nothing; values are built on first use. Tests pass `overrides` to swap adapters for fakes.
 */
export function createContainer(overrides: readonly ExplicitProvider[] = []): Container {
  return Container.create({ ...containerOptions, overrides });
}

let container: Container | undefined;

/** Boots the dependency graph once. Controllers are singletons: one state per screen family, shared by navigation. */
export function startContainer(): Container {
  container ??= createContainer();
  return container;
}

export function resolve<K extends Token>(token: K): TokenValue<K> {
  return startContainer().get(token);
}

export const controllers = {
  auth: () => resolve(AuthController),
  hero: () => resolve(HeroController),
  record: () => resolve(RecordController),
  health: () => resolve(HealthSyncController),
  locale: () => resolve(LocaleController),
  listActivities: () => resolve(ListActivities),
};
