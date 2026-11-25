import { InMemoryKeyValueStore } from '@/shared/testing/fakes';
import {
  createHttpClient,
  type HttpHandler,
  type HttpRequest,
} from '@/platform/network/HttpClient';
import { httpStatusInterceptor } from '@/platform/network/interceptors/httpStatusInterceptor';
import { HttpError } from '@/platform/network/networkErrors';
import type { RecordedActivity } from '../domain/Activity';
import { HttpActivityRepository } from '../infrastructure/HttpActivityRepository';
import { KeyValuePendingActivityQueue } from '../infrastructure/KeyValuePendingActivityQueue';
import { ActivityFeedController } from '../presentation/ActivityFeedController';
import {
  GetActivity,
  ListActivities,
  ListPendingActivities,
  SyncPendingActivities,
} from './ActivityHistory';
import { FakeActivityServer, FakeSession } from './activityFakes';

const rec = (clientId: string, startedAtMs: number): RecordedActivity => ({
  clientId,
  sportCode: 'running',
  startedAtMs,
  endedAtMs: startedAtMs + 600_000,
  durationMs: 600_000,
  distanceMeters: 1500,
});

function setup({ signedIn = true } = {}) {
  const store = new InMemoryKeyValueStore();
  const queue = new KeyValuePendingActivityQueue(store);
  const server = new FakeActivityServer();
  const session = new FakeSession(signedIn);
  const sync = new SyncPendingActivities(queue, server, session);
  const list = new ListActivities(server, queue, sync, session);
  const feed = new ActivityFeedController(
    list,
    new ListPendingActivities(queue),
    new GetActivity(server, queue, session),
  );
  return { store, queue, server, session, sync, list, feed };
}

describe('pending recordings', () => {
  it('offline: the recording stays queued and is shown; back online it is uploaded once', async () => {
    const { queue, server, list } = setup();
    queue.add(rec('act-1', 1000));
    server.offline = true;
    await expect(list.execute()).rejects.toMatchObject({
      code: 'ACTIVITY_NETWORK',
    });
    expect(queue.all()).toHaveLength(1);

    server.offline = false;
    const page = await list.execute();
    expect(page.items).toHaveLength(1);
    expect(page.items[0]).toMatchObject({ id: 'srv-1', externalId: 'act-1' });
    expect(page.items[0]?.pending).toBeUndefined();
    expect(queue.all()).toHaveLength(0);
    await list.execute();
    expect(server.saved).toHaveLength(1);
  });

  it('a retry after a lost response does not create a second activity (same clientId)', async () => {
    const { queue, server, sync } = setup();
    const recording = rec('act-1', 1000);
    await server.save(recording); // the server stored it, but the app never heard back
    queue.add(recording);
    expect(await sync.execute()).toBe(1);
    expect(server.saved).toHaveLength(1);
  });

  it('a guest keeps everything on the device, uploads once signed in', async () => {
    const { queue, server, session, list } = setup({ signedIn: false });
    queue.add(rec('act-1', 1000));
    queue.add(rec('act-2', 2000));
    const guest = await list.execute();
    expect(guest.items.map(a => [a.id, a.pending])).toEqual([
      ['act-2', true],
      ['act-1', true],
    ]);
    expect(server.saveCalls).toBe(0);

    session.signedIn = true;
    const signedIn = await list.execute();
    expect(signedIn.items.map(a => a.externalId)).toEqual(['act-2', 'act-1']);
    expect(queue.all()).toHaveLength(0);
  });

  it('concurrent syncs share one run (no double upload)', async () => {
    const { queue, server, sync } = setup();
    queue.add(rec('act-1', 1000));
    await Promise.all([sync.execute(), sync.execute()]);
    expect(server.saveCalls).toBe(1);
  });

  it('the queue adopts the pre-server local history once, keyed by the old ids', () => {
    const store = new InMemoryKeyValueStore();
    store.setString(
      'tracking.activities',
      JSON.stringify([
        { id: 'act-a', sportCode: 'cycling', sportName: 'Cycling', startedAtMs: 5, durationMs: 1000, distanceMeters: 9, source: 'cua' },
        { broken: true },
      ]),
    );
    const queue = new KeyValuePendingActivityQueue(store);
    expect(queue.all()).toEqual([
      { clientId: 'act-a', sportCode: 'cycling', startedAtMs: 5, endedAtMs: 1005, durationMs: 1000, distanceMeters: 9 },
    ]);
    expect(store.getString('tracking.activities')).toBeUndefined();
    expect(new KeyValuePendingActivityQueue(store).all()).toHaveLength(1);
  });
});

