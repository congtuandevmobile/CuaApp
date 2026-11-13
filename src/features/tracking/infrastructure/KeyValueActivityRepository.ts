import { inject, injectable } from 'inversiland';
import { KeyValueStoreToken, type KeyValueStore } from '@/shared/domain/ports';
import type { Activity } from '../domain/Activity';
import type { ActivityRepository, LifetimeDistance } from '../domain/ports';

const ACTIVITIES = 'tracking.activities';
const TOTAL_KM = 'progress.totalKm';

@injectable()
export class KeyValueActivityRepository implements ActivityRepository, LifetimeDistance {
  constructor(@inject(KeyValueStoreToken) private readonly store: KeyValueStore) {}

  all(): readonly Activity[] {
    const raw = this.store.getString(ACTIVITIES);
    if (!raw) return [];
    try {
      return JSON.parse(raw) as Activity[];
    } catch {
      return [];
    }
  }

  add(activity: Activity): void {
    this.store.setString(ACTIVITIES, JSON.stringify([...this.all(), activity]));
  }

  addMeters(meters: number): void {
    const km = Number(this.store.getString(TOTAL_KM) ?? '0') || 0;
    this.store.setString(TOTAL_KM, String(km + meters / 1000));
  }
}
