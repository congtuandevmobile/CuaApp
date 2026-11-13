import { inject, injectable } from 'inversiland';
import type { UseCase } from '@/shared/application/UseCase';
import { SessionRepositoryToken, type SessionRepository } from '../domain/ports';

@injectable()
export class SignOut implements UseCase<void, void> {
  constructor(@inject(SessionRepositoryToken) private readonly sessions: SessionRepository) {}

  execute(): void {
    this.sessions.clear();
  }
}
