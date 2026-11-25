import { FixedClock, InMemoryKeyValueStore } from '@/shared/testing/fakes';
import { createHttpClient, type HttpHandler } from '@/platform/network/HttpClient';
import { httpStatusInterceptor } from '@/platform/network/interceptors/httpStatusInterceptor';
import { HttpError } from '@/platform/network/networkErrors';
import {
  HttpWorkoutUploader,
  toImportItem,
} from '../infrastructure/HttpWorkoutUploader';
import type {
  HealthRepository,
  UploadResult,
  WorkoutUploader,
} from '../domain/ports';
import type { Workout } from '../domain/Workout';
import { KeyValueSyncStateRepository } from '../infrastructure/KeyValueSyncStateRepository';
import { toWorkout } from '../infrastructure/AppleHealthRepository';
import { HealthSyncController } from '../presentation/HealthSyncController';
import {
  FIRST_SYNC_DAYS,
  ObserveNewWorkouts,
  RequestHealthAccess,
  SyncWorkouts,
} from './HealthCommands';

const w = (
  id: string,
  sportId: number,
  startedAtMs: number,
  sportName = 'soccer',
): Workout => ({
  id,
  sportId,
  sportName,
  startedAtMs,
  endedAtMs: startedAtMs + 1000,
  durationSec: 1,
  source: 'Watch',
  isManual: false,
});

/** Cua API's import, deduplicating on the workout UUID like the server does. */
class FakeUploader implements WorkoutUploader {
  readonly server = new Set<string>();
  batches: string[][] = [];
  fail = false;
  async upload(workouts: readonly Workout[]): Promise<UploadResult> {
    if (this.fail) throw new Error('offline');
    this.batches.push(workouts.map(x => x.id));
    let created = 0;
    for (const x of workouts)
      if (!this.server.has(x.id)) {
        this.server.add(x.id);
        created += 1;
      }
    return { created, skipped: workouts.length - created };
  }
}

function setup(read: Workout[] = [], { signedIn = true } = {}) {
  const calls: Array<[number, number]> = [];
  let notify: (() => void) | undefined;
  const repo: HealthRepository = {
    isAvailable: () => true,
    requestAccess: async () => true,
    readWorkouts: async (a, b) => {
      calls.push([a, b]);
      return read;
    },
    observeNewWorkouts: l => {
      notify = l;
      return () => {
        notify = undefined;
      };
    },
  };
  const clock = new FixedClock(10_000_000_000);
  const store = new InMemoryKeyValueStore();
  const state = new KeyValueSyncStateRepository(store);
  const uploader = new FakeUploader();
  const session = { signedIn, isSignedIn: () => session.signedIn };
  const sync = new SyncWorkouts(repo, state, uploader, session, clock);
  const controller = new HealthSyncController(
    new RequestHealthAccess(repo),
    sync,
    new ObserveNewWorkouts(repo),
  );
  return {
    repo,
    sync,
    state,
    store,
    uploader,
    session,
    controller,
    calls,
    clock,
    fire: () => notify?.(),
    setRead: (r: Workout[]) => {
      read = r;
    },
  };
}

describe('SyncWorkouts', () => {
  it('reads 90 days on the first sync and returns every sport, newest first', async () => {
    const { sync, calls } = setup([
      w('a', 41, 1),
      w('b', 9999, 3, 'unknown'),
      w('c', 37, 2, 'running'),
    ]);
    const result = await sync.execute();
    expect(calls[0]?.[1] - calls[0]?.[0]).toBe(FIRST_SYNC_DAYS * 86_400_000);
    expect(result.added.map(x => x.id)).toEqual(['b', 'c', 'a']);
    expect(result.added.find(x => x.id === 'b')).toMatchObject({
      sportId: 9999,
      sportName: 'unknown',
    }); // kept, not dropped
  });
  it('returns only the new ones afterwards, with a one-day overlap', async () => {
    const { sync, clock, calls, setRead } = setup([w('a', 41, 1)]);
    await sync.execute();
    clock.now += 3_600_000;
    setRead([w('a', 41, 1), w('d', 6, 5, 'basketball')]);
    const second = await sync.execute();
    expect(second.added.map(x => x.id)).toEqual(['d']);
    expect(calls[1]?.[0]).toBe(10_000_000_000 - 86_400_000);
  });
});

