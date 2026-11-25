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
import { SaveHero } from './SaveHero';
import { DomainError } from '@/shared/domain/DomainError';
import { SyncHero } from './SyncHero';
import type { HeroGateway } from '../domain/ports';
import { HttpHeroGateway } from '../infrastructure/HttpHeroGateway';
import { createHttpClient, type HttpRequest } from '@/platform/network/HttpClient';
import { httpStatusInterceptor } from '@/platform/network/interceptors/httpStatusInterceptor';
import { HttpError } from '@/platform/network/networkErrors';

const flush = () => new Promise(r => setTimeout(r, 0));

/** Cua API's hero routes: one hero per account, can go offline. */
class FakeHeroServer implements HeroGateway {
  stored: ReturnType<Hero['toJSON']> | undefined;
  offline = false;
  puts = 0;
  async fetch() {
    if (this.offline) throw new DomainError('HERO_NETWORK', 'offline');
    return this.stored ? Hero.restore(this.stored) : undefined;
  }
  async save(hero: Hero) {
    if (this.offline) throw new DomainError('HERO_NETWORK', 'offline');
    this.puts += 1;
    this.stored = hero.toJSON();
  }
}

function setup(km = 0, { signedIn = true } = {}) {
  const store = new InMemoryKeyValueStore();
  store.setString('progress.totalKm', String(km));
  const heroes = new KeyValueHeroRepository(store);
  const progress = new StoredProgressSource(store);
  const server = new FakeHeroServer();
  const session = { signedIn, isSignedIn: () => session.signedIn };
  const save = new SaveHero(heroes, server, session);
  const controller = new HeroController(
    new GetHero(heroes),
    new CreateHero(save),
    new ChangeGender(heroes, save),
    new EquipAccessory(heroes, progress, save),
    new ChangeSkinTone(heroes, save),
    new GetProgress(progress),
    new SyncHero(heroes, server, session, save),
  );
  return { store, heroes, controller, server, session };
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
  it('creates, persists, changes body (outfit follows) and keeps the watch', async () => {
    const { controller, heroes } = setup();
    expect(
      await controller.create({ name: 'Minh', gender: 'male', skinTone: 1 }),
    ).toBe(true);
    await controller.equip('watch', 'garmin');
    await controller.setGender('female');
    await controller.setSkinTone(4);
    expect(controller.hero?.gender).toBe('female');
    expect(controller.hero?.equipment.watch).toBe('garmin');
    expect(heroes.get()?.equipment.top).toBe('f-top-1');
    expect(heroes.get()?.skinTone).toBe(4);
    expect(await controller.setSkinTone(7)).toBe(false);
    expect(controller.errorCode).toBe('HERO_SKIN_TONE_INVALID');
  });
  it('previews and tries on without saving; wear() saves', async () => {
    const { controller, heroes } = setup();
    await controller.create({ name: 'Lan', gender: 'female', skinTone: 2 });
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
    expect(await controller.wear()).toBe(true);
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
  it('keeps closet view rules in the controller: none, gender switch, slot switch, failing wear', async () => {
    const { controller } = setup();
    await controller.create({ name: 'Lan', gender: 'female', skinTone: 2 });
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
    await controller.setGender('male');
    expect(controller.selected).toBeUndefined();
    controller.select('m-hat-1');
    controller.openSlot('top');
    expect(controller.selected).toBeUndefined();
    expect(await controller.wear()).toBe(true); // nothing picked: nothing to save
    controller.select('f-top-1'); // the other body's item
    expect(controller.preview?.top).toBe('m-top-1');
    expect(await controller.wear()).toBe(false);
    expect(controller.errorCode).toBe('HERO_ACCESSORY_UNKNOWN');
  });
  it('opening the closet from a worn item lands on that item tab with nothing picked', async () => {
    const { controller } = setup();
    await controller.create({ name: 'Minh', gender: 'male', skinTone: 1 });
    controller.select('m-top-2');
    controller.openSlot('shoes');
    expect(controller.slot).toBe('shoes');
    expect(controller.selected).toBeUndefined();
    expect(controller.shownId).toBe('m-shoes-1');
  });
  it('reports HERO_NOT_CREATED instead of crashing', async () => {
    const { controller } = setup();
    expect(await controller.equip('watch', 'apple')).toBe(false);
    expect(controller.errorCode).toBe('HERO_NOT_CREATED');
  });
});

describe('hero on the server', () => {
  it('a change shows at once (like a like button); a refused upload rolls the hero back', async () => {
    const { controller, server, heroes } = setup();
    await controller.create({ name: 'Minh', gender: 'male', skinTone: 1 });
    server.offline = true;
    expect(controller.setSkinTone(4)).toBe(true);
    expect(controller.hero?.skinTone).toBe(4); // on screen before the server answered
    expect(heroes.get()?.skinTone).toBe(4);
    await flush();
    expect(controller.hero?.skinTone).toBe(1); // rolled back to what the server has
    expect(heroes.get()?.skinTone).toBe(1);
    expect(controller.errorCode).toBe('HERO_NETWORK');
  });

  it('after sign-in the account hero replaces the device copy; none on the server means onboarding', async () => {
    const { controller, server, heroes } = setup();
    server.stored = Hero.create({ name: 'Server', gender: 'female', skinTone: 3 }).toJSON();
    heroes.save(Hero.create({ name: 'Other account', gender: 'male', skinTone: 0 }));
    expect((await controller.sync('signIn'))?.name).toBe('Server');
    expect(heroes.get()?.name).toBe('Server');

    server.stored = undefined;
    expect(await controller.sync('signIn')).toBeUndefined();
    expect(heroes.get()).toBeUndefined();
  });

  it("reopening the app uploads a hero that only this device has (saved before the server kept heroes)", async () => {
    const { controller, server, heroes } = setup();
    heroes.save(Hero.create({ name: 'Old', gender: 'male', skinTone: 2 }));
    expect((await controller.sync('restore'))?.name).toBe('Old');
    expect(server.stored?.name).toBe('Old');
  });

  it('a change made while the start-up sync is out is not overwritten by the older server copy', async () => {
    const { controller, server } = setup();
    await controller.create({ name: 'Minh', gender: 'male', skinTone: 1 });
    let release: () => void = () => undefined;
    const fetch = server.fetch.bind(server);
    server.fetch = async () => {
      const old = await fetch();
      await new Promise<void>(r => (release = r));
      return old;
    };
    const syncing = controller.sync('restore');
    await flush();
    controller.setSkinTone(5);
    release();
    await syncing;
    expect(controller.hero?.skinTone).toBe(5);
  });

  it('a guest keeps the hero on the device only', async () => {
    const { controller, server, heroes } = setup(0, { signedIn: false });
    await controller.create({ name: 'Guest', gender: 'male', skinTone: 1 });
    expect(server.puts).toBe(0);
    expect(heroes.get()?.name).toBe('Guest');
  });

  it('quick taps are coalesced: the newest hero is sent, never an older one after it', async () => {
    const { controller, server } = setup();
    await controller.create({ name: 'Minh', gender: 'male', skinTone: 1 });
    const putsBefore = server.puts;
    for (const tone of [0, 2, 3, 4, 5]) expect(controller.setSkinTone(tone)).toBe(true);
    expect(controller.hero?.skinTone).toBe(5);
    await flush();
    expect(server.puts - putsBefore).toBe(2); // the first tap, then only the newest
    expect(server.stored?.skinTone).toBe(5);
    expect(controller.errorCode).toBeUndefined();
  });

  it('HttpHeroGateway: GET (404 = none) and PUT of the whole hero', async () => {
    const seen: HttpRequest[] = [];
    let stored: unknown;
    const gateway = new HttpHeroGateway(
      createHttpClient(async req => {
        seen.push(req);
        if (req.method === 'PUT') stored = JSON.parse(String(req.body));
        const status = req.method === 'GET' && !stored ? 404 : 200;
        return { url: req.url, status, statusText: '', headers: {}, data: { hero: stored } };
      }, [httpStatusInterceptor]),
    );
    expect(await gateway.fetch()).toBeUndefined();
    const hero = Hero.create({ name: 'Lan', gender: 'female', skinTone: 2 });
    await gateway.save(hero);
    expect(seen[1]).toMatchObject({ url: '/v1/hero', method: 'PUT' });
    expect(stored).toEqual(hero.toJSON());
    expect((await gateway.fetch())?.toJSON()).toEqual(hero.toJSON());

    const offline = new HttpHeroGateway(
      createHttpClient(async req => {
        throw new HttpError('NETWORK', 'down', req);
      }, [httpStatusInterceptor]),
    );
    await expect(offline.save(hero)).rejects.toMatchObject({ code: 'HERO_NETWORK' });
  });
});
