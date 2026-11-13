import { inject, injectable } from 'inversiland';
import { IdGeneratorToken, type IdGenerator } from '@/shared/domain/ports';
import type { AccountGateway } from '../domain/ports';
import type { Registration } from '../domain/Session';

/**
 * PLACEHOLDER for the backend: it only mints a local account id. Replace it with an HTTP gateway that implements the
 * same `AccountGateway` port; nothing else in the app changes.
 */
@injectable()
export class LocalAccountGateway implements AccountGateway {
  constructor(@inject(IdGeneratorToken) private readonly ids: IdGenerator) {}

  async register(_registration: Registration, _guestId?: string): Promise<{ id: string }> {
    return { id: `account-${this.ids.next()}` };
  }
}
