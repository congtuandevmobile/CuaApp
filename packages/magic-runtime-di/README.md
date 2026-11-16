# @magic-runtime/di (vendored runtime)

Copy of the runtime half of `@magic-runtime/di` (`decorators_runtime/src/runtime`), kept verbatim so it can be
re-synced. The build-time `di-check` tooling is **not** vendored: it loads the composition root with bun, which cannot
import the app's React Native / Nitro modules. In CuaApp the same guarantees come from:

- `Container.create(...)` validating the whole graph at launch (and in `src/__tests__/container.test.ts`);
- `src/__tests__/architecture.test.ts` enforcing the layer rules.

Resolved with the `@magic-runtime/di` alias (`babel.config.js`, `tsconfig.json`, `jest.config.js`); no install step.

Re-sync:

```bash
cp ../decorators_runtime/src/runtime/*.ts packages/magic-runtime-di/src/
```

See the upstream README for the full API (`Injectable`, `Provides`, `Decorates`, `Module`, `bind`, `token`, `input`,
`optional`, `all`, `inner`, `options`).
