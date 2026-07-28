# Gymmin

Gymmin is a mobile-first workout builder for strength training.

## Stack

- Mobile: Expo SDK 57, React Native 0.86, React 19.2, TypeScript
- UI: Gluestack UI, Ionicons, React Native SVG
- Local storage: AsyncStorage
- Android testing: standalone APK distributed through private GitHub Release
- Backend: ASP.NET Core Web API
- Auth: backend email/password auth with bearer tokens
- AI creator: OpenAI Responses API through the backend
- Privacy: localized in-app policy plus a public, unauthenticated `GET /privacy?lang=pl|en`
- Account deletion: in-app permanent deletion plus public, unauthenticated instructions at `GET /account-deletion?lang=pl|en`
- Workout UX: compact Exercise Detail Page with hero summary, optional local media, worked-muscle anatomy toggle and collapsible technique panels; Progress uses a dashboard with summary cards, filters and compact exercise metric cards. Rest timer visibility is a per-user training preference.
- Manual workout editor: three-step `Details -> Stages -> Save` wizard. It edits one stage, set or exercise at a time while preserving the existing `WorkoutDraft` model and account synchronization format. A set containing exactly two executable exercises is marked as a planned superset.
- Workout library: workouts can be archived and restored without deleting their definitions or weekly-plan assignments. Archived items are hidden by default, can be included with a list filter, and the archive state synchronizes with the account.
- Home workout panel: shows every unique, non-archived workout assigned to the active weekly plan without an arbitrary item limit. Sorting remains available there, while adding workouts stays on the full workout-library screen.
- Workout export: a selected local workout can be saved offline as a simple Excel-compatible UTF-8 CSV or a one-sheet XLSX workbook. Both formats contain the same compact exercise table, and the file uses the workout name. Android writes exact bytes directly to the public `Downloads/Gymmin` collection through MediaStore, then shows a notification that can open the saved file; execution history and account data are intentionally excluded.
- Exercise catalog: 964 validated records with stable IDs, canonical ID aliases for reviewed merges, dedicated front-raise/step-up/good-morning/rope-climb categories, explicit `libraryTier` classification and a fail-fast validator available through `npm run exercise:catalog:validate`. Historical IDs are normalized when plans, sessions, favorites, technique content and image assets are read. The detailed migration report is in `docs/exercise-catalog-refactor.md`.
- Exercise picker: shows `main` exercises by default and provides compact opt-in filters for variations, advanced, sport-specific and rehabilitation movements. Search can find all active tiers and marks non-main results with a tier badge; deprecated and progression records remain history-only.
- Bug reports: durable File/Database storage with optional account linkage and SMTP notification
- Diagnostics: backend correlation id, structured request/error logs, safe global 500 responses, mobile diagnostics ring buffer
- Current durable backend storage: selectable File JSON store or EF Core database store
- Database providers: SQLite for local development and PostgreSQL for production-ready deployments

## Repository Layout

```text
apps/
  mobile/       Expo React Native app
backend/
  Gymmin.Api/   ASP.NET Core API
docs/
  architecture.md
  achievements.md
  application-status.md
  backend-sync.md
  build-android-apk.md
  deployment.md
  production-audit-2026-07-16.md
  performance-audit-2026-07-23.md
  security-audit-2026-07-21.md
  security-audit-2026-07-22.md
  release-checklist.md
  run-mobile-tunnel.md
  system-status.md
  workout-ux.md
scripts/
  start-expo-tunnel.ps1
```

Aktualny audyt gotowości produkcyjnej, wykryte blokery i kolejność napraw są
opisane w `docs/production-audit-2026-07-16.md`.

The current security follow-up and applied fixes are documented in
`docs/security-audit-2026-07-22.md` (with the previous pass retained in
`docs/security-audit-2026-07-21.md`).

The latest correctness and performance review is documented in
`docs/performance-audit-2026-07-23.md`.

The mobile UI is split by responsibility: route-level views live in
`apps/mobile/src/screens`, reusable controls and view fragments in
`apps/mobile/src/components`, domain types and pure helpers in
`apps/mobile/src/domain`, and navigation metadata in
`apps/mobile/src/navigation`. `apps/mobile/App.tsx` composes application
state, account-scoped persistence, backend integrations, synchronization,
and screen callbacks instead of containing complete screen layouts.

## Getting Started

### Mobile

```powershell
cd apps/mobile
npm install
npm run start
```

Expo Go is no longer the primary testing flow. The current practical phone-testing flow is a standalone Android release APK uploaded to GitHub Release.

