import { DiError } from "./DiError";
import type { ExplicitProvider, Provider } from "./providers";
import type { ClassMeta, Scope } from "./Registry";
import { registry } from "./Registry";
import type { Dep, Token } from "./tokens";
import { tokenName } from "./tokens";

type Constructor = new (...args: never[]) => unknown;

/** How to make one value: a class built from its dependencies, a fixed value, or a factory. */
export type Impl = {
  readonly label: string;
  readonly scope: Scope;
  readonly deps: readonly Dep[];
  /** Fixed values are returned even when the graph is only being validated. */
  readonly isValue: boolean;
  readonly create: (args: readonly unknown[]) => unknown;
};

/** `impl` answers to `token`. A decorator also wraps whatever else answers to `token`. */
export type Binding = {
  readonly token: Token;
  readonly multi: boolean;
  readonly impl: Impl;
  readonly decorator: { readonly order: number } | null;
};

/** Which provider answers to which token, built from modules, extra providers and test overrides. */
export class BindingTable {
  private readonly byToken = new Map<Token, Binding[]>();
  private readonly classImpls = new Map<Constructor, Impl>();
  private readonly added = new Set<Constructor>();
  private position = 0;

  lookup(token: Token): readonly Binding[] {
    return this.byToken.get(token) ?? [];
  }

  tokens(): readonly Token[] {
    return [...this.byToken.keys()];
  }

  /** A class listed twice (two modules import the same one) is added once. */
  add(provider: Provider): void {
    if (typeof provider === "function") {
      this.addClass(provider);
      return;
    }
    this.push({
      token: provider.token,
      multi: provider.multi,
      impl: this.explicitImpl(provider),
      decorator: null,
    });
  }

  /**
   * Replaces what answers to each token. Everything built on the old provider, under any token it
   * answers to, receives the replacement; decorators around a token stay in place.
   */
  override(providers: readonly ExplicitProvider[]): void {
    const byToken = new Map<Token, ExplicitProvider[]>();
    for (const provider of providers) {
      byToken.set(provider.token, [...(byToken.get(provider.token) ?? []), provider]);
    }

    for (const [token, replacements] of byToken) {
      const replaced = new Set(
        this.lookup(token)
          .filter((binding) => binding.decorator === null)
          .map((binding) => binding.impl),
      );
      const [first, ...rest] = replacements.map((provider) => ({
        token,
        multi: provider.multi,
        impl: this.explicitImpl(provider),
        decorator: null,
      }));

      for (const [key, list] of this.byToken) {
        const kept = list
          .filter((binding) => !(key === token && binding.decorator === null))
          .map((binding) =>
            first && replaced.has(binding.impl) ? { ...binding, impl: first.impl } : binding,
          );
        this.byToken.set(key, kept);
      }
      this.byToken.set(token, [
        ...(first ? [first, ...rest] : []),
        ...this.lookup(token).filter((binding) => binding.decorator !== null),
      ]);
    }
  }

  private addClass(cls: Constructor): void {
    if (this.added.has(cls)) return;
    this.added.add(cls);

    const meta = this.metaOf(cls);
    const impl = this.classImpl(cls, meta);
    // A decorator only exists wrapped around the provider of its port, never on its own.
    if (!meta.decorates) this.push({ token: cls, multi: false, impl, decorator: null });
    for (const provided of meta.provides) {
      this.push({ token: provided.token, multi: provided.multi, impl, decorator: null });
    }
    if (meta.decorates) {
      const order = meta.decorates.order ?? this.position;
      this.push({ token: meta.decorates.token, multi: false, impl, decorator: { order } });
    }
  }

  private push(binding: Binding): void {
    this.position += 1;
    const list = this.byToken.get(binding.token) ?? [];
    this.byToken.set(binding.token, [...list, binding]);
  }

  private metaOf(cls: Constructor): ClassMeta & { deps: readonly Dep[] } {
    const meta = registry.findClass(cls);
    if (!meta || meta.deps === null) {
      throw new DiError(
        `\`${cls.name}\` is listed as a provider but has no @Injectable([...]). Add it, with [] when the constructor takes nothing.`,
      );
    }
    return { ...meta, deps: meta.deps };
  }

  private classImpl(cls: Constructor, meta: ClassMeta & { deps: readonly Dep[] }): Impl {
    const known = this.classImpls.get(cls);
    if (known) return known;
    const impl: Impl = {
      label: cls.name,
      scope: meta.scope,
      deps: meta.deps,
      isValue: false,
      create: (args) => new (cls as new (...a: readonly unknown[]) => unknown)(...args),
    };
    this.classImpls.set(cls, impl);
    return impl;
  }

  private explicitImpl(provider: ExplicitProvider): Impl {
    switch (provider.kind) {
      case "class":
        return this.classImpl(provider.cls, this.metaOf(provider.cls));
      case "value":
        return {
          label: `value of ${tokenName(provider.token)}`,
          scope: "singleton",
          deps: [],
          isValue: true,
          create: () => provider.value,
        };
      case "factory":
        return {
          label: `factory of ${tokenName(provider.token)}`,
          scope: "singleton",
          deps: provider.deps,
          isValue: false,
          create: (args) => (provider.make as (...a: readonly unknown[]) => unknown)(...args),
        };
    }
  }
}
