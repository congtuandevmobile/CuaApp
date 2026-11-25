import { Injectable } from '@magic-runtime/di';
import { KeyValueStore } from '@/shared/domain/ports';
import type { LifetimeDistance } from '../domain/ports';

const TOTAL_KM = 'progress.totalKm';

/** Lifetime kilometres on the device (the hero reads the same key to unlock accessories). */
@Injectable([KeyValueStore])
export class KeyValueLifetimeDistance implements LifetimeDistance {
  constructor(private readonly store: KeyValueStore) {}

  addMeters(meters: number): void {
    const km = Number(this.store.getString(TOTAL_KM) ?? '0') || 0;
    this.store.setString(TOTAL_KM, String(km + meters / 1000));
  }
}