Build and publish an installable Android release APK for phone download:

```powershell
npm run mobile:apk:share -- -ApiBaseUrl "https://your-backend-url.example.com"
```

This creates an `arm64-v8a` `.artifacts/Gymmin-arm64-v8a-release-latest.apk` and uploads it to the private GitHub Release repository `kicha93/gymmin-apk`, release `v1.0`. This is the phone-test APK flow that worked reliably on Android. Details are in `docs/build-android-apk.md`.

Google Play Internal Testing uses an AAB:

```powershell
$env:GYMMIN_UPLOAD_STORE_FILE = "C:\secure\gymmin-upload-key.jks"
$env:GYMMIN_UPLOAD_STORE_PASSWORD = "<password>"
$env:GYMMIN_UPLOAD_KEY_ALIAS = "gymmin-upload"
$env:GYMMIN_UPLOAD_KEY_PASSWORD = "<password>"
npm run mobile:store:aab -- -ApiBaseUrl "https://your-backend-url.example.com"
```

The release AAB build requires the upload key and fails if signing is not
configured, so it cannot accidentally use the Android debug keystore.

### Backend

Install the .NET SDK first, then:

```powershell
cd backend/Gymmin.Api
dotnet restore
dotnet run
```

By default, development still uses the file-backed store in `backend/Gymmin.Api/App_Data`.
To use the database-backed store locally, set:

```powershell
$env:Gymmin__Storage__Provider = "Database"
$env:Gymmin__Storage__DatabaseProvider = "SQLite"
$env:Gymmin__Storage__ApplyMigrationsOnStartup = "true"
```

The default development connection string is SQLite:

```text
ConnectionStrings:DefaultConnection = Data Source=App_Data/gymmin-dev.db
```

You can also run migrations explicitly:

```powershell
cd backend/Gymmin.Api
dotnet tool restore
dotnet tool run dotnet-ef database update
```

PostgreSQL is supported through `Gymmin:Storage:DatabaseProvider=PostgreSQL`.
For local PostgreSQL, use:

```powershell
docker compose -f docker-compose.postgres.yml up -d
$env:Gymmin__Storage__Provider = "Database"
$env:Gymmin__Storage__DatabaseProvider = "PostgreSQL"
$env:ConnectionStrings__DefaultConnection = "Host=localhost;Port=5432;Database=gymmin;Username=gymmin;Password=gymmin-dev-password"
```

Production secrets must be supplied through environment variables or a secret manager. See `docs/deployment.md`.
Tracked files are checked by `npm run security:secrets`; the same check runs
before mobile tests and in the production gate. It rejects private keys, common
provider tokens, release signing material, service-account files and literal
production credentials. A failure must be treated as possible exposure: remove
the material from Git and rotate the credential before continuing.

## Useful Checks

```powershell
npm run security:secrets
npm run production:smoke:self-test
```

```powershell
dotnet test backend/Gymmin.Api.Tests/Gymmin.Api.Tests.csproj
```

```powershell
npm --prefix apps/mobile run test
```

After deploying to the permanent HTTPS domain, run the synthetic production
probe (or set `GYMMIN_PRODUCTION_BASE_URL` instead of passing the URL):

```powershell
npm run production:smoke -- https://api.example.com
```

It verifies liveness/readiness, the sanitized production health response, HSTS,
security/cache headers and the PL/EN privacy and account-deletion pages. Local
and temporary Cloudflare/ngrok hosts are intentionally rejected.

```powershell
cd apps/mobile
npm run typecheck
npx expo-doctor
npx expo export --platform android --output-dir .expo-export-smoke
```

```powershell
cd backend/Gymmin.Api
dotnet build
```

Backend tests run against an isolated SQLite database in Database provider mode. OpenAI workout generation and SMTP email sending are replaced with fakes, so tests never call the real OpenAI API and never send real email.

Mobile unit tests use Vitest and cover pure helper logic for account-scoped local storage, favorite exercise tombstones, workout session conflict resolution/progress filtering, session-only supersets, workout reminder scheduling rules, achievements/app-usage metrics and the diagnostics ring buffer. They do not render React Native UI and do not run native modules.

## Current Notes

