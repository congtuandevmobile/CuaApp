import { inject, injectable } from 'inversiland';
import type { UseCase } from '@/shared/application/UseCase';
import type { Activity } from '../domain/Activity';
import { ActivityRepositoryToken, type ActivityRepository } from '../domain/ports';

/** Newest first. */
@injectable()
export class ListActivities implements UseCase<void, readonly Activity[]> {
  constructor(@inject(ActivityRepositoryToken) private readonly activities: ActivityRepository) {}

  execute(): readonly Activity[] {
    return [...this.activities.all()].sort((a, b) => b.startedAtMs - a.startedAtMs);
  }
}
