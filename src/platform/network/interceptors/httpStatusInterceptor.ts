import type { HttpInterceptor } from '../HttpClient';
import { HttpError } from '../networkErrors';

/** Converts non-2xx responses to a typed error so retry/auth middleware can reason about them. */
export const httpStatusInterceptor: HttpInterceptor = async (request, next) => {
  const response = await next(request);
  if (response.status >= 200 && response.status < 300) return response;
  throw new HttpError(
    'HTTP_STATUS',
    `HTTP ${response.status} ${response.statusText}`,
    request,
    response,
  );
};
