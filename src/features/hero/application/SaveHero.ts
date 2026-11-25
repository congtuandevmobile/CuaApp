import { Injectable } from '@magic-runtime/di';
import { SessionStatus } from '@/shared/domain/ports';
import type { Hero } from '../domain/Hero';
import { HeroGateway, HeroRepository } from '../domain/ports';

/** A change applied on the device at once; `saved` settles when the server has it (or refused it). */
export interface HeroChange {
  readonly hero: Hero;
  /** Resolves once the server stored this hero or a newer one; rejects (with the device rolled back) on failure. */
  readonly saved: Promise<void>;
}

/**
 * Optimistic save, like a "like" button: the device copy changes now, the server is told in the background. Changes
 * made while an upload runs are coalesced: only the newest hero is sent next (six quick taps on skin tones cost at
 * most two requests, never an out-of-order write). If the server refuses, the device returns to the last hero the
 * server confirmed. A guest has no server: the device copy is final.
 */
@Injectable([HeroRepository, HeroGateway, SessionStatus])
export class SaveHero {
  /** The last hero the server has (valid while uploads run; refreshed from the device when idle). */
  private confirmed: Hero | undefined;
  private queued: Hero | undefined;
  private running: Promise<void> | undefined;
  private changes = 0;

  constructor(
    private readonly cache: HeroRepository,
    private readonly remote: HeroGateway,
    private readonly session: SessionStatus,
  ) {}

  /** Changes made on this device since the app started (or since the last sync) are newer than any server copy. */
  get changedLocally(): boolean {
    return this.changes > 0;
  }

  /** A server copy was just adopted: older local changes are settled. */
  markSynced(): void {
    this.changes = 0;
  }

  execute(hero: Hero): HeroChange {
    this.changes += 1;
    if (!this.running) this.confirmed = this.cache.get();
    this.cache.save(hero);
    if (!this.session.isSignedIn()) return { hero, saved: Promise.resolve() };
    this.queued = hero;
    this.running ??= this.drain().finally(() => {
      this.running = undefined;
    });
    return { hero, saved: this.running };
  }

  private async drain(): Promise<void> {
    try {
      while (this.queued) {
        const next = this.queued;
        this.queued = undefined;
        await this.remote.save(next);
        this.confirmed = next;
      }
    } catch (error) {
      this.queued = undefined;
      if (this.confirmed) this.cache.save(this.confirmed);
      else this.cache.clear();
      throw error;
    }
  }
}
