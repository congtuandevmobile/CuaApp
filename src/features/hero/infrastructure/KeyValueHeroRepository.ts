import { Injectable } from '@magic-runtime/di';
import { KeyValueStore } from '@/shared/domain/ports';
import { Hero } from '../domain/Hero';
import type { HeroRepository } from '../domain/ports';

const KEY = 'hero.current';

/** The device copy of the hero (see `HeroRepository`). */
@Injectable([KeyValueStore])
export class KeyValueHeroRepository implements HeroRepository {
  constructor(private readonly store: KeyValueStore) {}

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

  clear(): void {
    this.store.remove(KEY);
  }
}
