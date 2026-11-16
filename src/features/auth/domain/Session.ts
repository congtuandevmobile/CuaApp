import { DomainError } from '@/shared/domain/DomainError';

/** Who is using the app. A guest is a first-class user: everything local works without an account. */
export type Session =
  | { readonly kind: 'guest'; readonly id: string }
  | {
      readonly kind: 'account';
      /** Internal id (a UUID from the backend). Never shown. */
      readonly id: string;
      readonly username: string;
      readonly name: string;
      readonly email?: string;
      /** Public short code people see and share, e.g. `ABC314`. */
      readonly code?: string;
    };

export const isGuest = (s: Session): s is Extract<Session, { kind: 'guest' }> => s.kind === 'guest';

/** 3–30 characters: letters, digits, `_` and `.`. Case-insensitive (the server stores it lowercase). */
const USERNAME = /^[A-Za-z0-9_.]{3,30}$/;
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export interface Registration {
  readonly name: string;
  readonly email: string;
  readonly username: string;
  readonly password: string;
}

export interface Credentials {
  /** The username or the email of the account. */
  readonly username: string;
  readonly password: string;
}

/** The rules of a sign-in form; throws a DomainError with a stable code. */
export function validateCredentials(c: Credentials): void {
  if (c.username.trim().length === 0) throw new DomainError('AUTH_USERNAME_REQUIRED', 'Enter your username.');
  if (c.password.length === 0) throw new DomainError('AUTH_PASSWORD_REQUIRED', 'Enter your password.');
}

/** The rules of a registration; throws a DomainError with a stable code. */
export function validateRegistration(r: Registration): void {
  if (r.name.trim().length < 1) throw new DomainError('AUTH_NAME_REQUIRED', 'Enter your name.');
  if (!EMAIL.test(r.email.trim())) throw new DomainError('AUTH_EMAIL_INVALID', 'Enter a full email address.');
  if (!USERNAME.test(r.username.trim())) throw new DomainError('AUTH_USERNAME_INVALID', 'Use 3–30 letters, digits, "_" or ".".');
  if (r.password.length < 8) throw new DomainError('AUTH_PASSWORD_TOO_SHORT', 'Use at least 8 characters.');
}
