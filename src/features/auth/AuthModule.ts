import { Module, bind } from '@magic-runtime/di';
import { AuthTokenProvider } from '@/platform/network/interceptors/authInterceptor';
import { SharedModule } from '@/shared/SharedModule';
import { ContinueAsGuest } from './application/ContinueAsGuest';
import { GetSession } from './application/GetSession';
import { RefreshAccessToken } from './application/RefreshAccessToken';
import { SignIn } from './application/SignIn';
import { SignOut } from './application/SignOut';
import { SignUp } from './application/SignUp';
import { AccountGateway, SessionRepository, TokenStore } from './domain/ports';
import { HttpAccountGateway } from './infrastructure/HttpAccountGateway';
import { KeyValueSessionRepository } from './infrastructure/KeyValueSessionRepository';
import { KeyValueTokenStore } from './infrastructure/KeyValueTokenStore';
import { AuthController } from './presentation/AuthController';

/** Public surface for the app shell: `AuthController`, `GetSession`. Also feeds the HTTP layer its bearer token. */
@Module({
  imports: [SharedModule],
  providers: [
    bind(SessionRepository).toClass(KeyValueSessionRepository),
    bind(TokenStore).toClass(KeyValueTokenStore),
    bind(AccountGateway).toClass(HttpAccountGateway),
    // What `HttpClient` asks for on every request (bearer) and on a 401 (refresh). Wired here, so neither platform
    // nor infrastructure imports the auth use cases.
    bind(AuthTokenProvider).toFactory(
      [TokenStore, RefreshAccessToken],
      (tokens, refresh) => ({
        accessToken: () => tokens.get()?.accessToken,
        refreshAccessToken: () => refresh.execute(),
      }),
    ),
    ContinueAsGuest,
    SignUp,
    SignIn,
    RefreshAccessToken,
    GetSession,
    SignOut,
    AuthController,
  ],
})
export class AuthModule {}
