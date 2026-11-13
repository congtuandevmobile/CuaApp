import { inject, injectable } from 'inversiland';
import type { UseCase } from '@/shared/application/UseCase';
import { IdGeneratorToken, type IdGenerator } from '@/shared/domain/ports';
import { SessionRepositoryToken, type SessionRepository } from '../domain/ports';
import type { Session } from '../domain/Session';

/** Starts (or resumes) a guest session: a local id, nothing leaves the device. */
@injectable()
export class ContinueAsGuest implements UseCase<void, Session> {
  constructor(
    @inject(SessionRepositoryToken) private readonly sessions: SessionRepository,
    @inject(IdGeneratorToken) private readonly ids: IdGenerator,
  ) {}

  execute(): Session {
    const existing = this.sessions.get();
    if (existing) return existing;
    const session: Session = { kind: 'guest', id: `guest-${this.ids.next()}` };
    this.sessions.save(session);
    return session;
  }
}
