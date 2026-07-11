# Backend deployment

This document describes the production-ready backend configuration for Gymmin.
For the consolidated pre-release gate and manual smoke matrix, see
`docs/release-checklist.md`.

## Storage modes

Gymmin has two storage layers:

```text
Gymmin:Storage:Provider = File | Database
Gymmin:Storage:DatabaseProvider = SQLite | PostgreSQL
```

Rules:

- `Provider=File` uses JSON files in `backend/Gymmin.Api/App_Data`.
- `Provider=Database` uses EF Core stores.
- `DatabaseProvider=SQLite` is intended for local development and tests.
- `DatabaseProvider=PostgreSQL` is intended for staging/production and local PostgreSQL smoke tests.

## Environment variables

Production should be configured through environment variables or a secret manager.
Do not commit real secrets or production connection strings.

PowerShell example:

```powershell
$env:ASPNETCORE_ENVIRONMENT = "Production"
$env:Gymmin__Storage__Provider = "Database"
$env:Gymmin__Storage__DatabaseProvider = "PostgreSQL"
$env:Gymmin__Storage__ApplyMigrationsOnStartup = "false"
$env:Gymmin__Storage__ImportAppDataOnStartup = "false"
$env:Gymmin__Diagnostics__Enabled = "false"
$env:ConnectionStrings__DefaultConnection = "Host=...;Database=...;Username=...;Password=..."
$env:OPENAI_API_KEY = "..."
$env:Gymmin__AiCredits__InitialGrant = "1"
$env:Gymmin__AiCredits__PlanCost = "1"
$env:Gymmin__AiCredits__RewriteCost = "1"
$env:Gymmin__AiCredits__DevGrantEnabled = "false"
$env:Gymmin__GooglePlay__Enabled = "true"
$env:Gymmin__GooglePlay__PackageName = "com.gymmin.app"
$env:Gymmin__GooglePlay__ServiceAccountJsonBase64 = "<base64-json>"
$env:BugReports__Smtp__Host = "..."
$env:BugReports__Smtp__Port = "587"
$env:BugReports__Smtp__Username = "..."
$env:BugReports__Smtp__Password = "..."
$env:BugReports__Smtp__From = "..."
$env:BugReports__Smtp__To = "..."
```

Password reset email can use `Auth:Smtp` values. If they are not set, the backend falls back to `BugReports:Smtp` where supported by the current sender configuration.

## Local PostgreSQL

Start local PostgreSQL:

```powershell
docker compose -f docker-compose.postgres.yml up -d
```

Development connection string:

```text
Host=localhost;Port=5432;Database=gymmin;Username=gymmin;Password=gymmin-dev-password
```

Run the backend with PostgreSQL:

```powershell
$env:ASPNETCORE_ENVIRONMENT = "Development"
$env:Gymmin__Storage__Provider = "Database"
$env:Gymmin__Storage__DatabaseProvider = "PostgreSQL"
$env:ConnectionStrings__DefaultConnection = "Host=localhost;Port=5432;Database=gymmin;Username=gymmin;Password=gymmin-dev-password"
cd backend/Gymmin.Api
dotnet run
```

The password in `docker-compose.postgres.yml` is dev-only.

If Docker is not available but a local PostgreSQL service is already installed,
you can use that service instead. Create a database manually and use the same
environment variables with the service port/user/password. For isolated smoke
tests on a developer machine, a temporary PostgreSQL cluster created with
`initdb` is also acceptable.

The current EF migrations were originally created against the shared SQLite
schema. Gymmin maps `DateTimeOffset`, `Guid` and boolean values through
text/integer-compatible EF converters so the existing `TEXT`/`INTEGER` columns
work consistently on SQLite and PostgreSQL.

## Migrations

Development may use:

```powershell
$env:Gymmin__Storage__ApplyMigrationsOnStartup = "true"
```

Production should keep it disabled:

```powershell
$env:Gymmin__Storage__ApplyMigrationsOnStartup = "false"
```

Run migrations explicitly before starting a production instance:

```powershell
cd backend/Gymmin.Api
dotnet tool restore
dotnet tool run dotnet-ef database update
```

For PostgreSQL migrations, set `Gymmin__Storage__Provider`, `Gymmin__Storage__DatabaseProvider` and `ConnectionStrings__DefaultConnection` before running `dotnet-ef`.

No migration was added for PostgreSQL provider wiring because the EF model did not change in this step.

## Health and diagnostics

`GET /health` stays simple and fast:

```json
{ "status": "ok" }
```

