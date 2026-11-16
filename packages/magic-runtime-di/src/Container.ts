import { BindingTable } from "./BindingTable";
import { DiError } from "./DiError";
import type { ExplicitProvider, Provider } from "./providers";
import { registry } from "./Registry";
import { Resolver } from "./Resolver";
import type { Token, TokenValue } from "./tokens";

export type ContainerOptions = {
  /** `@Module` classes. Their providers (and their imports') are the app. */
  readonly modules?: readonly object[];
  /** Providers the app supplies itself: inputs, and adapters that import native code. */
  readonly providers?: readonly Provider[];
  /** Fakes for tests. Whatever depends on the replaced provider receives the fake. */
  readonly overrides?: readonly ExplicitProvider[];
};

/**
 * Hands out the providers declared by `@Injectable` classes and modules.
 *
 * `create` checks the whole graph before returning (nothing is constructed): a missing provider,
 * a cycle, an ambiguous token or a missing input throws a `DiError` that names the chain. Values
 * are then built on first use and kept (singletons), so constructors can stay side-effect free
 * of their dependents.
 */
export class Container {
  private readonly resolver: Resolver;

  private constructor(private readonly table: BindingTable) {
    this.resolver = new Resolver(table, false);
  }

  static create(options: ContainerOptions): Container {
    const table = new BindingTable();
    const listed = new Set<object>();
    for (const module of options.modules ?? []) Container.collect(module, table, listed);
    for (const provider of options.providers ?? []) table.add(provider);
    table.override(options.overrides ?? []);

    const container = new Container(table);
    container.validate();
    return container;
  }

  get<K extends Token>(token: K): TokenValue<K> {
    return this.resolver.one(token, false) as TokenValue<K>;
  }

  /** Every provider of a `multi` token, in declaration order. */
  getAll<K extends Token>(token: K): readonly TokenValue<K>[] {
    return (this.resolver.list(token, false) ?? []) as readonly TokenValue<K>[];
  }

  /** Walks the whole graph without constructing anything. */
  validate(): void {
    new Resolver(this.table, true).validateAll();
  }

  private static collect(module: object, table: BindingTable, listed: Set<object>): void {
    if (listed.has(module)) return;
    listed.add(module);
    const meta = registry.findModule(module);
    if (!meta) {
      const name = typeof module === "function" ? module.name : String(module);
      throw new DiError(`\`${name}\` is listed in \`modules\` but is not decorated with @Module.`);
    }
    for (const imported of meta.imports) Container.collect(imported, table, listed);
    for (const provider of meta.providers) table.add(provider as Provider);
  }
}
