import { Injectable } from '@magic-runtime/di';
import { KeyValueStore } from '@/shared/domain/ports';
import type { AuthTokens, TokenStore } from '../domain/ports';

const KEY = 'auth.tokens';

/**
 * Tokens in the app's key-value store, apart from the session (which the UI reads). TEMPORARY: MMKV is not encrypted;
 * production should keep the refresh token in the Keychain / Keystore behind this same port.
 */
@Injectable([KeyValueStore])
export class KeyValueTokenStore implements TokenStore {
  constructor(private readonly store: KeyValueStore) {}

  get(): AuthTokens | undefined {
    const raw = this.store.getString(KEY);
    if (!raw) return undefined;
    try {
      const value = JSON.parse(raw) as Partial<AuthTokens>;
      if (
        typeof value.accessToken === 'string' &&
        typeof value.refreshToken === 'string'
      )
        return value as AuthTokens;
    } catch {
      // fall through: a damaged value is dropped
    }
    this.store.remove(KEY);
    return undefined;
  }

  save(tokens: AuthTokens): void {
    this.store.setString(KEY, JSON.stringify(tokens));
  }

  clear(): void {
    this.store.remove(KEY);
  }
}
