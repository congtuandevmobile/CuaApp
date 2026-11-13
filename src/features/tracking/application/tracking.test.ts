import { FixedClock, InMemoryKeyValueStore, SequenceIdGenerator } from '@/shared/testing/fakes';
import { EndLiveActivity, StartLiveActivity, UpdateLiveActivity } from '@/features/liveActivity/application/LiveActivityCommands';
import type { LiveActivityInfo, LiveActivityPort } from '@/features/liveActivity/domain/ports';
import { idleRecording, type LocationPermission, type Position, type RecordingSnapshot } from '../domain/Recording';
import type { PositionPreview, RecordingService } from '../domain/ports';
import { KeyValueActivityRepository } from '../infrastructure/KeyValueActivityRepository';
import { RecordController } from '../presentation/RecordController';
import { FinishRecording } from './FinishRecording';
import { ListActivities } from './ListActivities';
import { ObservePositions, ObserveRecording, PauseRecording, RequestLocationPermission, ResumeRecording, StartRecording, WatchPreviewPosition } from './RecordingCommands';

class FakeRecorder implements RecordingService {
  perm: LocationPermission = 'granted';
  current: RecordingSnapshot = idleRecording;
  cleared = 0;
  finalDurable = true;
  listener?: (s: RecordingSnapshot) => void;
  positionListener?: (p: Position) => void;
  permission() { return this.perm; }
  async requestPermission() { this.perm = 'granted'; return this.perm; }
  async start(_s: unknown, sessionId: string) { return (this.current = { ...idleRecording, status: 'running', sessionId }); }
  async pause() { return (this.current = { ...this.current, status: 'paused' }); }
  async resume() { return (this.current = { ...this.current, status: 'running' }); }
  async finish() { return (this.current = { ...this.current, status: 'finished', durable: this.finalDurable }); }
  snapshot() { return this.current; }
  observe(l: (s: RecordingSnapshot) => void) { this.listener = l; return () => { this.listener = undefined; }; }
  observePositions(l: (p: Position) => void) { this.positionListener = l; return () => { this.positionListener = undefined; }; }
  async clearPersisted() { this.cleared++; }
  push(patch: Partial<RecordingSnapshot>) { this.current = { ...this.current, ...patch }; this.listener?.(this.current); }
}

class FakePreview implements PositionPreview {
  listener?: (p: Position) => void;
  stopped = 0;
  async watch(l: (p: Position) => void) { this.listener = l; return () => { this.stopped++; this.listener = undefined; }; }
  emit(accuracyM: number, atMs = 1_700_000_000_000) { this.listener?.({ latitude: 10.77, longitude: 106.7, accuracyM, atMs }); }
}

class FakeSurface implements LiveActivityPort {
  log: string[] = [];
  async start(i: LiveActivityInfo) { this.log.push(`start:${i.status}`); return { shown: true }; }
  async update(i: LiveActivityInfo) { this.log.push(`update:${i.status}:${i.distanceMeters}`); }
  async end(i: LiveActivityInfo) { this.log.push(`end:${i.status}`); }
}

/** A controller whose pre-start preview already saw one good fix (so Start is allowed). */
async function setup({ gps = true }: { gps?: boolean } = {}) {
  const store = new InMemoryKeyValueStore();
  const ids = new SequenceIdGenerator();
  const clock = new FixedClock();
  const recorder = new FakeRecorder();
  const surface = new FakeSurface();
  const preview = new FakePreview();
  const activities = new KeyValueActivityRepository(store);
  const controller = new RecordController(
    new RequestLocationPermission(recorder), new StartRecording(recorder, ids), new PauseRecording(recorder),
    new ResumeRecording(recorder), new FinishRecording(recorder, activities, activities, ids), new ObserveRecording(recorder), new ObservePositions(recorder), new WatchPreviewPosition(recorder, preview),
    new StartLiveActivity(surface), new UpdateLiveActivity(surface), new EndLiveActivity(surface), clock,
  );
  await controller.startPreview();
  if (gps) preview.emit(5);
  return { store, recorder, surface, activities, controller, clock, preview };
}

