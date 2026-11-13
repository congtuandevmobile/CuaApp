import { inject, injectable } from 'inversiland';
import type { UseCase } from '@/shared/application/UseCase';
import { LiveActivityPortToken, type LiveActivityInfo, type LiveActivityOutcome, type LiveActivityPort } from '../domain/ports';

/** A refused start is a normal outcome (disabled in Settings...): it never stops the recording. */
@injectable()
export class StartLiveActivity implements UseCase<LiveActivityInfo, Promise<LiveActivityOutcome>> {
  constructor(@inject(LiveActivityPortToken) private readonly surface: LiveActivityPort) {}

  async execute(info: LiveActivityInfo): Promise<LiveActivityOutcome> {
    try {
      return await this.surface.start(info);
    } catch (error) {
      return { shown: false, reason: error instanceof Error ? error.message : String(error) };
    }
  }
}

@injectable()
export class UpdateLiveActivity implements UseCase<LiveActivityInfo, Promise<void>> {
  constructor(@inject(LiveActivityPortToken) private readonly surface: LiveActivityPort) {}

  async execute(info: LiveActivityInfo): Promise<void> {
    try {
      await this.surface.update(info);
    } catch {
      // the surface is cosmetic: a failed update must never reach the recording
    }
  }
}

@injectable()
export class EndLiveActivity implements UseCase<LiveActivityInfo, Promise<void>> {
  constructor(@inject(LiveActivityPortToken) private readonly surface: LiveActivityPort) {}

  async execute(info: LiveActivityInfo): Promise<void> {
    try {
      await this.surface.end(info);
    } catch {
      // see UpdateLiveActivity
    }
  }
}
