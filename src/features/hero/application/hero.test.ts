import { InMemoryKeyValueStore } from '@/shared/testing/fakes';
import { ACCESSORIES, accessoriesOf, km, NONE } from '../domain/accessories';
import {
  defaultEquipment,
  Hero,
  isUnlocked,
  SKIN_TONE_COUNT,
} from '../domain/Hero';
import { SKIN_TONES } from '../presentation/components/skinTones';
import { KeyValueHeroRepository } from '../infrastructure/KeyValueHeroRepository';
import { StoredProgressSource } from '../infrastructure/StoredProgressSource';
import { HeroController } from '../presentation/HeroController';
import { ChangeGender } from './ChangeGender';
import { ChangeSkinTone } from './ChangeSkinTone';
import { CreateHero } from './CreateHero';
import { EquipAccessory } from './EquipAccessory';
import { GetHero } from './GetHero';
import { GetProgress } from './GetProgress';

function setup(km = 0) {
  const store = new InMemoryKeyValueStore();
  store.setString('progress.totalKm', String(km));
  const heroes = new KeyValueHeroRepository(store);
  const progress = new StoredProgressSource(store);
  const controller = new HeroController(
    new GetHero(heroes),
    new CreateHero(heroes),
    new ChangeGender(heroes),
    new EquipAccessory(heroes, progress),
    new ChangeSkinTone(heroes),
    new GetProgress(progress),
  );
  return { store, heroes, controller };
}

