import { token } from '@magic-runtime/di';
export type HttpMethod = 'DELETE' | 'GET' | 'HEAD' | 'OPTIONS' | 'PATCH' | 'POST' | 'PUT';

export type HttpHeaders = Readonly<Record<string, string>>;

export type HttpBody = string | ArrayBuffer | Blob | FormData | URLSearchParams;

export interface HttpRequest {
  readonly url: string;
  readonly method?: HttpMethod;
  readonly headers?: HttpHeaders;
  readonly body?: HttpBody;
  readonly signal?: AbortSignal;
  readonly timeoutMs?: number;
  /** Middleware state. Never send this field over the wire. */
  readonly context?: Readonly<Record<string, unknown>>;
}

export interface HttpResponse<T = unknown> {
  readonly url: string;
  readonly status: number;
  readonly statusText: string;
  readonly headers: HttpHeaders;
  readonly data: T;
}

export type HttpHandler = (request: HttpRequest) => Promise<HttpResponse>;

/** A composable onion middleware. Keep middleware deterministic and side-effect free except for its own policy. */
export type HttpInterceptor = (request: HttpRequest, next: HttpHandler) => Promise<HttpResponse>;

export type HttpRequestOptions = Omit<
  HttpRequest,
  'url' | 'method' | 'body'
>;

export interface HttpClient {
  request<T = unknown>(request: HttpRequest): Promise<HttpResponse<T>>;
  get<T = unknown>(url: string, options?: HttpRequestOptions): Promise<HttpResponse<T>>;
  post<T = unknown>(url: string, body?: HttpBody, options?: HttpRequestOptions): Promise<HttpResponse<T>>;
}

/** DI token used by feature data sources; concrete transport stays in platform. */
export const HttpClient = token<HttpClient>('platform.network.HttpClient');

export function composeInterceptors(interceptors: readonly HttpInterceptor[], transport: HttpHandler): HttpHandler {
  return interceptors.reduceRight<HttpHandler>((next, interceptor) => (request) => interceptor(request, next), transport);
}

export function createHttpClient(transport: HttpHandler, interceptors: readonly HttpInterceptor[] = []): HttpClient {
  const handler = composeInterceptors(interceptors, transport);
  return {
    request: <T>(request: HttpRequest) => handler(request) as Promise<HttpResponse<T>>,
    get: <T>(url: string, options: HttpRequestOptions = {}) => handler({ ...options, url, method: 'GET' }) as Promise<HttpResponse<T>>,
    post: <T>(url: string, body?: HttpBody, options: HttpRequestOptions = {}) => handler({ ...options, url, method: 'POST', body }) as Promise<HttpResponse<T>>,
  };
}
