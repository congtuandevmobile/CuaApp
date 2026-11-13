import { DomainError } from '@/shared/domain/DomainError';

/** Who is using the app. A guest is a first-class user: everything local works without an account. */
export type Session =
  | { readonly kind: 'guest'; readonly id: string }
  | { readonly kind: 'account'; readonly id: string; readonly email: string; readonly name: string };

export const isGuest = (s: Session): s is Extract<Session, { kind: 'guest' }> => s.kind === 'guest';

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export interface Registration {
  readonly name: string;
  readonly email: string;
  readonly password: string;
}

/** The rules of a registration; throws a DomainError with a stable code. */
export function validateRegistration(r: Registration): void {
  if (r.name.trim().length < 1) throw new DomainError('AUTH_NAME_REQUIRED', 'Enter your name.');
  if (!EMAIL.test(r.email.trim())) throw new DomainError('AUTH_EMAIL_INVALID', 'Enter a full email address.');
  if (r.password.length < 8) throw new DomainError('AUTH_PASSWORD_TOO_SHORT', 'Use at least 8 characters.');
}
