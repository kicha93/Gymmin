# Gymmin

[![Download Android APK](https://img.shields.io/badge/Android-Download%20latest%20APK-138A87?logo=android&logoColor=white)](https://github.com/kicha93/Gymmin/releases/latest/download/Gymmin-arm64-v8a-release.apk)

**[Download the latest signed Android APK directly](https://github.com/kicha93/Gymmin/releases/latest/download/Gymmin-arm64-v8a-release.apk).** Source code and installable packages are published together in this repository. Every APK release is immutable, so a later one-click publication cannot interrupt or replace an in-progress download.

Gymmin is a local-only Expo/React Native workout app created and maintained by **Paweł Kaliszewski**.

## Product architecture

- one mobile application; there is no Gymmin backend, account, authentication, synchronization, credit system, billing, or remote AI job;
- workouts, sessions, history, weekly plan, favorites, achievements, settings, reminders, creator profiles, and the optional local avatar stay in private device storage;
- the Progress entry opens a derived Progress Report with week, month and 12-week periods, real session summary, e1RM-based comparisons, records and drill-down to the existing per-exercise history;
- Home can expand the current Monday-Sunday plan into a local weekly muscle-volume estimate, separating completed sets from projected end-of-week volume and reusing the exercise catalog's muscle-impact data; the responsive list and anatomy view share one status model, and individual muscle groups can be temporarily hidden or restored on the figure;
- the local profile action is always visible in the top-right header and never opens login; the workout creator remains available from the Workouts screen regardless of saved workouts or connectivity, but is not duplicated on Home;
- Profile is a local dashboard with a private avatar, derived completed-session and active-plan counts, achievements and bug reporting; Gymmin does not collect a display name, so the UI uses a localized local-profile label;
- AI workout creation works by local generation of a prompt optimized for ChatGPT Deep Research, manual clipboard hand-off, and strict local JSON validation/import; Gymmin does not call an AI API, and AI modification of saved workouts is not part of the product;
- backup/import uses `.gymmin.json`; v1 backups without `profile` preserve the current local profile, and orphan weekly-plan references are safely discarded without rejecting otherwise valid user data;
- Contact and bug reports prepare `mailto:` messages locally for `kontakt@gymmin.app`; only the user can send them from the system email client, with clipboard fallback when no client is available;
- workout CSV/XLSX export and backup work offline;
- voluntary support only opens [Buy Me a Coffee](https://buymeacoffee.com/atomicjumpr) and grants no product benefits.
- optional [Advanced Muscle Mode](docs/advanced-muscle-mode.md) adds local, generated subdivision profiles to Exercise Detail without changing the standard catalog or weekly-volume semantics.

The repository is public source-available software. Copyright remains with Paweł Kaliszewski and no reuse license is granted beyond the terms in [LICENSE](LICENSE). Product, architecture, build, release and historical documentation is indexed in [docs/README.md](docs/README.md).

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
npm run docs:validate
npm run exercise:catalog:validate
npm run security:secrets
npm run security:dependencies
node scripts/validate-local-only-runtime.mjs
node scripts/validate-local-product-runtime.mjs
npm run exercise:media:validate
npm run google-play:validate
```

Exercise images use a reproducible source-to-runtime pipeline: paired PNG sources live outside the mobile bundle under `media-source/exercises`, while the app statically requires optimized WebP Q90 files constrained to 900 x 1140 without cropping. After importing or generating PNG sources, run `npm run exercise:media:optimize`; see [exercise media](docs/exercise-media.md).

The validated exercise catalog is the single source for creator prompts, exercise selection, localized names, technique content and the five-level muscle-involvement model. Deprecated integration-only metadata and unpopulated calorie/heart-rate fields are not part of the product model.

The hypertrophy-oriented weekly dashboard uses fractional working sets rather than `sets x repetitions`. Its evidence basis, Gymmin heuristics and limitations are documented in [weekly muscle volume](docs/weekly-muscle-volume.md).

## Android artifacts

Phone APK, dependency/Expo/mobile gates + signed release build + merged-manifest, package and signature verification + public GitHub Release upload:

```powershell
npm run mobile:github:apk:oneclick
```

Google Play AAB, gates + signed release bundle:

```powershell
npm run mobile:store:aab
```

Niepodpisana paczka iOS do 7-dniowych testów, budowana na macOS przez GitHub Actions:

```powershell
npm run mobile:ios:personal
```

IPA jest dostępne jako GitHub Artifact i musi zostać podpisane podczas instalacji darmowym Apple ID przez AltStore, SideStore albo Sideloadly. Podpis jest ważny 7 dni. Alternatywny, również niepodpisany build może uruchomić Codemagic z pliku `codemagic.yaml`. Żaden z tych workflow nie publikuje aplikacji w App Store. Szczegóły: [prywatny build iOS](docs/build-ios-personal.md).

Release builds require all four `GYMMIN_UPLOAD_*` values (directly or via the local ignored signing properties/environment file). Gradle fails closed when they are missing and never falls back to the debug keystore. Neither command accepts or embeds a backend URL.

The one-click command reads the version, `versionCode`, and package directly from `apps/mobile/app.json`. It publishes a versioned APK such as `Gymmin-1.0-vc2-arm64-v8a-release.apk` to the matching `v1.0` release unless tag/title overrides are supplied. Because the repository is public, its release and assets are public. The user-facing version remains `1.0`; Android `versionCode` increments independently for upgrade compatibility. It performs Git/GitHub preflight checks before the expensive build, retries transient network failures, updates an existing release instead of recreating its tag, and verifies the uploaded asset size.

See [Android builds](docs/build-android-apk.md), the [release checklist](docs/release-checklist.md), and the prepared [Google Play materials](docs/google-play/console-declarations.md).

## Privacy and support

Gymmin has an in-app PL/EN privacy policy and canonical static sources under `docs/privacy/`. The same publishable files are mirrored to the dedicated `kicha93/gymmin-privacy` repository so the stable Google Play privacy URLs remain independent of the application repository and its release workflow.

- Privacy policy PL: <https://kicha93.github.io/gymmin-privacy/>
- Privacy policy EN: <https://kicha93.github.io/gymmin-privacy/en/>
- Local data deletion PL: <https://kicha93.github.io/gymmin-privacy/delete-data/>
- Local data deletion EN: <https://kicha93.github.io/gymmin-privacy/en/delete-data/>

- Author: **Paweł Kaliszewski**
- Contact: `kontakt@gymmin.app`
- Support: <https://buymeacoffee.com/atomicjumpr>

© Paweł Kaliszewski
