import { inject, injectable } from 'inversiland';
import { KeyValueStoreToken, type KeyValueStore } from '@/shared/domain/ports';
import type { SessionRepository } from '../domain/ports';
import type { Session } from '../domain/Session';

const KEY = 'auth.session';

@injectable()
export class KeyValueSessionRepository implements SessionRepository {
  constructor(@inject(KeyValueStoreToken) private readonly store: KeyValueStore) {}

  get(): Session | undefined {
    const raw = this.store.getString(KEY);
    if (!raw) return undefined;
    try {
      return JSON.parse(raw) as Session;
    } catch {
      this.store.remove(KEY); // a damaged value is dropped, never crashes the launch
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
