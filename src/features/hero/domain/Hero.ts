import { DomainError } from '@/shared/domain/DomainError';
import { ACCESSORIES, accessoryById, SLOTS, type AccessoryId, type Slot } from './accessories';

export type Gender = 'male' | 'female';
export type Equipment = Readonly<Record<Slot, AccessoryId>>;

/** Skin tones offered, light to deep. The index is persisted. */
export const SKIN_TONE_COUNT = 6;
const DEFAULT_SKIN_TONE = 1;

/** A new hero is dressed (everyday outfit, daily trainers); hair and watch are chosen by the user. */
export const DEFAULT_EQUIPMENT: Equipment = {
  outfit: 'everyday',
  shoes: 'daily',
  watch: 'none',
  hair: 'none',
};

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
    return new Hero(name, input.gender, input.skinTone, DEFAULT_EQUIPMENT);
  }

  /**
   * Rebuilds a stored hero. Stored data may come from an older catalog (head/face/wrist/feet/back slots, five skin
   * tones): any slot whose id is not in today's catalog falls back to the default, so an old save never crashes.
   */
  static restore(raw: { name: string; gender: Gender; skinTone: number; equipment?: Partial<Record<string, AccessoryId>> }): Hero {
    const stored = raw.equipment ?? {};
    const equipment = Object.fromEntries(
      SLOTS.map((slot) => {
        const id = stored[slot];
        return [slot, id !== undefined && accessoryById(id, slot) ? id : DEFAULT_EQUIPMENT[slot]];
      }),
    ) as Record<Slot, AccessoryId>;
    const gender: Gender = raw.gender === 'female' ? 'female' : 'male';
    return new Hero(raw.name, gender, isSkinTone(raw.skinTone) ? raw.skinTone : DEFAULT_SKIN_TONE, equipment);
  }

  withSkinTone(skinTone: number): Hero {
    if (!isSkinTone(skinTone)) throw new DomainError('HERO_SKIN_TONE_INVALID', 'Pick one of the skin tones.');
    return new Hero(this.name, this.gender, skinTone, this.equipment);
  }

  withGender(gender: Gender): Hero {
    return new Hero(this.name, gender, this.skinTone, this.equipment);
  }

  /** Equips an accessory in its slot. It must exist, belong to that slot, and be unlocked by `progress`. */
  equip(slot: Slot, id: AccessoryId, progress: Progress): Hero {
    const accessory = accessoryById(id, slot);
    if (!accessory) {
      throw new DomainError('HERO_ACCESSORY_UNKNOWN', `"${id}" is not an accessory for ${slot}.`);
    }
    if (!isUnlocked(accessory.unlock, progress)) {
      throw new DomainError('HERO_ACCESSORY_LOCKED', `"${accessory.name}" is still locked.`);
    }
    return new Hero(this.name, this.gender, this.skinTone, { ...this.equipment, [slot]: id });
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
