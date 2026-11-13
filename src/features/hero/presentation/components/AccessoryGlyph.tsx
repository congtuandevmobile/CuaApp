import { memo } from 'react';
import Svg, { Path } from 'react-native-svg';
import type { Slot } from '../../domain/accessories';

const NONE = 'M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18zM5.6 5.6l12.8 12.8';
const NONE_COLOR = '#8791A8';
const TEE = 'M8 4l-5 3 2 4 2-1v10h10V10l2 1 2-4-5-3q-1 2-4 2T8 4z';
const SHOE = 'M3 16l5-6 4 2 4-3 5 3v4z';
const SQUARE_WATCH = 'M8 3h8v3H8zM8 18h8v3H8zM6 6h12v12H6zM10 10h4';
const ROUND_WATCH = 'M9 3h6v3H9zM9 18h6v3H9zM12 6a6 6 0 1 0 0 12 6 6 0 0 0 0-12zM12 9v3l2 1';
const HAIR = 'M5 15Q4 5 12 4t7 11q-2-5-7-6-5 1-7 6z';

/** Glyph and colour of each catalog item (the colour hints at the item's main colour on the model). */
const GLYPH: Record<Slot, Record<string, { d: string; color: string }>> = {
  outfit: {
    everyday: { d: TEE, color: '#AEB4BC' },
    club: { d: TEE, color: '#3BC4B8' },
    race: { d: TEE, color: '#FF6A4D' },
  },
  shoes: {
    none: { d: NONE, color: NONE_COLOR },
    daily: { d: SHOE, color: '#F4F6FB' },
    tempo: { d: SHOE, color: '#4F8DFF' },
    racer: { d: SHOE, color: '#C8FF3D' },
  },
  watch: {
    none: { d: NONE, color: NONE_COLOR },
    smart: { d: SQUARE_WATCH, color: '#4FD8FF' },
    multisport: { d: ROUND_WATCH, color: '#7CFF6B' },
    outdoor: { d: ROUND_WATCH, color: '#FFB347' },
  },
  hair: {
    none: { d: NONE, color: NONE_COLOR },
    style1: { d: HAIR, color: '#C9A46A' },
    style2: { d: HAIR, color: '#9B6B45' },
    style3: { d: HAIR, color: '#6A4A32' },
  },
};

export const AccessoryGlyph = memo(function AccessoryGlyph({ slot, id, size = 32 }: { slot: Slot; id: string; size?: number }) {
  const g = GLYPH[slot][id] ?? { d: NONE, color: NONE_COLOR };
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" accessible={false}>
      <Path d={g.d} fill="none" stroke={g.color} strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  );
});
