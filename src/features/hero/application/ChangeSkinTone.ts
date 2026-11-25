import { Injectable } from '@magic-runtime/di';
import type { UseCase } from '@/shared/application/UseCase';
import { DomainError } from '@/shared/domain/DomainError';
import { HeroRepository } from '../domain/ports';
import { SaveHero, type HeroChange } from './SaveHero';

/** Changes the skin tone; body, outfit and accessories are kept. */
@Injectable([HeroRepository, SaveHero])
export class ChangeSkinTone implements UseCase<number, HeroChange> {
  constructor(
    private readonly heroes: HeroRepository,
    private readonly saveHero: SaveHero,
  ) {}

  execute(skinTone: number): HeroChange {
    const hero = this.heroes.get();
    if (!hero)
      throw new DomainError('HERO_NOT_CREATED', 'Create your hero first.');
    const next = hero.withSkinTone(skinTone);
    return this.saveHero.execute(next);
  }
}
