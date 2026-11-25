import { token } from '@magic-runtime/di';

/** The texts of the surface, in the language of the app (the SDK ships no translation). */
export interface LiveActivityLabels {
  readonly distance: string;
  readonly time: string;
  readonly pace: string;
  readonly speed: string;
  readonly paused: string;
  readonly pausedTitle: string;
}

/** What the lock screen / notification shows about the recording. */
export interface LiveActivityInfo {
  readonly sportCode: string;
  /** The sport as shown, already translated. */
  readonly title: string;
  readonly labels: LiveActivityLabels;
  /** Android notification channel name, translated. */
  readonly channelName?: string;
  readonly status: 'active' | 'paused' | 'finished';
  readonly elapsedSeconds: number;
  readonly distanceMeters: number;
  readonly paceSecondsPerKm: number;
  readonly startedAtMs?: number;
}

export interface LiveActivityOutcome {
  readonly shown: boolean;
  readonly reason?: string;
}

/** The surface outside the app: iOS Live Activity (lock screen, Dynamic Island), Android ongoing notification. */
export interface LiveActivityPort {
  start(info: LiveActivityInfo): Promise<LiveActivityOutcome>;
  update(info: LiveActivityInfo): Promise<void>;
  end(info: LiveActivityInfo): Promise<void>;
}

export const LiveActivityPort = token<LiveActivityPort>(
  'liveActivity.LiveActivityPort',
);
