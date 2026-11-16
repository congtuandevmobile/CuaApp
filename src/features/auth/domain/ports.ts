import type { Registration, Session } from './Session';
import { token } from '@magic-runtime/di';

export interface SessionRepository {
  get(): Session | undefined;
  save(session: Session): void;
  clear(): void;
}

/** The backend that owns accounts. Not built yet: the infrastructure ships a local stand-in. */
export interface AccountGateway {
  register(registration: Registration, guestId?: string): Promise<{ id: string }>;
}

export const SessionRepository = token<SessionRepository>('auth.SessionRepository');
export const AccountGateway = token<AccountGateway>('auth.AccountGateway');
