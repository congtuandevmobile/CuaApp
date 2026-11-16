import { Injectable } from '@magic-runtime/di';
import { IdGenerator } from '@/shared/domain/ports';
import type { AccountGateway } from '../domain/ports';
import type { Registration } from '../domain/Session';

/**
 * PLACEHOLDER for the backend: it only mints a local account id. Replace it with an HTTP gateway that implements the
 * same `AccountGateway` port; nothing else in the app changes.
 */
@Injectable([IdGenerator])
export class LocalAccountGateway implements AccountGateway {
  constructor(private readonly ids: IdGenerator) {}

  async register(_registration: Registration, _guestId?: string): Promise<{ id: string }> {
    return { id: `account-${this.ids.next()}` };
  }
}
