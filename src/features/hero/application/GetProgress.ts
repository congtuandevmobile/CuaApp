import { Injectable } from '@magic-runtime/di';
import type { UseCase } from '@/shared/application/UseCase';
import type { Progress } from '../domain/Hero';
import { ProgressSource } from '../domain/ports';

/** Lifetime distance, to show which accessories are unlocked. */
@Injectable([ProgressSource])
export class GetProgress implements UseCase<void, Progress> {
  constructor(private readonly progress: ProgressSource) {}

  execute(): Progress {
    return this.progress.current();
  }
}
