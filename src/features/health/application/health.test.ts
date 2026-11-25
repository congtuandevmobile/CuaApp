import { FixedClock, InMemoryKeyValueStore } from '@/shared/testing/fakes';
import type { HealthRepository } from '../domain/ports';
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

function setup(read: Workout[] = []) {
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
  const state = new KeyValueSyncStateRepository(new InMemoryKeyValueStore());
  const sync = new SyncWorkouts(repo, state, clock);
  const controller = new HealthSyncController(
    new RequestHealthAccess(repo),
    sync,
    new ObserveNewWorkouts(repo),
  );
  return {
    repo,
    sync,
    state,
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
