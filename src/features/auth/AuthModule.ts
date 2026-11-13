import { module } from 'inversiland';
import { SharedModule } from '@/shared/SharedModule';
import { ContinueAsGuest } from './application/ContinueAsGuest';
import { GetSession } from './application/GetSession';
import { SignOut } from './application/SignOut';
import { SignUpWithEmail } from './application/SignUpWithEmail';
import { AccountGatewayToken, SessionRepositoryToken } from './domain/ports';
import { KeyValueSessionRepository } from './infrastructure/KeyValueSessionRepository';
import { LocalAccountGateway } from './infrastructure/LocalAccountGateway';
import { AuthController } from './presentation/AuthController';

@module({
  imports: [SharedModule],
  providers: [
    { provide: SessionRepositoryToken, useClass: KeyValueSessionRepository },
    { provide: AccountGatewayToken, useClass: LocalAccountGateway },
    ContinueAsGuest,
    SignUpWithEmail,
    GetSession,
    SignOut,
    AuthController,
  ],
  exports: [AuthController, GetSession],
})
export class AuthModule {}
