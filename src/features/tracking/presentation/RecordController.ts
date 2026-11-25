import { Injectable } from '@magic-runtime/di';
import {
  action,
  makeObservable,
  observable,
  observableRef,
  runInAction,
} from 'mobx';
import { DomainError } from '@/shared/domain/DomainError';
import { Clock } from '@/shared/domain/ports';
import {
  EndLiveActivity,
  StartLiveActivity,
  UpdateLiveActivity,
} from '@/features/liveActivity/application/LiveActivityCommands';
import type { LiveActivityInfo } from '@/features/liveActivity/domain/ports';
import { sportName } from '@/app/i18n/format';
import { i18n } from '@/app/i18n/i18n';
import { FinishRecording } from '../application/FinishRecording';
import {
  ObserveRecording,
  ObservePositions,
  PauseRecording,
  RequestLocationPermission,
  ResumeRecording,
  StartRecording,
  WatchPreviewPosition,
} from '../application/RecordingCommands';
import type { Activity } from '../domain/Activity';
import {
  GOOD_ACCURACY_M,
  GpsSignalJudge,
  type SignalQuality,
} from '../domain/gpsSignal';
import {
  idleRecording,
  paceSecondsPerKm,
  type LocationPermission,
  type Position,
  type RecordingSnapshot,
  type RecordingSport,
  type RoutePoint,
} from '../domain/Recording';

/**
 * State and commands of the record flow: pick a sport -> recording -> summary. Deterministic under repeated calls
 * (a second `start` while open, or a second `finish`, does nothing) and free of React and native code.
 */
@Injectable([
  RequestLocationPermission,
  StartRecording,
  PauseRecording,
  ResumeRecording,
  FinishRecording,
  ObserveRecording,
  ObservePositions,
  WatchPreviewPosition,
  StartLiveActivity,
  UpdateLiveActivity,
  EndLiveActivity,
  Clock,
])
export class RecordController {
  sport: RecordingSport = { code: 'running', name: 'Running' };
  snapshot: RecordingSnapshot = idleRecording;
  permission: LocationPermission = 'notDetermined';
  lastActivity: Activity | undefined = undefined;
  errorCode: string | undefined = undefined;
  /**
   * The route of the open (or last finished) recording, for the map. In memory only: it is replaced by the next
   * recording and never persisted, logged or sent anywhere by the app.
   */
  route: readonly RoutePoint[] = [];
  /** Where the person is now (the map marker): the preview watcher before Start, the tracker while recording. */
  position: Position | undefined = undefined;
  /** Pre-start GPS signal. Start is refused while `unknown` (the UPRACE rule). */
  signal: SignalQuality = 'unknown';

  private readonly judge = new GpsSignalJudge();
  private stopPreviewWatch: (() => void) | undefined;
  private signalTimer: ReturnType<typeof setInterval> | undefined;
  private startedAtMs = 0;
  private stopObserving: (() => void) | undefined;
  private stopRoute: (() => void) | undefined;
  private pending: RoutePoint[] = [];
  private flushTimer: ReturnType<typeof setTimeout> | undefined;
  private busy = false;

  constructor(
    private readonly requestPermission: RequestLocationPermission,
    private readonly startRecording: StartRecording,
    private readonly pauseRecording: PauseRecording,
    private readonly resumeRecording: ResumeRecording,
    private readonly finishRecording: FinishRecording,
    private readonly observeRecording: ObserveRecording,
    private readonly observePositions: ObservePositions,
    private readonly watchPreview: WatchPreviewPosition,
    private readonly startSurface: StartLiveActivity,
    private readonly updateSurface: UpdateLiveActivity,
    private readonly endSurface: EndLiveActivity,
    private readonly clock: Clock,
  ) {
    makeObservable(this, {
      sport: observable,
      snapshot: observableRef,
      permission: observable,
      lastActivity: observableRef,
      errorCode: observable,
      route: observableRef,
      position: observableRef,
      signal: observable,
      pickSport: action,
    });
  }

  pickSport(sport: RecordingSport): void {
    this.sport = sport;
  }

  async askPermission(): Promise<LocationPermission> {
    const permission = await this.requestPermission.execute();
    runInAction(() => {
      this.permission = permission;
    });
    return permission;
  }

  /** True once at least one GPS fix arrived: the record screen shows a toast instead of starting otherwise. */
  get canStart(): boolean {
    return this.signal !== 'unknown';
  }

  /**
   * Starts the pre-start preview (map marker + signal judge) on the record screen. Safe to call twice; the returned
   * function stops it. It also stops by itself when the recording starts (the tracker then owns location).
   */
  async startPreview(): Promise<() => void> {
    if (this.stopPreviewWatch || this.isOpen()) return () => this.stopPreview();
    this.judge.reset();
    runInAction(() => {
      this.signal = 'unknown';
    });
    const stop = await this.watchPreview.execute(p => {
      // Staleness is judged on arrival: a re-confirmed fix of a still phone can carry an older timestamp.
      const signal = this.judge.push({
        accuracyM: p.accuracyM ?? Number.POSITIVE_INFINITY,
        atMs: this.clock.nowMs(),
      });
      runInAction(() => {
        this.position = p;
        this.signal = signal;
      });
    });
    this.stopPreviewWatch = stop;
    this.signalTimer = setInterval(() => {
      const signal = this.judge.tick(this.clock.nowMs());
      if (signal !== this.signal) runInAction(() => (this.signal = signal));
    }, 2000);
    return () => this.stopPreview();
  }

