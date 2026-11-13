import { InMemoryKeyValueStore, SequenceIdGenerator } from '@/shared/testing/fakes';
import { KeyValueSessionRepository } from '../infrastructure/KeyValueSessionRepository';
import { LocalAccountGateway } from '../infrastructure/LocalAccountGateway';
import type { AccountGateway } from '../domain/ports';
import { ContinueAsGuest } from './ContinueAsGuest';
import { GetSession } from './GetSession';
import { SignOut } from './SignOut';
import { SignUpWithEmail } from './SignUpWithEmail';
import { AuthController } from '../presentation/AuthController';

function setup(gateway?: AccountGateway) {
  const store = new InMemoryKeyValueStore();
  const sessions = new KeyValueSessionRepository(store);
  const ids = new SequenceIdGenerator();
  const accounts = gateway ?? new LocalAccountGateway(ids);
  const guest = new ContinueAsGuest(sessions, ids);
  const signUp = new SignUpWithEmail(sessions, accounts);
  const get = new GetSession(sessions);
  const out = new SignOut(sessions);
  return { store, sessions, guest, signUp, get, out, controller: new AuthController(get, guest, signUp, out) };
}

describe('guest', () => {
  it('creates a local guest once and reuses it', () => {
    const { guest, get } = setup();
    const a = guest.execute();
    const b = guest.execute();
    expect(a).toEqual({ kind: 'guest', id: 'guest-id-1' });
    expect(b).toEqual(a);
    expect(get.execute()).toEqual(a);
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
    [{ name: '', email: 'a@b.co', password: '12345678' }, 'AUTH_NAME_REQUIRED'],
    [{ name: 'A', email: 'nope', password: '12345678' }, 'AUTH_EMAIL_INVALID'],
    [{ name: 'A', email: 'a@b.co', password: 'short' }, 'AUTH_PASSWORD_TOO_SHORT'],
  ])('rejects %j with %s and keeps the session', async (input, code) => {
    const { signUp, guest, get } = setup();
    const g = guest.execute();
    await expect(signUp.execute(input)).rejects.toMatchObject({ code });
    expect(get.execute()).toEqual(g);
  });

  it('hands the guest id to the backend so local activities can migrate', async () => {
    const register = jest.fn(async () => ({ id: 'acct-1' }));
    const { signUp, guest, get } = setup({ register });
    const g = guest.execute();
    const s = await signUp.execute({ name: ' Minh ', email: ' m@x.vn ', password: 'longenough' });
    expect(register).toHaveBeenCalledWith(expect.objectContaining({ email: ' m@x.vn ' }), g.id);
    expect(s).toEqual({ kind: 'account', id: 'acct-1', email: 'm@x.vn', name: 'Minh' });
    expect(get.execute()).toEqual(s);
  });
});

describe('AuthController', () => {
  it('exposes a stable error code and busy state', async () => {
    const { controller } = setup();
    const ok = await controller.signUp({ name: 'A', email: 'bad', password: '12345678' });
    expect(ok).toBe(false);
    expect(controller.errorCode).toBe('AUTH_EMAIL_INVALID');
    expect(controller.busy).toBe(false);
    expect(await controller.signUp({ name: 'A', email: 'a@b.co', password: '12345678' })).toBe(true);
    expect(controller.errorCode).toBeUndefined();
    expect(controller.session?.kind).toBe('account');
    controller.signOut();
    expect(controller.session).toBeUndefined();
  });
});
