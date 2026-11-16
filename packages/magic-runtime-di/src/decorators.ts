import type { Scope } from "./Registry";
import { registry } from "./Registry";
import type { Dep, DepValues, Token } from "./tokens";

type Constructor<A extends readonly unknown[] = never[]> = new (...args: A) => unknown;

/**
 * Declares what a class needs. The position in `deps` is the position in the constructor: Babel
 * has no parameter decorators and emits no type metadata, so the order is stated here. The types
 * make a wrong order a compile error.
 *
 *   @Injectable([AuthApi, Clock])
 *   class EmailAuthProvider { constructor(api: AuthApi, clock: Clock) {} }
 */
export function Injectable<const D extends readonly Dep[]>(
  deps: D,
  options: { readonly scope?: Scope } = {},
) {
  return <C extends Constructor<DepValues<D>>>(target: C): C => {
    const meta = registry.classMeta(target);
    meta.deps = deps;
    meta.scope = options.scope ?? "singleton";
    return target;
  };
}

/**
 * The class also answers to `token` (a port it implements). With `multi`, it is one member of the
 * list that `all(token)` receives instead of the only provider.
 */
export function Provides(token: Token, options: { readonly multi?: boolean } = {}) {
  return <C extends Constructor>(target: C): C => {
    registry.classMeta(target).provides.push({ token, multi: options.multi === true });
    return target;
  };
}

/**
 * The class wraps the provider of `token` and is itself a `token`. It receives the wrapped one as
 * `inner(token)`. `order` 0 is the outermost; without it the order the providers are listed in.
 */
export function Decorates(token: Token, options: { readonly order?: number } = {}) {
  return <C extends Constructor>(target: C): C => {
    registry.classMeta(target).decorates = { token, order: options.order };
    return target;
  };
}