`GET /api/health` includes safe storage information:

```json
{
  "status": "ok",
  "storageProvider": "Database",
  "databaseProvider": "PostgreSQL",
  "database": {
    "configured": true,
    "canConnect": true
  }
}
```

`GET /api/diagnostics` also includes the safe database status. It does not expose connection strings, passwords or API keys.

Diagnostics is available in development/testing. In production it requires explicit `Gymmin:Diagnostics:Enabled=true`, and startup logs a warning if this is enabled.

## Startup validation

The backend fails fast when:

- `Gymmin:Storage:Provider` is not `File` or `Database`,
- `Gymmin:Storage:Provider=Database` and `ConnectionStrings:DefaultConnection` is empty,
- `Gymmin:Storage:DatabaseProvider` is not `SQLite` or `PostgreSQL`.

The backend logs warnings when:

- `ApplyMigrationsOnStartup=true` in Production,
- diagnostics are enabled in Production,
- SMTP settings are incomplete,
- OpenAI API key is missing.

Missing SMTP or OpenAI configuration does not block startup. Affected features fail with their own errors until configured.

## Production checklist

- `ASPNETCORE_ENVIRONMENT=Production`.
- `Gymmin:Storage:Provider=Database`.
- `Gymmin:Storage:DatabaseProvider=PostgreSQL`.
- Production connection string supplied by environment variable or secret manager.
- Migrations run explicitly before app startup.
- `ApplyMigrationsOnStartup=false`.
- SMTP configured for bug reports and password reset.
- OpenAI API key configured if AI creator should work.
- AI credits configured: initial grant, plan/rewrite cost and `DevGrantEnabled=false` in Production.
- AI credits running on `Provider=Database` with PostgreSQL for production paid-credit safety. File provider is a dev fallback only.
- Google Play one-time products created and active: `ai_tokens_1`, `ai_tokens_3`, `ai_tokens_10` for the current 1/3/10 credit packs.
- Google Play service account configured through environment variables or a secret manager.
- Google Play Billing tested with internal testing/license testers before public release.
- Diagnostics disabled or protected.
- HTTPS / reverse proxy configured.
- CORS configured intentionally for the deployed mobile/backend setup.
- Auth rate limiting enabled.
- Logs collected by the hosting platform.
- Database backups configured.
- GitHub sideload APK built with the intended test `ApiBaseUrl` when doing phone QA.
- Store AAB built with the production `ApiBaseUrl`.
- `/health` and `/api/diagnostics` verified after deployment.

## Manual PostgreSQL smoke test

1. Start PostgreSQL:

   ```powershell
   docker compose -f docker-compose.postgres.yml up -d
   ```

2. If Docker is unavailable, use an installed local PostgreSQL instance or a
   temporary local cluster on another port.
3. Set PostgreSQL environment variables.
4. Run `dotnet tool run dotnet-ef database update`.
5. Start the backend.
6. Verify:

   - `GET /health`,
   - `GET /api/health`,
   - register/login,
   - settings PUT/GET,
   - workouts POST/GET,
   - favorite exercises sync,
   - workout sessions sync,
   - auth sessions list,
   - password reset request with SMTP warning/fake configuration behavior.

### AiCredits PostgreSQL concurrency smoke

The AiCredits ledger hardening was manually verified on a real local
PostgreSQL cluster without Docker. The test used PostgreSQL on
`127.0.0.1:55432`, a dedicated smoke database and explicit EF migrations,
including `HardenAiCreditsConcurrency`.

Expected checks:

- `GET /api/health` reports `storageProvider=Database`,
  `databaseProvider=PostgreSQL` and `database.canConnect=true`.
- Initial grant is idempotent: repeated balance reads do not create a second
  `InitialGrant`.
- With balance `1`, two parallel `POST /api/workout-creator/plan` requests
  result in one `202 Accepted` and one `402 insufficient_ai_credits`.
- Final balance for the successful consume path remains `0`; ledger has one
  `Consume` with `BalanceAfter=0`.
- Reusing the same `X-Idempotency-Key` for the same user returns the existing
  job and creates only one `Consume`.
- Different users can reuse the same `X-Idempotency-Key` independently.
- A technical AI job failure creates exactly one `Refund`; repeated checks do
  not add another refund.
- Transaction indexes include unique guards for `UserId + RelatedJobId + Type`
  and `UserId + Reason + IdempotencyKey`.

## Google Play Billing

