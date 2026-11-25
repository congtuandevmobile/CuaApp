import { fetch as nitroFetch } from 'react-native-nitro-fetch';
import type {
  HttpHandler,
  HttpHeaders,
  HttpRequest,
  HttpResponse,
} from './HttpClient';
import { HttpError } from './networkErrors';

type NitroFetchInit = NonNullable<Parameters<typeof nitroFetch>[1]>;

function toHeaders(headers: Headers): HttpHeaders {
  const result: Record<string, string> = {};
  headers.forEach((value, key) => {
    result[key.toLowerCase()] = value;
  });
  return result;
}

async function readBody(response: Response): Promise<unknown> {
  if (response.status === 204 || response.status === 205) return undefined;
  const contentType = response.headers.get('content-type')?.toLowerCase() ?? '';
  const text = await response.text();
  if (text.length === 0) return undefined;
  if (!contentType.includes('json')) return text;
  try {
    return JSON.parse(text) as unknown;
  } catch (cause) {
    throw new HttpError(
      'INVALID_JSON',
      'The server returned invalid JSON.',
      { url: response.url },
      undefined,
      cause,
    );
  }
}

function timeoutSignal(request: HttpRequest): {
  signal?: AbortSignal;
  dispose: () => void;
} {
  if (request.timeoutMs === undefined)
    return { signal: request.signal, dispose: () => undefined };
  const controller = new AbortController();
  const onAbort = () => controller.abort(request.signal?.reason);
  request.signal?.addEventListener('abort', onAbort, { once: true });
  const timer = setTimeout(
    () => controller.abort('timeout'),
    request.timeoutMs,
  );
  return {
    signal: controller.signal,
    dispose: () => {
      clearTimeout(timer);
      request.signal?.removeEventListener('abort', onAbort);
    },
  };
}

/** Nitro Fetch transport. No feature may import the Nitro package directly. */
export const nitroFetchTransport: HttpHandler = async (
  request,
): Promise<HttpResponse> => {
  const method = request.method ?? 'GET';
  const timeout = timeoutSignal(request);
  try {
    const response = await nitroFetch(request.url, {
      method,
      headers: request.headers,
      // Nitro Fetch owns the platform-specific BodyInit type; this is the only cast at the adapter boundary.
      body: request.body as NitroFetchInit['body'],
      signal: timeout.signal as NitroFetchInit['signal'],
    });
    const data = await readBody(response);
    return {
      url: response.url || request.url,
      status: response.status,
      statusText: response.statusText,
      headers: toHeaders(response.headers),
      data,
    };
  } catch (cause) {
    if (cause instanceof HttpError) throw cause;
    const timedOut =
      timeout.signal?.aborted && timeout.signal.reason === 'timeout';
    const aborted = timeout.signal?.aborted || request.signal?.aborted;
    let code: 'TIMEOUT' | 'ABORTED' | 'NETWORK' = 'NETWORK';
    let message = 'Network request failed.';
    if (timedOut) {
      code = 'TIMEOUT';
      message = `Request timed out after ${request.timeoutMs}ms.`;
    } else if (aborted) {
      code = 'ABORTED';
    }
    throw new HttpError(code, message, request, undefined, cause);
  } finally {
    timeout.dispose();
  }
};
