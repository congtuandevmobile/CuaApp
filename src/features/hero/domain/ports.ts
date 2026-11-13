import type { Hero, Progress } from './Hero';

export interface HeroRepository {
  get(): Hero | undefined;
  save(hero: Hero): void;
}

/** Lifetime progress comes from recorded activities: the hero context only asks for the number. */
export interface ProgressSource {
  current(): Progress;
}

export const HeroRepositoryToken = Symbol.for('hero.HeroRepository');
export const ProgressSourceToken = Symbol.for('hero.ProgressSource');
