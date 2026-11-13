import type { IdGenerator } from '@/shared/domain/ports';

/** Collision-safe enough for local ids (time + random). A server can replace it with UUIDs later. */
export class RandomIdGenerator implements IdGenerator {
  next(): string {
    return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
  }
}
