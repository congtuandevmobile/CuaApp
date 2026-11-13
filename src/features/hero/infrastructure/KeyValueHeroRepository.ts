import { inject, injectable } from 'inversiland';
import { KeyValueStoreToken, type KeyValueStore } from '@/shared/domain/ports';
import { Hero } from '../domain/Hero';
import type { HeroRepository } from '../domain/ports';

const KEY = 'hero.current';

@injectable()
export class KeyValueHeroRepository implements HeroRepository {
  constructor(@inject(KeyValueStoreToken) private readonly store: KeyValueStore) {}

  get(): Hero | undefined {
    const raw = this.store.getString(KEY);
    if (!raw) return undefined;
    try {
      return Hero.restore(JSON.parse(raw));
    } catch {
      this.store.remove(KEY);
      return undefined;
    }
  }

  save(hero: Hero): void {
    this.store.setString(KEY, JSON.stringify(hero));
  }
}
