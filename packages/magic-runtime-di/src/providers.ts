import type { Dep, DepValues, Token } from "./tokens";

type Constructor<T> = new (...args: never[]) => T;

/** A provider written out in a module or passed to `Container.create`, instead of a decorated class. */
export type ExplicitProvider =
  | {
      readonly kind: "class";
      readonly token: Token;
      readonly multi: boolean;
      readonly cls: Constructor<unknown>;
    }
  | {
      readonly kind: "value";
      readonly token: Token;
      readonly multi: boolean;
      readonly value: unknown;
    }
  | {
      readonly kind: "factory";
      readonly token: Token;
      readonly multi: boolean;
      readonly deps: readonly Dep[];
      readonly make: (...args: never[]) => unknown;
    };

/** Either a `@Injectable` class, or one of the explicit forms below. */
export type Provider = Constructor<unknown> | ExplicitProvider;

/** `bind(Clock).toValue(new SystemClock())`: provides `Clock` without a decorated class. */
export class Binder<T> {
  constructor(
    private readonly token: Token<T>,
    private readonly multi: boolean,
  ) {}

  /** `cls` must be `@Injectable`; it is built like any other provider, but answers to this token only. */
  toClass(cls: Constructor<T>): ExplicitProvider {
    return { kind: "class", token: this.token, multi: this.multi, cls };
  }

  /** The caller owns the value, so it is used as is; no constructor runs. */
  toValue(value: T): ExplicitProvider {
    return { kind: "value", token: this.token, multi: this.multi, value };
  }

  /** `deps` are resolved like constructor dependencies and passed to `make` in order. */
  toFactory<const D extends readonly Dep[]>(
    deps: D,
    make: (...args: DepValues<D>) => T,
  ): ExplicitProvider {
    return {
      kind: "factory",
      token: this.token,
      multi: this.multi,
      deps,
      make: make as (...args: never[]) => unknown,
    };
  }
}

export function bind<T>(token: Token<T>, options: { readonly multi?: boolean } = {}): Binder<T> {
  return new Binder(token, options.multi === true);
}
