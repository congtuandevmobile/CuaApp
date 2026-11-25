import { bind } from '@magic-runtime/di';
import { TokenStore } from '@/features/auth/domain/ports';
import { createHttpClient, PublicHttpClient, type HttpHandler } from '@/platform/network/HttpClient';
import { AuthTokenProvider, createAuthInterceptor } from '@/platform/network/interceptors/authInterceptor';
import { httpStatusInterceptor } from '@/platform/network/interceptors/httpStatusInterceptor';
import { AuthController } from '@/features/auth/presentation/AuthController';
import { HealthSyncController } from '@/features/health/presentation/HealthSyncController';
import { HeroController } from '@/features/hero/presentation/HeroController';
import { LocaleController } from '@/features/localization/presentation/LocaleController';
import { ListActivities } from '@/features/tracking/application/ActivityHistory';
import { LifetimeDistance, PendingActivityQueue } from '@/features/tracking/domain/ports';
import { ActivityFeedController } from '@/features/tracking/presentation/ActivityFeedController';
import { SessionStatus } from '@/shared/domain/ports';
import { RecordController } from '@/features/tracking/presentation/RecordController';
import { KeyValueStore } from '@/shared/domain/ports';
import { controllers, createContainer, resolve, startContainer } from '../app/composition/container';

/** The composition root builds under Babel (legacy decorators, no metadata) and gives one controller per kind. */
describe('dependency container', () => {
  it('validates the whole graph when it is created (no missing provider, cycle or ambiguous port)', () => {
    expect(() => createContainer()).not.toThrow();
  });

  it('resolves every controller with its whole dependency tree', () => {
    expect(resolve(AuthController)).toBeInstanceOf(AuthController);
    expect(resolve(HeroController)).toBeInstanceOf(HeroController);
    expect(resolve(RecordController)).toBeInstanceOf(RecordController);
    expect(resolve(HealthSyncController)).toBeInstanceOf(HealthSyncController);
    expect(resolve(LocaleController)).toBeInstanceOf(LocaleController);
    expect(resolve(ListActivities)).toBeInstanceOf(ListActivities);
    expect(resolve(ActivityFeedController)).toBeInstanceOf(ActivityFeedController);
  });

  it('shares one instance of each controller (the state follows the user across screens)', () => {
    expect(startContainer()).toBe(startContainer());
    expect(controllers.hero()).toBe(controllers.hero());
    expect(controllers.record()).toBe(controllers.record());
  });

  it('the session status comes from the auth feature tokens', () => {
    const values = new Map<string, string>();
    const container = createContainer([
      bind(KeyValueStore).toValue({ getString: (k) => values.get(k), setString: (k, v) => void values.set(k, v), remove: (k) => void values.delete(k) }),
    ]);
    expect(container.get(SessionStatus).isSignedIn()).toBe(false);
    container.get(TokenStore).save({ accessToken: 'a', refreshToken: 'r' });
    expect(container.get(SessionStatus).isSignedIn()).toBe(true);
  });

  it('keeps only not-yet-uploaded recordings on the device, and adopts the old local history once', () => {
    const values = new Map<string, string>([
      ['tracking.activities', JSON.stringify([{ id: 'act-old-1', sportCode: 'running', sportName: 'Running', startedAtMs: 1, durationMs: 60_000, distanceMeters: 100, source: 'cua' }])],
    ]);
    const container = createContainer([
      bind(KeyValueStore).toValue({ getString: (k) => values.get(k), setString: (k, v) => void values.set(k, v), remove: (k) => void values.delete(k) }),
    ]);
    expect(container.get(PendingActivityQueue).all().map((r) => r.clientId)).toEqual(['act-old-1']);
    expect(values.has('tracking.activities')).toBe(false);
  });

  it('lets a test replace an adapter for everything built on it', () => {
    const values = new Map<string, string>();
    const fakeStore: KeyValueStore = {
      getString: (key) => values.get(key),
      setString: (key, value) => {
        values.set(key, value);
      },
      remove: (key) => {
        values.delete(key);
      },
    };
    const container = createContainer([bind(KeyValueStore).toValue(fakeStore)]);
    container.get(LifetimeDistance).addMeters(1500);
    expect(values.get('progress.totalKm')).toBe('1.5');
  });

  it('a 401 is answered by one refresh through the auth feature, then the request is replayed', async () => {
    const values = new Map<string, string>();
    const fakeStore: KeyValueStore = {
      getString: (key) => values.get(key),
      setString: (key, value) => {
        values.set(key, value);
      },
      remove: (key) => {
        values.delete(key);
      },
    };
    // The fake Cua API: /v1/auth/refresh rotates the pair; /v1/profile only accepts the new access token.
    const server: HttpHandler = async (req) => {
      const reply = (status: number, data?: unknown) => ({ url: req.url, status, statusText: '', headers: {}, data });
      if (req.url === '/v1/auth/refresh') return reply(200, { session: { accessToken: 'new', refreshToken: 'r2', user: { id: 'u1' } } });
      if (req.headers?.authorization === 'Bearer new') return reply(200, { profile: { id: 'u1' } });
      return reply(401, { error: { code: 'UNAUTHORIZED' } });
    };
    const container = createContainer([
      bind(KeyValueStore).toValue(fakeStore),
      bind(PublicHttpClient).toValue(createHttpClient(server, [httpStatusInterceptor])),
    ]);
    container.get(TokenStore).save({ accessToken: 'expired', refreshToken: 'r1' });

    const api = createHttpClient(server, [createAuthInterceptor(container.get(AuthTokenProvider)), httpStatusInterceptor]);
    const res = await api.get<{ profile: { id: string } }>('/v1/profile');

    expect(res.data.profile.id).toBe('u1');
    expect(container.get(TokenStore).get()).toMatchObject({ accessToken: 'new', refreshToken: 'r2' });
  });
});
