import { NONE, SLOTS, type AccessoryId, type Slot } from '@/features/hero/domain/accessories';
import type { Equipment, Gender } from '@/features/hero/domain/Hero';

/**
 * How the domain catalog maps onto the wardrobe GLBs (`assets/models/hero`, built by
 * ~/Desktop/3D/tools/build_wardrobe_v2.py, manifest ~/Desktop/3D/avatar/<gender>/hero_<gender>.json). One GLB per
 * gender holds the body, the run cycle and every wearable of that body; the scene shows one item per slot by node name.
 */
export const HERO_MODELS: Readonly<Record<Gender, number>> = {
  male: require('../../../../../../assets/models/hero/hero_male.glb'),
  female: require('../../../../../../assets/models/hero/hero_female.glb'),
};

/**
 * Catalog id -> GLB node, per body. Written out on purpose: ids are persisted and node names come from the build
 * manifest, so neither is derived from list positions. `none` (and unknown ids) map to nothing.
 */
const NODES: Readonly<Record<Gender, Readonly<Record<Slot, Readonly<Record<AccessoryId, string>>>>>> = {
  male: {
    top: { 'm-top-1': 'TOP_1', 'm-top-2': 'TOP_2', 'm-top-3': 'TOP_3', 'm-top-4': 'TOP_4', 'm-top-5': 'TOP_5' },
    bottom: { 'm-bottom-1': 'BOTTOM_1', 'm-bottom-2': 'BOTTOM_2', 'm-bottom-3': 'BOTTOM_3', 'm-bottom-4': 'BOTTOM_4', 'm-bottom-5': 'BOTTOM_5' },
    shoes: { 'm-shoes-1': 'SHOE_1', 'm-shoes-2': 'SHOE_2', 'm-shoes-3': 'SHOE_3', 'm-shoes-4': 'SHOE_4', 'm-shoes-5': 'SHOE_5' },
    sandals: { 'm-sandals-1': 'SANDAL_1', 'm-sandals-2': 'SANDAL_2', 'm-sandals-3': 'SANDAL_3', 'm-sandals-4': 'SANDAL_4', 'm-sandals-5': 'SANDAL_5' },
    hat: { 'm-hat-1': 'HAT_1', 'm-hat-2': 'HAT_2' },
    hair: { 'm-hair-1': 'HAIR_1', 'm-hair-2': 'HAIR_2', 'm-hair-3': 'HAIR_3', 'm-hair-4': 'HAIR_4', 'm-hair-5': 'HAIR_5' },
    watch: { apple: 'WATCH_1', huawei: 'WATCH_2', samsung: 'WATCH_3', coros: 'WATCH_4', garmin: 'WATCH_5', suunto: 'WATCH_6', amazfit: 'WATCH_7' },
  },
  female: {
    top: { 'f-top-1': 'TOP_1', 'f-top-2': 'TOP_2', 'f-top-3': 'TOP_3', 'f-top-4': 'TOP_4', 'f-top-5': 'TOP_5' },
    bottom: { 'f-bottom-1': 'BOTTOM_1', 'f-bottom-2': 'BOTTOM_2', 'f-bottom-3': 'BOTTOM_3', 'f-bottom-4': 'BOTTOM_4', 'f-bottom-5': 'BOTTOM_5' },
    shoes: { 'f-shoes-1': 'SHOE_1', 'f-shoes-2': 'SHOE_2', 'f-shoes-3': 'SHOE_3', 'f-shoes-4': 'SHOE_4', 'f-shoes-5': 'SHOE_5' },
    sandals: { 'f-sandals-1': 'SANDAL_1', 'f-sandals-2': 'SANDAL_2', 'f-sandals-3': 'SANDAL_3', 'f-sandals-4': 'SANDAL_4', 'f-sandals-5': 'SANDAL_5' },
    hat: { 'f-hat-1': 'HAT_1', 'f-hat-2': 'HAT_2' },
    hair: { 'f-hair-1': 'HAIR_1', 'f-hair-2': 'HAIR_2', 'f-hair-3': 'HAIR_3', 'f-hair-4': 'HAIR_4', 'f-hair-5': 'HAIR_5' },
    watch: { apple: 'WATCH_1', huawei: 'WATCH_2', samsung: 'WATCH_3', coros: 'WATCH_4', garmin: 'WATCH_5', suunto: 'WATCH_6', amazfit: 'WATCH_7' },
  },
};

/** The GLB node of a catalog item on this body, or undefined for `none`/unknown ids. */
export function nodeFor(gender: Gender, slot: Slot, id: AccessoryId): string | undefined {
  return NODES[gender][slot][id];
}

/** Every toggleable node of a body, so the scene can hide what is not worn. */
export function wardrobeNodes(gender: Gender): readonly string[] {
  return SLOTS.flatMap((slot) => Object.values(NODES[gender][slot]));
}

/** Volume hair is hidden under a hat (manifest `hides_hair`). */
const HIDDEN_UNDER_HAT: Readonly<Record<Gender, readonly string[]>> = { male: ['HAIR_5'], female: [] };

/** The nodes visible for a look: one per slot, minus hair a hat covers. */
export function visibleNodes(gender: Gender, equipment: Equipment): Set<string> {
  const visible = new Set<string>();
  for (const slot of SLOTS) {
    const node = nodeFor(gender, slot, equipment[slot]);
    if (node) visible.add(node);
  }
  if (equipment.hat !== NONE) HIDDEN_UNDER_HAT[gender].forEach((n) => visible.delete(n));
  return visible;
}

/**
 * The sole sits under the bare foot: while footwear is worn the avatar is raised by its stack height (metres, manifest
 * `lift_m`). The female footwear is scaled to her foot.
 */
const LIFT: Readonly<Record<Gender, Readonly<Record<string, number>>>> = {
  male: {
    SHOE_1: 0.028, SHOE_2: 0.025, SHOE_3: 0.036, SHOE_4: 0.0345, SHOE_5: 0.044,
    SANDAL_1: 0.02, SANDAL_2: 0.018, SANDAL_3: 0.014, SANDAL_4: 0.02, SANDAL_5: 0.026,
  },
  female: {
    SHOE_1: 0.0246, SHOE_2: 0.022, SHOE_3: 0.0317, SHOE_4: 0.0303, SHOE_5: 0.0387,
    SANDAL_1: 0.0176, SANDAL_2: 0.0158, SANDAL_3: 0.0123, SANDAL_4: 0.0176, SANDAL_5: 0.0229,
  },
};

export function footLift(gender: Gender, equipment: Equipment): number {
  const node = nodeFor(gender, 'shoes', equipment.shoes) ?? nodeFor(gender, 'sandals', equipment.sandals);
  return node ? LIFT[gender][node] ?? 0 : 0;
}

/** The tintable material names in the GLB. */
export const SKIN_MATERIAL = 'M_Skin';
