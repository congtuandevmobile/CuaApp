import { DomainError } from '@/shared/domain/DomainError';
import {
  InMemoryKeyValueStore,
  SequenceIdGenerator,
} from '@/shared/testing/fakes';
import { KeyValueSessionRepository } from '../infrastructure/KeyValueSessionRepository';
import { KeyValueTokenStore } from '../infrastructure/KeyValueTokenStore';
import type {
  AccountGateway,
  AuthenticatedAccount,
  AuthTokens,
} from '../domain/ports';
import { ContinueAsGuest } from './ContinueAsGuest';
import { GetSession } from './GetSession';
import { RefreshAccessToken } from './RefreshAccessToken';
import { SignIn } from './SignIn';
import { SignOut } from './SignOut';
import { SignUp } from './SignUp';
import { AuthController } from '../presentation/AuthController';

const tokens = (n: number): AuthTokens => ({
  accessToken: `access-${n}`,
  refreshToken: `refresh-${n}`,
  expiresAtMs: 1000 * n,
});

/** The backend, faked at the port: what the use cases see, without HTTP. */
function fakeGateway(
  overrides: Partial<AccountGateway> = {},
): AccountGateway & { revoked: string[] } {
  let n = 0;
  const revoked: string[] = [];
  const account = (username: string, name?: string): AuthenticatedAccount => ({
    id: 'acct-1',
    username: username.trim().toLowerCase(),
    email: 'minh@x.vn',
    name: name?.trim(),
    code: 'ABC314',
    tokens: tokens(++n),
  });
  return {
    revoked,
    register: async r => account(r.username, r.name),
    signIn: async c => account(c.username, 'Server Name'),
    refresh: async () => tokens(++n),
    signOut: async accessToken => {
      revoked.push(accessToken);
    },
    ...overrides,
  };
}

function setup(gateway: AccountGateway = fakeGateway()) {
  const store = new InMemoryKeyValueStore();
  const sessions = new KeyValueSessionRepository(store);
  const tokenStore = new KeyValueTokenStore(store);
  const ids = new SequenceIdGenerator();
  const guest = new ContinueAsGuest(sessions, ids);
  const signUp = new SignUp(sessions, gateway, tokenStore);
  const signIn = new SignIn(sessions, gateway, tokenStore);
  const get = new GetSession(sessions);
  const out = new SignOut(sessions, tokenStore, gateway);
  const refresh = new RefreshAccessToken(tokenStore, gateway);
  return {
    store,
    tokenStore,
    guest,
    signUp,
    signIn,
    get,
    out,
    refresh,
    controller: new AuthController(get, guest, signUp, signIn, out),
  };
}

describe('guest', () => {
  it('creates a local guest once and reuses it', () => {
    const { guest, get } = setup();
    const a = guest.execute();
    expect(a).toEqual({ kind: 'guest', id: 'guest-id-1' });
    expect(guest.execute()).toEqual(a);
    expect(get.execute()).toEqual(a);
  });
  it('drops an account session saved by the old email-based build', () => {
    const { store, get } = setup();
    store.setString(
      'auth.session',
      JSON.stringify({
        kind: 'account',
        id: 'account-x',
        email: 'a@b.co',
        name: 'Tuan',
      }),
    );
    expect(get.execute()).toBeUndefined();
    expect(store.getString('auth.session')).toBeUndefined();
  });
  it('survives a damaged stored value', () => {
    const { store, get } = setup();
    store.setString('auth.session', '{not json');
    expect(get.execute()).toBeUndefined();
    expect(store.getString('auth.session')).toBeUndefined();
  });
});

describe('sign up', () => {
  it.each([
    [
      { name: '', email: 'm@x.vn', username: 'minh', password: '12345678' },
      'AUTH_NAME_REQUIRED',
    ],
    [
      { name: 'A', email: 'nope', username: 'minh', password: '12345678' },
      'AUTH_EMAIL_INVALID',
    ],
    [
      { name: 'A', email: 'm@x.vn', username: 'a b', password: '12345678' },
      'AUTH_USERNAME_INVALID',
    ],
    [
      { name: 'A', email: 'm@x.vn', username: 'ab', password: '12345678' },
      'AUTH_USERNAME_INVALID',
    ],
    [
      { name: 'A', email: 'm@x.vn', username: 'minh', password: 'short' },
      'AUTH_PASSWORD_TOO_SHORT',
    ],
  ])(
    'rejects %j with %s before any request, and keeps the session',
    async (input, code) => {
      const register = jest.fn();
      const { signUp, guest, get } = setup(fakeGateway({ register }));
      const g = guest.execute();
      await expect(signUp.execute(input)).rejects.toMatchObject({ code });
      expect(register).not.toHaveBeenCalled();
      expect(get.execute()).toEqual(g);
    },
  );
  it('hands the guest id to the backend and keeps the tokens apart from the session', async () => {
    const gateway = fakeGateway();
    const register = jest.spyOn(gateway, 'register');
    const { signUp, guest, get, tokenStore } = setup(gateway);
    const g = guest.execute();
    const s = await signUp.execute({
      name: ' Minh ',
      email: ' Minh@X.vn ',
      username: ' Minh.Run ',
      password: 'longenough',
    });
    expect(register).toHaveBeenCalledWith(
      expect.objectContaining({ email: ' Minh@X.vn ', username: ' Minh.Run ' }),
      g.id,
    );
    expect(s).toEqual({
      kind: 'account',
      id: 'acct-1',
      username: 'minh.run',
      name: 'Minh',
      email: 'minh@x.vn',
      code: 'ABC314',
    });
    expect(get.execute()).toEqual(s);
    expect(tokenStore.get()).toEqual(tokens(1));
  });
  it('keeps the guest session when the server refuses', async () => {
    const { signUp, guest, get, tokenStore } = setup(
      fakeGateway({
        register: async () => {
          throw new DomainError('AUTH_USERNAME_TAKEN', 'taken');
        },
      }),
    );
    const g = guest.execute();
    await expect(
      signUp.execute({
        name: 'A',
        email: 'm@x.vn',
        username: 'minh',
        password: 'longenough',
      }),
    ).rejects.toMatchObject({ code: 'AUTH_USERNAME_TAKEN' });
    expect(get.execute()).toEqual(g);
    expect(tokenStore.get()).toBeUndefined();
  });
});

