import { Injectable } from '@magic-runtime/di';
import type { UseCase } from '@/shared/application/UseCase';
import { Hero, type Gender } from '../domain/Hero';
import { SaveHero, type HeroChange } from './SaveHero';

export interface CreateHeroInput {
  name: string;
  gender: Gender;
  skinTone: number;
}

/** The "Choose your hero" step: male or female, skin tone, name. */
@Injectable([SaveHero])
export class CreateHero implements UseCase<CreateHeroInput, HeroChange> {
  constructor(private readonly saveHero: SaveHero) {}

  execute(input: CreateHeroInput): HeroChange {
    return this.saveHero.execute(Hero.create(input));
  }
}
