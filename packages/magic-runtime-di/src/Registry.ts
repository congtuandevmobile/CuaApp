import type { Dep, Token } from "./tokens";

export type Scope = "singleton" | "transient";

export type ProvidesMeta = { readonly token: Token; readonly multi: boolean };
export type DecoratesMeta = { readonly token: Token; readonly order: number | undefined };

/** What the decorators recorded about one class. */
export type ClassMeta = {
  deps: readonly Dep[] | null;
  scope: Scope;
  provides: ProvidesMeta[];
  decorates: DecoratesMeta | null;
};

/** What `@Module` recorded about one module class (providers are `Provider | class`, see providers.ts). */
export type ModuleMeta = {
  readonly imports: readonly object[];
  readonly providers: readonly unknown[];
};

/**
 * Where decorators write what they declare. Keyed by the class itself, not by its name (axios-
 * retrofit keys by `target.name`, which breaks when two classes share a name), and weakly, so a
 * class that is unloaded is not kept alive.
 */
export class Registry {
  private readonly classes = new WeakMap<object, ClassMeta>();
  private readonly modules = new WeakMap<object, ModuleMeta>();

  classMeta(target: object): ClassMeta {
    let meta = this.classes.get(target);
    if (!meta) {
      meta = { deps: null, scope: "singleton", provides: [], decorates: null };
      this.classes.set(target, meta);
    }
    return meta;
  }

  findClass(target: object): ClassMeta | undefined {
    return this.classes.get(target);
  }

  setModule(target: object, meta: ModuleMeta): void {
    this.modules.set(target, meta);
  }

  findModule(target: object): ModuleMeta | undefined {
    return this.modules.get(target);
  }
}

/** The one registry the decorators use. */
export const registry = new Registry();
