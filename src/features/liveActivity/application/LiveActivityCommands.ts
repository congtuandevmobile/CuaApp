import { Injectable } from '@magic-runtime/di';
import type { UseCase } from '@/shared/application/UseCase';
import { LiveActivityPort, type LiveActivityInfo, type LiveActivityOutcome } from '../domain/ports';

/** A refused start is a normal outcome (disabled in Settings...): it never stops the recording. */
@Injectable([LiveActivityPort])
export class StartLiveActivity implements UseCase<LiveActivityInfo, Promise<LiveActivityOutcome>> {
  constructor(private readonly surface: LiveActivityPort) {}

  async execute(info: LiveActivityInfo): Promise<LiveActivityOutcome> {
    try {
      return await this.surface.start(info);
    } catch (error) {
      return { shown: false, reason: error instanceof Error ? error.message : String(error) };
    }
  }
}

@Injectable([LiveActivityPort])
export class UpdateLiveActivity implements UseCase<LiveActivityInfo, Promise<void>> {
  constructor(private readonly surface: LiveActivityPort) {}

  async execute(info: LiveActivityInfo): Promise<void> {
    try {
      await this.surface.update(info);
    } catch {
      // the surface is cosmetic: a failed update must never reach the recording
    }
  }
}

@Injectable([LiveActivityPort])
export class EndLiveActivity implements UseCase<LiveActivityInfo, Promise<void>> {
  constructor(private readonly surface: LiveActivityPort) {}

  async execute(info: LiveActivityInfo): Promise<void> {
    try {
      await this.surface.end(info);
    } catch {
      // see UpdateLiveActivity
    }
  }
}