describe('sign in', () => {
  it('stores the account session and its tokens', async () => {
    const { signIn, get, tokenStore } = setup();
    const s = await signIn.execute({ username: ' minh ', password: 'pw' });
    expect(s).toEqual({
      kind: 'account',
      id: 'acct-1',
      username: 'minh',
      name: 'Server Name',
      email: 'minh@x.vn',
      code: 'ABC314',
    });
    expect(get.execute()).toEqual(s);
    expect(tokenStore.get()?.accessToken).toBe('access-1');
  });
  it('needs a username and a password', async () => {
    await expect(
      setup().signIn.execute({ username: ' ', password: 'pw' }),
    ).rejects.toMatchObject({ code: 'AUTH_USERNAME_REQUIRED' });
    await expect(
      setup().signIn.execute({ username: 'minh', password: '' }),
    ).rejects.toMatchObject({ code: 'AUTH_PASSWORD_REQUIRED' });
  });
});

describe('sign out', () => {
  it('clears the device first, then revokes the token on the server', async () => {
    const gateway = fakeGateway();
    const { signIn, out, get, tokenStore } = setup(gateway);
    await signIn.execute({ username: 'minh', password: 'pw' });
    await out.execute();
    expect(get.execute()).toBeUndefined();
    expect(tokenStore.get()).toBeUndefined();
    expect(gateway.revoked).toEqual(['access-1']);
  });
  it('still signs out when the server cannot be reached', async () => {
    const { signIn, out, get } = setup(
      fakeGateway({
        signOut: async () => {
          throw new DomainError('AUTH_NETWORK', 'offline');
        },
      }),
    );
    await signIn.execute({ username: 'minh', password: 'pw' });
    await expect(out.execute()).resolves.toBeUndefined();
    expect(get.execute()).toBeUndefined();
  });
});

describe('refresh', () => {
  it('rotates the stored pair and returns the new access token', async () => {
    const { signIn, refresh, tokenStore } = setup();
    await signIn.execute({ username: 'minh', password: 'pw' });
    expect(await refresh.execute()).toBe('access-2');
    expect(tokenStore.get()?.refreshToken).toBe('refresh-2');
  });
  it('drops the tokens when the server refuses the refresh token', async () => {
    const { signIn, refresh, tokenStore } = setup(
      fakeGateway({
        refresh: async () => {
          throw new DomainError('AUTH_REFRESH_FAILED', 'no');
        },
      }),
    );
    await signIn.execute({ username: 'minh', password: 'pw' });
    expect(await refresh.execute()).toBeUndefined();
    expect(tokenStore.get()).toBeUndefined();
  });
  it('keeps the tokens when offline (the request fails as offline, not as signed out)', async () => {
    const { signIn, refresh, tokenStore } = setup(
      fakeGateway({
        refresh: async () => {
          throw new DomainError('AUTH_NETWORK', 'offline');
        },
      }),
    );
    await signIn.execute({ username: 'minh', password: 'pw' });
    await expect(refresh.execute()).rejects.toMatchObject({
      code: 'AUTH_NETWORK',
    });
    expect(tokenStore.get()?.accessToken).toBe('access-1');
  });
});

describe('AuthController', () => {
  it('exposes a stable error code and busy state', async () => {
    const { controller } = setup();
    expect(
      await controller.signUp({
        name: 'A',
        email: 'm@x.vn',
        username: 'a b',
        password: '12345678',
      }),
    ).toBe(false);
    expect(controller.errorCode).toBe('AUTH_USERNAME_INVALID');
    expect(controller.busy).toBe(false);
    expect(
      await controller.signUp({
        name: 'A',
        email: 'm@x.vn',
        username: 'minh',
        password: '12345678',
      }),
    ).toBe(true);
    expect(controller.errorCode).toBeUndefined();
    expect(controller.session?.kind).toBe('account');
    await controller.signOut();
    expect(controller.session).toBeUndefined();
  });
  it('ignores a second tap while a request is in flight', async () => {
    let release: () => void = () => undefined;
    const register = jest.fn(
      () =>
        new Promise<AuthenticatedAccount>(resolve => {
          release = () =>
            resolve({ id: 'a', username: 'minh', tokens: tokens(1) });
        }),
    );
    const { controller } = setup(fakeGateway({ register }));
    const form = {
      name: 'A',
      email: 'm@x.vn',
      username: 'minh',
      password: '12345678',
    };
    const first = controller.signUp(form);
    expect(await controller.signUp(form)).toBe(false);
    release();
    expect(await first).toBe(true);
    expect(register).toHaveBeenCalledTimes(1);
  });
});
