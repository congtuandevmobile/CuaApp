import { Injectable } from '@magic-runtime/di';
import {
  LiveActivityTracking,
  WorkoutLiveActivity,
  type LiveActivityData,
} from 'react-native-live-activity-tracking';
import type {
  LiveActivityInfo,
  LiveActivityOutcome,
  LiveActivityPort,
} from '../domain/ports';

const toData = (i: LiveActivityInfo): LiveActivityData => ({
  activityType: i.sportCode,
  status: i.status,
  elapsedSeconds: i.elapsedSeconds,
  distanceMeters: i.distanceMeters,
  paceSecondsPerKm: i.paceSecondsPerKm,
  startTimestamp: i.startedAtMs,
});

/** Adapts react-native-live-activity-tracking to the `LiveActivityPort`. */
@Injectable([])
export class SdkLiveActivityPort implements LiveActivityPort {
  private sdk?: LiveActivityTracking;
  private live?: WorkoutLiveActivity;

  private get native(): LiveActivityTracking {
    return (this.sdk ??= new LiveActivityTracking());
  }

  async start(info: LiveActivityInfo): Promise<LiveActivityOutcome> {
    if (!(await this.native.isSupported()))
      return { shown: false, reason: 'Live Activities are not available.' };
    this.live = new WorkoutLiveActivity({
      activity: this.native,
      options: {
        title: info.title,
        deepLinkUrl: 'cua://record',
        labels: info.labels,
        android: { channelName: info.channelName },
      },
    });
    const result = await this.live.start(toData(info));
    if (!result.success) this.live = undefined;
    return { shown: result.success, reason: result.error };
  }

  async update(info: LiveActivityInfo): Promise<void> {
    await this.live?.update(toData(info));
  }

  async end(info: LiveActivityInfo): Promise<void> {
    await this.live?.finish(toData(info));
    this.live = undefined;
  }
}
