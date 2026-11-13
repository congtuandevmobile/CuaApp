import { InMemoryKeyValueStore } from '@/shared/testing/fakes';
import { Hero } from '../domain/Hero';
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
  it('needs a name and one of the six skin tones', () => {
    expect(() => Hero.create({ name: '  ', gender: 'male', skinTone: 1 })).toThrow(/name/);
    expect(() => Hero.create({ name: 'A', gender: 'male', skinTone: 6 })).toThrow(/skin/);
    expect(Hero.create({ name: 'A', gender: 'male', skinTone: 5 }).skinTone).toBe(5);
  });
  it('starts dressed: everyday outfit and daily trainers, no watch, no hair', () => {
    expect(Hero.create({ name: 'A', gender: 'female', skinTone: 2 }).equipment).toEqual({
      outfit: 'everyday',
      shoes: 'daily',
      watch: 'none',
      hair: 'none',
    });
  });
  it('is immutable: equipping returns a new hero', () => {
    const h = Hero.create({ name: 'A', gender: 'female', skinTone: 2 });
    const next = h.equip('watch', 'smart', { totalKm: 0 });
    expect(h.equipment.watch).toBe('none');
    expect(next.equipment.watch).toBe('smart');
  });
  it('refuses a locked item, a wrong slot, an unknown id, and no outfit at all, with stable codes', () => {
    const h = Hero.create({ name: 'A', gender: 'male', skinTone: 0 });
    expect(() => h.equip('shoes', 'racer', { totalKm: 10 })).toThrow(expect.objectContaining({ code: 'HERO_ACCESSORY_LOCKED' }));
    expect(() => h.equip('watch', 'racer', { totalKm: 999 })).toThrow(expect.objectContaining({ code: 'HERO_ACCESSORY_UNKNOWN' }));
    expect(() => h.equip('outfit', 'none', { totalKm: 999 })).toThrow(expect.objectContaining({ code: 'HERO_ACCESSORY_UNKNOWN' }));
    expect(h.equip('shoes', 'racer', { totalKm: 100 }).equipment.shoes).toBe('racer');
  });
  it('restores a save from the old catalog without crashing (unknown slots and tones fall back)', () => {
    const old = Hero.restore({
      name: 'Old',
      gender: 'male',
      skinTone: 9,
      equipment: { head: 'cap', face: 'none', wrist: 'watch', feet: 'white', back: 'wings' },
    });
    expect(old.equipment).toEqual({ outfit: 'everyday', shoes: 'daily', watch: 'none', hair: 'none' });
    expect(old.skinTone).toBe(1);
    expect(Hero.restore({ name: 'B', gender: 'female', skinTone: 3, equipment: { watch: 'outdoor' } }).equipment.watch).toBe('outdoor');
  });
});

describe('HeroController', () => {
  it('creates, persists, changes body and keeps the outfit', () => {
    const { controller, heroes } = setup();
    expect(controller.create({ name: 'Minh', gender: 'male', skinTone: 1 })).toBe(true);
    controller.equip('watch', 'smart');
    controller.setGender('female');
    controller.setSkinTone(4);
    expect(controller.hero?.gender).toBe('female');
    expect(controller.hero?.equipment.watch).toBe('smart');
    expect(heroes.get()?.equipment.watch).toBe('smart');
    expect(heroes.get()?.skinTone).toBe(4);
    expect(controller.setSkinTone(7)).toBe(false);
    expect(controller.errorCode).toBe('HERO_SKIN_TONE_INVALID');
  });
  it('unlocks accessories from the stored lifetime distance', () => {
    const locked = setup(0);
    locked.controller.create({ name: 'A', gender: 'male', skinTone: 0 });
    expect(locked.controller.equip('shoes', 'tempo')).toBe(false);
    expect(locked.controller.errorCode).toBe('HERO_ACCESSORY_LOCKED');
    const unlocked = setup(12);
    unlocked.controller.create({ name: 'A', gender: 'male', skinTone: 0 });
    expect(unlocked.controller.equip('shoes', 'tempo')).toBe(true);
  });
  it('reports HERO_NOT_CREATED instead of crashing', () => {
    const { controller } = setup();
    expect(controller.equip('watch', 'smart')).toBe(false);
    expect(controller.errorCode).toBe('HERO_NOT_CREATED');
  });
  it('wraps the turntable angle for a full 360-degree view', () => {
    const { controller } = setup();
    controller.rotateTo(999);
    expect(controller.rotationDeg).toBe(279);
  });
});
