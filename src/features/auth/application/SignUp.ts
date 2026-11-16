import { Injectable } from '@magic-runtime/di';
import type { UseCase } from '@/shared/application/UseCase';
import { AccountGateway, SessionRepository, TokenStore } from '../domain/ports';
import { validateRegistration, type Registration, type Session } from '../domain/Session';

/**
 * Creates an account (name, email, username, password) and signs it in. A guest that signs up keeps every local activity: the
 * guest id travels with the request.
 */
@Injectable([SessionRepository, AccountGateway, TokenStore])
export class SignUp implements UseCase<Registration, Promise<Session>> {
  constructor(
    private readonly sessions: SessionRepository,
    private readonly accounts: AccountGateway,
    private readonly tokens: TokenStore,
  ) {}

  async execute(registration: Registration): Promise<Session> {
    validateRegistration(registration); // fails fast, before any request
    const current = this.sessions.get();
    const created = await this.accounts.register(registration, current?.kind === 'guest' ? current.id : undefined);
    const session: Session = {
      kind: 'account',
      id: created.id,
      username: created.username,
      name: created.name ?? registration.name.trim(),
      email: created.email ?? registration.email.trim().toLowerCase(),
      code: created.code,
    };
    this.tokens.save(created.tokens);
    this.sessions.save(session);
    return session;
  }
}
