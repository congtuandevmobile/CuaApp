import { token } from '@magic-runtime/di';
import type { Credentials, Registration, Session } from './Session';

export interface SessionRepository {
  get(): Session | undefined;
  save(session: Session): void;
  clear(): void;
}

/** What the backend hands out after a sign-up, a sign-in or a refresh. Never shown, never logged. */
export interface AuthTokens {
  readonly accessToken: string;
  readonly refreshToken: string;
  /** Epoch ms when the access token stops being accepted, when the server says. */
  readonly expiresAtMs?: number;
}

export interface AuthenticatedAccount {
  readonly id: string;
  readonly username: string;
  readonly email?: string;
  readonly name?: string;
  /** Public short code, e.g. `ABC314`. */
  readonly code?: string;
  readonly tokens: AuthTokens;
}

/**
 * The backend that owns accounts (username + password). Failures are DomainErrors with a stable code: the server's own
 * (`AUTH_EMAIL_TAKEN`, `AUTH_USERNAME_TAKEN`, `AUTH_LOGIN_FAILED`...) or `AUTH_NETWORK` / `AUTH_SERVER`.
 */
export interface AccountGateway {
  register(registration: Registration, guestId?: string): Promise<AuthenticatedAccount>;
  signIn(credentials: Credentials): Promise<AuthenticatedAccount>;
  /** A new pair; the old refresh token stops working (rotation). */
  refresh(refreshToken: string): Promise<AuthTokens>;
  /** Revokes the tokens on the server. */
  signOut(accessToken: string): Promise<void>;
}

/** Where the tokens of the signed-in account are kept on the device. */
export interface TokenStore {
  get(): AuthTokens | undefined;
  save(tokens: AuthTokens): void;
  clear(): void;
}

export const SessionRepository = token<SessionRepository>('auth.SessionRepository');
export const AccountGateway = token<AccountGateway>('auth.AccountGateway');
export const TokenStore = token<TokenStore>('auth.TokenStore');