describe('recording', () => {
  it('refuses to start without the location permission, leaving nothing open', async () => {
    const { recorder, controller } = await setup();
    recorder.perm = 'denied'; // revoked after the preview saw a fix
    expect(await controller.start()).toBe(false);
    expect(controller.errorCode).toBe('RECORDING_PERMISSION');
    expect(controller.snapshot.status).toBe('idle');
  });

  it('start, pause, resume, finish: saves the activity and the lifetime distance once', async () => {
    const { controller, recorder, activities, store, surface } = await setup();
    expect(await controller.start()).toBe(true);
    recorder.push({ totalMeters: 1500, activeTimeMs: 600_000, speedMps: 2.5 });
    await controller.pause();
    expect(controller.snapshot.status).toBe('paused');
    await controller.resume();
    expect(await controller.finish()).toBe(true);
    expect(await controller.finish()).toBe(false); // a second finish does nothing
    const list = new ListActivities(activities).execute();
    expect(list).toHaveLength(1);
    expect(list[0]).toMatchObject({ sportCode: 'running', distanceMeters: 1500, durationMs: 600_000, startedAtMs: 1_700_000_000_000 });
    expect(Number(store.getString('progress.totalKm'))).toBeCloseTo(1.5);
    expect(controller.lastActivity?.id).toBe(list[0]?.id);
    expect(recorder.cleared).toBe(1);
    expect(surface.log[0]).toBe('start:active');
    expect(surface.log.at(-1)).toBe('end:finished');
  });

  it('does not start twice while one is open', async () => {
    const { controller } = await setup();
    await controller.start();
    expect(await controller.start()).toBe(false);
  });

  it('does not save a recording that is not durable', async () => {
    const { controller, recorder, activities } = await setup();
    await controller.start();
    recorder.finalDurable = false;
    expect(await controller.finish()).toBe(false);
    expect(controller.errorCode).toBe('RECORDING_NOT_DURABLE');
    expect(activities.all()).toHaveLength(0);
  });

  it('a failing lock-screen surface never affects the recording', async () => {
    const { controller, surface } = await setup();
    surface.start = async () => { throw new Error('boom'); };
    surface.update = async () => { throw new Error('boom'); };
    expect(await controller.start()).toBe(true);
    expect(controller.snapshot.status).toBe('running');
  });
});

describe('pre-start GPS', () => {
  it('refuses Start until a first fix arrives (the screen shows a toast), then stops the preview on Start', async () => {
    const { controller, preview } = await setup({ gps: false });
    expect(controller.signal).toBe('unknown');
    expect(await controller.start()).toBe(false);
    expect(controller.errorCode).toBe('RECORDING_NO_GPS');
    preview.emit(80); // one weak fix: poor, but enough to start
    expect(controller.signal).toBe('poor');
    expect(controller.position).toBeDefined();
    expect(await controller.start()).toBe(true);
    expect(preview.stopped).toBe(1);
    await controller.finish();
  });

  it('turns good after two good fixes and drops back only on a clearly bad one', async () => {
    const { controller, preview } = await setup({ gps: false });
    preview.emit(12);
    preview.emit(10);
    expect(controller.signal).toBe('good');
    preview.emit(50); // hovering near the limit: still good
    expect(controller.signal).toBe('good');
    preview.emit(90);
    expect(controller.signal).toBe('poor');
    controller.stopPreview();
  });
});

describe('route', () => {
  it('draws good fixes in batches, per segment, and follows every fix with the marker', async () => {
    jest.useFakeTimers();
    const { recorder, controller } = await setup();
    await controller.start();
    const fix = (lat: number, accuracyM: number, segment: number) =>
      recorder.positionListener?.({ latitude: lat, longitude: 106.7, accuracyM, segment, atMs: 0 });
    fix(10.77, 5, 0);
    fix(10.771, 5, 0);
    fix(10.772, 120, 0); // too inaccurate for the line, but the marker moves
    expect(controller.route).toHaveLength(0); // batched, not one render per fix
    expect(controller.position?.latitude).toBe(10.772);
    jest.advanceTimersByTime(1600);
    expect(controller.route).toHaveLength(2);
    fix(10.773, 5, 1); // after a pause: a new segment
    await controller.finish();
    expect(controller.route.map((p) => p.segment)).toEqual([0, 0, 1]); // the last batch is flushed on finish
    expect(recorder.positionListener).toBeUndefined();
    jest.useRealTimers();
  });
});

describe('live tip', () => {
  const { planTip } = jest.requireActual('../domain/liveTip') as typeof import('../domain/liveTip');
  const at = (lat: number, atMs: number, accuracyM = 5) => ({ latitude: lat, longitude: 106.7, accuracyM, atMs });
  it('glides a normal step, ignores jitter inside the accuracy, jumps a big gap', () => {
    expect(planTip(at(10.77, 0), at(10.77002, 1000))).toEqual({ kind: 'ignore' }); // ~2 m
    expect(planTip(at(10.77, 0), at(10.7701, 1000))).toEqual({ kind: 'glide', durationMs: 1000 }); // ~11 m in 1 s
    expect(planTip(at(10.77, 0), at(10.7701, 9000))).toEqual({ kind: 'glide', durationMs: 3000 }); // capped
    expect(planTip(at(10.77, 0), at(10.771, 1000))).toEqual({ kind: 'jump' }); // ~111 m
    expect(planTip(undefined, at(10.77, 0))).toEqual({ kind: 'jump' });
  });
});
