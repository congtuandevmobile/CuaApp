import type { Gender, Unlock } from './Hero';

/**
 * What the hero wears: one item per slot. Top and bottom are always worn; the other slots can be empty (`none`).
 * Shoes and sandals both go on the feet, so wearing one takes the other off (a rule of `Hero.equip`).
 */
export type Slot = 'top' | 'bottom' | 'shoes' | 'sandals' | 'watch' | 'hat' | 'hair';
export const SLOTS: readonly Slot[] = ['top', 'bottom', 'shoes', 'sandals', 'watch', 'hat', 'hair'];
/** Slots that can never be empty. */
export const REQUIRED_SLOTS: readonly Slot[] = ['top', 'bottom'];

export type AccessoryId = string;
export const NONE: AccessoryId = 'none';

export interface Accessory {
  readonly id: AccessoryId;
  readonly slot: Slot;
  /** English fallback name; the screens show the translated name. */
  readonly name: string;
  /** The body it is designed for. Absent: fits both (watches, `none`). */
  readonly gender?: Gender;
  /** 1 everyday, 2 club, 3 race: how premium the item looks. */
  readonly tier?: 1 | 2 | 3;
  readonly unlock: Unlock;
}

const free: Unlock = { type: 'free' };
/**
 * Every item is free for now (product decision). To gate an item again, give it `unlock: km(n)`: the closet shows the
 * lock and `Hero.equip` refuses it until the lifetime distance reaches n.
 */
export const km = (n: number): Unlock => ({ type: 'distance', km: n });

type Row = readonly [id: AccessoryId, name: string, tier: 1 | 2 | 3];

/** A set designed for one body. Ids are written out per row: persisted, so never derived from a row's position. */
function set(gender: Gender, slot: Slot, rows: readonly Row[]): Accessory[] {
  return rows.map(([id, name, tier]) => ({ id, slot, name, gender, tier, unlock: free }));
}

const none = (slot: Slot): Accessory => ({ id: NONE, slot, name: 'None', unlock: free });

type Design = readonly [name: string, tier: 1 | 2 | 3];

/** Footwear designs exist for both bodies (each in its own colourway): `<m|f>-<slot>-<design>` ids. */
function pair(gender: Gender, slot: Slot, designs: readonly (readonly [key: string, ...Design])[]): Accessory[] {
  return set(gender, slot, designs.map(([key, name, tier]) => [`${gender[0]}-${slot}-${key}`, name, tier] as const));
}

const SHOES: readonly (readonly [string, ...Design])[] = [
  ['1', 'Daily trainer', 1],
  ['2', 'Tempo trainer', 2],
  ['3', 'Carbon racer', 3],
  ['4', 'Trail runner', 2],
  ['5', 'Max cushion', 3],
];
const SANDALS: readonly (readonly [string, ...Design])[] = [
  ['1', 'Recovery slide', 1],
  ['2', 'Sport strap sandal', 2],
  ['3', 'Run thong', 2],
  ['4', 'Double-strap slide', 1],
  ['5', 'Triple-strap slide', 3],
];

/** Watch designs are shared by both bodies (fitted to each wrist). Generic shapes, no logos. Ids are persisted. */
export const WATCH_BRANDS = ['apple', 'huawei', 'samsung', 'coros', 'garmin', 'suunto', 'amazfit'] as const;
const WATCH_NAMES: Record<(typeof WATCH_BRANDS)[number], string> = {
  apple: 'Apple',
  huawei: 'Huawei',
  samsung: 'Samsung',
  coros: 'Coros',
  garmin: 'Garmin',
  suunto: 'Suunto',
  amazfit: 'Amazfit',
};

/**
 * The catalog. Ids are persisted: add rows, never rename or reuse one. Clothes, footwear, hats and hair are designed
 * per body (the male and female sets differ); watches fit both.
 */
export const ACCESSORIES: readonly Accessory[] = [
  ...set('male', 'top', [
    ['m-top-1', 'White piped raglan tee', 2],
    ['m-top-2', 'Gradient diamond tee', 3],
    ['m-top-3', 'Mesh-panel tank', 2],
    ['m-top-4', 'Navy V-neck jersey', 3],
    ['m-top-5', 'Green court polo', 3],
  ]),
  ...set('female', 'top', [
    ['f-top-1', 'Mint V-neck tee', 2],
    ['f-top-2', 'Grey V-neck tee', 2],
    ['f-top-3', 'Black slim tee', 1],
    ['f-top-4', 'Pink polo', 3],
    ['f-top-5', 'Blue gradient tee', 3],
  ]),
  ...set('male', 'bottom', [
    ['m-bottom-1', 'White piped shorts', 2],
    ['m-bottom-2', 'White split shorts', 2],
    ['m-bottom-3', 'Grey split shorts', 1],
    ['m-bottom-4', 'Black court shorts', 2],
    ['m-bottom-5', 'Green court shorts', 2],
  ]),
  ...set('female', 'bottom', [
    ['f-bottom-1', 'Mint pleated skirt', 2],
    ['f-bottom-2', 'White pleated skirt', 2],
    ['f-bottom-3', 'Black 2-in-1 shorts', 1],
    ['f-bottom-4', 'Pink flared skirt', 3],
    ['f-bottom-5', 'White slit skirt', 2],
  ]),
  none('shoes'),
  ...pair('male', 'shoes', SHOES),
  ...pair('female', 'shoes', SHOES),
  none('sandals'),
  ...pair('male', 'sandals', SANDALS),
  ...pair('female', 'sandals', SANDALS),
  none('watch'),
  ...WATCH_BRANDS.map((id, i): Accessory => ({ id, slot: 'watch', name: WATCH_NAMES[id], tier: i === 0 ? 1 : 2, unlock: free })),
  none('hat'),
  ...set('male', 'hat', [
    ['m-hat-1', 'Black visor', 1],
    ['m-hat-2', 'Teal mesh run cap', 2],
  ]),
  ...set('female', 'hat', [
    ['f-hat-1', 'Beige baseball cap', 1],
    ['f-hat-2', 'White sun visor', 2],
  ]),
  none('hair'),
  ...set('male', 'hair', [
    ['m-hair-1', 'Buzz', 1],
    ['m-hair-2', 'Classic short', 1],
    ['m-hair-3', 'Side part', 1],
    ['m-hair-4', 'Swept fringe', 1],
    ['m-hair-5', 'Curly', 1],
  ]),
  ...set('female', 'hair', [
    ['f-hair-1', 'Ponytail', 1],
    ['f-hair-2', 'Side braid', 1],
    ['f-hair-3', 'Pixie', 1],
    ['f-hair-4', 'Bob', 1],
    ['f-hair-5', 'Long', 1],
  ]),
];

const fits = (a: Accessory, gender: Gender | undefined) => gender === undefined || a.gender === undefined || a.gender === gender;

/** The same id can exist in several slots (`none`): a slot always scopes the lookup; a gender keeps it on that body. */
export function accessoryById(id: AccessoryId, slot: Slot, gender?: Gender): Accessory | undefined {
  return ACCESSORIES.find((a) => a.id === id && a.slot === slot && fits(a, gender));
}

/** What the closet lists for a slot on this body, in catalog order (`none` first when the slot can be empty). */
export function accessoriesOf(slot: Slot, gender: Gender): readonly Accessory[] {
  return ACCESSORIES.filter((a) => a.slot === slot && fits(a, gender));
}
