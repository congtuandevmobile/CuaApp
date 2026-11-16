import { Injectable } from '@magic-runtime/di';
import { KeyValueStore } from '@/shared/domain/ports';
import type { SessionRepository } from '../domain/ports';
import type { Session } from '../domain/Session';

const KEY = 'auth.session';

@Injectable([KeyValueStore])
export class KeyValueSessionRepository implements SessionRepository {
  constructor(private readonly store: KeyValueStore) {}

  get(): Session | undefined {
    const raw = this.store.getString(KEY);
    if (!raw) return undefined;
    try {
      const session = JSON.parse(raw) as Session;
      // An account saved by an older build (email-based, no username) cannot talk to the backend: start over.
      if (session.kind === 'account' && typeof session.username !== 'string') throw new Error('stale account session');
      return session;
    } catch {
      this.store.remove(KEY); // a damaged or stale value is dropped, never crashes the launch
      return undefined;
    }
  }

  save(session: Session): void {
    this.store.setString(KEY, JSON.stringify(session));
  }

  clear(): void {
    this.store.remove(KEY);
  }
}
