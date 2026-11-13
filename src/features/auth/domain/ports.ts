import type { Registration, Session } from './Session';

export interface SessionRepository {
  get(): Session | undefined;
  save(session: Session): void;
  clear(): void;
}

/** The backend that owns accounts. Not built yet: the infrastructure ships a local stand-in. */
export interface AccountGateway {
  register(registration: Registration, guestId?: string): Promise<{ id: string }>;
}

export const SessionRepositoryToken = Symbol.for('auth.SessionRepository');
export const AccountGatewayToken = Symbol.for('auth.AccountGateway');
