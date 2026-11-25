import { Injectable } from '@magic-runtime/di';
import type { UseCase } from '@/shared/application/UseCase';
import type { Activity } from '../domain/Activity';
import { ActivityRepository } from '../domain/ports';

/** Newest first. */
@Injectable([ActivityRepository])
export class ListActivities implements UseCase<void, readonly Activity[]> {
  constructor(private readonly activities: ActivityRepository) {}

  execute(): readonly Activity[] {
    return [...this.activities.all()].sort(
      (a, b) => b.startedAtMs - a.startedAtMs,
    );
  }
}