  stopPreview(): void {
    this.stopPreviewWatch?.();
    this.stopPreviewWatch = undefined;
    if (this.signalTimer) clearInterval(this.signalTimer);
    this.signalTimer = undefined;
  }

  /** Starts recording the picked sport. Returns false (with `errorCode`) when it could not start. */
  async start(): Promise<boolean> {
    if (this.busy || this.isOpen()) return false;
    if (!this.canStart) {
      runInAction(() => (this.errorCode = 'RECORDING_NO_GPS'));
      return false;
    }
    this.stopPreview();
    return this.run(async () => {
      this.startedAtMs = this.clock.nowMs();
      const first = await this.startRecording.execute(this.sport);
      this.apply(first);
      runInAction(() => {
        this.route = [];
      });
      this.pending = [];
      this.stopRoute = this.observePositions.execute(p => this.onPosition(p));
      this.stopObserving = this.observeRecording.execute(s => {
        this.apply(s);
        void this.updateSurface.execute(this.info(s));
      });
      void this.startSurface.execute(this.info(first));
    });
  }

  async pause(): Promise<boolean> {
    return this.run(async () => {
      const s = await this.pauseRecording.execute();
      this.apply(s);
      void this.updateSurface.execute(this.info(s));
    });
  }

  async resume(): Promise<boolean> {
    return this.run(async () => {
      const s = await this.resumeRecording.execute();
      this.apply(s);
      void this.updateSurface.execute(this.info(s));
    });
  }

  /** Ends and saves the recording. The lock-screen surface closes with the final numbers. */
  async finish(): Promise<boolean> {
    if (this.snapshot.status !== 'running' && this.snapshot.status !== 'paused')
      return false;
    return this.run(async () => {
      const activity = await this.finishRecording.execute({
        sport: this.sport,
        startedAtMs: this.startedAtMs,
      });
      this.stopObserving?.();
      this.stopObserving = undefined;
      this.stopRoute?.();
      this.stopRoute = undefined;
      this.flushRoute();
      await this.endSurface.execute({
        ...this.info(this.snapshot),
        status: 'finished',
      });
      runInAction(() => {
        this.lastActivity = activity;
        this.snapshot = idleRecording;
      });
    });
  }

  private isOpen(): boolean {
    return (
      this.snapshot.status === 'running' || this.snapshot.status === 'paused'
    );
  }

  /** The marker follows every fix; the line only takes fixes good enough to be drawn (no zig-zag from bad ones). */
  private onPosition(p: Position): void {
    runInAction(() => {
      this.position = p;
    });
    if (p.accuracyM !== undefined && p.accuracyM > GOOD_ACCURACY_M) return;
    this.queuePoint({
      latitude: p.latitude,
      longitude: p.longitude,
      segment: p.segment ?? 0,
    });
  }

  /** Points arrive about once a second; the map gets them in batches so a long run does not re-render per fix. */
  private queuePoint(p: RoutePoint): void {
    this.pending.push(p);
    this.flushTimer ??= setTimeout(() => this.flushRoute(), 1500);
  }

  private flushRoute(): void {
    if (this.flushTimer) clearTimeout(this.flushTimer);
    this.flushTimer = undefined;
    if (this.pending.length === 0) return;
    const next = [...this.route, ...this.pending];
    this.pending = [];
    runInAction(() => {
      this.route = next;
    });
  }

  private apply(s: RecordingSnapshot): void {
    runInAction(() => {
      this.snapshot = s;
    });
  }

  private info(s: RecordingSnapshot): LiveActivityInfo {
    return {
      sportCode: this.sport.code,
      title: sportName(this.sport.code),
      // Fixed when the activity starts: the surface keeps the language it was started in.
      labels: {
        distance: i18n.t('liveActivity.distance'),
        time: i18n.t('liveActivity.time'),
        pace: i18n.t('liveActivity.pace'),
        speed: i18n.t('liveActivity.speed'),
        paused: i18n.t('liveActivity.paused'),
        pausedTitle: i18n.t('liveActivity.pausedTitle'),
      },
      channelName: i18n.t('liveActivity.channel'),
      status: s.status === 'paused' ? 'paused' : 'active',
      elapsedSeconds: Math.round(s.activeTimeMs / 1000),
      distanceMeters: s.totalMeters,
      paceSecondsPerKm: paceSecondsPerKm(s.speedMps) ?? 0,
      startedAtMs: this.startedAtMs,
    };
  }

  /** One command at a time; a failure becomes `errorCode`, never an unhandled rejection. */
  private async run(command: () => Promise<void>): Promise<boolean> {
    if (this.busy) return false;
    this.busy = true;
    runInAction(() => {
      this.errorCode = undefined;
    });
    try {
      await command();
      return true;
    } catch (error) {
      runInAction(() => {
        this.errorCode = error instanceof DomainError ? error.code : 'UNKNOWN';
      });
      return false;
    } finally {
      this.busy = false;
    }
  }
}
