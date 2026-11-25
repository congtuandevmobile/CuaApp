import { Injectable } from '@magic-runtime/di';
import type { UseCase } from '@/shared/application/UseCase';
import { DomainError } from '@/shared/domain/DomainError';
import type { AccessoryId, Slot } from '../domain/accessories';
import { HeroRepository, ProgressSource } from '../domain/ports';
import { SaveHero, type HeroChange } from './SaveHero';

@Injectable([HeroRepository, ProgressSource, SaveHero])
export class EquipAccessory
  implements UseCase<{ slot: Slot; id: AccessoryId }, HeroChange>
{
  constructor(
    private readonly heroes: HeroRepository,
    private readonly progress: ProgressSource,
    private readonly saveHero: SaveHero,
  ) {}

  execute({ slot, id }: { slot: Slot; id: AccessoryId }): HeroChange {
    const hero = this.heroes.get();
    if (!hero)
      throw new DomainError('HERO_NOT_CREATED', 'Create your hero first.');
    const next = hero.equip(slot, id, this.progress.current());
    return this.saveHero.execute(next);
  }
}
