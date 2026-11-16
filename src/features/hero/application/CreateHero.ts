import { Injectable } from '@magic-runtime/di';
import type { UseCase } from '@/shared/application/UseCase';
import { Hero, type Gender } from '../domain/Hero';
import { HeroRepository } from '../domain/ports';

export interface CreateHeroInput {
  name: string;
  gender: Gender;
  skinTone: number;
}

/** The "Choose your hero" step: male or female, skin tone, name. */
@Injectable([HeroRepository])
export class CreateHero implements UseCase<CreateHeroInput, Hero> {
  constructor(private readonly heroes: HeroRepository) {}

  execute(input: CreateHeroInput): Hero {
    const hero = Hero.create(input);
    this.heroes.save(hero);
    return hero;
  }
}
