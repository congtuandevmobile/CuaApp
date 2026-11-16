import { createHttpClient, type HttpHandler, type HttpRequest } from '@/platform/network/HttpClient';
import { HttpError } from '@/platform/network/networkErrors';
import { httpStatusInterceptor } from '@/platform/network/interceptors/httpStatusInterceptor';
import { HttpAccountGateway } from './HttpAccountGateway';

/** A fake server behind the real HttpClient pipeline (status → HttpError), so mapping is tested end to end. */
function gatewayWith(respond: (req: HttpRequest) => { status: number; data?: unknown } | Error) {
  const seen: HttpRequest[] = [];
  const transport: HttpHandler = async (req) => {
    seen.push(req);
    const r = respond(req);
    if (r instanceof Error) throw new HttpError('NETWORK', r.message, req);
    return { url: req.url, status: r.status, statusText: '', headers: {}, data: r.data };
  };
  return { gateway: new HttpAccountGateway(createHttpClient(transport, [httpStatusInterceptor])), seen };
}

const session = { accessToken: 'a1', refreshToken: 'r1', expiresAt: 1_800_000_000, user: { id: 'u1', username: 'minh', email: 'minh@x.vn', name: 'Minh', code: 'ABC314' } };

describe('HttpAccountGateway', () => {
  it('POSTs the sign-up as JSON and maps the session DTO (seconds → ms)', async () => {
    const { gateway, seen } = gatewayWith(() => ({ status: 201, data: { session } }));
    const account = await gateway.register({ name: ' Minh ', email: ' minh@x.vn ', username: ' minh ', password: 'longenough' }, 'guest-1');
    expect(seen[0]).toMatchObject({ url: '/v1/auth/signup', method: 'POST', headers: { 'content-type': 'application/json' } });
    expect(JSON.parse(seen[0]!.body as string)).toEqual({ name: 'Minh', email: 'minh@x.vn', username: 'minh', password: 'longenough', guestId: 'guest-1' });
    expect(account).toEqual({ id: 'u1', username: 'minh', email: 'minh@x.vn', name: 'Minh', code: 'ABC314', tokens: { accessToken: 'a1', refreshToken: 'r1', expiresAtMs: 1_800_000_000_000 } });
  });

  it("turns the server's { error: { code } } into a DomainError with that code", async () => {
    const { gateway } = gatewayWith(() => ({ status: 409, data: { error: { code: 'AUTH_USERNAME_TAKEN', message: 'taken' } } }));
    await expect(gateway.register({ name: 'A', email: 'a@x.vn', username: 'minh', password: 'longenough' })).rejects.toMatchObject({ name: 'DomainError', code: 'AUTH_USERNAME_TAKEN' });
  });

  it('reports offline as AUTH_NETWORK and a 5xx as AUTH_SERVER', async () => {
    await expect(gatewayWith(() => new Error('down')).gateway.signIn({ username: 'minh', password: 'x' })).rejects.toMatchObject({ code: 'AUTH_NETWORK' });
    await expect(gatewayWith(() => ({ status: 500, data: { error: { code: 'INTERNAL_ERROR' } } })).gateway.signIn({ username: 'minh', password: 'x' })).rejects.toMatchObject({ code: 'AUTH_SERVER' });
  });

  it('POSTs the login with the username', async () => {
    const { gateway, seen } = gatewayWith(() => ({ status: 200, data: { session } }));
    expect((await gateway.signIn({ username: 'minh', password: 'pw' })).username).toBe('minh');
    expect(seen[0]).toMatchObject({ url: '/v1/auth/login', method: 'POST' });
    expect(JSON.parse(seen[0]!.body as string)).toEqual({ username: 'minh', password: 'pw' });
  });

  it('sends the access token as a bearer header on logout', async () => {
    const { gateway, seen } = gatewayWith(() => ({ status: 204 }));
    await gateway.signOut('a1');
    expect(seen[0]).toMatchObject({ url: '/v1/auth/logout', headers: { authorization: 'Bearer a1' } });
    expect(seen[0]!.body).toBeUndefined();
    expect(seen[0]!.headers).not.toHaveProperty('content-type'); // Fastify answers 400 to JSON content-type + empty body
  });
});
