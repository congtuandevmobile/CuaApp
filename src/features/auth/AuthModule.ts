import { Module, bind } from '@magic-runtime/di';
import { SharedModule } from '@/shared/SharedModule';
import { ContinueAsGuest } from './application/ContinueAsGuest';
import { GetSession } from './application/GetSession';
import { SignOut } from './application/SignOut';
import { SignUpWithEmail } from './application/SignUpWithEmail';
import { AccountGateway, SessionRepository } from './domain/ports';
import { KeyValueSessionRepository } from './infrastructure/KeyValueSessionRepository';
import { LocalAccountGateway } from './infrastructure/LocalAccountGateway';
import { AuthController } from './presentation/AuthController';

/** Public surface for the app shell: `AuthController`, `GetSession`. */
@Module({
  imports: [SharedModule],
  providers: [
    bind(SessionRepository).toClass(KeyValueSessionRepository),
    bind(AccountGateway).toClass(LocalAccountGateway),
    ContinueAsGuest,
    SignUpWithEmail,
    GetSession,
    SignOut,
    AuthController,
  ],
})
export class AuthModule {}
