# Gymmin

Gymmin is a local-only Expo/React Native workout app created and maintained by **Paweł Kaliszewski**.

## Product architecture

- one mobile application; there is no Gymmin backend, account, authentication, synchronization, credit system, billing, or remote AI job;
- workouts, sessions, history, weekly plan, favorites, achievements, settings, reminders, creator profiles, and the optional local profile/avatar stay in private device storage;
- the local profile action is always visible in the top-right header and never opens login; the workout creator is always available regardless of saved workouts, account state, or connectivity;
- AI create/rewrite works by local prompt generation, clipboard hand-off to an external AI chosen by the user, and strict local JSON validation/import;
- backup/import uses `.gymmin.json`; v1 backups without `profile` preserve the current local profile;
- Contact and bug reports prepare `mailto:` messages locally for `kontakt@gymmin.app`; only the user can send them from the system email client, with clipboard fallback when no client is available;
- workout CSV/XLSX export and backup work offline;
- voluntary support only opens [Buy Me a Coffee](https://buymeacoffee.com/atomicjumpr) and grants no product benefits.

The released runtime opens `gymmin.local.v1.*` directly. Pre-release `gymmin.account.*` test namespaces are ignored and never merged into product data; they cannot block startup.

## Stack

- Expo SDK 57, React Native 0.86, React 19.2, TypeScript
- Gluestack UI, Ionicons, React Native SVG
- AsyncStorage and private app files
- Vitest and native Android Gradle builds

## Layout

```text
apps/mobile/       Gymmin product runtime
media-source/      non-bundled editable exercise image sources
docs/              current product/build/privacy documentation
docs/archive/      historical documentation for removed backend systems
scripts/           mobile validation, build and catalog tooling
```

`apps/mobile/App.tsx` composes local state and navigation. Screens live in `src/screens`, reusable UI in `src/components`, pure behavior and compatibility parsing in `src/domain`, and local repositories/hooks in `src/storage` and `src/features`.

## Development

```powershell
npm ci --prefix apps/mobile
npm --prefix apps/mobile start
npm --prefix apps/mobile test
npm --prefix apps/mobile run typecheck
Push-Location apps/mobile; npx expo-doctor; Pop-Location
```

Useful root checks:

```powershell
npm run exercise:catalog:validate
npm run security:secrets
npm run security:dependencies
node scripts/validate-local-only-runtime.mjs
node scripts/validate-local-product-runtime.mjs
npm run exercise:media:validate
```

Exercise images use a reproducible source-to-runtime pipeline: paired PNG sources live outside the mobile bundle under `media-source/exercises`, while the app statically requires optimized WebP Q90 files constrained to 900 x 1140 without cropping. After importing or generating PNG sources, run `npm run exercise:media:optimize`; see [exercise media](docs/exercise-media.md).

## Android artifacts

Phone APK, dependency/Expo/mobile gates + signed release build + merged-manifest, package and signature verification + private GitHub Release upload:

```powershell
npm run mobile:github:apk:oneclick
```

Google Play AAB, gates + signed release bundle:

```powershell
npm run mobile:store:aab
```

Release builds require all four `GYMMIN_UPLOAD_*` values (directly or via the local ignored signing properties/environment file). Gradle fails closed when they are missing and never falls back to the debug keystore. Neither command accepts or embeds a backend URL.

The one-click command reads the version, `versionCode`, and package directly from `apps/mobile/app.json`. It publishes a versioned APK such as `Gymmin-1.0-vc2-arm64-v8a-release.apk` to the matching `v1.0` private release unless tag/title overrides are supplied. The user-facing version remains `1.0`; Android `versionCode` increments independently for upgrade compatibility.

See [Android builds](docs/build-android-apk.md) and the [release checklist](docs/release-checklist.md).

## Privacy and support

Gymmin has an in-app PL/EN privacy policy and a static site under `docs/privacy/`. The manual `Publish privacy pages` workflow deploys exactly that directory after GitHub Pages is configured to use GitHub Actions. Use the URL reported by the successful deployment rather than assuming a repository Pages address.

- Author: **Paweł Kaliszewski**
- Contact: `kontakt@gymmin.app`
- Support: <https://buymeacoffee.com/atomicjumpr>

© Paweł Kaliszewski
