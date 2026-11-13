import { inject, injectable } from 'inversiland';
import type { UseCase } from '@/shared/application/UseCase';
import { Hero, type Gender } from '../domain/Hero';
import { HeroRepositoryToken, type HeroRepository } from '../domain/ports';

export interface CreateHeroInput {
  name: string;
  gender: Gender;
  skinTone: number;
}

/** The "Choose your hero" step: male or female, skin tone, name. */
@injectable()
export class CreateHero implements UseCase<CreateHeroInput, Hero> {
  constructor(@inject(HeroRepositoryToken) private readonly heroes: HeroRepository) {}

  execute(input: CreateHeroInput): Hero {
    const hero = Hero.create(input);
    this.heroes.save(hero);
    return hero;
  }
}
