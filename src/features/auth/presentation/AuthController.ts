import { Injectable } from '@magic-runtime/di';
import { action, makeObservable, observable, runInAction } from 'mobx';
import { DomainError } from '@/shared/domain/DomainError';
import { ContinueAsGuest } from '../application/ContinueAsGuest';
import { GetSession } from '../application/GetSession';
import { SignOut } from '../application/SignOut';
import { SignUpWithEmail } from '../application/SignUpWithEmail';
import type { Registration, Session } from '../domain/Session';

/**
 * The state and the commands of the account screens (a ViewModel: no React, no native code), so it is tested without
 * mounting anything. Screens observe it with `observer(...)`.
 */
@Injectable([GetSession, ContinueAsGuest, SignUpWithEmail, SignOut])
export class AuthController {
  session: Session | undefined = undefined;
  busy = false;
  /** Stable error code of the last failure (`AUTH_EMAIL_INVALID`...), undefined when fine. */
  errorCode: string | undefined = undefined;
  errorMessage: string | undefined = undefined;

  constructor(
    private readonly getSession: GetSession,
    private readonly continueAsGuest: ContinueAsGuest,
    private readonly signUpWithEmail: SignUpWithEmail,
    private readonly signOutUseCase: SignOut,
  ) {
    makeObservable(this, {
      session: observable,
      busy: observable,
      errorCode: observable,
      errorMessage: observable,
      restore: action,
      useAsGuest: action,
      signOut: action,
    });
  }

  restore(): Session | undefined {
    this.session = this.getSession.execute();
    return this.session;
  }

  useAsGuest(): Session {
    this.session = this.continueAsGuest.execute();
    return this.session;
  }

  async signUp(registration: Registration): Promise<boolean> {
    runInAction(() => {
      this.busy = true;
      this.errorCode = undefined;
      this.errorMessage = undefined;
    });
    try {
      const session = await this.signUpWithEmail.execute(registration);
      runInAction(() => {
        this.session = session;
      });
      return true;
    } catch (error) {
      runInAction(() => {
        this.errorCode = error instanceof DomainError ? error.code : 'UNKNOWN';
        this.errorMessage = error instanceof Error ? error.message : String(error);
      });
      return false;
    } finally {
      runInAction(() => {
        this.busy = false;
      });
    }
  }

  signOut(): void {
    this.signOutUseCase.execute();
    this.session = undefined;
  }
}
