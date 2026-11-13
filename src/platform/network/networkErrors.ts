import type { HttpRequest, HttpResponse } from './HttpClient';

export type HttpErrorCode = 'HTTP_STATUS' | 'NETWORK' | 'TIMEOUT' | 'ABORTED' | 'INVALID_JSON';

export class HttpError extends Error {
  constructor(
    readonly code: HttpErrorCode,
    message: string,
    readonly request: HttpRequest,
    readonly response?: HttpResponse,
    readonly cause?: unknown,
  ) {
    super(message);
    this.name = 'HttpError';
  }

  get status(): number | undefined {
    return this.response?.status;
  }
}

export function isRetryableError(error: unknown): boolean {
  if (!(error instanceof HttpError)) return true;
  if (error.code === 'TIMEOUT' || error.code === 'NETWORK') return true;
  return error.code === 'HTTP_STATUS' && error.status !== undefined && [408, 425, 429, 500, 502, 503, 504].includes(error.status);
}
