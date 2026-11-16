# Cua agent rules

Read this file before changing UI, native integrations, performance-sensitive code, or architecture. The app must match `/Users/lap16291/Desktop/CUA – Mobile App Design.html` while preserving the Clean Architecture boundaries below. The sibling SDK workspace is `/Users/lap16291/Desktop/RNPackage` and is an external contract.

## Canonical source structure

The source tree is feature-first Clean Architecture. These names are intentional; do not introduce old flat imports (`@/auth`, `@/tracking`, `@/container`) or put feature code under `core`.

```text
src/
├── app/                                # application shell and composition root
│   ├── App.tsx                         # bootstraps providers/navigation; no feature rules
│   ├── composition/                    # only DI/service-locator boundary
│   │   ├── AppModule.ts                # imports every feature module
│   │   └── container.ts                # starts/resolves graph; screens do not wire DI
│   ├── navigation/                     # route types, navigators, linking, tab composition
│   ├── providers/                      # app-scoped React providers only
│   ├── i18n/                           # translation runtime, formatting, locale resources
│   └── screens/                        # app-shell screens spanning multiple features
├── core/presentation/                  # reusable visual primitives and theme tokens only
│   ├── components/                     # Button, Screen, GlassCard, AppText, etc.
│   └── theme/                          # react-native-unistyles tokens and styles
├── platform/                           # generic infrastructure shared by features
│   ├── network/                        # HttpClient and Nitro Fetch adapter
│   ├── storage/                        # MMKV/key-value adapter
│   ├── identity/                       # ID generation
│   └── time/                           # Clock implementation
├── shared/                             # framework-free cross-feature contracts/fakes
│   ├── domain/                         # ports and domain errors
│   ├── application/                    # generic use-case abstractions
│   ├── infrastructure/                 # only truly generic adapters
│   └── testing/                        # fakes and test helpers
└── features/<feature>/                 # bounded context; owns rules and UI
    ├── domain/                         # entities, value objects, rules, ports
    ├── application/                    # use cases, commands, queries, coordinators
    ├── infrastructure/                # repositories, DTO mapping/data sources,
    │                                   # feature-specific native/Nitro adapters
    ├── presentation/                   # controllers/view-models, screens, components
    └── <Feature>Module.ts               # DI bindings and public feature exports
```

Current bounded contexts are `auth`, `tracking` (Record), `health` (Apple Health), `liveActivity`, `hero`, and `localization`. A feature such as booking, trip, driver, or payment gets the same four layers only when it has real behavior; do not create empty speculative folders.

`data/` is not a mandatory fifth Clean Architecture layer. If DTOs, mappers, remote/local data sources, or repository implementations are needed, put them under that feature's `infrastructure/` (optionally `infrastructure/data/`). This keeps adapters implementing domain ports instead of creating a second application boundary.

### App layer rules

- `app/composition` is the only place allowed to create the `Container` (`@magic-runtime/di`), call `resolve()`, or assemble feature implementations.
- DI is `@magic-runtime/di`, vendored in `packages/magic-runtime-di` (runtime only; resolved by alias, no install). A class lists its constructor dependencies in order with `@Injectable([...])`; ports are typed tokens declared next to their interface in `domain/ports.ts` under the same name (`export const Clock = token<Clock>('shared.Clock')`). Domain may import only `token` from it. `@Module`/`bind` live only in `<Feature>Module.ts`, `shared/SharedModule.ts` and `app/composition`. No `reflect-metadata`, no parameter decorators, no `emitDecoratorMetadata`.
- `app/navigation` may import feature presentation screens and public feature types to compose routes. It owns no business logic, native calls, or persistence.
- `app/providers` contains only app-wide React context/providers. Feature state belongs to feature presentation controllers/view-models.
- `app/screens` contains shell screens such as Home, Profile, Splash, Intro, and Permissions. They may consume public feature controllers/facades through composition, but stay thin.
- `app/i18n` owns translation runtime and locale resources. Domain/application code must not import React or call hooks.

## Dependency and ownership rules

Allowed direction: `presentation -> application -> domain`; `infrastructure -> domain`; and `app/composition -> all`. Domain is framework-free. Application contains orchestration but no React, navigation, persistence implementation, or native SDK. Infrastructure implements ports and translates external DTOs into domain entities. Presentation renders state and forwards user intent to controllers/use cases.

`core` and `shared` must never import a feature. A feature may depend on another feature only through that feature's public domain port or application use case; never its infrastructure, presentation, module internals, or screen. Cross-feature orchestration belongs in the composition root or an explicit application coordinator.

Native SDK imports belong at adapter boundaries: GPS, Apple HealthKit, Live Activity, and their Nitro packages belong in the owning feature's `infrastructure/`; generic MMKV and Nitro Fetch belong in `platform/`. No SDK type may leak into domain/application. Lazy-init native objects when possible, and make every subscription, timer, observer, native session, and GL resource explicitly disposable.

The RNPackage Nitro specs and generated bindings are external contracts. Do not edit generated SDK files from this app, do not import them into domain/application, and preserve release versions/tags in `package.json`. The app demonstrates Nitro integration through feature adapters, not screen-to-SDK coupling.

## Performance and rendering rules

- Never block the JS thread, UI thread, or render path with sorting, parsing, persistence, native calls, network work, large loops, or per-frame allocations.
- GPS/HealthKit work is asynchronous and incremental. Keep location, route, workout, account, and progress data out of logs and analytics.
- Keep Three.js behind `features/hero/presentation/components/HeroScene.tsx`. Use `frameloop="demand"` for static scenes, bounded DPR, reusable materials/geometries, one Canvas per scene (never per list item), and an error/fallback boundary with deterministic disposal.
- Skia is allowed only as a presentation optimization behind a visual seam when the dependency is actually installed. Do not claim Skia usage or add an abstraction without a measured use case.
- All controls need a 44 px minimum hit target and an accessibility label/role. Use `FlatList`/`SectionList` for unbounded activity/workout data.
- A performance claim requires a measurement or explicit baseline (frame time, JS/UI FPS, render count, memory, or startup timing).

## Change workflow

Before changing structure, inspect the relevant feature, `src/app/composition`, the architecture test, and the RNPackage contract when native behavior is involved. Update `src/__tests__/architecture.test.ts` whenever a boundary changes. Never leave compatibility aliases that hide a stale import tree unless explicitly marked temporary.

For UI changes run `design-fidelity`, `architecture-mvvm`, `code-review`, `performance`, and `js-ui-thread`. For Three.js changes also run `threejs-performance`. For GPS/HealthKit/Live Activity changes run `native-sdk`, `security-privacy`, and `test-reliability`. For native dependency changes run `release`.

## Verification and review output

Run `bun run typecheck`, `bun run lint`, and `bun run test`. Native dependency changes additionally require `pod install` and iOS/Android smoke builds on the available platform.

```text
Role: <agent>
Status: PASS | NEEDS_CHANGES | BLOCKED
Findings:
- [P1] path:line — issue; evidence; fix
Checks: <commands, device, or measurement>
```
