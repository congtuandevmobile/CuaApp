import type { Provider } from "./providers";
import { registry } from "./Registry";

/**
 * A group of providers, usually one feature. `imports` are other modules whose providers are
 * included first. The container is flat: every provider of every module is visible to all.
 *
 *   @Module({ imports: [SharedModule], providers: [EmailAuthProvider, AuthFacade] })
 *   class AuthModule {}
 */
export function Module(options: {
  readonly imports?: readonly object[];
  readonly providers?: readonly Provider[];
}) {
  return <C extends abstract new (...args: never[]) => unknown>(target: C): C => {
    registry.setModule(target, {
      imports: options.imports ?? [],
      providers: options.providers ?? [],
    });
    return target;
  };
}
