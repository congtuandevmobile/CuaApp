import { Injectable } from '@magic-runtime/di';
import { DomainError } from '@/shared/domain/DomainError';
import { HttpClient } from '@/platform/network/HttpClient';
import { HttpError } from '@/platform/network/networkErrors';
import { Hero } from '../domain/Hero';
import type { HeroGateway } from '../domain/ports';

/** JSON shape of Cua API's hero (CuaApp-BE docs/hero.md). It never leaves this file. */
interface HeroDto {
  name: string;
  gender: 'male' | 'female';
  skinTone: number;
  equipment: Record<string, string>;
}

const TIMEOUT_MS = 10_000;
const ACCEPT_JSON = { accept: 'application/json' };

/** `HeroGateway` over `GET/PUT /v1/hero`, through the authenticated `HttpClient`. */
@Injectable([HttpClient])
export class HttpHeroGateway implements HeroGateway {
  constructor(private readonly http: HttpClient) {}

  async fetch(): Promise<Hero | undefined> {
    try {
      const res = await this.http.get<{ hero: HeroDto }>('/v1/hero', {
        headers: ACCEPT_JSON,
        timeoutMs: TIMEOUT_MS,
      });
      // `restore` tolerates ids from an older or newer catalog: an unknown item falls back to the default.
      return Hero.restore(res.data.hero);
    } catch (error) {
      if (error instanceof HttpError && error.status === 404) return undefined;
      throw toDomainError(error);
    }
  }

  async save(hero: Hero): Promise<void> {
    try {
      await this.http.request({
        url: '/v1/hero',
        method: 'PUT',
        body: JSON.stringify(hero.toJSON()),
        headers: { ...ACCEPT_JSON, 'content-type': 'application/json' },
        timeoutMs: TIMEOUT_MS,
      });
    } catch (error) {
      throw toDomainError(error);
    }
  }
}

function toDomainError(error: unknown): DomainError {
  if (
    error instanceof HttpError &&
    (error.code === 'NETWORK' || error.code === 'TIMEOUT')
  )
    return new DomainError('HERO_NETWORK', 'Cannot reach the server.');
  return new DomainError('HERO_SERVER', 'The server could not save the hero.');
}