describe('Hero rules', () => {
  it('offers exactly one picker colour per skin tone', () => {
    expect(SKIN_TONES).toHaveLength(SKIN_TONE_COUNT);
  });
  it('needs a name and one of the six skin tones', () => {
    expect(() =>
      Hero.create({ name: '  ', gender: 'male', skinTone: 1 }),
    ).toThrow(/name/);
    expect(() =>
      Hero.create({ name: 'A', gender: 'male', skinTone: 6 }),
    ).toThrow(/skin/);
    expect(
      Hero.create({ name: 'A', gender: 'male', skinTone: 5 }).skinTone,
    ).toBe(5);
  });
  it('starts dressed in the first set of its own body: top, bottom, trainers, hair; no sandals, watch or hat', () => {
    expect(
      Hero.create({ name: 'A', gender: 'female', skinTone: 2 }).equipment,
    ).toEqual({
      top: 'f-top-1',
      bottom: 'f-bottom-1',
      shoes: 'f-shoes-1',
      sandals: 'none',
      watch: 'none',
      hat: 'none',
      hair: 'f-hair-1',
    });
    expect(defaultEquipment('male').top).toBe('m-top-1');
  });
  it('lists a different set per body (5 tops, 5 bottoms, 5 shoes, 5 sandals, 5 hairs, 2 hats) and shared watches', () => {
    for (const gender of ['male', 'female'] as const) {
      const ids = (slot: Parameters<typeof accessoriesOf>[0]) =>
        accessoriesOf(slot, gender)
          .filter(a => a.id !== NONE)
          .map(a => a.id);
      expect(ids('top')).toHaveLength(5);
      expect(ids('bottom')).toHaveLength(5);
      expect(ids('shoes')).toHaveLength(5);
      expect(ids('sandals')).toHaveLength(5);
      expect(ids('hair')).toHaveLength(5);
      expect(ids('hat')).toHaveLength(2);
      expect(ids('watch')).toEqual([
        'apple',
        'huawei',
        'samsung',
        'coros',
        'garmin',
        'suunto',
        'amazfit',
      ]);
      expect(ids('top').every(id => id.startsWith(gender[0]))).toBe(true);
    }
  });
  it('is immutable: equipping returns a new hero', () => {
    const h = Hero.create({ name: 'A', gender: 'female', skinTone: 2 });
    const next = h.equip('watch', 'garmin', { totalKm: 0 });
    expect(h.equipment.watch).toBe('none');
    expect(next.equipment.watch).toBe('garmin');
  });
  it("refuses a wrong slot, the other body's item, an unknown id, and an empty top, with stable codes", () => {
    const h = Hero.create({ name: 'A', gender: 'male', skinTone: 0 });
    const code = { code: 'HERO_ACCESSORY_UNKNOWN' };
    expect(() => h.equip('watch', 'm-shoes-1', { totalKm: 999 })).toThrow(
      expect.objectContaining(code),
    );
    expect(() => h.equip('top', 'f-top-1', { totalKm: 999 })).toThrow(
      expect.objectContaining(code),
    );
    expect(() => h.equip('top', 'none', { totalKm: 999 })).toThrow(
      expect.objectContaining(code),
    );
    expect(() => h.equip('hat', 'm-hat-9', { totalKm: 999 })).toThrow(
      expect.objectContaining(code),
    );
  });
  it('wears shoes or sandals, never both', () => {
    const h = Hero.create({ name: 'A', gender: 'male', skinTone: 0 });
    const sandals = h.equip('sandals', 'm-sandals-2', { totalKm: 0 });
    expect(sandals.equipment.shoes).toBe('none');
    expect(sandals.equipment.sandals).toBe('m-sandals-2');
    const shoes = sandals.equip('shoes', 'm-shoes-4', { totalKm: 0 });
    expect(shoes.equipment).toMatchObject({
      shoes: 'm-shoes-4',
      sandals: 'none',
    });
    expect(shoes.equip('sandals', 'none', { totalKm: 0 }).equipment.shoes).toBe(
      'm-shoes-4',
    );
  });
  it('swaps every worn item for the same-position item of the other body and keeps shared ones', () => {
    const h = Hero.create({ name: 'A', gender: 'male', skinTone: 0 })
      .equip('top', 'm-top-4', { totalKm: 0 })
      .equip('hat', 'm-hat-2', { totalKm: 0 })
      .equip('watch', 'suunto', { totalKm: 0 });
    expect(h.withGender('female').equipment).toMatchObject({
      top: 'f-top-4',
      hat: 'f-hat-2',
      watch: 'suunto',
      sandals: 'none',
    });
    expect(h.withGender('female').withGender('male').equipment).toEqual(
      h.equipment,
    );
  });
  it('offers every catalog item of its body from the first run (all unlocked)', () => {
    for (const gender of ['male', 'female'] as const) {
      const h = Hero.create({ name: 'A', gender, skinTone: 0 });
      for (const a of ACCESSORIES.filter(
        x => !x.gender || x.gender === gender,
      )) {
        expect(isUnlocked(a.unlock, { totalKm: 0 })).toBe(true);
        if (a.id !== NONE || (a.slot !== 'top' && a.slot !== 'bottom'))
          expect(h.equip(a.slot, a.id, { totalKm: 0 }).equipment[a.slot]).toBe(
            a.id,
          );
      }
    }
  });
  it('still gates a distance-locked item until the lifetime distance is reached', () => {
    expect(isUnlocked(km(25), { totalKm: 24.9 })).toBe(false);
    expect(isUnlocked(km(25), { totalKm: 25 })).toBe(true);
  });
  it('restores a save from an old catalog without crashing (unknown slots, ids and tones fall back)', () => {
    const old = Hero.restore({
      name: 'Old',
      gender: 'male',
      skinTone: 9,
      equipment: {
        outfit: 'race',
        shoes: 'daily',
        watch: 'smart',
        hair: 'style1',
        head: 'cap',
      },
    });
    expect(old.equipment).toEqual(defaultEquipment('male'));
    expect(old.skinTone).toBe(1);
    const kept = Hero.restore({
      name: 'B',
      gender: 'female',
      skinTone: 3,
      equipment: {
        watch: 'coros',
        top: 'm-top-2',
        shoes: 'f-shoes-3',
        sandals: 'f-sandals-1',
      },
    });
    expect(kept.equipment).toMatchObject({
      watch: 'coros',
      top: 'f-top-1',
      shoes: 'f-shoes-3',
      sandals: 'none',
    });
    const sandalsKept = Hero.restore({
      name: 'C',
      gender: 'male',
      skinTone: 1,
      equipment: { shoes: 'daily', sandals: 'm-sandals-2' },
    });
    expect(sandalsKept.equipment).toMatchObject({
      shoes: 'none',
      sandals: 'm-sandals-2',
    });
  });
});

