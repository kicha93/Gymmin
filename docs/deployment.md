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
$env:Gymmin__Storage__RequireCurrentSchema = "true"
$env:Gymmin__Storage__ImportAppDataOnStartup = "false"
$env:Gymmin__Diagnostics__Enabled = "false"
$env:ConnectionStrings__DefaultConnection = "Host=...;Database=...;Username=...;Password=..."
$env:OPENAI_API_KEY = "..."
$env:Gymmin__AiCredits__InitialGrant = "1"
$env:Gymmin__AiCredits__PlanCost = "1"
$env:Gymmin__AiCredits__RewriteCost = "1"
$env:Gymmin__AiCredits__DevGrantEnabled = "false"
$env:Gymmin__WorkoutCreator__Worker__PollMilliseconds = "500"
$env:Gymmin__WorkoutCreator__Worker__LeaseSeconds = "300"
$env:Gymmin__GooglePlay__Enabled = "true"
$env:Gymmin__GooglePlay__PackageName = "com.gymmin.app"
$env:Gymmin__GooglePlay__ServiceAccountJsonBase64 = "<base64-json>"
$env:Gymmin__GooglePlay__RtdnEnabled = "true"
$env:Gymmin__GooglePlay__RtdnAudience = "https://api.example.com/api/integrations/google-play/rtdn"
$env:Gymmin__GooglePlay__RtdnServiceAccountEmail = "gymmin-pubsub@project.iam.gserviceaccount.com"
$env:BugReports__Smtp__Host = "..."
$env:BugReports__Smtp__Port = "587"
$env:BugReports__Smtp__Username = "..."
$env:BugReports__Smtp__Password = "..."
$env:BugReports__Smtp__From = "..."
$env:BugReports__Smtp__To = "..."
$env:BugReports__EmailDelivery__PollSeconds = "10"
$env:BugReports__EmailDelivery__BatchSize = "20"
```

Bug-report SMTP is sent by a persistent background worker. Run database migrations before starting the new backend version so `BugReports` and `BugReportRewardTransactions` exist before the worker begins polling. The default intake limit is 10 reports per user/IP per hour and each request is capped at 64 KiB.

Workout creator jobs are also processed by a persistent database worker. Its
atomic lease prevents two replicas from owning one job simultaneously. Keep the
lease substantially longer than the heartbeat/poll interval and run the lease
migration before starting the new version.

Password reset email can use `Auth:Smtp` values. If they are not set, the backend falls back to `BugReports:Smtp` where supported by the current sender configuration.
Production startup fails when neither `Auth:Smtp` nor the `BugReports:Smtp` fallback contains complete host, username and password credentials, because new accounts could not complete mandatory email verification.

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

The production hardening migrations add database avatar content and workout
creator lease fields. Apply them before the new API/worker starts. When importing
legacy `App_Data`, the importer also copies valid existing avatar files into the
database; keep the source directory until the migration has been verified.

## Health and diagnostics

`GET /health` and `GET /health/live` are process liveness probes and do not depend
on the database. `GET /health/ready` is the deployment/readiness probe and returns
`503` until the configured database is reachable and has no pending EF migrations.
The database result is cached for 15 seconds by default to keep frequent platform
probes inexpensive.

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
    "canConnect": true,
    "schemaCurrent": true,
    "pendingMigrationCount": 0
  }
}
```

`GET /api/diagnostics` also includes the safe database status. It does not expose connection strings, passwords or API keys.

Diagnostics is available only in development/testing. Production startup fails
if it is enabled.

Production writes one-line JSON console logs with UTC timestamps, scopes and the
sanitized correlation id. Forward stdout/stderr to the hosting log collector; do
not enable request-body or authorization-header logging at the proxy. Alert at a
minimum on `/health/ready` failures, sustained HTTP 5xx, repeated SMTP outbox
failures, failed RTDN deliveries and PostgreSQL backup/restore job failure.

Production data-retention cleanup runs every six hours by default. It deletes
expired password-reset tokens after a 7-day grace period, expired/revoked sessions
after 30 days, expired distributed rate-limit buckets immediately, and technical
RTDN inbox events after 90 days. Completed and failed workout-creator jobs,
including their request/result JSON, are deleted after
`WorkoutCreatorJobDays` (90 days by default); queued and processing jobs are
preserved. The worker also clears obsolete email-verification code hashes.
Configure these bounded values under `Gymmin:DataRetention`. User workouts,
purchase/credit ledgers, bug reports and admin audits are intentionally excluded
until their legal/business retention periods are approved.

## Startup validation

