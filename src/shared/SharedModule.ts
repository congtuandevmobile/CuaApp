import { Module, bind, optional } from '@magic-runtime/di';
import { Clock, IdGenerator, KeyValueStore } from './domain/ports';
import { MmkvKeyValueStore } from '@/platform/storage/MmkvKeyValueStore';
import { RandomIdGenerator } from '@/platform/identity/RandomIdGenerator';
import { SystemClock } from '@/platform/time/SystemClock';
import {
  ApiBaseUrl,
  HttpClient,
  PublicHttpClient,
} from '@/platform/network/HttpClient';
import { AuthTokenProvider } from '@/platform/network/interceptors/authInterceptor';
import { createApiHttpClient } from '@/platform/network/createApiHttpClient';

/**
 * Generic platform adapters behind the shared ports. Factories (not decorated classes) keep `platform/` free of DI
 * annotations, and are lazy: MMKV opens only when the first repository needs it, no HTTP client exists before the
 * first request.
 */
@Module({
  providers: [
    bind(KeyValueStore).toFactory([], () => new MmkvKeyValueStore()),
    bind(IdGenerator).toFactory([], () => new RandomIdGenerator()),
    bind(Clock).toFactory([], () => new SystemClock()),
    bind(PublicHttpClient).toFactory([ApiBaseUrl], baseUrl =>
      createApiHttpClient({ baseUrl }),
    ),
    // Bearer + one refresh/replay on 401 when a feature binds AuthTokenProvider (auth does); anonymous otherwise.
    bind(HttpClient).toFactory(
      [ApiBaseUrl, optional(AuthTokenProvider)],
      (baseUrl, auth) => createApiHttpClient({ baseUrl, auth }),
    ),
  ],
})
export class SharedModule {}