- The app is local-first for anonymous users. Users can create and keep manual workouts on the phone without logging in.
- The Profile screen uses a dashboard layout: avatar, name/email and avatar actions live in one profile card, achievements sit directly below it, quick actions link to Credits/change password/sessions/bug reports, and the Account section contains account details, delete account and logout. Settings are kept for app preferences.
- Contact uses a compact mail-first layout: a single email CTA opens the device mail client, app issues link to the existing Report a bug form, and the three FAQ answers are collapsible.
- Terms use a short dashboard layout with a hero summary, three key rules, an issue-reporting callout and seven expandable detailed sections.
- Homepage includes an account-scoped, local-first weekly plan. Planned workouts are assigned to weekdays and completed workout sessions are counted from Monday through Sunday. For signed-in users the assignments sync through account settings and are restored on other devices.
- Registration includes username, email, password, repeated password and password preview in the mobile UI. The backend contract still receives a single password field.
- Signed-in users can upload, replace and delete a profile avatar from the Profile screen. Avatars are uploaded as `multipart/form-data`; production Database mode stores bytes and metadata in the database, while File mode remains a development fallback. They are exposed through authenticated `GET /api/profile/avatar`. Native mobile downloads the image with the bearer token into an account-scoped private cache and limits the rendered/uploaded copy to 1024 px on its longest side, preventing high-resolution camera images from exhausting Android image memory. `avatarUpdatedAt` invalidates the cache; anonymous users keep the default icon.
- Signed-in users can permanently delete their account from Profile -> Account. Mobile requires the current password plus typing `USUŃ` / `DELETE`; the backend verifies both, rate-limits attempts per user/IP, deletes private user-owned data and avatar, and anonymizes retained bug reports.
- Installed APKs contain the API base URL used at build time. For GitHub Release phone builds, run `npm run mobile:github:apk:oneclick -- -ApiBaseUrl "https://..."` or set `GYMMIN_APK_API_BASE_URL`; published APKs reject non-HTTPS API URLs. The wrapper checks `/health` and, if the URL is missing or stale, starts or attaches a backend tunnel automatically. A running local backend on `http://127.0.0.1:5198` can be reused behind that HTTPS tunnel instead of restarted. The current tunnel URL is written to `.artifacts/backend-url.txt`.
- Android release builds reject cleartext HTTP at the native network-security layer. Debug and debug-optimized builds retain a separate local-development exception. Android cloud backup and device-to-device transfer exclude all private app storage; signed-in state is restored through Gymmin account sync instead of an OS backup.
- The final merged Android release manifest is checked against an exported-component allowlist. Only the launcher activity and the permission-protected AndroidX Profile Installer receiver may be exported; unexpected components, implicit `android:exported` values, forbidden high-risk permissions, debuggable builds and test-only builds fail the production gate. Camera permission is removed because avatar selection currently uses the system media library rather than direct capture. Gymmin notifications are local-only, so FCM/C2DM delivery services, receiver and permission are removed from release.
- Gymmin does not use application-icon badge counters. The 16 legacy OEM launcher read/write permissions contributed by the notification library are removed from the release manifest and covered by the permission regression gate; ordinary Android notifications and system-managed notification dots remain available.
- Android package visibility is allowlisted in the merged release manifest. Gallery-only avatar selection exposes only `GET_CONTENT image/*`; unused image/video camera queries and wildcard `*/*` visibility are removed. HTTPS opening, the legacy Downloads folder picker and Google Play Billing queries remain intentionally available.
- Auth hardening is implemented: token expiry, active sessions, single-session revoke, logout-all, change password and password reset by email/token. Reset tokens are stored only as hashes. Mobile bearer tokens live in OS-backed SecureStore/Keychain and legacy plaintext AsyncStorage sessions migrate on first launch. New accounts must confirm a six-digit email code before AI use; registration and AI generation are rate-limited per IP/user with shared Database-provider buckets.
- After login, workouts are synchronized to the user's backend account and kept locally as a cache/offline copy.
- After login, the complete account-settings payload is synchronized to the user's backend account and kept locally as an account-scoped cache/offline copy. This includes language, theme, workout defaults, rest-timer visibility, collapsed panels, reminder configuration, AI workout-creator profiles, the selected creator profile and the homepage weekly plan; only device-specific scheduled-notification IDs remain local. Creator profiles and weekly-plan assignments created on one signed-in phone are therefore restored on another phone after login and settings sync.
- After login, catalog-only favorite exercises are synchronized to the user's backend account and remain available locally/offline.
- After login, workout execution sessions are synchronized to the user's backend account and remain available locally/offline. History and progress are still calculated on-device from the local synchronized session cache.
- The Progress screen is local-first and dashboard-style: it shows tracked exercises, best-result count, current-month volume, filters for all/strength/volume and compact exercise cards with latest result, best weight, best volume and optional SVG sparkline. Per-exercise history is grouped by completed workout session, so all sets from one workout appear as compact rows in one collapsible card.
- Achievements are visible in Profile and sync for signed-in users. The app ships 30 static achievements, evaluates progress from local `WorkoutSession` data, stores unlocked achievements/app usage per local owner, syncs unlocked state through `/api/sync/achievements`, and keeps unlocked achievements unlocked even if history is later deleted. Weekly achievements use Monday-based calendar weeks. See `docs/achievements.md`.
- Users can delete a single workout history entry. Mobile marks the `WorkoutSession` with `deletedAt`, hides it from history/progress immediately, and syncs the tombstone later when account sync is available.
- Deleting a workout definition does not delete workout history. If the workout already has active history entries, the mobile app shows a stronger irreversible-action confirmation before soft-deleting the workout definition.
- The read-only workout view has collapsible sections, and session status labels are localized instead of rendering raw enum values such as `abandoned`.
- Rest between sets is configured directly in the exercise editor (hours,
  minutes and seconds), stored as `WorkoutStep.restSeconds` and synchronized
  with the workout. The AI creator writes the same field instead of appending a
  standalone rest element. Existing valid legacy rest elements migrate to the
  preceding exercise; the active session still creates an internal rest entry
  so the guided timer and supersets keep working.
