import { inject, injectable } from 'inversiland';
import type { UseCase } from '@/shared/application/UseCase';
import { SessionRepositoryToken, type SessionRepository } from '../domain/ports';
import type { Session } from '../domain/Session';

@injectable()
export class GetSession implements UseCase<void, Session | undefined> {
  constructor(@inject(SessionRepositoryToken) private readonly sessions: SessionRepository) {}

  execute(): Session | undefined {
    return this.sessions.get();
  }
}