The backend fails fast when:

- `Gymmin:Storage:Provider` is not `File` or `Database`,
- `Gymmin:Storage:Provider=Database` and `ConnectionStrings:DefaultConnection` is empty,
- `Gymmin:Storage:DatabaseProvider` is not `SQLite` or `PostgreSQL`.

Production startup fails when migrations-on-startup or diagnostics are enabled,
when the production storage is not Database/PostgreSQL, when the database is
unreachable or has pending migrations, when a production AI feature has no OpenAI
key, when developer credit grants are enabled, or when an enabled Google Play/SMTP
integration is incomplete.

API responses default to `Cache-Control: no-store` and `Pragma: no-cache`.
Endpoints that deliberately implement authenticated private caching, such as the
avatar response with its ETag, retain their stricter `private` policy.
Responses also include restrictive content-type, framing, referrer, permissions,
content-security and cross-origin resource headers. Kestrel does not emit its
`Server` identification header. Verify that the reverse proxy does not overwrite
these protections or add its own server-version disclosure.

Outside Production, missing SMTP or OpenAI configuration does not block startup. In Production, missing authentication SMTP credentials block startup because email verification is mandatory. Missing bug-report delivery settings do not lose reports: they remain persisted for retry or admin handling.

## Production checklist

- `ASPNETCORE_ENVIRONMENT=Production`.
- `Gymmin:Storage:Provider=Database`.
- `Gymmin:Storage:DatabaseProvider=PostgreSQL`.
- Production connection string supplied by environment variable or secret manager.
- Migrations run explicitly before app startup.
- `ApplyMigrationsOnStartup=false`.
- `RequireCurrentSchema=true`; a deployment with pending migrations must fail
  startup and readiness.
- SMTP configured for bug reports and password reset.
- OpenAI API key configured if AI creator should work.
- AI credits configured: initial grant, plan/rewrite cost and `DevGrantEnabled=false` in Production.
- AI credits running on `Provider=Database` with PostgreSQL for production paid-credit safety. File provider is a dev fallback only.
- Google Play one-time products created and active: `ai_tokens_1`, `ai_tokens_3`, `ai_tokens_10` for the current 1/3/10 credit packs.
- Google Play service account configured through environment variables or a secret manager.
- `Gymmin:GooglePlay:VoidedPurchasesEnabled=true`; monitor the reconciliation worker and manually review unrecovered credits.
- Google Play Billing tested with internal testing/license testers before public release.
- Diagnostics disabled or protected.
- HTTPS / reverse proxy configured.
- Za reverse proxy ustaw `Gymmin:Proxy:ForwardedHeadersEnabled=true` i dodaj adres proxy do `Gymmin:Proxy:KnownProxies`; inaczej limity per IP zobaczą adres proxy zamiast klienta. Nie ufaj nagłówkom `X-Forwarded-*` z nieznanych adresów.
- CORS configured intentionally for the deployed mobile/backend setup.
- Web clients are listed explicitly in `Gymmin:Cors:AllowedOrigins`; native Android/iOS requests do not require a CORS origin. Development/Testing may use wildcard CORS, Production does not.
- Auth rate limiting enabled.
- Request limits are reviewed under `Gymmin:Security:RequestLimits`; reverse proxy limits must be equal or stricter. Account deletion requires the current password and is rate-limited.
- `AddEmailVerification` and `AddDistributedAbuseRateLimits` migrations applied; verify new registration email delivery and confirm that unverified users receive `403 email_not_verified` from AI endpoints.
- Final Android/iOS build uses `expo-secure-store`; verify a legacy session migrates without leaving `token` in `gymmin.localAuth.v1`.
- Logs collected by the hosting platform.
- Database backups configured.
- Verify PostgreSQL backup/restore includes `Users.AvatarContent`; run an avatar
  upload/read/delete smoke through two backend replicas without sticky sessions.
- GitHub sideload APK built with the intended test `ApiBaseUrl` when doing phone QA.
- Store AAB built with the production `ApiBaseUrl`.
- `/health` and `/api/diagnostics` verified after deployment.

## PostgreSQL backup and restore verification

The scripts require PostgreSQL client tools (`pg_dump`, `pg_restore`, `psql`) and
a `postgresql://` connection URI supplied at runtime. They never store the URI in
the backup manifest.

```powershell
.\scripts\backup-postgres.ps1 `
  -ConnectionUri $env:GYMMIN_DATABASE_URI `
  -OutputDirectory 'D:\GymminBackups'
```

