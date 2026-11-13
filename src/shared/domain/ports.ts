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

export const KeyValueStoreToken = Symbol.for('shared.KeyValueStore');
export const IdGeneratorToken = Symbol.for('shared.IdGenerator');
export const ClockToken = Symbol.for('shared.Clock');
