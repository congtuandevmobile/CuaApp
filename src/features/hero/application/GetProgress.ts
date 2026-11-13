import { inject, injectable } from 'inversiland';
import type { UseCase } from '@/shared/application/UseCase';
import type { Progress } from '../domain/Hero';
import { ProgressSourceToken, type ProgressSource } from '../domain/ports';

/** Lifetime distance, to show which accessories are unlocked. */
@injectable()
export class GetProgress implements UseCase<void, Progress> {
  constructor(@inject(ProgressSourceToken) private readonly progress: ProgressSource) {}

  execute(): Progress {
    return this.progress.current();
  }
}
