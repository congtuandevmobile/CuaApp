import { Injectable } from '@magic-runtime/di';
import {
  AppleHealthSync,
  type HealthWorkoutRecord,
} from 'react-native-apple-health-sync';
import type { HealthRepository } from '../domain/ports';
import type { Workout } from '../domain/Workout';

/** Maps a platform record; a record without an id or a start time cannot be stored and is skipped by the caller. */
export function toWorkout(r: HealthWorkoutRecord): Workout | undefined {
  if (r.uuid === undefined || r.startTime === undefined) return undefined;
  const end = r.endTime ?? r.startTime;
  return {
    id: r.uuid,
    sportId: r.sportId,
    sportName: r.sport,
    startedAtMs: r.startTime,
    endedAtMs: end,
    durationSec: r.duration ?? Math.max(0, (end - r.startTime) / 1000),
    distanceMeters: r.totalDistance,
    energyKcal: r.totalEnergyBurned,
    source: r.sourceName ?? 'Apple Health',
    isManual: r.isManual ?? false,
  };
}

/** Adapts react-native-apple-health-sync (HealthKit, iOS only) to the `HealthRepository` port. */
@Injectable([])
export class AppleHealthRepository implements HealthRepository {
  private sdk?: AppleHealthSync;

  private get health(): AppleHealthSync {
    return (this.sdk ??= new AppleHealthSync());
  }

  isAvailable(): boolean {
    return this.health.isAvailable();
  }

  requestAccess(): Promise<boolean> {
    return this.health.requestPermissions();
  }

  async readWorkouts(
    fromMs: number,
    toMs: number,
  ): Promise<readonly Workout[]> {
    const records = await this.health.readWorkouts(fromMs, toMs);
    return records.flatMap(r => toWorkout(r) ?? []);
  }

  observeNewWorkouts(listener: () => void): () => void {
    return this.health.onNewDataAvailable(listener);
  }
}
