import { Injectable } from '@magic-runtime/di';
import { DomainError } from '@/shared/domain/DomainError';
import type { UseCase } from '@/shared/application/UseCase';
import { AccountGateway, TokenStore } from '../domain/ports';

/**
 * Called by the HTTP layer when the server answers 401: trades the refresh token for a new pair. Resolves the new
 * access token, or `undefined` when there is none to give (no tokens, or the server refused the refresh token, which
 * is then dropped). A network failure is rethrown so the original request fails as offline, not as signed out.
 */
@Injectable([TokenStore, AccountGateway])
export class RefreshAccessToken
  implements UseCase<void, Promise<string | undefined>>
{
  constructor(
    private readonly tokens: TokenStore,
    private readonly accounts: AccountGateway,
  ) {}

  async execute(): Promise<string | undefined> {
    const current = this.tokens.get();
    if (!current) return undefined;
    try {
      const renewed = await this.accounts.refresh(current.refreshToken);
      this.tokens.save(renewed);
      return renewed.accessToken;
    } catch (error) {
      if (error instanceof DomainError && error.code === 'AUTH_NETWORK')
        throw error;
      this.tokens.clear();
      return undefined;
    }
  }
}
