import { Injectable } from '@magic-runtime/di';
import type { UseCase } from '@/shared/application/UseCase';
import { DomainError } from '@/shared/domain/DomainError';
import type { Gender } from '../domain/Hero';
import { HeroRepository } from '../domain/ports';
import { SaveHero, type HeroChange } from './SaveHero';

/** Changes the 3D body; skin tone is kept, each worn item becomes the same-position item of the other body. */
@Injectable([HeroRepository, SaveHero])
export class ChangeGender implements UseCase<Gender, HeroChange> {
  constructor(
    private readonly heroes: HeroRepository,
    private readonly saveHero: SaveHero,
  ) {}

  execute(gender: Gender): HeroChange {
    const hero = this.heroes.get();
    if (!hero)
      throw new DomainError('HERO_NOT_CREATED', 'Create your hero first.');
    const next = hero.withGender(gender);
    return this.saveHero.execute(next);
  }
}
