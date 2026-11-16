import { Injectable } from '@magic-runtime/di';
import { DomainError } from '@/shared/domain/DomainError';
import { PublicHttpClient, type HttpClient } from '@/platform/network/HttpClient';
import { HttpError } from '@/platform/network/networkErrors';
import type { AccountGateway, AuthenticatedAccount, AuthTokens } from '../domain/ports';
import type { Credentials, Registration } from '../domain/Session';

/** JSON shapes of Cua API (CuaApp-BE docs/openapi.yaml). They never leave this file. */
interface UserDto {
  id: string;
  username: string;
  email?: string;
  name?: string;
  code?: string;
}
interface SessionDto {
  accessToken: string;
  refreshToken: string;
  /** Epoch seconds. */
  expiresAt?: number;
  user: UserDto;
}
interface SessionResponseDto {
  session: SessionDto | null;
}
interface ErrorDto {
  error?: { code?: string; message?: string };
}

const ACCEPT_JSON = { accept: 'application/json' };
/** Only with a body: a JSON content-type on an empty body is a 400 for Fastify (it would silently break logout). */
const SEND_JSON = { ...ACCEPT_JSON, 'content-type': 'application/json' };
const TIMEOUT_MS = 10_000;

/**
 * `AccountGateway` over Cua API. Uses the PUBLIC client (no automatic bearer / refresh): these calls are what create
 * and renew the tokens, so they must not depend on them.
 */
@Injectable([PublicHttpClient])
export class HttpAccountGateway implements AccountGateway {
  constructor(private readonly http: HttpClient) {}

  async register(registration: Registration, guestId?: string): Promise<AuthenticatedAccount> {
    const body = {
      name: registration.name.trim(),
      email: registration.email.trim(),
      username: registration.username.trim(),
      password: registration.password,
      guestId,
    };
    const res = await this.send<SessionResponseDto>('/v1/auth/signup', body);
    if (!res.session) throw new DomainError('AUTH_SERVER', 'The server returned no session.');
    return toAccount(res.session);
  }

  async signIn(credentials: Credentials): Promise<AuthenticatedAccount> {
    const res = await this.send<SessionResponseDto>('/v1/auth/login', { username: credentials.username, password: credentials.password });
    if (!res.session) throw new DomainError('AUTH_SERVER', 'The server returned no session.');
    return toAccount(res.session);
  }

  async refresh(refreshToken: string): Promise<AuthTokens> {
    const res = await this.send<SessionResponseDto>('/v1/auth/refresh', { refreshToken });
    if (!res.session) throw new DomainError('AUTH_SERVER', 'The server returned no session.');
    return toTokens(res.session);
  }

  async signOut(accessToken: string): Promise<void> {
    await this.send('/v1/auth/logout', undefined, { authorization: `Bearer ${accessToken}` });
  }

  private async send<T>(path: string, body: unknown, headers: Record<string, string> = {}): Promise<T> {
    try {
      const res = await this.http.post<T>(path, body === undefined ? undefined : JSON.stringify(body), {
        headers: { ...(body === undefined ? ACCEPT_JSON : SEND_JSON), ...headers },
        timeoutMs: TIMEOUT_MS,
      });
      return res.data;
    } catch (error) {
      throw toDomainError(error);
    }
  }
}

function toTokens(s: SessionDto): AuthTokens {
  return { accessToken: s.accessToken, refreshToken: s.refreshToken, expiresAtMs: s.expiresAt === undefined ? undefined : s.expiresAt * 1000 };
}

function toAccount(s: SessionDto): AuthenticatedAccount {
  return { id: s.user.id, username: s.user.username, email: s.user.email, name: s.user.name, code: s.user.code, tokens: toTokens(s) };
}

/** Transport and server failures become stable domain codes; the UI switches on the code, never on HTTP. */
function toDomainError(error: unknown): DomainError {
  if (!(error instanceof HttpError)) return new DomainError('AUTH_SERVER', error instanceof Error ? error.message : String(error));
  if (error.code === 'NETWORK' || error.code === 'TIMEOUT') return new DomainError('AUTH_NETWORK', 'Cannot reach the server.');
  const status = error.status ?? 0;
  const server = (error.response?.data as ErrorDto | undefined)?.error;
  if (status >= 500 || !server?.code) return new DomainError('AUTH_SERVER', server?.message ?? error.message);
  return new DomainError(server.code, server.message ?? error.message);
}
