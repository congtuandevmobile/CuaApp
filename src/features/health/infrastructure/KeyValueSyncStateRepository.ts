import { Injectable } from '@magic-runtime/di';
import { KeyValueStore } from '@/shared/domain/ports';
import type { SyncState, SyncStateRepository } from '../domain/ports';

const KEY = 'health.syncState';

@Injectable([KeyValueStore])
export class KeyValueSyncStateRepository implements SyncStateRepository {
  constructor(private readonly store: KeyValueStore) {}

  get(): SyncState {
    const raw = this.store.getString(KEY);
    if (!raw) return { lastSyncMs: undefined, known: new Set() };
    try {
      const v = JSON.parse(raw) as { lastSyncMs: number; ids: string[] };
      return { lastSyncMs: v.lastSyncMs, known: new Set(v.ids) };
    } catch {
      return { lastSyncMs: undefined, known: new Set() };
    }
  }

  save(lastSyncMs: number, ids: readonly string[]): void {
    this.store.setString(
      KEY,
      JSON.stringify({ lastSyncMs, ids: [...new Set(ids)] }),
    );
  }
}
