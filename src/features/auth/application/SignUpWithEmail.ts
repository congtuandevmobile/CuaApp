import { Injectable } from '@magic-runtime/di';
import type { UseCase } from '@/shared/application/UseCase';
import { AccountGateway, SessionRepository } from '../domain/ports';
import { validateRegistration, type Registration, type Session } from '../domain/Session';

/** Creates an account. A guest that signs up keeps every local activity: the guest id travels with the request. */
@Injectable([SessionRepository, AccountGateway])
export class SignUpWithEmail implements UseCase<Registration, Promise<Session>> {
  constructor(
    private readonly sessions: SessionRepository,
    private readonly accounts: AccountGateway,
  ) {}

  async execute(registration: Registration): Promise<Session> {
    validateRegistration(registration);
    const current = this.sessions.get();
    const created = await this.accounts.register(registration, current?.kind === 'guest' ? current.id : undefined);
    const session: Session = {
      kind: 'account',
      id: created.id,
      email: registration.email.trim(),
      name: registration.name.trim(),
    };
    this.sessions.save(session);
    return session;
  }
}
