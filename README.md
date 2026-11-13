# Cua

The CUA mobile app (React Native 0.88, new architecture) built with a **clean architecture** in the shape of
[react-native-clean-architecture](https://github.com/carlossalasamper/react-native-clean-architecture): bounded contexts,
each with `domain / application / infrastructure / presentation`, wired by a dependency-injection module.

It uses the three SDKs of the sibling `RNPackage` monorepo:
`react-native-gps-tracking` (the record button), `react-native-apple-health-sync` (every sport by name and id) and
`react-native-live-activity-tracking` (lock screen / ongoing notification). Design: the "CUA" canvas.

## Structure

```
src/
  AppModule.ts            composition root: imports every bounded context
  container.ts            boots Inversiland, `controllers.*()` resolve the singletons screens use
  App.tsx                 navigation + safe area
  shared/                 kernel: ports (KeyValueStore, IdGenerator, Clock), DomainError, UseCase, MMKV store
  core/                   presentation only: navigation, theme (unistyles), components, shell screens
  auth/ hero/ tracking/ health/ liveActivity/     one bounded context each:
     domain/              entities, value objects, rules, ports (interfaces)      -> imports nothing outward
     application/         use cases (one class, one `execute`)                    -> imports domain
     infrastructure/      adapters: storage, the SDKs                             -> imports domain
     presentation/        MobX controllers (ViewModels) + screens                 -> imports application/domain
     XModule.ts           providers and exports of the context
```

The **dependency rule** is a test (`src/__tests__/architecture.test.ts`): domain imports nothing but domain, application
never imports infrastructure/presentation/native SDKs, native SDKs are imported only by infrastructure, and a context
reaches another only through its domain or application layer.

| Context | Does |
|---|---|
| `auth` | guest first, create account (backend is a placeholder gateway) |
| `hero` | male/female hero, skin tone, one accessory per slot (head, face, wrist, feet, back), unlock by distance |
| `tracking` | record flow on `react-native-gps-tracking`, saves activities, lifetime distance |
| `health` | Apple Health sync on `react-native-apple-health-sync`, new-workout observer |
| `liveActivity` | lock-screen / notification surface, mirrored from the recording |
| `localization` | the language in use: device language or the person's choice, persisted |

## Languages (i18n)

English and Vietnamese, with `i18next` + `react-i18next`. Nothing user-visible is hard-coded.

- Texts live in `src/core/presentation/i18n/locales/en.ts` (the source of truth) and `vi.ts`. `vi` is typed against `en`,
  so a missing or extra key does not compile; a test also checks that every translation keeps its `{{placeholders}}`.
- In a screen: `const { t, km, dateTime, sport, error } = useT();` then `t('home.empty')`. Keys are typed (autocomplete,
  typo = compile error). Build sentences with placeholders (`t('record.start', { sport })`), never by joining pieces.
- Numbers and dates follow the language (`1,50` in Vietnamese): `km()`, `dateTime()`. Sports (`sport(code)`) and domain
  error codes (`error(code)`) are translated by their stable code; the domain never holds display text.
- Which language: the choice saved in Profile wins, otherwise the device language if supported, otherwise English
  (`resolveLocale`, in the `localization` context). Changing it re-renders every screen at once, no restart.
- The lock-screen Live Activity and the Android notification get their texts from the same dictionary when an activity starts.
- `src/__tests__/i18n-literals.test.ts` fails if a screen gets a literal text again.

**Add a language:** add the code to `SUPPORTED_LOCALES` and its name to `NATIVE_NAMES` (`localization/domain/Locale.ts`),
copy `locales/en.ts` to `locales/<code>.ts` (typed `Translation<Messages>`), register it in `i18n.ts`. The compiler lists
every missing key. For text that is not in the app (the app name under the icon, the permission prompts of iOS and
Android) add `ios/.../<code>.lproj/InfoPlist.strings` and `android/.../values-<code>/strings.xml` later.

## How to add a feature

1. Domain: the rule and the port (`domain/`). 2. Use case (`application/`, `@injectable`, `execute`). 3. Adapter
(`infrastructure/`). 4. Provide it in the context's module. 5. A MobX controller if a screen needs state. 6. Test the use
case with fakes (see `*.test.ts`): no native code, no React.

## Run

```sh
bun install                    # installs package dependencies; released SDKs are kept intact
cd ios && pod install && cd .. # first time, and after an SDK changes its native code
bun run ios                    # or: bun run android
bun run typecheck && bun run test
```

### Installing released SDK tags

The GitHub tags are monorepo tags, not npm packages. The repository archive shown on GitHub contains all packages, so
install one SDK by checking out its tag and packing that package:

```sh
git clone --depth 1 --branch react-native-gps-tracking_tag-0.0.1-beta.1 \
  https://github.com/congtuandevmobile/CUAPackage.git /tmp/cua-package-release
cd /tmp/cua-package-release/packages/react-native-gps-tracking
bun pm pack --destination /tmp/cua-sdk-tarballs

cd /path/to/CuaApp
bun add /tmp/cua-sdk-tarballs/react-native-gps-tracking-0.0.1-beta.1.tgz
```

Repeat for the matching `react-native-apple-health-sync` and `react-native-live-activity-tracking` tags. The local
linker is opt-in, so released tarballs are not replaced by sibling symlinks. For local SDK development use
`CUA_LINK_LOCAL_SDKS=1 bun install`.

After the release workflow has created `.tgz` assets, Cua can link GitHub directly without npm:

```json
{
  "dependencies": {
    "react-native-gps-tracking": "https://github.com/congtuandevmobile/CUAPackage/releases/download/react-native-gps-tracking_tag-0.0.1-beta.3/react-native-gps-tracking-0.0.1-beta.3.tgz",
    "react-native-apple-health-sync": "https://github.com/congtuandevmobile/CUAPackage/releases/download/react-native-apple-health-sync_tag-0.0.1-beta.3/react-native-apple-health-sync-0.0.1-beta.3.tgz",
    "react-native-live-activity-tracking": "https://github.com/congtuandevmobile/CUAPackage/releases/download/react-native-live-activity-tracking_tag-0.0.1-beta.3/react-native-live-activity-tracking-0.0.1-beta.3.tgz"
  }
}
```

Then run `bun install` and `cd ios && pod install`. The release workflow creates these per-SDK GitHub assets when the
next `[tag]` or `[tag:<package>]` commit is pushed.

Metro (`metro.config.js`) watches `../RNPackage` and answers `react`, `react-native` and `react-native-nitro-modules`
from this app only, so the SDKs never bring a second copy.

## State of the project

Typecheck and lint pass. The UI shell follows the design canvas and `HeroScene` has a procedural Three.js preview.
Production glTF assets, device/simulator validation, and native Expo GL/CocoaPods integration still need to be verified
on a machine with Node, CocoaPods, and the iOS/Android toolchains.
