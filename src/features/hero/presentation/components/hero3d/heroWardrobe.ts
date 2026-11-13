import type { AccessoryId, Slot } from '@/features/hero/domain/accessories';
import type { Gender } from '@/features/hero/domain/Hero';

/**
 * How the domain catalog maps onto the wardrobe GLBs (`assets/models/hero`, built by
 * avatar-3d-assets/tools/build_wardrobe.py, contract in avatar-3d-assets/WARDROBE.md). One GLB per gender holds the
 * body, the run cycle and every wearable; the scene shows one item per slot by node name.
 */
export const HERO_MODELS: Readonly<Record<Gender, number>> = {
  male: require('../../../../../../assets/models/hero/hero_male.glb'),
  female: require('../../../../../../assets/models/hero/hero_female.glb'),
};

/** Node names in the GLB for each catalog id. `none` (and unknown ids) map to nothing. */
const NODES: Readonly<Record<Slot, Readonly<Record<AccessoryId, readonly string[]>>>> = {
  outfit: {
    everyday: ['OUT_1_Top', 'OUT_1_Bottom'],
    club: ['OUT_2_Top', 'OUT_2_Bottom'],
    race: ['OUT_3_Top', 'OUT_3_Bottom'],
  },
  shoes: { daily: ['SHOE_1'], tempo: ['SHOE_2'], racer: ['SHOE_3'] },
  watch: { smart: ['WATCH_1'], multisport: ['WATCH_2'], outdoor: ['WATCH_3'] },
  hair: { style1: ['HAIR_1'], style2: ['HAIR_2'], style3: ['HAIR_3'] },
};

/** Every toggleable node, so the scene can hide what is not worn. */
export const WARDROBE_NODES: readonly string[] = Object.values(NODES).flatMap((slot) => Object.values(slot).flat());

export function nodesFor(slot: Slot, id: AccessoryId): readonly string[] {
  return NODES[slot][id] ?? [];
}

/**
 * The sole sits under the bare foot: while shoes are worn the avatar is raised by the stack height (metres, from the
 * build manifest `lift_m`). The female shoes are scaled to her foot.
 */
const SHOE_LIFT: Readonly<Record<Gender, Readonly<Record<AccessoryId, number>>>> = {
  male: { daily: 0.028, tempo: 0.025, racer: 0.036 },
  female: { daily: 0.0246, tempo: 0.022, racer: 0.0317 },
};

export function shoeLift(gender: Gender, id: AccessoryId): number {
  return SHOE_LIFT[gender][id] ?? 0;
}

/** sRGB skin tones, light to deep, indexed by `Hero.skinTone`. Shared by the 3D material and the tone picker. */
export const SKIN_TONES: readonly string[] = ['#F5D7C3', '#E8BE9C', '#D29C74', '#B07850', '#8A5536', '#5A3422'];

/** The tintable material names in the GLB. */
export const SKIN_MATERIAL = 'M_Skin';
