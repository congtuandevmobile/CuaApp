import { Module, bind } from '@magic-runtime/di';
import { Clock, IdGenerator, KeyValueStore } from './domain/ports';
import { MmkvKeyValueStore } from '@/platform/storage/MmkvKeyValueStore';
import { RandomIdGenerator } from '@/platform/identity/RandomIdGenerator';
import { SystemClock } from '@/platform/time/SystemClock';

/**
 * Generic platform adapters behind the shared ports. Factories (not decorated classes) keep `platform/` free of DI
 * annotations, and are lazy: MMKV opens only when the first repository needs it.
 */
@Module({
  providers: [
    bind(KeyValueStore).toFactory([], () => new MmkvKeyValueStore()),
    bind(IdGenerator).toFactory([], () => new RandomIdGenerator()),
    bind(Clock).toFactory([], () => new SystemClock()),
  ],
})
export class SharedModule {}
