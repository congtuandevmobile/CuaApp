import { Injectable } from '@magic-runtime/di';
import type { UseCase } from '@/shared/application/UseCase';
import { SessionRepository } from '../domain/ports';
import type { Session } from '../domain/Session';

@Injectable([SessionRepository])
export class GetSession implements UseCase<void, Session | undefined> {
  constructor(private readonly sessions: SessionRepository) {}

  execute(): Session | undefined {
    return this.sessions.get();
  }
}
