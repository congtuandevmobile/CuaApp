import { GpsTracking, TrackingStateError, trackingConfigForSport, type TrackingSession, type TrackingSnapshot, type TrackingSport } from 'react-native-gps-tracking';
import { injectable } from 'inversiland';
import { DomainError } from '@/shared/domain/DomainError';
import { idleRecording, type LocationPermission, type Position, type RecordingSnapshot, type RecordingSport, type RecordingStatus } from '../domain/Recording';
import type { RecordingService } from '../domain/ports';

/** The engine only knows a few speed profiles; every other sport records with the general one. */
const PROFILE: Record<string, TrackingSport> = {
  running: 'running',
  walking: 'walking',
  hiking: 'walking',
  cycling: 'cycling',
};

/**
 * The engine rejects simulated positions (`rejectMock`, iOS `isSimulatedBySoftware`) so a spoofed route never becomes
 * distance. Debug builds accept them, so a recording can be tested in the Simulator (Features > Location) or with
 * `xcrun simctl location`; release builds keep rejecting them.
 */
const REJECT_MOCK_FIXES = !__DEV__;

const STATUS: Record<TrackingSnapshot['state'], RecordingStatus> = {
  idle: 'idle',
  running: 'running',
  paused: 'paused',
  finishing: 'finishing',
  finished: 'finished',
};

/** Adapts react-native-gps-tracking (native GPS engine) to the `RecordingService` port. One session at a time. */
@injectable()
export class GpsTrackingRecordingService implements RecordingService {
  private sdk?: GpsTracking;
  private session?: TrackingSession;
  private last: RecordingSnapshot = idleRecording;

  /** Created on first use so that importing the app never touches native code. */
  private get gps(): GpsTracking {
    return (this.sdk ??= new GpsTracking());
  }

  permission(): LocationPermission {
    return this.gps.permissionStatus();
  }

  requestPermission(): Promise<LocationPermission> {
    return this.gps.requestPermission();
  }

  async start(sport: RecordingSport, sessionId: string): Promise<RecordingSnapshot> {
    if (this.session) throw new DomainError('RECORDING_ALREADY_OPEN', 'A recording is already open.');
    const session = this.gps.createSession({
      config: trackingConfigForSport(PROFILE[sport.code] ?? 'other', { rejectMock: REJECT_MOCK_FIXES }),
      notificationTitle: sport.name,
      stepsEnabled: sport.code === 'running' || sport.code === 'walking' || sport.code === 'hiking',
    });
    this.session = session;
    try {
      await session.start({ sessionId });
    } catch (error) {
      this.session = undefined;
      await session.dispose();
      throw error;
    }
    return this.remember(session.snapshot);
  }

  async pause(): Promise<RecordingSnapshot> {
    const session = this.open();
    await session.pause();
    return this.remember(session.snapshot);
  }

  async resume(): Promise<RecordingSnapshot> {
    const session = this.open();
    await session.resume();
    return this.remember(session.snapshot);
  }

  async finish(): Promise<RecordingSnapshot> {
    const session = this.open();
    try {
      return this.remember(await session.finish());
    } catch (error) {
      // The SDK's state error (still finishing, journal not durable) becomes a stable code the screen can show.
      if (error instanceof TrackingStateError) {
        this.remember(session.snapshot);
        throw new DomainError('RECORDING_NOT_FINAL', error.message);
      }
      throw error;
    }
  }

  snapshot(): RecordingSnapshot {
    return this.last;
  }

  observe(listener: (snapshot: RecordingSnapshot) => void): () => void {
    const session = this.open();
    return session.subscribe((s) => listener(this.remember(s)));
  }

  observePositions(listener: (position: Position) => void): () => void {
    const session = this.open();
    return session.onFix((fix) =>
      listener({
        latitude: fix.latitude,
        longitude: fix.longitude,
        accuracyM: fix.horizontalAccuracy,
        headingDeg: fix.course !== undefined && fix.course >= 0 ? fix.course : undefined,
        atMs: fix.time.getTime(),
        segment: fix.segmentId,
      }),
    );
  }

  async clearPersisted(): Promise<void> {
    const session = this.session;
    if (!session) return;
    await session.clearPersisted();
    await session.dispose();
    this.session = undefined;
  }

  private open(): TrackingSession {
    if (!this.session) throw new DomainError('RECORDING_NOT_OPEN', 'No recording is open.');
    return this.session;
  }

  private remember(s: TrackingSnapshot): RecordingSnapshot {
    this.last = {
      status: STATUS[s.state],
      sessionId: s.sessionId,
      totalMeters: s.totalMeters,
      activeTimeMs: s.activeTimeMs,
      elapsedTimeMs: s.elapsedTimeMs,
      speedMps: s.speedMps,
      gpsQuality: s.quality,
      steps: s.steps,
      durable: s.journalPending === 0 && !s.journalFailed,
      failure: s.failureState === 'none' ? undefined : s.failureState,
      error: s.error,
    };
    return this.last;
  }
}
