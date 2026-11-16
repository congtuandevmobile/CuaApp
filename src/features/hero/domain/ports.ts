import type { Hero, Progress } from './Hero';
import { token } from '@magic-runtime/di';

export interface HeroRepository {
  get(): Hero | undefined;
  save(hero: Hero): void;
}

/** Lifetime progress comes from recorded activities: the hero context only asks for the number. */
export interface ProgressSource {
  current(): Progress;
}

export const HeroRepository = token<HeroRepository>('hero.HeroRepository');
export const ProgressSource = token<ProgressSource>('hero.ProgressSource');
