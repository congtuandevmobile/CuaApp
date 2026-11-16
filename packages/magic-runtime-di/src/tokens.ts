/** A class (abstract or not) used as the key of a dependency. */
export type AbstractClass<T = unknown> = abstract new (...args: never[]) => T;

/**
 * The key of a dependency that has no class of its own: an interface, a function, a setting.
 * Declare it next to the interface it stands for, under the same name:
 *
 *   export interface Clock { now(): number }
 *   export const Clock = token<Clock>("Clock");
 */
export class TypedToken<T> {
  /** Carries `T` for inference only; never set. */
  readonly phantom: T | undefined;

  constructor(
    readonly name: string,
    /** An input is a value the caller of `Container.create` supplies, not a class that is built. */
    readonly isInput: boolean,
  ) {}
}

export type Token<T = unknown> = TypedToken<T> | AbstractClass<T>;

/** What a token hands out: the instance type of a class, or the `T` of a typed token. */
export type TokenValue<K> = K extends TypedToken<infer V>
  ? V
  : K extends AbstractClass<infer I>
    ? I
    : never;

/** `optional(T)`: `undefined` instead of an error when nothing provides `T`. */
export class OptionalDep<K> {
  readonly kind = "optional";
  constructor(readonly target: K) {}
}

/** `all(T)`: every provider of `T`, in declaration order. */
export class AllDep<K> {
  readonly kind = "all";
  constructor(readonly target: K) {}
}

/** `inner(T)`: in a class marked `@Decorates(T)`, the provider it wraps. */
export class InnerDep<K> {
  readonly kind = "inner";
  constructor(readonly target: K) {}
}

/**
 * `options({ cache: CatalogCache, clock: Clock })`: for a constructor that takes one options
 * object. Each property is a dependency; an `optional` one that nothing provides is left out.
 */
export class OptionsDep<R> {
  readonly kind = "options";
  constructor(readonly shape: R) {}
}

export type Dep =
  | Token
  | OptionsDep<{ readonly [key: string]: Dep }>
  | OptionalDep<Token>
  | OptionalDep<AllDep<Token>>
  | AllDep<Token>
  | InnerDep<Token>;

/** The object an `options({...})` dependency builds: optional dependencies become optional properties. */
export type OptionsValue<R> = {
  -readonly [K in keyof R as R[K] extends OptionalDep<unknown> ? never : K]: DepValue<R[K]>;
} & {
  -readonly [K in keyof R as R[K] extends OptionalDep<unknown> ? K : never]?: Exclude<
    DepValue<R[K]>,
    undefined
  >;
};

/** The value a dependency puts in its constructor slot. */
export type DepValue<D> = D extends OptionsDep<infer R>
  ? OptionsValue<R>
  : D extends AllDep<infer K>
    ? readonly TokenValue<K>[]
    : D extends OptionalDep<infer K>
      ? DepValue<K> | undefined
      : D extends InnerDep<infer K>
        ? TokenValue<K>
        : TokenValue<D>;

/** The constructor (or factory) parameters a list of dependencies stands for, in order. */
export type DepValues<D extends readonly unknown[]> = { -readonly [I in keyof D]: DepValue<D[I]> };

export function token<T>(name: string): TypedToken<T> {
  return new TypedToken<T>(name, false);
}

/** A value the app supplies when it creates the container: a base URL, a feature flag. */
export function input<T>(name: string): TypedToken<T> {
  return new TypedToken<T>(name, true);
}

export function optional<K extends Token | AllDep<Token>>(target: K): OptionalDep<K> {
  return new OptionalDep(target);
}

export function options<const R extends { readonly [key: string]: Dep }>(shape: R): OptionsDep<R> {
  return new OptionsDep(shape);
}

export function all<K extends Token>(target: K): AllDep<K> {
  return new AllDep(target);
}

export function inner<K extends Token>(target: K): InnerDep<K> {
  return new InnerDep(target);
}

export function tokenName(key: Token): string {
  return key.name;
}
