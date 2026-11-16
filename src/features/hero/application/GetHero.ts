import { Injectable } from '@magic-runtime/di';
import type { UseCase } from '@/shared/application/UseCase';
import type { Hero } from '../domain/Hero';
import { HeroRepository } from '../domain/ports';

@Injectable([HeroRepository])
export class GetHero implements UseCase<void, Hero | undefined> {
  constructor(private readonly heroes: HeroRepository) {}

  execute(): Hero | undefined {
    return this.heroes.get();
  }
}