describe('ActivityFeedController', () => {
  it('shows the device first, then the server page; pages further on demand', async () => {
    const { feed, server, queue } = setup();
    server.pageSize = 2;
    for (let i = 1; i <= 3; i += 1) await server.save(rec(`old-${i}`, i * 1000));
    queue.add(rec('new-1', 10_000));
    const loading = feed.refresh();
    expect(feed.items.map(a => a.id)).toEqual(['new-1']); // instant, before the network answers
    await loading;
    // The pending one was uploaded first, so it is now the newest row of the server's first page.
    expect(feed.items.map(a => [a.externalId, a.pending])).toEqual([
      ['new-1', undefined],
      ['old-3', undefined],
    ]);
    expect(feed.hasMore).toBe(true);
    await feed.loadMore();
    expect(feed.items.map(a => a.externalId)).toEqual(['new-1', 'old-3', 'old-2', 'old-1']);
    expect(feed.hasMore).toBe(false);
  });

  it('keeps what it shows and reports a code when the server cannot be reached', async () => {
    const { feed, server, queue } = setup();
    await server.save(rec('a', 1000));
    await feed.refresh();
    server.offline = true;
    queue.add(rec('b', 2000));
    await feed.refresh();
    expect(feed.status).toBe('failed');
    expect(feed.errorCode).toBe('ACTIVITY_NETWORK');
    expect(feed.items.map(a => a.externalId)).toEqual(['b', 'a']);
  });

  it('opens an activity that is not in the loaded pages', async () => {
    const { feed, server } = setup();
    const stored = await server.save(rec('a', 1000));
    await feed.open(stored.id);
    expect(feed.find(stored.id)?.externalId).toBe('a');
  });
});

describe('HttpActivityRepository', () => {
  function client(reply: (req: HttpRequest) => { status: number; data?: unknown } | Error) {
    const requests: HttpRequest[] = [];
    const transport: HttpHandler = async req => {
      requests.push(req);
      const r = reply(req);
      if (r instanceof Error) throw r;
      return { url: req.url, status: r.status, statusText: '', headers: {}, data: r.data };
    };
    return { requests, repo: new HttpActivityRepository(createHttpClient(transport, [httpStatusInterceptor])) };
  }
  const dto = {
    id: 'srv-1',
    source: 'apple_health',
    externalId: 'HK-1',
    activityType: 'cycling',
    startedAt: '2026-11-20T06:00:00.000Z',
    endedAt: '2026-11-20T07:00:00.000Z',
    durationSec: 3600,
    distanceMeters: null,
  };

  it('POSTs the recording with its clientId and maps the answer', async () => {
    const { repo, requests } = client(() => ({ status: 201, data: { activity: { ...dto, source: 'phone', externalId: 'act-1' } } }));
    const saved = await repo.save(rec('act-1', Date.parse('2026-11-20T06:00:00.000Z')));
    expect(requests[0]?.url).toBe('/v1/activities');
    expect(JSON.parse(String(requests[0]?.body))).toEqual({
      clientId: 'act-1',
      activityType: 'running',
      startedAt: '2026-11-20T06:00:00.000Z',
      endedAt: '2026-11-20T06:10:00.000Z',
      durationSec: 600,
      distanceMeters: 1500,
    });
    expect(saved).toMatchObject({ id: 'srv-1', source: 'cua', externalId: 'act-1' });
  });

  it('reads a page with the cursor and maps Apple Health rows', async () => {
    const { repo, requests } = client(() => ({ status: 200, data: { activities: [dto], nextCursor: 'abc+/=' } }));
    const page = await repo.page('abc+/=');
    expect(requests[0]?.url).toBe('/v1/activities?limit=50&cursor=abc%2B%2F%3D');
    expect(page).toEqual({
      items: [{ id: 'srv-1', sportCode: 'cycling', startedAtMs: Date.parse(dto.startedAt), durationMs: 3_600_000, distanceMeters: 0, source: 'health', externalId: 'HK-1' }],
      nextCursor: 'abc+/=',
    });
  });

  it('turns transport and server failures into stable codes', async () => {
    const offline = client(req => new HttpError('NETWORK', 'down', req));
    await expect(offline.repo.page()).rejects.toMatchObject({ code: 'ACTIVITY_NETWORK' });
    const missing = client(() => ({ status: 404, data: { error: { code: 'ACTIVITY_NOT_FOUND' } } }));
    await expect(missing.repo.byId('x')).resolves.toBeUndefined();
    const broken = client(() => ({ status: 500, data: { error: { code: 'INTERNAL_ERROR' } } }));
    await expect(broken.repo.page()).rejects.toMatchObject({ code: 'ACTIVITY_SERVER' });
  });
});
