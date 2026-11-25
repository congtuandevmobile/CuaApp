import { Injectable } from '@magic-runtime/di';
import type { UseCase } from '@/shared/application/UseCase';
import { AccountGateway, SessionRepository, TokenStore } from '../domain/ports';
import {
  validateCredentials,
  type Credentials,
  type Session,
} from '../domain/Session';

/** Signs in with the username or the email + password; replaces a guest session on this device. */
@Injectable([SessionRepository, AccountGateway, TokenStore])
export class SignIn implements UseCase<Credentials, Promise<Session>> {
  constructor(
    private readonly sessions: SessionRepository,
    private readonly accounts: AccountGateway,
    private readonly tokens: TokenStore,
  ) {}

  async execute(credentials: Credentials): Promise<Session> {
    validateCredentials(credentials);
    const account = await this.accounts.signIn({
      username: credentials.username.trim(),
      password: credentials.password,
    });
    const session: Session = {
      kind: 'account',
      id: account.id,
      username: account.username,
      name: account.name ?? account.username,
      email: account.email,
      code: account.code,
    };
    this.tokens.save(account.tokens);
    this.sessions.save(session);
    return session;
  }
}
