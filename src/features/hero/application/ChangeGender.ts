import { Injectable } from '@magic-runtime/di';
import type { UseCase } from '@/shared/application/UseCase';
import { DomainError } from '@/shared/domain/DomainError';
import type { Gender, Hero } from '../domain/Hero';
import { HeroRepository } from '../domain/ports';

/** Changes the 3D body; skin tone is kept, each worn item becomes the same-position item of the other body. */
@Injectable([HeroRepository])
export class ChangeGender implements UseCase<Gender, Hero> {
  constructor(private readonly heroes: HeroRepository) {}

  execute(gender: Gender): Hero {
    const hero = this.heroes.get();
    if (!hero)
      throw new DomainError('HERO_NOT_CREATED', 'Create your hero first.');
    const next = hero.withGender(gender);
    this.heroes.save(next);
    return next;
  }
}