describe('HeroController', () => {
  it('creates, persists, changes body (outfit follows) and keeps the watch', () => {
    const { controller, heroes } = setup();
    expect(
      controller.create({ name: 'Minh', gender: 'male', skinTone: 1 }),
    ).toBe(true);
    controller.equip('watch', 'garmin');
    controller.setGender('female');
    controller.setSkinTone(4);
    expect(controller.hero?.gender).toBe('female');
    expect(controller.hero?.equipment.watch).toBe('garmin');
    expect(heroes.get()?.equipment.top).toBe('f-top-1');
    expect(heroes.get()?.skinTone).toBe(4);
    expect(controller.setSkinTone(7)).toBe(false);
    expect(controller.errorCode).toBe('HERO_SKIN_TONE_INVALID');
  });
  it('previews and tries on without saving; wear() saves', () => {
    const { controller, heroes } = setup();
    controller.create({ name: 'Lan', gender: 'female', skinTone: 2 });
    controller.openSlot('bottom');
    expect(controller.items.map(a => a.id)).toEqual([
      'f-bottom-1',
      'f-bottom-2',
      'f-bottom-3',
      'f-bottom-4',
      'f-bottom-5',
    ]);
    controller.select('f-bottom-4');
    expect(controller.view).toBe('item');
    expect(controller.preview?.bottom).toBe('f-bottom-4');
    expect(heroes.get()?.equipment.bottom).toBe('f-bottom-1');
    controller.tryOn();
    expect(controller.view).toBe('tryOn');
    expect(controller.wear()).toBe(true);
    expect(heroes.get()?.equipment.bottom).toBe('f-bottom-4');
    controller.openSlot('sandals');
    controller.select('f-sandals-3');
    expect(controller.preview).toMatchObject({
      sandals: 'f-sandals-3',
      shoes: 'none',
    });
    controller.resetCloset();
    expect(controller.preview?.shoes).toBe('f-shoes-1');
  });
  it('keeps closet view rules in the controller: none, gender switch, slot switch, failing wear', () => {
    const { controller } = setup();
    controller.create({ name: 'Lan', gender: 'female', skinTone: 2 });
    controller.openSlot('hat');
    expect(controller.shownId).toBe('none');
    expect(controller.canShowItem).toBe(false);
    controller.select('f-hat-2');
    expect(controller.focusSlot).toBe('hat');
    expect(controller.isShownWorn).toBe(false);
    controller.select('none');
    expect(controller.view).toBe('tryOn');
    controller.showItem();
    expect(controller.view).toBe('tryOn');
    controller.select('f-hat-1');
    controller.setGender('male');
    expect(controller.selected).toBeUndefined();
    controller.select('m-hat-1');
    controller.openSlot('top');
    expect(controller.selected).toBeUndefined();
    expect(controller.wear()).toBe(true); // nothing picked: nothing to save
    controller.select('f-top-1'); // the other body's item
    expect(controller.preview?.top).toBe('m-top-1');
    expect(controller.wear()).toBe(false);
    expect(controller.errorCode).toBe('HERO_ACCESSORY_UNKNOWN');
  });
  it('cycles shoes and toggles the quick watch from the hero screen', () => {
    const { controller } = setup();
    controller.create({ name: 'Minh', gender: 'male', skinTone: 1 });
    controller.cycleShoes();
    expect(controller.hero?.equipment.shoes).toBe('m-shoes-2');
    for (let i = 0; i < 4; i++) controller.cycleShoes();
    expect(controller.hero?.equipment.shoes).toBe('m-shoes-1');
    controller.toggleQuickWatch();
    expect(controller.hero?.equipment.watch).toBe('apple');
    controller.toggleQuickWatch();
    expect(controller.hero?.equipment.watch).toBe('none');
  });
  it('reports HERO_NOT_CREATED instead of crashing', () => {
    const { controller } = setup();
    expect(controller.equip('watch', 'apple')).toBe(false);
    expect(controller.errorCode).toBe('HERO_NOT_CREATED');
  });
});
