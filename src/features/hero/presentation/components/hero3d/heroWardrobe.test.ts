import { accessoriesOf, NONE, SLOTS } from '@/features/hero/domain/accessories';
import { defaultEquipment } from '@/features/hero/domain/Hero';
import { footLift, nodeFor, visibleNodes, wardrobeNodes } from './heroWardrobe';

jest.mock('../../../../../../assets/models/hero/hero_male.glb', () => 1, {
  virtual: true,
});
jest.mock('../../../../../../assets/models/hero/hero_female.glb', () => 2, {
  virtual: true,
});

describe('wardrobe GLB mapping', () => {
  it('maps every catalog item of each body to a distinct toggleable node of that body', () => {
    for (const gender of ['male', 'female'] as const) {
      const nodes = wardrobeNodes(gender);
      expect(new Set(nodes).size).toBe(nodes.length);
      for (const slot of SLOTS) {
        for (const a of accessoriesOf(slot, gender)) {
          if (a.id === NONE)
            expect(nodeFor(gender, slot, a.id)).toBeUndefined();
          else expect(nodes).toContain(nodeFor(gender, slot, a.id));
        }
      }
    }
  });
  it('maps ids by an explicit table, not by position', () => {
    expect(nodeFor('female', 'top', 'f-top-3')).toBe('TOP_3');
    expect(nodeFor('male', 'watch', 'amazfit')).toBe('WATCH_7');
    expect(nodeFor('male', 'top', 'f-top-1')).toBeUndefined();
  });
  it('shows one node per slot and hides volume hair under a hat', () => {
    const look = {
      ...defaultEquipment('male'),
      hair: 'm-hair-5',
      hat: 'm-hat-2',
    };
    const visible = visibleNodes('male', look);
    expect(visible.has('HAT_2')).toBe(true);
    expect(visible.has('HAIR_5')).toBe(false);
  });
  it('raises the body by the worn footwear', () => {
    expect(footLift('female', defaultEquipment('female'))).toBeCloseTo(0.0246);
    expect(
      footLift('male', {
        ...defaultEquipment('male'),
        shoes: 'none',
        sandals: 'm-sandals-3',
      }),
    ).toBeCloseTo(0.014);
    expect(
      footLift('male', { ...defaultEquipment('male'), shoes: 'none' }),
    ).toBe(0);
  });
});
