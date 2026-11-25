/** A rule of the domain was broken. `code` is stable: switch on it, never on the message. */
export class DomainError extends Error {
  constructor(readonly code: string, message: string) {
    super(message);
    this.name = 'DomainError';
  }
}