Every custom-format dump receives a SHA256 manifest. Copy both files to durable,
encrypted storage outside the application host. Verify a representative backup
regularly against a PostgreSQL server using an admin URI whose database can be
used to create a short-lived `gymmin_restore_verify_*` database:

```powershell
.\scripts\verify-postgres-restore.ps1 `
  -AdminConnectionUri $env:GYMMIN_POSTGRES_ADMIN_URI `
  -BackupPath 'D:\GymminBackups\gymmin-20260715T220000Z.dump'
```

The verifier checks the checksum, restores with `--exit-on-error`, requires a
non-empty EF migration history and then removes only its randomly named temporary
database. A backup is not considered operational until this restore check has
passed in the target PostgreSQL major version.

## Administrative bug-report API

The admin API is disabled by default. Generate a 256-bit key once on a trusted
machine:

```powershell
.\scripts\new-admin-api-key.ps1 -KeyId 'ops-2026-01'
```

Put `ApiKey` only in the admin panel's server-side secret store and configure the
backend with `Gymmin__Admin__Enabled=true`, `Gymmin__Admin__KeyId` and only the
returned `Gymmin__Admin__ApiKeySha256` hash. Do not put the key in browser/mobile
source, URLs, repository files or logs. Rotate it by deploying a newly generated
key and hash.

`GET /api/admin/bug-reports` and `PUT /api/admin/bug-reports/{id}` require the key
in `X-Gymmin-Admin-Key`. Invalid credentials deliberately return `404` and are
rate-limited per client IP. Updates can set a bounded status/response and award a
single immutable reward to an identified reporter. Every accepted update appends
an `AdminAuditEvents` record with key id, action, target and correlation id. Apply
the `AddAdminAuditEvents` migration before enabling the API.

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
- sanitize Google API diagnostics before persistence; `purchaseToken` and
  `developerPayload` are replaced with `[redacted]`,
- use `ServiceAccountJsonBase64` or `ServiceAccountJsonPath` from secrets,
- do not trust product credits or prices from mobile,
- attach the opaque `gymmin_{userId}` account identifier to the Billing flow and reject a different identifier returned by Google,
- use Database/PostgreSQL for production paid credits.

Production also requires authenticated Google Cloud Pub/Sub push delivery to
`POST /api/integrations/google-play/rtdn`. Configure the push subscription with
OIDC enabled, use the exact endpoint URL as its audience, and set the exact push
service-account email in `RtdnServiceAccountEmail`. The backend verifies Google's
JWT signature, audience, verified email and expected identity before decoding the
message. It rejects another package name, deduplicates by Pub/Sub `messageId`,
stores only a SHA256 purchase-token fingerprint, and rechecks any already-known
purchase with Google Play. Apply the `AddGooglePlayRtdnInbox` migration first.

An RTDN for an unknown token is retained as `unmatched`; it cannot safely be
credited because an RTDN does not identify the Gymmin user. The normal mobile
verify/restore flow establishes that ownership.

The `GooglePlayVoidedPurchasesWorker` polls the Voided Purchases API with a
persistent checkpoint and overlap window. It stores only the purchase-token hash,
marks matching purchases as `Voided`, and removes at most the user's currently
unused credits from that purchase. It never creates a negative balance. Any
remaining amount is stored as `UnrecoveredCredits` for manual review. Apply
`AddGooglePlayVoidedPurchases` before enabling this worker. The API exposes only
the recent 30-day window, so Production fails startup when Google Play purchases
are enabled but reconciliation is disabled.

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
- The mobile stack is Expo SDK 57, React Native 0.86 and React/React DOM 19.2. The project requires Node.js 22.13 or newer.
- `react-dom` and `react-native-web` are installed because Expo tooling and transitive React Aria/Gluestack imports require the web peer stack during validation/bundling.
- The checked-in native Android project is maintained manually. It includes `com.android.vending.BILLING`; `react-native-iap@15.5.0` is autolinked and owns its OpenIAP Android dependency, so it is not duplicated manually in `app/build.gradle` and is not listed as an Expo config plugin.
- Local Gradle/APK/AAB build smoke requires `ANDROID_HOME` or `ANDROID_SDK_ROOT`; CI/release machines must install Android SDK before building. After the Expo 57 update, `expo-doctor` passed 19/19, Hermes Android export passed, and native debug APK plus clean release AAB smoke passed for `arm64-v8a`.
- On Windows, release AAB should be built from a short path. Use `npm run mobile:store:aab -- -ApiBaseUrl "https://..."`; it mirrors the repo into `C:\gymmin-aab\repo`, clears stale native caches, runs `bundleRelease`, and writes `.artifacts/Gymmin-release-latest.aab`.
- The local APK helper also mirrors into `C:\gymmin-local-apk\repo` by default. Do not copy `.cxx`, Gradle or native `build` caches between workspace paths: they contain absolute paths and can make Ninja compile against the old location.
- Release AAB builds require Google Play upload-key signing. Configure the key through `GYMMIN_UPLOAD_STORE_FILE`, `GYMMIN_UPLOAD_STORE_PASSWORD`, `GYMMIN_UPLOAD_KEY_ALIAS` and `GYMMIN_UPLOAD_KEY_PASSWORD`, or through the ignored local file `apps/mobile/android/upload-keystore.properties`. Missing signing config fails the release build instead of using the debug keystore.
- GitHub Release phone-test packages should be built with `npm run mobile:apk:share -- -ApiBaseUrl "https://..."`. That command produces `.artifacts/Gymmin-arm64-v8a-release-latest.apk` by default; it is not the Store AAB artifact.
- Temporary Cloudflare/ngrok URLs remain supported for phone-test APKs. Store AAB and EAS `production` builds fail before compilation when the API URL is not HTTPS or points to a known tunnel/local host. The checked-in `buildConfig.ts` stays empty, and `EXPO_PUBLIC_API_BASE_URL` has precedence.
- Native Android release configuration independently rejects cleartext HTTP
  through `network_security_config.xml`. Debug variants use a separate
  cleartext-enabled resource for local development; never copy that resource
  into the main source set.
