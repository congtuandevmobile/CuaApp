import { inject, injectable } from 'inversiland';
import type { UseCase } from '@/shared/application/UseCase';
import { DomainError } from '@/shared/domain/DomainError';
import type { Gender, Hero } from '../domain/Hero';
import { HeroRepositoryToken, type HeroRepository } from '../domain/ports';

/** Changes the 3D body; equipment and skin tone are kept (every accessory fits both models). */
@injectable()
export class ChangeGender implements UseCase<Gender, Hero> {
  constructor(@inject(HeroRepositoryToken) private readonly heroes: HeroRepository) {}

  execute(gender: Gender): Hero {
    const hero = this.heroes.get();
    if (!hero) throw new DomainError('HERO_NOT_CREATED', 'Create your hero first.');
    const next = hero.withGender(gender);
    this.heroes.save(next);
    return next;
  }
}