Google Play Billing is used for Android AI credit purchases. The backend is the
source of truth: the mobile app starts the purchase and sends the Google Play
`purchaseToken` to:

```http
POST /api/ai-credits/purchases/google-play/verify
```

The backend validates the purchase with Google Play Developer API, checks the
configured product pack, writes `AiCreditPurchases`, appends a `Purchase`
transaction to the AiCredits ledger and then attempts server-side consume.

Security rules:

- do not commit service account JSON,
- do not log or store plaintext purchase tokens,
- use `ServiceAccountJsonBase64` or `ServiceAccountJsonPath` from secrets,
- do not trust product credits or prices from mobile,
- use Database/PostgreSQL for production paid credits.

Play Console checklist:

- app exists in Google Play Console with package name `com.gymmin.app`,
- one-time products are created and active:
  - `ai_tokens_1` = 1 credit,
  - `ai_tokens_3` = 3 credits,
  - `ai_tokens_10` = 10 credits,
- prices are configured in Play Console,
- license testers are configured,
- a service account has Google Play Developer API access,
- backend credentials are supplied through env/secrets,
- purchases are tested via internal testing or license testers.

Mobile build notes:

- Expo Go is not enough for Google Play Billing.
- Use a standalone Android APK/dev build/internal testing build with the native billing module.
- `react-native-iap` and `react-native-nitro-modules` are the native billing dependencies and should be present in `apps/mobile/package.json` and `package-lock.json`.
- `react-dom` is present only to satisfy release bundling of a transitive React Aria/Gluestack import.
- The Android app config includes the `react-native-iap` Expo plugin, and the checked-in native Android project includes `com.android.vending.BILLING` plus the OpenIAP Google dependency.
- Local Gradle/APK/AAB build smoke requires `ANDROID_HOME` or `ANDROID_SDK_ROOT`; CI/release machines must install Android SDK before building. Local debug APK and release AAB smoke passed after installing Android SDK command-line tools and the Billing/Nitro dependencies.
- On Windows, release AAB should be built from a short path. Use `npm run mobile:store:aab -- -ApiBaseUrl "https://..."`; it mirrors the repo into `C:\gymmin-aab\repo`, clears stale native caches, runs `bundleRelease`, and writes `.artifacts/Gymmin-release-latest.aab`.
- Release AAB builds require Google Play upload-key signing. Configure the key through `GYMMIN_UPLOAD_STORE_FILE`, `GYMMIN_UPLOAD_STORE_PASSWORD`, `GYMMIN_UPLOAD_KEY_ALIAS` and `GYMMIN_UPLOAD_KEY_PASSWORD`, or through the ignored local file `apps/mobile/android/upload-keystore.properties`. Missing signing config fails the release build instead of using the debug keystore.
- GitHub Release phone-test packages should be built with `npm run mobile:apk:share -- -ApiBaseUrl "https://..."`. That command produces `.artifacts/Gymmin-arm64-v8a-release-latest.apk` by default; it is not the Store AAB artifact.
- Generate the upload key outside the repository:

```powershell
keytool -genkeypair -v -keystore C:\secure\gymmin-upload-key.jks -alias gymmin-upload -keyalg RSA -keysize 2048 -validity 10000
```

- Verify the final bundle before Play upload:

```powershell
jarsigner -verify -verbose -certs .artifacts/Gymmin-release-latest.aab
```

  The certificate owner must not be `CN=Android Debug`.
- If no emulator or phone is attached, the smoke only proves native Android linking. Runtime fallback checks for `billing_unavailable` and real purchase flows still need an installed Android build; real purchases need Play Console internal testing.
- If backend verification fails after a successful purchase, use the in-app pending/restore purchase action.

12B.2 status: code and AAB build are ready for Internal Testing, but a real
purchase smoke is not complete until Play Console products, license testers, a
Google Play service account and an installed Internal Testing build are all
available.

RTDN is not implemented yet. Future work should add Pub/Sub Real-time Developer
Notifications for refunds, chargebacks, pending state changes and cancellation
lifecycle updates.

## TODO

- Choose real hosting.
- Configure production DB backups.
- Add production log aggregation.
- Add external error/crash monitoring.
- Add HTTPS/reverse proxy deployment notes for the selected host.
- Add CI/CD migration step.
- Add optional PostgreSQL smoke test in CI when a stable service container is available.
- Add CI PostgreSQL AiCredits concurrency smoke test using a service container.
- Add RTDN handling for Google Play refunds/chargebacks/pending lifecycle.
- Add CI/manual smoke for Google Play purchase validation with test products.
