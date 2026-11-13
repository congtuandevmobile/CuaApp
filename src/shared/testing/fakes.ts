import type { Clock, IdGenerator, KeyValueStore } from '../domain/ports';

export class InMemoryKeyValueStore implements KeyValueStore {
  readonly data = new Map<string, string>();
  getString(key: string) {
    return this.data.get(key);
  }
  setString(key: string, value: string) {
    this.data.set(key, value);
  }
  remove(key: string) {
    this.data.delete(key);
  }
}

export class SequenceIdGenerator implements IdGenerator {
  private n = 0;
  next() {
    return `id-${++this.n}`;
  }
}

export class FixedClock implements Clock {
  constructor(public now = 1_700_000_000_000) {}
  nowMs() {
    return this.now;
  }
}
