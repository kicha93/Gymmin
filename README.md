# Gymmin

Gymmin is a mobile-first workout builder for strength training.

## Stack

- Mobile: Expo SDK 54, React Native, React 19, TypeScript
- UI: Gluestack UI, Ionicons, React Native SVG
- Local storage: AsyncStorage
- Android testing: standalone APK distributed through private GitHub Release
- Backend: ASP.NET Core Web API
- Auth: backend email/password auth with bearer tokens
- AI creator: OpenAI Responses API through the backend
- Workout UX: compact Exercise Detail Page with hero summary, optional local media, worked-muscle anatomy toggle and collapsible technique panels; Progress uses a dashboard with summary cards, filters and compact exercise metric cards. Rest timer visibility is a per-user training preference.
- Exercise catalog: 963 validated records with stable IDs, canonical ID aliases for merged duplicates, explicit `libraryTier` classification and a fail-fast validator available through `npm run exercise:catalog:validate`. The detailed migration report is in `docs/exercise-catalog-refactor.md`.
- Bug reports: backend SMTP sender
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
  release-checklist.md
  run-mobile-tunnel.md
  system-status.md
  workout-ux.md
scripts/
  start-expo-tunnel.ps1
```

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

## Useful Checks

```powershell
dotnet test backend/Gymmin.Api.Tests/Gymmin.Api.Tests.csproj
```

```powershell
npm --prefix apps/mobile run test
```

```powershell
cd apps/mobile
npm run typecheck
```

```powershell
cd backend/Gymmin.Api
dotnet build
```

Backend tests run against an isolated SQLite database in Database provider mode. OpenAI workout generation and SMTP email sending are replaced with fakes, so tests never call the real OpenAI API and never send real email.

Mobile unit tests use Vitest and cover pure helper logic for account-scoped local storage, favorite exercise tombstones, workout session conflict resolution/progress filtering, workout reminder scheduling rules, achievements/app-usage metrics and the diagnostics ring buffer. They do not render React Native UI and do not run native modules.

## Current Notes

- The app is local-first for anonymous users. Users can create and keep manual workouts on the phone without logging in.
- The Profile screen uses a dashboard layout: avatar, name/email and avatar actions live in one profile card, achievements sit directly below it, quick actions link to Credits/change password/sessions/bug reports, and the Account section contains account details, active sessions, delete account and logout. Settings are kept for app preferences.
- Contact uses a compact mail-first layout: a single email CTA opens the device mail client, app issues link to the existing Report a bug form, and the three FAQ answers are collapsible.
- Terms use a short dashboard layout with a hero summary, three key rules, an issue-reporting callout and seven expandable detailed sections.
- Homepage includes an account-scoped, local-first weekly plan. Planned workouts are assigned to weekdays and completed workout sessions are counted from Monday through Sunday.
- Registration includes username, email, password, repeated password and password preview in the mobile UI. The backend contract still receives a single password field.
- Signed-in users can upload, replace and delete a profile avatar from the Profile screen. Avatars are uploaded as `multipart/form-data`, stored as files on the backend, exposed through `GET /api/profile/avatar`, and displayed in the mobile header/profile with `avatarUpdatedAt` cache busting. Anonymous users keep the default icon.
- Signed-in users can permanently delete their account from Profile -> Account. Mobile requires typing `USUŃ` / `DELETE`, calls `DELETE /api/account`, clears only that account's local cache, removes local auth, and leaves anonymous/other-user data untouched. The backend deletes the user, sessions, avatar file and private user-owned data.
- Installed APKs contain the API base URL used at build time. For GitHub Release phone builds, run `npm run mobile:github:apk:oneclick -- -ApiBaseUrl "https://..."` or set `GYMMIN_APK_API_BASE_URL`; the wrapper checks `/health` and, if the URL is missing or stale, starts or attaches a backend tunnel automatically. A running local backend on `http://127.0.0.1:5198` is reused instead of restarted. The current tunnel URL is written to `.artifacts/backend-url.txt`.
- Auth hardening is implemented: token expiry, active sessions, single-session revoke, logout-all, change password and password reset by email/token. Reset tokens are stored only as hashes.
- After login, workouts are synchronized to the user's backend account and kept locally as a cache/offline copy.
- After login, app settings are synchronized to the user's backend account and kept locally as a cache/offline copy.
- After login, catalog-only favorite exercises are synchronized to the user's backend account and remain available locally/offline.
- After login, workout execution sessions are synchronized to the user's backend account and remain available locally/offline. History and progress are still calculated on-device from the local synchronized session cache.
- The Progress screen is local-first and dashboard-style: it shows tracked exercises, best-result count, current-month volume, filters for all/strength/volume and compact exercise cards with latest result, best weight, best volume and optional SVG sparkline. Per-exercise history is grouped by completed workout session, so all sets from one workout appear as compact rows in one collapsible card.
- Achievements are visible in Profile and sync for signed-in users. The app ships 30 static achievements, evaluates progress from local `WorkoutSession` data, stores unlocked achievements/app usage per local owner, syncs unlocked state through `/api/sync/achievements`, and keeps unlocked achievements unlocked even if history is later deleted. Weekly achievements use Monday-based calendar weeks. See `docs/achievements.md`.
- Users can delete a single workout history entry. Mobile marks the `WorkoutSession` with `deletedAt`, hides it from history/progress immediately, and syncs the tombstone later when account sync is available.
- Deleting a workout definition does not delete workout history. If the workout already has active history entries, the mobile app shows a stronger irreversible-action confirmation before soft-deleting the workout definition.
- The read-only workout view has collapsible sections, and session status labels are localized instead of rendering raw enum values such as `abandoned`.
- The read-only workout view shows compact exercise rows with set/target tiles such as `[3] x [8]`; rest elements use a single tile such as `[2m]`.
- The `body-outline` button on exercise rows opens the same exercise detail page as tapping the row.
- The per-exercise anatomy view reuses the same front/back SVG anatomy map as the workout overview, filtered to one exercise.
- Tapping an exercise row opens a dedicated exercise detail page with metadata, optional exercise images, worked muscles, technique placeholders and exercise history/progress when local data exists. The media panel is hidden when no exercise images are mapped yet.
- Starting a workout no longer asks for execution mode every time. The app uses the workout execution mode saved in Settings for the next session.
- The guided active workout screen now uses a compact workout header with a clock icon and elapsed time, an `Exercises X/Y` progress card, a clearer current-exercise card, rest duration pills and set/target tiles.
- Inline workout table execution supports a per-user default table orientation: vertical or horizontal. Horizontal mode widens the table for landscape use; actual screen rotation is handled by the device/system auto-rotate setting. This setting syncs through `/api/settings`.
- Mobile account-scoped data uses per-user AsyncStorage keys: `gymmin.account.anonymous.*` for signed-out data and `gymmin.account.{userId}.*` for signed-in cache/sync metadata. Account switching does not silently merge data from the previous account.
- If signed-out local data exists after login, the app asks whether to merge it into the current account, keep it for later, or delete only the anonymous local data.
- Workout reminders are local system notifications. They have a per-weekday schedule (`weeklySchedule`) where each day has its own enabled state and `HH:mm` time, while `message` and `description` remain shared. Old `daysOfWeek + time` settings are normalized into the new shape. Reminders were manually verified in the standalone Android APK / development build and sync through `/api/settings`, while scheduled notification IDs stay per-user on the device under `gymmin.account.{owner}.workoutReminderNotificationIds`.
- The home screen shows at most five workouts in the Workouts section and links to the full workout list when more exist.
- Local articles are multilingual. Each article stores per-language `translations`, uses `defaultLanguage` fallback, and the current training-plan article has both PL and EN content.
- Workout list sorting is stored locally with workouts. Default sorting is by creation date descending; the user can switch between creation date/alphabetical and ascending/descending.
- Login and registration are connected to the backend.
- The mobile app exposes the AI workout creator only to logged-in users, and backend creator endpoints require bearer tokens.
- AI creator and AI rewrite use account-bound AI credits. The user-facing name is `Credits`; technically the backend/mobile model remains `AiCredits`. `1 credit = 1 plan generation or 1 workout modification`; the backend is the source of truth for balance and blocks AI jobs when the account has no credits.
- AI credit consumption is protected by database transactions and an atomic conditional balance update in Database mode. File mode remains a development fallback, not the production safety boundary for paid credits.
- AI credit concurrency, idempotency and technical-failure refund were smoke-tested on a real local PostgreSQL cluster without Docker, using the `HardenAiCreditsConcurrency` migration.
- New users can receive an idempotent initial AI credit grant. Development/testing can use the guarded `/api/ai-credits/dev/grant` endpoint.
- Android AI credit purchases are prepared through Google Play Billing: mobile sends the Google Play `purchaseToken` to `POST /api/ai-credits/purchases/google-play/verify`, and the backend validates the purchase, appends a `Purchase` ledger transaction, updates `AiCreditPurchases`, and performs server-side consume. `purchaseToken` is hashed and never stored plaintext.
- Mobile uses `react-native-iap@15.3.4` plus `react-native-nitro-modules` as the native Google Play Billing stack. Android debug APK and release AAB build smoke pass with this stack when `ANDROID_HOME` / `ANDROID_SDK_ROOT` points to an installed Android SDK. The AAB build uses a short temporary build path to avoid Windows CMake path-length failures in Nitro/IAP native sources. Real billing tests still require Play Console one-time products (`ai_tokens_1`, `ai_tokens_3`, `ai_tokens_10`) matching the current 1/3/10 credit packs, license testers, a Google Play service account, and installing the app from an Internal Testing track.
- Workout creator jobs are asynchronous and persisted on both sides: the phone stores the active `jobId`, and the backend stores job state in File or Database storage.
- Bug reports call the backend and are sent by SMTP when SMTP is configured. Email subjects use the app-prefixed format `[Gymmin][Bug] {Title}` / `[Gymmin][Błąd] {Tytuł}` with safe fallback titles.
- Every backend response includes `X-Correlation-Id`. Mobile sends `X-Correlation-Id` on API requests and attaches recent correlation ids plus local diagnostic events to bug reports.
- Backend unexpected errors return a safe JSON error response with `correlationId`; stack traces are logged server-side only.
- `/api/diagnostics` is available only in development/testing or when explicitly enabled, and does not expose secrets.
- `/api/system/status` is a public, user-safe status endpoint. Mobile checks it on the homepage and shows a calm callout for `degraded`, `maintenance`, `update`, or local `offline`; `ok` shows nothing. Configure it with `SystemStatus:Kind`, `SystemStatus:MessagePl`, and `SystemStatus:MessageEn`. See `docs/system-status.md`.
- Conflict resolution and multi-device sync polish are not finished yet.
- Garmin integration is currently a placeholder and is out of scope for the current development track.
- Backend API has integration smoke tests for auth hardening, settings, workouts, favorite exercises, workout sessions, AI creator auth/owner checks and bug reports.
- Mobile has unit tests for critical local-first/sync/reminder/diagnostics helpers.
- External monitoring SaaS is not connected yet. TODO: Sentry/Crashlytics or production log aggregation before a public release.

For a broader status snapshot, see `docs/application-status.md`.

For the final pre-release checklist and manual smoke matrix, see `docs/release-checklist.md`.
