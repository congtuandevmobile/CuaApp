import { createContext, createElement, type ReactNode, useContext } from "react";
import type { Container } from "./Container";
import { DiError } from "./DiError";
import type { Token, TokenValue } from "./tokens";

const ContainerContext = createContext<Container | null>(null);

/** Makes `container` available to `useInject` below it. Put one near the root of the app. */
export function ContainerProvider(props: { container: Container; children?: ReactNode }) {
  return createElement(ContainerContext.Provider, { value: props.container }, props.children);
}

export function useContainer(): Container {
  const container = useContext(ContainerContext);
  if (!container) throw new DiError("useInject needs a <ContainerProvider> above it.");
  return container;
}

/** The provider of `token`. The same value on every render (providers are singletons). */
export function useInject<K extends Token>(token: K): TokenValue<K> {
  return useContainer().get(token);
}
