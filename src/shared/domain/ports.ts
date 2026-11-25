import { token } from '@magic-runtime/di';

/** Small ports every context can use. Implementations live in `shared/infrastructure`. */

export interface KeyValueStore {
  getString(key: string): string | undefined;
  setString(key: string, value: string): void;
  remove(key: string): void;
}

export interface IdGenerator {
  next(): string;
}

export interface Clock {
  /** Wall-clock epoch ms: only for dates shown to the user or stored. Never for measuring time. */
  nowMs(): number;
}

/**
 * Whether the device holds a signed-in session, i.e. whether calls to Cua API can act as a user. Bound by the auth
 * feature (it owns the session); a guest keeps working offline and syncs once signed in.
 */
export interface SessionStatus {
  isSignedIn(): boolean;
}

export const KeyValueStore = token<KeyValueStore>('shared.KeyValueStore');
export const IdGenerator = token<IdGenerator>('shared.IdGenerator');
export const Clock = token<Clock>('shared.Clock');
export const SessionStatus = token<SessionStatus>('shared.SessionStatus');
