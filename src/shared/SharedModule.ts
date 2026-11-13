import { module } from 'inversiland';
import { ClockToken, IdGeneratorToken, KeyValueStoreToken } from './domain/ports';
import { MmkvKeyValueStore } from '@/platform/storage/MmkvKeyValueStore';
import { RandomIdGenerator } from '@/platform/identity/RandomIdGenerator';
import { SystemClock } from '@/platform/time/SystemClock';

@module({
  providers: [
    { provide: KeyValueStoreToken, useClass: MmkvKeyValueStore },
    { provide: IdGeneratorToken, useClass: RandomIdGenerator },
    { provide: ClockToken, useClass: SystemClock },
  ],
  exports: [KeyValueStoreToken, IdGeneratorToken, ClockToken],
})
export class SharedModule {}
