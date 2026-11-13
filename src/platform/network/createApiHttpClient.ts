import { createHttpClient, type HttpInterceptor, type HttpClient } from './HttpClient';
import { nitroFetchTransport } from './nitroFetchHttpClient';
import { httpStatusInterceptor } from './interceptors/httpStatusInterceptor';
import { createAuthInterceptor, type AuthTokenProvider } from './interceptors/authInterceptor';
import { createRetryInterceptor, type RetryOptions } from './interceptors/retryInterceptor';

export interface ApiHttpClientOptions {
  readonly baseUrl: string;
  readonly auth?: AuthTokenProvider;
  readonly retry?: RetryOptions;
  readonly interceptors?: readonly HttpInterceptor[];
}

function baseUrlInterceptor(baseUrl: string): HttpInterceptor {
  const normalized = baseUrl.replace(/\/$/, '');
  return (request, next) => next({ ...request, url: request.url.startsWith('http') ? request.url : `${normalized}/${request.url.replace(/^\//, '')}` });
}

/** The application API client composition. Feature repositories receive HttpClient, never Nitro Fetch. */
export function createApiHttpClient(options: ApiHttpClientOptions): HttpClient {
  // User middleware wraps the policy stack, so logging/metrics can observe retries and terminal errors.
  const interceptors: HttpInterceptor[] = [baseUrlInterceptor(options.baseUrl), ...(options.interceptors ?? []), createRetryInterceptor(options.retry), ...(options.auth ? [createAuthInterceptor(options.auth)] : []), httpStatusInterceptor];
  return createHttpClient(nitroFetchTransport, interceptors);
}