- The `body-outline` button on exercise rows opens the same exercise detail page as tapping the row.
- The per-exercise anatomy view reuses the same front/back SVG anatomy map as the workout overview, filtered to one exercise.
- Tapping an exercise row opens a dedicated exercise detail page with metadata, optional exercise images, worked muscles, technique placeholders and exercise history/progress when local data exists. The media panel is hidden when no exercise images are mapped yet.
- Starting a workout no longer asks for execution mode every time. The app uses the workout execution mode saved in Settings for the next session.
- The guided active workout screen now uses a compact workout header with a clock icon and elapsed time, an `Exercises X/Y` progress card, a clearer current-exercise card, rest duration pills and set/target tiles.
- Guided active sessions support supersets of two adjacent exercises. They can be created during a session or seeded automatically from a saved workout set containing exactly two exercises. The removable grouping remains session-only: a combined step shows both exercises and their original previous-value prefill actions, records A/B results in the existing session entries, survives local resume and account sync, and makes Back/Next skip the second exercise. Splitting it keeps all entered results and does not modify the saved workout.
- Workout tables follow the device orientation. With system auto-rotate enabled, Android switches the whole screen between portrait and landscape; tables adapt their width automatically and retain horizontal scrolling when needed. Legacy orientation values in synced settings remain accepted but are no longer exposed in the UI.
- Mobile account-scoped data uses per-user AsyncStorage keys: `gymmin.account.anonymous.*` for signed-out data and `gymmin.account.{userId}.*` for signed-in cache/sync metadata. Account switching does not silently merge data from the previous account.
- If signed-out local data exists after login, the app asks whether to merge it into the current account, keep it for later, or delete only the anonymous local data.
- Workout reminders are local system notifications. They have a per-weekday schedule (`weeklySchedule`) where each day has its own enabled state and `HH:mm` time, while `message` and `description` remain shared. Old `daysOfWeek + time` settings are normalized into the new shape. Reminders were manually verified in the standalone Android APK / development build and sync through `/api/settings`, while scheduled notification IDs stay per-user on the device under `gymmin.account.{owner}.workoutReminderNotificationIds`.
- The home screen shows only workouts assigned to the active weekly plan, without
  an artificial item limit. Adding, searching, sorting and archived-workout
  filtering remain on the full Workouts screen.
- Local articles are multilingual. Each article stores per-language `translations`, uses `defaultLanguage` fallback, and the current training-plan article has both PL and EN content.
- Workout list sorting is stored locally with workouts. Default sorting is by creation date descending; the user can switch between creation date/alphabetical and ascending/descending.
- Login and registration are connected to the backend.
- The mobile app exposes the AI workout creator only to logged-in users, and backend creator endpoints require bearer tokens.
- AI creator and AI rewrite use account-bound AI credits. The user-facing name is `Credits`; technically the backend/mobile model remains `AiCredits`. `1 credit = 1 plan generation or 1 workout modification`; the backend is the source of truth for balance and blocks AI jobs when the account has no credits.
- The AI workout creator requires an explicit consent immediately before submitting
  answers that may include health, injury, medication and lifestyle information.
  Mobile sends `sensitiveDataConsent: true`, and the backend rejects plan requests
  without it before charging a credit or contacting OpenAI.
