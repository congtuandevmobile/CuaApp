import { createHttpClient, type HttpHandler, type HttpResponse } from './HttpClient';
import { createAuthInterceptor, type AuthTokenProvider } from './interceptors/authInterceptor';
import { httpStatusInterceptor } from './interceptors/httpStatusInterceptor';
import { createRetryInterceptor } from './interceptors/retryInterceptor';

const ok = (data: unknown = { ok: true }): HttpResponse => ({ url: '/test', status: 200, statusText: 'OK', headers: {}, data });

describe('platform HTTP middleware', () => {
  it('runs interceptors in order and exposes typed responses', async () => {
    const seen: string[] = [];
    const transport: HttpHandler = async (request) => {
      seen.push(`transport:${request.headers?.['x-request-id']}`);
      return ok();
    };
    const client = createHttpClient(transport, [
      async (request, next) => next({ ...request, headers: { ...request.headers, 'x-request-id': 'one' } }),
      async (request, next) => { seen.push('before'); const response = await next(request); seen.push('after'); return response; },
    ]);

    await expect(client.get('/test')).resolves.toMatchObject({ status: 200, data: { ok: true } });
    expect(seen).toEqual(['before', 'transport:one', 'after']);
  });

  it('refreshes once and replays a 401 request with the new token', async () => {
    let calls = 0;
    const provider: AuthTokenProvider = {
      accessToken: () => 'old-token',
      refreshAccessToken: async () => 'new-token',
    };
    const transport: HttpHandler = async (request) => {
      calls += 1;
      return request.headers?.authorization === 'Bearer new-token'
        ? ok()
        : { ...ok(), status: 401, statusText: 'Unauthorized' };
    };
    const client = createHttpClient(transport, [createAuthInterceptor(provider), httpStatusInterceptor]);

    await expect(client.get('/private')).resolves.toMatchObject({ status: 200 });
    expect(calls).toBe(2);
  });

  it('retries transient GET failures but does not retry POST', async () => {
    let attempts = 0;
    const transport: HttpHandler = async () => {
      attempts += 1;
      return { ...ok(), status: attempts < 3 ? 503 : 200, statusText: attempts < 3 ? 'Busy' : 'OK' };
    };
    const client = createHttpClient(transport, [createRetryInterceptor({ maxAttempts: 3, baseDelayMs: 0 }), httpStatusInterceptor]);

    await expect(client.get('/retry')).resolves.toMatchObject({ status: 200 });
    expect(attempts).toBe(3);
  });
});
