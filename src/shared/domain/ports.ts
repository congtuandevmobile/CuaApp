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

export const KeyValueStore = token<KeyValueStore>('shared.KeyValueStore');
export const IdGenerator = token<IdGenerator>('shared.IdGenerator');
export const Clock = token<Clock>('shared.Clock');
