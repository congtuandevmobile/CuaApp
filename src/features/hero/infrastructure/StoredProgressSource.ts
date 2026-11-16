import { Injectable } from '@magic-runtime/di';
import { KeyValueStore } from '@/shared/domain/ports';
import type { Progress } from '../domain/Hero';
import type { ProgressSource } from '../domain/ports';

/** Reads the lifetime distance that the tracking context stores when an activity is saved. */
@Injectable([KeyValueStore])
export class StoredProgressSource implements ProgressSource {
  constructor(private readonly store: KeyValueStore) {}

  current(): Progress {
    const km = Number(this.store.getString('progress.totalKm') ?? '0');
    return { totalKm: Number.isFinite(km) ? km : 0 };
  }
}
