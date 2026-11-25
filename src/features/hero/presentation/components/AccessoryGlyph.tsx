import { memo } from 'react';
import Svg, { Path } from 'react-native-svg';
import { NONE, type Slot } from '../../domain/accessories';

const NONE_D = 'M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18zM5.6 5.6l12.8 12.8';
const NONE_COLOR = '#8791A8';
const D = {
  tee: 'M8 4l-5 3 2 4 2-1v10h10V10l2 1 2-4-5-3q-1 2-4 2T8 4z',
  tank: 'M8 4h2q2 3 4 0h2v4l1 2v10H7V10l1-2z',
  polo: 'M8 4l-5 3 2 4 2-1v10h10V10l2 1 2-4-5-3-2 3-2-3-2 3z',
  shorts: 'M6 5h12l1 13h-5l-2-7-2 7H5z',
  skirt: 'M8 5h8l3 13H5zM8 8h8',
  shoe: 'M3 16l5-6 4 2 4-3 5 3v4z',
  sandal: 'M3 17h18M6 17q0-5 4-6h3q3 1 3 6',
  square: 'M8 3h8v3H8zM8 18h8v3H8zM6 6h12v12H6zM10 10h4',
  round:
    'M9 3h6v3H9zM9 18h6v3H9zM12 6a6 6 0 1 0 0 12 6 6 0 0 0 0-12zM12 9v3l2 1',
  octagon: 'M9 3h6v3H9zM9 18h6v3H9zM10 6h4l3 3v6l-3 3h-4l-3-3V9z',
  cap: 'M4 15q0-8 8-8t8 8M4 15h18',
  visor: 'M5 11q7-3 14 0v2q-7-3-14 0zM5 13q-2 2-2 3 9-3 18 0 0-1-2-3',
  hair: 'M5 15Q4 5 12 4t7 11q-2-5-7-6-5 1-7 6z',
};

/** Glyph and colour of each catalog item (the colour is the item's main colour on the model). */
const GLYPH: Readonly<Record<string, { d: string; color: string }>> = {
  'm-top-1': { d: D.tee, color: '#F4F5F3' },
  'm-top-2': { d: D.tee, color: '#F0794C' },
  'm-top-3': { d: D.tank, color: '#E8EAEC' },
  'm-top-4': { d: D.tee, color: '#29B6E8' },
  'm-top-5': { d: D.polo, color: '#4F9A72' },
  'f-top-1': { d: D.tee, color: '#CFE5CC' },
  'f-top-2': { d: D.tee, color: '#B8BABE' },
  'f-top-3': { d: D.tee, color: '#8E8E94' },
  'f-top-4': { d: D.polo, color: '#F5C6D1' },
  'f-top-5': { d: D.tee, color: '#3AA3F2' },
  'm-bottom-1': { d: D.shorts, color: '#F2F3F1' },
  'm-bottom-2': { d: D.shorts, color: '#E6E7E5' },
  'm-bottom-3': { d: D.shorts, color: '#8A8E94' },
  'm-bottom-4': { d: D.shorts, color: '#6E7178' },
  'm-bottom-5': { d: D.shorts, color: '#4F8A6A' },
  'f-bottom-1': { d: D.skirt, color: '#CFE3CB' },
  'f-bottom-2': { d: D.skirt, color: '#F5F6F3' },
  'f-bottom-3': { d: D.shorts, color: '#8E8E94' },
  'f-bottom-4': { d: D.skirt, color: '#F5C6D1' },
  'f-bottom-5': { d: D.skirt, color: '#E9EAE8' },
  'm-shoes-1': { d: D.shoe, color: '#8A8F99' },
  'm-shoes-2': { d: D.shoe, color: '#EEF1F5' },
  'm-shoes-3': { d: D.shoe, color: '#D7FF3A' },
  'm-shoes-4': { d: D.shoe, color: '#8C9A6E' },
  'm-shoes-5': { d: D.shoe, color: '#4F7BE8' },
  'f-shoes-1': { d: D.shoe, color: '#F2EEF6' },
  'f-shoes-2': { d: D.shoe, color: '#58C4A6' },
  'f-shoes-3': { d: D.shoe, color: '#FF4FA0' },
  'f-shoes-4': { d: D.shoe, color: '#9B7EB0' },
  'f-shoes-5': { d: D.shoe, color: '#FF7F6B' },
  'm-sandals-1': { d: D.sandal, color: '#8A8F99' },
  'm-sandals-2': { d: D.sandal, color: '#FF7A1A' },
  'm-sandals-3': { d: D.sandal, color: '#2D6BE3' },
  'm-sandals-4': { d: D.sandal, color: '#9AA0A8' },
  'm-sandals-5': { d: D.sandal, color: '#78909C' },
  'f-sandals-1': { d: D.sandal, color: '#D9CDEB' },
  'f-sandals-2': { d: D.sandal, color: '#58C4A6' },
  'f-sandals-3': { d: D.sandal, color: '#FF4FA0' },
  'f-sandals-4': { d: D.sandal, color: '#F2A541' },
  'f-sandals-5': { d: D.sandal, color: '#9B7EB0' },
  apple: { d: D.square, color: '#4FD1FF' },
  huawei: { d: D.round, color: '#C7CBD1' },
  samsung: { d: D.round, color: '#8AB4FF' },
  coros: { d: D.round, color: '#F26B21' },
  garmin: { d: D.round, color: '#7CFF6B' },
  suunto: { d: D.round, color: '#FFB347' },
  amazfit: { d: D.octagon, color: '#FF6A3D' },
  'm-hat-1': { d: D.visor, color: '#9A9AA0' },
  'm-hat-2': { d: D.cap, color: '#1FB5AC' },
  'f-hat-1': { d: D.cap, color: '#E7E1D3' },
  'f-hat-2': { d: D.visor, color: '#F7F7F5' },
};
const HAIR_COLOR = '#B08960';

export const AccessoryGlyph = memo(function AccessoryGlyph({
  slot,
  id,
  size = 32,
}: {
  slot: Slot;
  id: string;
  size?: number;
}) {
  const g =
    id === NONE
      ? undefined
      : slot === 'hair'
      ? { d: D.hair, color: HAIR_COLOR }
      : GLYPH[id];
  const { d, color } = g ?? { d: NONE_D, color: NONE_COLOR };
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" accessible={false}>
      <Path
        d={d}
        fill="none"
        stroke={color}
        strokeWidth={1.8}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
});
