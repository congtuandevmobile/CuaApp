import { Injectable } from '@magic-runtime/di';
import type { UseCase } from '@/shared/application/UseCase';
import { SessionRepository } from '../domain/ports';

@Injectable([SessionRepository])
export class SignOut implements UseCase<void, void> {
  constructor(private readonly sessions: SessionRepository) {}

  execute(): void {
    this.sessions.clear();
  }
}
