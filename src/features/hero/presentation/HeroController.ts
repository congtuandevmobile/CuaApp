import { inject, injectable } from 'inversiland';
import { action, makeObservable, observable, observableRef } from 'mobx';
import { DomainError } from '@/shared/domain/DomainError';
import { ChangeGender } from '../application/ChangeGender';
import { ChangeSkinTone } from '../application/ChangeSkinTone';
import { CreateHero, type CreateHeroInput } from '../application/CreateHero';
import { EquipAccessory } from '../application/EquipAccessory';
import { GetHero } from '../application/GetHero';
import { GetProgress } from '../application/GetProgress';
import type { AccessoryId, Slot } from '../domain/accessories';
import type { Gender, Hero, Progress } from '../domain/Hero';

/** State and commands of the hero screens: choose, 3D viewer (rotation), closet. */
@injectable()
export class HeroController {
  hero: Hero | undefined = undefined;
  /** The slot tab open in the closet. */
  slot: Slot = 'outfit';
  /** Turntable angle in degrees; the 3D scene reads it every frame. */
  rotationDeg = 0;
  errorCode: string | undefined = undefined;
  /** Lifetime distance: decides which accessories show as unlocked. */
  progress: Progress = { totalKm: 0 };

  constructor(
    @inject(GetHero) private readonly getHero: GetHero,
    @inject(CreateHero) private readonly createHero: CreateHero,
    @inject(ChangeGender) private readonly changeGender: ChangeGender,
    @inject(EquipAccessory) private readonly equipAccessory: EquipAccessory,
    @inject(ChangeSkinTone) private readonly changeSkinTone: ChangeSkinTone,
    @inject(GetProgress) private readonly getProgress: GetProgress,
  ) {
    makeObservable(this, {
      hero: observableRef,
      slot: observable,
      rotationDeg: observable,
      errorCode: observable,
      progress: observableRef,
      load: action,
      create: action,
      setGender: action,
      setSkinTone: action,
      equip: action,
      openSlot: action,
      rotateTo: action,
    });
  }

  load(): Hero | undefined {
    this.hero = this.getHero.execute();
    this.progress = this.getProgress.execute();
    return this.hero;
  }

  create(input: CreateHeroInput): boolean {
    return this.guard(() => {
      this.hero = this.createHero.execute(input);
    });
  }

  setGender(gender: Gender): boolean {
    return this.guard(() => {
      this.hero = this.changeGender.execute(gender);
    });
  }

  setSkinTone(skinTone: number): boolean {
    return this.guard(() => {
      this.hero = this.changeSkinTone.execute(skinTone);
    });
  }

  equip(slot: Slot, id: AccessoryId): boolean {
    return this.guard(() => {
      this.hero = this.equipAccessory.execute({ slot, id });
    });
  }

  openSlot(slot: Slot): void {
    this.slot = slot;
  }

  rotateTo(deg: number): void {
    this.rotationDeg = ((deg % 360) + 360) % 360;
  }

  private guard(run: () => void): boolean {
    this.errorCode = undefined;
    try {
      run();
      return true;
    } catch (error) {
      this.errorCode = error instanceof DomainError ? error.code : 'UNKNOWN';
      return false;
    }
  }
}
