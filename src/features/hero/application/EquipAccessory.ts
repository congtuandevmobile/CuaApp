import { inject, injectable } from 'inversiland';
import type { UseCase } from '@/shared/application/UseCase';
import { DomainError } from '@/shared/domain/DomainError';
import type { AccessoryId, Slot } from '../domain/accessories';
import type { Hero } from '../domain/Hero';
import { HeroRepositoryToken, ProgressSourceToken, type HeroRepository, type ProgressSource } from '../domain/ports';

@injectable()
export class EquipAccessory implements UseCase<{ slot: Slot; id: AccessoryId }, Hero> {
  constructor(
    @inject(HeroRepositoryToken) private readonly heroes: HeroRepository,
    @inject(ProgressSourceToken) private readonly progress: ProgressSource,
  ) {}

  execute({ slot, id }: { slot: Slot; id: AccessoryId }): Hero {
    const hero = this.heroes.get();
    if (!hero) throw new DomainError('HERO_NOT_CREATED', 'Create your hero first.');
    const next = hero.equip(slot, id, this.progress.current());
    this.heroes.save(next);
    return next;
  }
}
