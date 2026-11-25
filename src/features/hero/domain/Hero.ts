import { DomainError } from '@/shared/domain/DomainError';
import { ACCESSORIES, accessoriesOf, accessoryById, NONE, REQUIRED_SLOTS, SLOTS, type AccessoryId, type Slot } from './accessories';

export type Gender = 'male' | 'female';
export type Equipment = Readonly<Record<Slot, AccessoryId>>;

/** Skin tones offered, light to deep. The index is persisted. */
export const SKIN_TONE_COUNT = 6;
const DEFAULT_SKIN_TONE = 1;

/** Slots a new hero starts dressed in (the first catalog item of its body); the others start empty. */
const DRESSED: readonly Slot[] = ['top', 'bottom', 'shoes', 'hair'];

/** A new hero wears the first top, bottom, shoes and hair of its body; sandals, watch and hat are chosen by the user. */
export function defaultEquipment(gender: Gender): Equipment {
  return Object.fromEntries(
    SLOTS.map((slot) => [slot, DRESSED.includes(slot) ? (accessoriesOf(slot, gender).find((a) => a.id !== NONE)?.id ?? NONE) : NONE]),
  ) as Record<Slot, AccessoryId>;
}

/** Shoes and sandals share the feet: wearing one takes the other off. */
const FEET: Partial<Record<Slot, Slot>> = { shoes: 'sandals', sandals: 'shoes' };

const isSkinTone = (tone: unknown): tone is number =>
  typeof tone === 'number' && Number.isInteger(tone) && tone >= 0 && tone < SKIN_TONE_COUNT;

export interface Progress {
  /** Lifetime recorded distance: unlocks accessories. */
  readonly totalKm: number;
}

/**
 * The user's hero. Immutable: every change returns a new Hero, so a rule can never be skipped by mutating a field.
 * The 3D model only reads it (gender, skin tone, one accessory per slot).
 */
export class Hero {
  private constructor(
    readonly name: string,
    readonly gender: Gender,
    readonly skinTone: number,
    readonly equipment: Equipment,
  ) {}

  static create(input: { name: string; gender: Gender; skinTone: number }): Hero {
    const name = input.name.trim();
    if (name.length === 0) throw new DomainError('HERO_NAME_REQUIRED', 'Give your hero a name.');
    if (!isSkinTone(input.skinTone)) {
      throw new DomainError('HERO_SKIN_TONE_INVALID', 'Pick one of the skin tones.');
    }
    return new Hero(name, input.gender, input.skinTone, defaultEquipment(input.gender));
  }

  /**
   * Rebuilds a stored hero. Stored data may come from an older catalog (outfit slot, unisex ids, five skin tones):
   * any slot whose id is not in today's catalog for that body falls back to the default, so an old save never crashes.
   */
  static restore(raw: { name: string; gender: Gender; skinTone: number; equipment?: Partial<Record<string, AccessoryId>> }): Hero {
    if (typeof raw.name !== 'string') throw new DomainError('HERO_NAME_REQUIRED', 'Stored hero has no name.');
    const gender: Gender = raw.gender === 'female' ? 'female' : 'male';
    const stored = raw.equipment ?? {};
    const fallback = defaultEquipment(gender);
    const valid = (slot: Slot) => {
      const id = stored[slot];
      return id !== undefined && accessoryById(id, slot, gender) ? id : undefined;
    };
    const equipment = Object.fromEntries(SLOTS.map((slot) => [slot, valid(slot) ?? fallback[slot]])) as Record<Slot, AccessoryId>;
    // feet: a valid stored choice beats a fallback; two stored choices keep the shoes
    if (equipment.sandals !== NONE && equipment.shoes !== NONE) {
      if (valid('shoes') === undefined) equipment.shoes = NONE;
      else equipment.sandals = NONE;
    }
    return new Hero(raw.name, gender, isSkinTone(raw.skinTone) ? raw.skinTone : DEFAULT_SKIN_TONE, equipment);
  }

  withSkinTone(skinTone: number): Hero {
    if (!isSkinTone(skinTone)) throw new DomainError('HERO_SKIN_TONE_INVALID', 'Pick one of the skin tones.');
    return new Hero(this.name, this.gender, skinTone, this.equipment);
  }

  /**
   * Changes the body. Clothes, footwear, hats and hair are designed per body, so each worn item is swapped for the item
   * at the same position in the other body's list (`none` stays `none`; shared items such as watches are kept).
   */
  withGender(gender: Gender): Hero {
    if (gender === this.gender) return this;
    const fallback = defaultEquipment(gender);
    const equipment = Object.fromEntries(
      SLOTS.map((slot) => {
        const id = this.equipment[slot];
        if (accessoryById(id, slot, gender)) return [slot, id];
        const index = accessoriesOf(slot, this.gender).findIndex((a) => a.id === id);
        return [slot, accessoriesOf(slot, gender)[index]?.id ?? fallback[slot]];
      }),
    ) as Record<Slot, AccessoryId>;
    return new Hero(this.name, gender, this.skinTone, equipment);
  }

  /**
   * Equips an accessory in its slot. It must exist, belong to that slot and this body, be unlocked by `progress`, and
   * top/bottom can never be emptied. Shoes take the sandals off and the reverse.
   */
  equip(slot: Slot, id: AccessoryId, progress: Progress): Hero {
    const accessory = accessoryById(id, slot, this.gender);
    if (!accessory || (id === NONE && REQUIRED_SLOTS.includes(slot))) {
      throw new DomainError('HERO_ACCESSORY_UNKNOWN', `"${id}" is not an accessory for ${slot}.`);
    }
    if (!isUnlocked(accessory.unlock, progress)) {
      throw new DomainError('HERO_ACCESSORY_LOCKED', `"${accessory.name}" is still locked.`);
    }
    const other = FEET[slot];
    const next: Record<Slot, AccessoryId> = { ...this.equipment, [slot]: id };
    if (other && id !== NONE) next[other] = NONE;
    return new Hero(this.name, this.gender, this.skinTone, next);
  }

  toJSON() {
    return { name: this.name, gender: this.gender, skinTone: this.skinTone, equipment: this.equipment };
  }
}

export type Unlock = { readonly type: 'free' } | { readonly type: 'distance'; readonly km: number };

export function isUnlocked(unlock: Unlock, progress: Progress): boolean {
  return unlock.type === 'free' || progress.totalKm >= unlock.km;
}

export { ACCESSORIES };