- The workout-definition AI rewrite remains implemented in mobile/backend but its
  `Modify with AI` entry point is intentionally hidden for the current production
  release. The standard AI workout creator remains available.
- Settings contain a localized privacy screen that works offline and links to the
  public backend policy. The production URL ending in `/privacy` can be used as the
  Google Play privacy-policy URL; `?lang=en` serves the English version.
- The same screen links to `/account-deletion`, which documents immediate in-app
  deletion and an external email request flow with ownership verification. This
  public URL is intended for Google Play's account-deletion web-link field.
- AI credit consumption is protected by database transactions and an atomic conditional balance update in Database mode. File mode remains a development fallback, not the production safety boundary for paid credits.
- AI credit concurrency, idempotency and technical-failure refund were smoke-tested on a real local PostgreSQL cluster without Docker, using the `HardenAiCreditsConcurrency` migration.
- New users can receive an idempotent initial AI credit grant. Development/testing can use the guarded `/api/ai-credits/dev/grant` endpoint.
- Android AI credit purchases use backend Google Play validation and consume. Mobile attaches an opaque account identifier and backend checks it when Google returns it. Google API diagnostics redact purchase tokens and developer payloads before persistence. Authenticated RTDN/Pub/Sub push verifies Google's OIDC signature, exact audience, service-account email and package name; notifications are deduplicated by `messageId`, stored in `GooglePlayRtdnEvents`, and plaintext purchase tokens are never persisted. A checkpointed Voided Purchases worker reconciles refunds/chargebacks, claws back only unused credits without creating negative balances and records unrecovered amounts for manual review.
- Mobile uses `react-native-iap@15.5.0` plus `react-native-nitro-modules@0.35.10` as the native Google Play Billing stack. Android debug APK and release AAB build smoke pass on Expo SDK 57 / React Native 0.86 when `ANDROID_HOME` / `ANDROID_SDK_ROOT` points to an installed Android SDK. Windows native builds use a short temporary build path and clear copied `.cxx` caches to avoid CMake/Ninja path failures in Nitro/IAP sources. Real billing tests still require Play Console one-time products (`ai_tokens_1`, `ai_tokens_3`, `ai_tokens_10`) matching the current 1/3/10 credit packs, license testers, a Google Play service account, and installing the app from an Internal Testing track.
- Workout creator jobs are asynchronous and persisted on both sides: the phone stores the active `jobId`, and the backend stores job state in File or Database storage. Database jobs are processed by a controlled worker with atomic lease, heartbeat and expired-lease recovery for safe multi-replica deployment.
- Bug reports are persisted before email delivery in File or Database storage. Submissions are limited to 64 KiB, rate-limited, and retry-safe through `X-Idempotency-Key`. A durable background outbox retries SMTP delivery. The optional admin API uses only a configured SHA256 key hash, rate-limits failed access, supports status/response and one immutable reward per report, and appends `AdminAuditEvents`.
- Every backend response includes `X-Correlation-Id`. Mobile sends `X-Correlation-Id` on API requests and attaches recent correlation ids plus local diagnostic events to bug reports.
- Backend unexpected errors return a safe JSON error response with `correlationId`; stack traces are logged server-side only.
- `/api/diagnostics` is available only in development/testing. Production fails startup if diagnostics or migrations-on-startup are enabled, or if the database schema has pending EF migrations. `/health/live` checks process liveness and `/health/ready` checks database connectivity plus schema currency. API responses default to disabled HTTP caching unless an endpoint explicitly uses authenticated private caching, and use restrictive security headers; Kestrel omits its server-identification header.
- `/api/system/status` is a public, user-safe status endpoint. Mobile checks it on the homepage and shows a calm callout for `degraded`, `maintenance`, `update`, or local `offline`; `ok` shows nothing. Configure it with `SystemStatus:Kind`, `SystemStatus:MessagePl`, and `SystemStatus:MessageEn`. See `docs/system-status.md`.
- Conflict resolution and multi-device sync polish are not finished yet.
- Garmin integration is currently a placeholder and is out of scope for the current development track.
- Backend API has integration smoke tests for auth hardening, settings, workouts, favorite exercises, workout sessions, AI creator auth/owner checks and bug reports.
- Mobile has unit tests for critical local-first/sync/reminder/diagnostics helpers.
- Production emits one-line JSON logs with UTC timestamps and correlation scopes. Selecting and connecting the external log/crash provider remains a deployment task; request bodies and authorization headers must stay excluded.

For a broader status snapshot, see `docs/application-status.md`.

For the final pre-release checklist and manual smoke matrix, see `docs/release-checklist.md`.
