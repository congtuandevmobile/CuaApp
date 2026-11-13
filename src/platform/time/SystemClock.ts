import type { Clock } from '@/shared/domain/ports';

export class SystemClock implements Clock {
  nowMs(): number {
    return Date.now();
  }
}
