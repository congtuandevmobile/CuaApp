import { Injectable } from '@magic-runtime/di';
import type { UseCase } from '@/shared/application/UseCase';
import { SessionStatus } from '@/shared/domain/ports';
import type { Hero } from '../domain/Hero';
import { HeroGateway, HeroRepository } from '../domain/ports';
import { SaveHero } from './SaveHero';

export interface SyncHeroInput {
  /**
   * `signIn`: a (maybe different) account just signed in: the server's hero wins, and none on the server means none
   * here (the device's hero may belong to someone else). `restore`: the same session reopened the app: the server
   * wins too, but a hero only this device has (saved before heroes moved to the server) is uploaded, not dropped.
   */
  readonly mode: 'signIn' | 'restore';
}

/** Reads the hero from the server into the device cache. Guests keep the device's hero. */
@Injectable([HeroRepository, HeroGateway, SessionStatus, SaveHero])
export class SyncHero implements UseCase<SyncHeroInput, Promise<Hero | undefined>> {
  constructor(
    private readonly cache: HeroRepository,
    private readonly remote: HeroGateway,
    private readonly session: SessionStatus,
    private readonly saveHero: SaveHero,
  ) {}

  async execute({ mode }: SyncHeroInput): Promise<Hero | undefined> {
    if (!this.session.isSignedIn()) return this.cache.get();
    const server = await this.remote.fetch();
    // The user changed the hero while this request was out: that change is newer (and is being uploaded). Keep it.
    if (mode === 'restore' && this.saveHero.changedLocally) return this.cache.get();
    if (server) {
      this.saveHero.markSynced();
      this.cache.save(server);
      return server;
    }
    const local = this.cache.get();
    if (mode === 'restore' && local) {
      await this.remote.save(local);
      return local;
    }
    this.cache.clear();
    return undefined;
  }
}