describe('SyncWorkouts upload', () => {
  it('uploads the new workouts and moves the sync state forward only after the upload', async () => {
    const { sync, uploader, state } = setup([w('a', 41, 1), w('b', 6, 2)]);
    const result = await sync.execute();
    expect(result.uploaded).toEqual({ created: 2, skipped: 0 });
    expect(uploader.batches).toEqual([['b', 'a']]);
    expect([...state.get().known].sort()).toEqual(['a', 'b']);
  });

  it('a failed upload keeps the state, so the next sync sends the same workouts again', async () => {
    const { sync, uploader, state } = setup([w('a', 41, 1)]);
    uploader.fail = true;
    await expect(sync.execute()).rejects.toThrow('offline');
    expect(state.get().lastSyncMs).toBeUndefined();
    uploader.fail = false;
    expect((await sync.execute()).uploaded).toEqual({ created: 1, skipped: 0 });
  });

  it('a guest reads but sends nothing; signing in later sends everything', async () => {
    const { sync, uploader, session } = setup([w('a', 41, 1)], {
      signedIn: false,
    });
    expect((await sync.execute()).uploaded).toBeUndefined();
    expect(uploader.batches).toEqual([]);
    session.signedIn = true;
    expect((await sync.execute()).uploaded).toEqual({ created: 1, skipped: 0 });
  });

  it('after a reinstall (empty local state) everything is re-sent and the server skips what it has', async () => {
    const read = [w('a', 41, 1), w('b', 6, 2), w('c', 37, 3)];
    const first = setup(read);
    await first.sync.execute();
    // Reinstall: a fresh device state, the same server.
    const again = setup(read);
    const server = first.uploader.server;
    again.uploader.server.clear();
    server.forEach(id => again.uploader.server.add(id));
    const result = await again.sync.execute();
    expect(result.uploaded).toEqual({ created: 0, skipped: 3 });
  });
});

describe('HealthSyncController', () => {
  it('connects, syncs, and syncs again when the store says there is a new workout', async () => {
    const { controller, fire, setRead } = setup([w('a', 41, 1)]);
    await controller.connect();
    expect(controller.status).toBe('idle');
    expect(controller.workouts.map(x => x.id)).toEqual(['a']);
    setRead([w('a', 41, 1), w('b', 6, 2, 'basketball')]);
    fire();
    await new Promise(r => setTimeout(r, 0));
    expect(controller.workouts.map(x => x.id)).toEqual(['b', 'a']);
    controller.dispose();
  });
  it('reports unavailable when the platform refuses', async () => {
    const { repo, controller } = setup();
    repo.isAvailable = () => false;
    await controller.connect();
    expect(controller.status).toBe('unavailable');
  });
});

describe('platform record mapping', () => {
  it('keeps an unknown sport with its real id', () => {
    const mapped = toWorkout({
      uuid: 'u',
      sport: 'unknown',
      sportId: 90,
      startTime: 5,
      endTime: 65,
      duration: 60,
    });
    expect(mapped).toMatchObject({
      id: 'u',
      sportId: 90,
      sportName: 'unknown',
      durationSec: 60,
    });
  });
  it('skips a record that has no id', () => {
    expect(
      toWorkout({ sport: 'soccer', sportId: 41, startTime: 1 }),
    ).toBeUndefined();
  });
});

describe('HttpWorkoutUploader', () => {
  it('sends batches of 100 to the import route and adds up the answers', async () => {
    const bodies: Array<{ source: string; items: Array<{ externalId: string }> }> = [];
    const transport: HttpHandler = async req => {
      const body = JSON.parse(String(req.body));
      bodies.push(body);
      return {
        url: req.url,
        status: 200,
        statusText: '',
        headers: {},
        data: { created: body.items.length - 1, skipped: 1 },
      };
    };
    const uploader = new HttpWorkoutUploader(
      createHttpClient(transport, [httpStatusInterceptor]),
    );
    const many = Array.from({ length: 250 }, (_, i) => w(`hk-${i}`, 37, i, 'running'));
    expect(await uploader.upload(many)).toEqual({ created: 247, skipped: 3 });
    expect(bodies.map(b => b.items.length)).toEqual([100, 100, 50]);
    expect(bodies[0]?.source).toBe('apple_health');
    expect(toImportItem(many[0] as Workout)).toEqual({
      externalId: 'hk-0',
      activityType: 'running',
      startedAt: '1970-01-01T00:00:00.000Z',
      endedAt: '1970-01-01T00:00:01.000Z',
      durationSec: 1,
      distanceMeters: null,
      energyKcal: null,
      sourceName: 'Watch',
      metadata: { sportId: 37, isManual: false },
    });
  });

  it('reports an offline upload with a stable code', async () => {
    const uploader = new HttpWorkoutUploader(
      createHttpClient(async req => {
        throw new HttpError('NETWORK', 'down', req);
      }, [httpStatusInterceptor]),
    );
    await expect(uploader.upload([w('a', 1, 1)])).rejects.toMatchObject({
      code: 'HEALTH_UPLOAD_NETWORK',
    });
  });
});
