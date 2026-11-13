import { inject, injectable } from 'inversiland';
import type { UseCase } from '@/shared/application/UseCase';
import { DomainError } from '@/shared/domain/DomainError';
import type { Hero } from '../domain/Hero';
import { HeroRepositoryToken, type HeroRepository } from '../domain/ports';

/** Changes the skin tone; body, outfit and accessories are kept. */
@injectable()
export class ChangeSkinTone implements UseCase<number, Hero> {
  constructor(@inject(HeroRepositoryToken) private readonly heroes: HeroRepository) {}

  execute(skinTone: number): Hero {
    const hero = this.heroes.get();
    if (!hero) throw new DomainError('HERO_NOT_CREATED', 'Create your hero first.');
    const next = hero.withSkinTone(skinTone);
    this.heroes.save(next);
    return next;
  }
}
