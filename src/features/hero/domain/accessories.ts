import type { Unlock } from './Hero';

/** What the hero wears: one item per slot. An outfit is always worn; the other slots can be empty (`none`). */
export type Slot = 'outfit' | 'shoes' | 'watch' | 'hair';
export const SLOTS: readonly Slot[] = ['outfit', 'shoes', 'watch', 'hair'];

export type AccessoryId = string;

export interface Accessory {
  readonly id: AccessoryId;
  readonly slot: Slot;
  readonly name: string;
  /** 1 everyday, 2 club, 3 race: how premium the item looks. `none` has no tier. */
  readonly tier?: 1 | 2 | 3;
  readonly unlock: Unlock;
}

const free: Unlock = { type: 'free' };
const km = (n: number): Unlock => ({ type: 'distance', km: n });

/**
 * The catalog. Ids are persisted: add rows, never rename or reuse one. Items are generic styles (no brands), and the
 * same id exists for both bodies: the 3D layer maps it to the mesh fitted to the current gender.
 */
export const ACCESSORIES: readonly Accessory[] = [
  { id: 'everyday', slot: 'outfit', name: 'Everyday', tier: 1, unlock: free },
  { id: 'club', slot: 'outfit', name: 'Club', tier: 2, unlock: km(10) },
  { id: 'race', slot: 'outfit', name: 'Race', tier: 3, unlock: km(50) },

  { id: 'none', slot: 'shoes', name: 'Barefoot', unlock: free },
  { id: 'daily', slot: 'shoes', name: 'Daily trainer', tier: 1, unlock: free },
  { id: 'tempo', slot: 'shoes', name: 'Tempo trainer', tier: 2, unlock: km(10) },
  { id: 'racer', slot: 'shoes', name: 'Carbon racer', tier: 3, unlock: km(100) },

  { id: 'none', slot: 'watch', name: 'None', unlock: free },
  { id: 'smart', slot: 'watch', name: 'Square smartwatch', tier: 1, unlock: free },
  { id: 'multisport', slot: 'watch', name: 'Round multisport', tier: 2, unlock: km(25) },
  { id: 'outdoor', slot: 'watch', name: 'Outdoor steel', tier: 3, unlock: km(75) },

  { id: 'none', slot: 'hair', name: 'None', unlock: free },
  { id: 'style1', slot: 'hair', name: 'Style 1', unlock: free },
  { id: 'style2', slot: 'hair', name: 'Style 2', unlock: free },
  { id: 'style3', slot: 'hair', name: 'Style 3', unlock: free },
];

/** The same id can exist in several slots (`none`): a slot always scopes the lookup. */
export function accessoryById(id: AccessoryId, slot?: Slot): Accessory | undefined {
  return ACCESSORIES.find((a) => a.id === id && (slot === undefined || a.slot === slot));
}

export function accessoriesOf(slot: Slot): readonly Accessory[] {
  return ACCESSORIES.filter((a) => a.slot === slot);
}
