import { Injectable } from '@magic-runtime/di';
import type { UseCase } from '@/shared/application/UseCase';
import { AccountGateway, SessionRepository, TokenStore } from '../domain/ports';

/**
 * Signs out on this device at once, then asks the server to revoke the tokens. Being offline never keeps someone
 * signed in: the server call is best effort and its failure is ignored.
 */
@Injectable([SessionRepository, TokenStore, AccountGateway])
export class SignOut implements UseCase<void, Promise<void>> {
  constructor(
    private readonly sessions: SessionRepository,
    private readonly tokens: TokenStore,
    private readonly accounts: AccountGateway,
  ) {}

  async execute(): Promise<void> {
    const accessToken = this.tokens.get()?.accessToken;
    this.tokens.clear();
    this.sessions.clear();
    if (!accessToken) return;
    try {
      await this.accounts.signOut(accessToken);
    } catch {
      // Local sign-out already happened; the token expires on its own.
    }
  }
}