- OS backup is intentionally disabled. `backup_rules.xml` and
  `data_extraction_rules.xml` exclude app files, databases and preferences from
  cloud backup and device-to-device transfer, including device-protected
  storage. Cross-device restoration must use authenticated Gymmin sync.
- Run `npm run mobile:security:android` after Expo/native configuration changes.
  The production gate also verifies the final merged release manifest.
- After a native dependency or Expo upgrade, run
  `npm run mobile:security:android-components` against the generated release
  manifest. The allowlist currently permits only `MainActivity` plus the
  AndroidX Profile Installer receiver protected by `android.permission.DUMP`.
  Review rather than automatically allow any new exported component.
- The same validation rejects implicit component visibility, debuggable/test-only
  release manifests and a denylist of high-risk permissions. The app does not
  request camera permission while avatar input is gallery-only.
- Workout reminders and export notifications are scheduled locally. The release
  manifest therefore removes Expo/Firebase remote-messaging services, the
  Firebase instance-ID receiver and `com.google.android.c2dm.permission.RECEIVE`.
  Keep the non-exported Expo `NotificationsService` and boot receiver actions:
  they restore local scheduled reminders after reboot. Remote push must not be
  enabled by merely loosening the manifest; add token lifecycle, backend
  delivery, consent/privacy documentation and abuse controls first.
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

Authenticated RTDN/Pub/Sub push is implemented for one-time purchase and
cancellation notifications. Production startup requires the exact OIDC audience
and Pub/Sub service-account email whenever Google Play purchases are enabled.
Refund and chargeback reconciliation is implemented through the scheduled
Voided Purchases worker; deployment must enable and monitor it.

## Deployment-owned work remaining

- Apply and verify the completed hardening migrations on the target PostgreSQL.
- Run avatar and AI-job smoke through at least two backend replicas.
- Choose the permanent host/domain and configure its trusted proxy addresses.
- Schedule `backup-postgres.ps1`, copy backups off-host and record successful
  `verify-postgres-restore.ps1` runs.
- Connect JSON logs and mobile crashes to the selected external provider.
- Make `.github/workflows/production-gate.yml` required on the release branch;
  it runs the real PostgreSQL migration smoke and native Android release build.
- Configure Pub/Sub OIDC, enable the Voided Purchases worker and alert on
  `manual_review`, `partial_clawback`, `unmatched` or repeated polling failures.
- Complete Google Play Internal Testing with real test products and license testers.
- Deploy the backend on its permanent HTTPS domain and verify:

  ```text
  https://API_DOMAIN/privacy
  https://API_DOMAIN/privacy?lang=en
  https://API_DOMAIN/account-deletion
  https://API_DOMAIN/account-deletion?lang=en
  ```

- Enter `/privacy` as the Google Play Privacy Policy URL and
  `/account-deletion` as the Account deletion URL. Both URLs must be reachable
  without authentication, redirects to private tunnels or development warning
  pages.
- Perform a real deletion request from the registered account email and document
  the support ownership-verification procedure. Support must never request a
  password or email verification code.
