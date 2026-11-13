import { inject, injectable } from 'inversiland';
import type { UseCase } from '@/shared/application/UseCase';
import type { Hero } from '../domain/Hero';
import { HeroRepositoryToken, type HeroRepository } from '../domain/ports';

@injectable()
export class GetHero implements UseCase<void, Hero | undefined> {
  constructor(@inject(HeroRepositoryToken) private readonly heroes: HeroRepository) {}

  execute(): Hero | undefined {
    return this.heroes.get();
  }
}
