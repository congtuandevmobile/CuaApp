import type { Binding, BindingTable, Impl } from "./BindingTable";
import { DiError } from "./DiError";
import type { Token } from "./tokens";
import {
  AllDep,
  type Dep,
  InnerDep,
  OptionalDep,
  OptionsDep,
  TypedToken,
  tokenName,
} from "./tokens";

type Frame = { readonly key: object; readonly label: string };

/** Stands in for an instance while the graph is only being validated: nothing is constructed. */
const PLACEHOLDER: object = Object.freeze({});

/**
 * Builds values on demand. Every provider is a singleton unless its class says `transient`.
 * With `dry`, the whole walk happens (so missing providers and cycles are found) but no
 * constructor or factory runs.
 */
export class Resolver {
  private readonly singletons = new Map<Impl, unknown>();
  private readonly chains = new Map<Token, unknown>();
  private readonly stack: Frame[] = [];

  constructor(
    private readonly table: BindingTable,
    private readonly dry: boolean,
  ) {}

  /** Every token the table knows, so one pass proves the whole graph. */
  validateAll(): void {
    for (const token of this.table.tokens()) {
      const bases = this.table.lookup(token).filter((binding) => binding.decorator === null);
      if (bases.some((binding) => binding.multi)) this.list(token, false);
      else this.one(token, false);
    }
  }

  one(token: Token, optional: boolean): unknown {
    const bindings = this.table.lookup(token);
    const bases = bindings.filter((binding) => binding.decorator === null);
    const decorators = bindings.filter((binding) => binding.decorator !== null);

    if (bindings.length === 0) return this.missing(token, optional, false);
    const [base, ...others] = bases;
    if (!base) {
      throw this.fail(
        `\`${tokenName(token)}\` has decorators (${this.names(decorators)}) but nothing to wrap.`,
      );
    }
    if (bases.some((binding) => binding.multi)) {
      throw this.fail(
        `\`${tokenName(token)}\` is provided as a list (${this.names(bases)}). Inject all(${tokenName(token)}), or provide it once.`,
      );
    }
    if (others.length > 0) {
      throw this.fail(
        `\`${tokenName(token)}\` has several providers (${this.names(bases)}). Provide it once, mark each one multi and inject all(${tokenName(token)}), or choose in \`overrides\`.`,
      );
    }
    if (decorators.length === 0) return this.instance(base.impl);
    return this.chain(token, base.impl, decorators);
  }

  list(token: Token, optional: boolean): readonly unknown[] | undefined {
    const bases = this.table.lookup(token).filter((binding) => binding.decorator === null);
    if (bases.length === 0) return this.missing(token, optional, true) as undefined;
    return bases.map((binding) => this.instance(binding.impl));
  }

  private chain(token: Token, base: Impl, decorators: readonly Binding[]): unknown {
    if (this.chains.has(token)) return this.chains.get(token);

    this.enter(token, tokenName(token));
    try {
      let wrapped = this.instance(base);
      // Higher order = closer to the base, so the lowest order ends up outermost.
      const inside = [...decorators].sort(
        (a, b) => (b.decorator?.order ?? 0) - (a.decorator?.order ?? 0),
      );
      for (const decorator of inside) {
        wrapped = this.build(decorator.impl, new Map([[token, wrapped]]));
      }
      this.chains.set(token, wrapped);
      return wrapped;
    } finally {
      this.stack.pop();
    }
  }

  private instance(impl: Impl): unknown {
    if (impl.scope === "singleton" && this.singletons.has(impl)) return this.singletons.get(impl);
    const value = this.build(impl, undefined);
    if (impl.scope === "singleton") this.singletons.set(impl, value);
    return value;
  }

  private build(impl: Impl, inside: ReadonlyMap<Token, unknown> | undefined): unknown {
    this.enter(impl, impl.label);
    try {
      const args = impl.deps.map((dep) => this.dep(dep, inside));
      return this.dry && !impl.isValue ? PLACEHOLDER : impl.create(args);
    } finally {
      this.stack.pop();
    }
  }

  private dep(
    dep: Dep,
    inside: ReadonlyMap<Token, unknown> | undefined,
    optional = false,
  ): unknown {
    if (dep instanceof OptionsDep) return this.options(dep.shape, inside);
    if (dep instanceof OptionalDep) return this.dep(dep.target, inside, true);
    if (dep instanceof AllDep) return this.list(dep.target, optional);
    if (dep instanceof InnerDep) {
      if (inside?.has(dep.target)) return inside.get(dep.target);
      throw this.fail(
        `inner(${tokenName(dep.target)}) only works in a class marked @Decorates(${tokenName(dep.target)}).`,
      );
    }
    return this.one(dep, optional);
  }

  /** An optional property that nothing provides is left out, not set to `undefined`. */
  private options(
    shape: { readonly [key: string]: Dep },
    inside: ReadonlyMap<Token, unknown> | undefined,
  ): Record<string, unknown> {
    const built: Record<string, unknown> = {};
    for (const [key, dep] of Object.entries(shape)) {
      const value = this.dep(dep, inside);
      if (value !== undefined) built[key] = value;
    }
    return built;
  }

  private missing(token: Token, optional: boolean, list: boolean): undefined {
    if (optional) return undefined;
    const name = tokenName(token);
    if (token instanceof TypedToken && token.isInput) {
      throw this.fail(
        `Input \`${name}\` was not supplied. Pass bind(${name}).toValue(...) in \`providers\`.`,
      );
    }
    throw this.fail(
      list
        ? `No provider for all(${name}). Add a class marked @Provides(${name}, { multi: true }) to a module, or make the dependency optional.`
        : `No provider for \`${name}\`. Add a class that is @Injectable (or @Provides(${name})) to a module, or bind(${name}) in \`providers\`.`,
    );
  }

  private names(bindings: readonly Binding[]): string {
    return bindings.map((binding) => binding.impl.label).join(", ");
  }

  private enter(key: object, label: string): void {
    const at = this.stack.findIndex((frame) => frame.key === key);
    if (at >= 0) {
      const loop = [...this.stack.slice(at).map((frame) => frame.label), label];
      throw new DiError(`Circular dependency: ${loop.join(" → ")}`);
    }
    this.stack.push({ key, label });
  }

  private fail(message: string): DiError {
    const chain = this.stack.map((frame) => frame.label);
    return new DiError(
      chain.length > 0 ? `${message}\n  required by: ${chain.join(" → ")}` : message,
    );
  }
}
