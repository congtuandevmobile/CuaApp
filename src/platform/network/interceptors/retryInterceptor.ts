import type { HttpHandler, HttpInterceptor } from '../HttpClient';
import { isRetryableError } from '../networkErrors';

const IDEMPOTENT = new Set(['GET', 'HEAD', 'OPTIONS', 'PUT', 'DELETE']);

export interface RetryOptions {
  readonly maxAttempts?: number;
  readonly baseDelayMs?: number;
  readonly maxDelayMs?: number;
}

const wait = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms));

/** Retries only safe/idempotent requests and transient failures. Never retries POST by default. */
export function createRetryInterceptor(options: RetryOptions = {}): HttpInterceptor {
  const maxAttempts = Math.max(1, options.maxAttempts ?? 3);
  const baseDelayMs = options.baseDelayMs ?? 250;
  const maxDelayMs = options.maxDelayMs ?? 2_000;
  return async (request, next) => {
    if (!IDEMPOTENT.has(request.method ?? 'GET')) return next(request);
    const attemptRequest = async (attempt: number): ReturnType<HttpHandler> => {
      try {
        return await next(request);
      } catch (error) {
        if (attempt >= maxAttempts || !isRetryableError(error)) throw error;
        await wait(Math.min(maxDelayMs, baseDelayMs * 2 ** (attempt - 1)));
        return attemptRequest(attempt + 1);
      }
    };
    return attemptRequest(1);
  };
}
