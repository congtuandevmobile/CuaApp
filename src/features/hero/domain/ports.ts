import type { Hero, Progress } from './Hero';
import { token } from '@magic-runtime/di';

/** The hero kept on this device: a cache of the server's copy (first frame, offline) and a guest's only copy. */
export interface HeroRepository {
  get(): Hero | undefined;
  save(hero: Hero): void;
  clear(): void;
}

/**
 * The hero on Cua API, the source of truth for a signed-in user. Failures are DomainErrors: `HERO_NETWORK` (offline,
 * timeout) or `HERO_SERVER`.
 */
export interface HeroGateway {
  /** Undefined when this account has no hero yet. */
  fetch(): Promise<Hero | undefined>;
  /** Creates or replaces the whole hero. */
  save(hero: Hero): Promise<void>;
}

/** Lifetime progress comes from recorded activities: the hero context only asks for the number. */
export interface ProgressSource {
  current(): Progress;
}

export const HeroRepository = token<HeroRepository>('hero.HeroRepository');
export const HeroGateway = token<HeroGateway>('hero.HeroGateway');
export const ProgressSource = token<ProgressSource>('hero.ProgressSource');
