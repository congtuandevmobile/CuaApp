import { Injectable } from '@magic-runtime/di';
import { action, makeObservable, observable, runInAction } from 'mobx';
import { DomainError } from '@/shared/domain/DomainError';
import { ContinueAsGuest } from '../application/ContinueAsGuest';
import { GetSession } from '../application/GetSession';
import { SignIn } from '../application/SignIn';
import { SignOut } from '../application/SignOut';
import { SignUp } from '../application/SignUp';
import type { Credentials, Registration, Session } from '../domain/Session';

/**
 * The state and the commands of the account screens (a ViewModel: no React, no native code), so it is tested without
 * mounting anything. Screens observe it with `observer(...)`.
 */
@Injectable([GetSession, ContinueAsGuest, SignUp, SignIn, SignOut])
export class AuthController {
  session: Session | undefined = undefined;
  busy = false;
  /** Stable error code of the last failure (`AUTH_USERNAME_TAKEN`...), undefined when fine. */
  errorCode: string | undefined = undefined;
  errorMessage: string | undefined = undefined;

  constructor(
    private readonly getSession: GetSession,
    private readonly continueAsGuest: ContinueAsGuest,
    private readonly signUpUseCase: SignUp,
    private readonly signInUseCase: SignIn,
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
      clearError: action,
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

  /** Resolves `true` when signed up; on failure `errorCode` says why (validation, server or network). */
  signUp(registration: Registration): Promise<boolean> {
    return this.authenticate(() => this.signUpUseCase.execute(registration));
  }

  signIn(credentials: Credentials): Promise<boolean> {
    return this.authenticate(() => this.signInUseCase.execute(credentials));
  }

  private async authenticate(run: () => Promise<Session>): Promise<boolean> {
    if (this.busy) return false; // a second tap while a request is in flight does nothing
    runInAction(() => {
      this.busy = true;
      this.errorCode = undefined;
      this.errorMessage = undefined;
    });
    try {
      const session = await run();
      runInAction(() => {
        this.session = session;
      });
      return true;
    } catch (error) {
      runInAction(() => {
        this.errorCode = error instanceof DomainError ? error.code : 'UNKNOWN';
        this.errorMessage =
          error instanceof Error ? error.message : String(error);
      });
      return false;
    } finally {
      runInAction(() => {
        this.busy = false;
      });
    }
  }

  /** Each auth screen starts clean: an error from the other form is not shown here. */
  clearError(): void {
    this.errorCode = undefined;
    this.errorMessage = undefined;
  }

  /** Signed out locally at once (the UI can navigate away); the server revocation finishes in the background. */
  signOut(): Promise<void> {
    this.session = undefined;
    return this.signOutUseCase.execute();
  }
}
