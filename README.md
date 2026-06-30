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
  application-status.md
  backend-sync.md
  build-android-apk.md
  deployment.md
  run-mobile-tunnel.md
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

Expo Go is no longer the primary testing flow. The current practical phone-testing flow is a standalone Android APK.

Build and publish an installable Android APK for phone download:

```powershell
npm run mobile:apk:share -- -ApiBaseUrl "https://your-backend-url.example.com"
```

This creates a small `arm64-v8a` release APK and uploads it to the private GitHub Release repository `kicha93/gymmin-apk`, release `v1.0`. Details are in `docs/build-android-apk.md`.

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

Mobile unit tests use Vitest and cover pure helper logic for account-scoped local storage, favorite exercise tombstones, workout session conflict resolution/progress filtering, workout reminder scheduling rules and the diagnostics ring buffer. They do not render React Native UI and do not run native modules.

## Current Notes

- The app is local-first for anonymous users. Users can create and keep manual workouts on the phone without logging in.
- Registration includes username, email, password, repeated password and password preview in the mobile UI. The backend contract still receives a single password field.
- Auth hardening is implemented: token expiry, active sessions, single-session revoke, logout-all, change password and password reset by email/token. Reset tokens are stored only as hashes.
- After login, workouts are synchronized to the user's backend account and kept locally as a cache/offline copy.
- After login, app settings are synchronized to the user's backend account and kept locally as a cache/offline copy.
- After login, catalog-only favorite exercises are synchronized to the user's backend account and remain available locally/offline.
- After login, workout execution sessions are synchronized to the user's backend account and remain available locally/offline. History and progress are still calculated on-device from the local synchronized session cache.
- Mobile account-scoped data uses per-user AsyncStorage keys: `gymmin.account.anonymous.*` for signed-out data and `gymmin.account.{userId}.*` for signed-in cache/sync metadata. Account switching does not silently merge data from the previous account.
- If signed-out local data exists after login, the app asks whether to merge it into the current account, keep it for later, or delete only the anonymous local data.
- Workout reminders are local system notifications. They were manually verified in the standalone Android APK / development build. Their settings sync through `/api/settings`, while scheduled notification IDs stay per-user on the device under `gymmin.account.{owner}.workoutReminderNotificationIds`.
- Workout list sorting is stored locally with workouts. Default sorting is by creation date descending; the user can switch between creation date/alphabetical and ascending/descending.
- Login and registration are connected to the backend.
- The mobile app exposes the AI workout creator only to logged-in users, and backend creator endpoints require bearer tokens.
- AI creator and AI rewrite use account-bound AI credits. `1 AI credit = 1 plan generation or 1 workout modification`; the backend is the source of truth for balance and blocks AI jobs when the account has no credits.
- New users can receive an idempotent initial AI credit grant. Development/testing can use the guarded `/api/ai-credits/dev/grant` endpoint; production billing through Google Play is still TODO.
- Workout creator jobs are asynchronous and persisted on both sides: the phone stores the active `jobId`, and the backend stores job state in File or Database storage.
- Bug reports call the backend and are sent by SMTP when SMTP is configured.
- Every backend response includes `X-Correlation-Id`. Mobile sends `X-Correlation-Id` on API requests and attaches recent correlation ids plus local diagnostic events to bug reports.
- Backend unexpected errors return a safe JSON error response with `correlationId`; stack traces are logged server-side only.
- `/api/diagnostics` is available only in development/testing or when explicitly enabled, and does not expose secrets.
- Conflict resolution and multi-device sync polish are not finished yet.
- Garmin integration is currently a placeholder and is out of scope for the current development track.
- Backend API has integration smoke tests for auth hardening, settings, workouts, favorite exercises, workout sessions, AI creator auth/owner checks and bug reports.
- Mobile has unit tests for critical local-first/sync/reminder/diagnostics helpers.
- External monitoring SaaS is not connected yet. TODO: Sentry/Crashlytics or production log aggregation before a public release.

For a broader status snapshot, see `docs/application-status.md`.
