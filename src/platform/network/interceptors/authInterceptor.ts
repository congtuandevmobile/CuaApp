import type { HttpInterceptor } from '../HttpClient';
import { HttpError } from '../networkErrors';

export interface AuthTokenProvider {
  accessToken(): string | undefined | Promise<string | undefined>;
  refreshAccessToken(): Promise<string | undefined>;
}

/** Adds bearer auth and performs one refresh/replay for concurrent 401s. */
export function createAuthInterceptor(provider: AuthTokenProvider): HttpInterceptor {
  let refresh: Promise<string | undefined> | undefined;
  const getToken = () => provider.accessToken();
  const refreshOnce = () => (refresh ??= provider.refreshAccessToken().finally(() => { refresh = undefined; }));

  return async (request, next) => {
    const token = await getToken();
    const authorized = token ? { ...request, headers: { ...request.headers, authorization: `Bearer ${token}` } } : request;
    try {
      return await next(authorized);
    } catch (error) {
      if (!(error instanceof HttpError) || error.status !== 401 || request.context?.authRetried === true) throw error;
      const renewed = await refreshOnce();
      if (!renewed) throw error;
      return next({ ...request, context: { ...request.context, authRetried: true }, headers: { ...request.headers, authorization: `Bearer ${renewed}` } });
    }
  };
}
