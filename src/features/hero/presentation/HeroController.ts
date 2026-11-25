import { Injectable } from '@magic-runtime/di';
import { action, computed, makeObservable, observable, observableRef } from 'mobx';
import { DomainError } from '@/shared/domain/DomainError';
import { ChangeGender } from '../application/ChangeGender';
import { ChangeSkinTone } from '../application/ChangeSkinTone';
import { CreateHero, type CreateHeroInput } from '../application/CreateHero';
import { EquipAccessory } from '../application/EquipAccessory';
import { GetHero } from '../application/GetHero';
import { GetProgress } from '../application/GetProgress';
import { accessoriesOf, NONE, type Accessory, type AccessoryId, type Slot } from '../domain/accessories';
import { isUnlocked, type Equipment, type Gender, type Hero, type Progress } from '../domain/Hero';

/** The watch the hero screen's quick chip toggles. */
export const QUICK_WATCH: AccessoryId = 'apple';

/** The closet stage shows the selected item alone (`item`) or the hero wearing it (`tryOn`). */
export type ClosetView = 'item' | 'tryOn';

/** State and commands of the hero screens: choose, 3D viewer, closet (browse, preview, try on, wear). */
@Injectable([GetHero, CreateHero, ChangeGender, EquipAccessory, ChangeSkinTone, GetProgress])
export class HeroController {
  hero: Hero | undefined = undefined;
  /** The slot tab open in the closet. */
  slot: Slot = 'top';
  /** The item picked in the open slot: previewed and tried on, saved only by `wear()`. */
  selected: AccessoryId | undefined = undefined;
  view: ClosetView = 'tryOn';
  errorCode: string | undefined = undefined;
  /** Lifetime distance: decides which accessories show as unlocked. */
  progress: Progress = { totalKm: 0 };

  constructor(
    private readonly getHero: GetHero,
    private readonly createHero: CreateHero,
    private readonly changeGender: ChangeGender,
    private readonly equipAccessory: EquipAccessory,
    private readonly changeSkinTone: ChangeSkinTone,
    private readonly getProgress: GetProgress,
  ) {
    makeObservable(this, {
      hero: observableRef,
      slot: observable,
      selected: observable,
      view: observable,
      errorCode: observable,
      progress: observableRef,
      items: computed,
      preview: computed,
      shownId: computed,
      canShowItem: computed,
      isShownWorn: computed,
      focusSlot: computed,
      showingItem: computed,
      load: action,
      create: action,
      setGender: action,
      setSkinTone: action,
      equip: action,
      openSlot: action,
      select: action,
      showItem: action,
      tryOn: action,
      wear: action,
      resetCloset: action,
      cycleShoes: action,
      toggleQuickWatch: action,
    });
  }

  /** What the open closet tab lists for the hero's body. */
  get items(): readonly Accessory[] {
    return accessoriesOf(this.slot, this.hero?.gender ?? 'male');
  }

  /** The equipment the closet stage shows: the saved look with the selected item tried on (never saved here). */
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

  /** The item highlighted in the open tab: the pick, else what is worn. */
  get shownId(): AccessoryId | undefined {
    return this.selected ?? this.hero?.equipment[this.slot];
  }

  /** `none` has nothing to show alone. */
  get canShowItem(): boolean {
    return this.shownId !== undefined && this.shownId !== NONE;
  }

  get isShownWorn(): boolean {
    return this.shownId === this.hero?.equipment[this.slot];
  }

  /** The stage shows the item alone (else the hero wearing it). */
  get showingItem(): boolean {
    return this.view === 'item' && this.canShowItem;
  }

  /** The slot the 3D stage previews alone, if any. */
  get focusSlot(): Slot | undefined {
    return this.showingItem ? this.slot : undefined;
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
      this.selected = undefined; // the other body has its own items
      this.view = 'tryOn';
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

  /** Saves the selected item to the hero. */
  wear(): boolean {
    if (this.selected === undefined) return true;
    const ok = this.equip(this.slot, this.selected);
    if (ok) this.view = 'tryOn';
    return ok;
  }

  /** Hero screen: puts on the next unlocked shoes of this body (wraps around). */
  cycleShoes(): boolean {
    const hero = this.hero;
    if (!hero) return false;
    const shoes = accessoriesOf('shoes', hero.gender).filter((a) => a.id !== NONE && isUnlocked(a.unlock, this.progress));
    const next = shoes[(shoes.findIndex((a) => a.id === hero.equipment.shoes) + 1) % shoes.length];
    return next ? this.equip('shoes', next.id) : false;
  }

  /** Hero screen: one tap puts the quick watch on, a second takes it off. */
  toggleQuickWatch(): boolean {
    return this.equip('watch', this.hero?.equipment.watch === QUICK_WATCH ? NONE : QUICK_WATCH);
  }

  /** Leaving the closet drops an unsaved try-on. */
  resetCloset(): void {
    this.selected = undefined;
    this.view = 'tryOn';
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
