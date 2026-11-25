import { Injectable } from '@magic-runtime/di';
import {
  action,
  computed,
  makeObservable,
  observable,
  observableRef,
  runInAction,
} from 'mobx';
import { DomainError } from '@/shared/domain/DomainError';
import { ChangeGender } from '../application/ChangeGender';
import { ChangeSkinTone } from '../application/ChangeSkinTone';
import { CreateHero, type CreateHeroInput } from '../application/CreateHero';
import type { HeroChange } from '../application/SaveHero';
import { EquipAccessory } from '../application/EquipAccessory';
import { GetHero } from '../application/GetHero';
import { GetProgress } from '../application/GetProgress';
import { SyncHero, type SyncHeroInput } from '../application/SyncHero';
import {
  accessoriesOf,
  NONE,
  type Accessory,
  type AccessoryId,
  type Slot,
} from '../domain/accessories';
import {
  type Equipment,
  type Gender,
  type Hero,
  type Progress,
} from '../domain/Hero';

/** The closet stage shows the selected item alone (`item`) or the hero wearing it (`tryOn`). */
export type ClosetView = 'item' | 'tryOn';

/** State and commands of the hero screens: choose, 3D viewer, closet (browse, preview, try on, wear). */
@Injectable([
  GetHero,
  CreateHero,
  ChangeGender,
  EquipAccessory,
  ChangeSkinTone,
  GetProgress,
  SyncHero,
])
export class HeroController {
  hero: Hero | undefined = undefined;
  slot: Slot = 'top';
  selected: AccessoryId | undefined = undefined;
  view: ClosetView = 'tryOn';
  errorCode: string | undefined = undefined;
  progress: Progress = { totalKm: 0 };
  saving = false;

  constructor(
    private readonly getHero: GetHero,
    private readonly createHero: CreateHero,
    private readonly changeGender: ChangeGender,
    private readonly equipAccessory: EquipAccessory,
    private readonly changeSkinTone: ChangeSkinTone,
    private readonly getProgress: GetProgress,
    private readonly syncHero: SyncHero,
  ) {
    makeObservable(this, {
      hero: observableRef,
      slot: observable,
      selected: observable,
      view: observable,
      errorCode: observable,
      progress: observableRef,
      saving: observable,
      items: computed,
      preview: computed,
      shownId: computed,
      canShowItem: computed,
      isShownWorn: computed,
      focusSlot: computed,
      showingItem: computed,
      load: action,
      openSlot: action,
      select: action,
      showItem: action,
      tryOn: action,
      resetCloset: action,
      setGender: action,
      setSkinTone: action,
      equip: action,
      wear: action,
    });
  }

  get items(): readonly Accessory[] {
    return accessoriesOf(this.slot, this.hero?.gender ?? 'male');
  }

  get preview(): Equipment | undefined {
    const hero = this.hero;
    if (!hero || this.selected === undefined) return hero?.equipment;
    try {
      return hero.equip(this.slot, this.selected, this.progress).equipment;
    } catch (error) {
      if (error instanceof DomainError) return hero.equipment; // a locked/unknown pick previews the saved look
      throw error;
    }
  }

  get shownId(): AccessoryId | undefined {
    return this.selected ?? this.hero?.equipment[this.slot];
  }

  get canShowItem(): boolean {
    return this.shownId !== undefined && this.shownId !== NONE;
  }

  get isShownWorn(): boolean {
    return this.shownId === this.hero?.equipment[this.slot];
  }

  get showingItem(): boolean {
    return this.view === 'item' && this.canShowItem;
  }

  get focusSlot(): Slot | undefined {
    return this.showingItem ? this.slot : undefined;
  }

  load(): Hero | undefined {
    this.hero = this.getHero.execute();
    this.progress = this.getProgress.execute();
    return this.hero;
  }

  async sync(mode: SyncHeroInput['mode']): Promise<Hero | undefined> {
    try {
      const hero = await this.syncHero.execute({ mode });
      runInAction(() => {
        this.hero = hero;
        this.progress = this.getProgress.execute();
      });
      return hero;
    } catch (error) {
      runInAction(() => {
        this.errorCode = error instanceof DomainError ? error.code : 'UNKNOWN';
      });
      return this.hero;
    }
  }

  async create(input: CreateHeroInput): Promise<boolean> {
    if (this.saving) return false;
    let change: HeroChange;
    try {
      change = this.createHero.execute(input);
    } catch (error) {
      runInAction(() => {
        this.errorCode = codeOf(error);
      });
      return false;
    }
    runInAction(() => {
      this.errorCode = undefined;
      this.saving = true;
    });
    try {
      await change.saved;
      runInAction(() => {
        this.hero = change.hero;
      });
      return true;
    } catch (error) {
      runInAction(() => {
        this.errorCode = codeOf(error);
      });
      return false;
    } finally {
      runInAction(() => {
        this.saving = false;
      });
    }
  }

  setGender(gender: Gender): boolean {
    return this.change(
      () => this.changeGender.execute(gender),
      () => {
        this.selected = undefined; // the other body has its own items
        this.view = 'tryOn';
      },
    );
  }

  setSkinTone(skinTone: number): boolean {
    return this.change(() => this.changeSkinTone.execute(skinTone));
  }

  equip(slot: Slot, id: AccessoryId): boolean {
    return this.change(() => this.equipAccessory.execute({ slot, id }));
  }

  openSlot(slot: Slot): void {
    this.slot = slot;
    this.selected = undefined;
    this.view = 'tryOn';
  }

  /** Picks an item: the stage shows it alone, ready to turn (`none` shows the hero without it). */
  select(id: AccessoryId): void {
    this.selected = id;
    this.view = id === NONE ? 'tryOn' : 'item';
  }

  showItem(): void {
    if (this.canShowItem) this.view = 'item';
  }

  tryOn(): void {
    this.view = 'tryOn';
  }

  wear(): boolean {
    if (this.selected === undefined) return true;
    const ok = this.equip(this.slot, this.selected);
    if (ok) this.view = 'tryOn';
    return ok;
  }

  resetCloset(): void {
    this.selected = undefined;
    this.view = 'tryOn';
  }

  private change(run: () => HeroChange, then?: () => void): boolean {
    this.errorCode = undefined;
    let change: HeroChange;
    try {
      change = run();
    } catch (error) {
      this.errorCode = codeOf(error);
      return false;
    }
    this.hero = change.hero;
    then?.();
    change.saved.catch(error =>
      runInAction(() => {
        this.hero = this.getHero.execute(); // the device copy was rolled back to the server's
        this.errorCode = codeOf(error);
      }),
    );
    return true;
  }
}

function codeOf(error: unknown): string {
  return error instanceof DomainError ? error.code : 'UNKNOWN';
}
