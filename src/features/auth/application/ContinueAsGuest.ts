import { Injectable } from '@magic-runtime/di';
import type { UseCase } from '@/shared/application/UseCase';
import { IdGenerator } from '@/shared/domain/ports';
import { SessionRepository } from '../domain/ports';
import type { Session } from '../domain/Session';

/** Starts (or resumes) a guest session: a local id, nothing leaves the device. */
@Injectable([SessionRepository, IdGenerator])
export class ContinueAsGuest implements UseCase<void, Session> {
  constructor(
    private readonly sessions: SessionRepository,
    private readonly ids: IdGenerator,
  ) {}

  execute(): Session {
    const existing = this.sessions.get();
    if (existing) return existing;
    const session: Session = { kind: 'guest', id: `guest-${this.ids.next()}` };
    this.sessions.save(session);
    return session;
  }
}
