# Gymmin release checklist

This is the single pre-release checklist for publishing Gymmin beyond local
development. Keep detailed setup notes in the topic documents, but use this file
as the final pass before a GitHub APK test release or Google Play Internal
Testing release.

## Release targets

- GitHub phone-test APK: private GitHub Release `kicha93/gymmin-apk`, tag
  `v1.0`, artifact `.artifacts/Gymmin-arm64-v8a-release-latest.apk`.
- Google Play Internal Testing: signed release AAB
  `.artifacts/Gymmin-release-latest.aab`.
- Backend: production-like ASP.NET Core API with `Database/PostgreSQL`.

## Closed code-level release blockers

The 2026-07-16 audit is recorded in
`docs/production-audit-2026-07-16.md`. The following protections are implemented
and covered by automated tests:

- `X-Gymmin-User-Id` can no longer authenticate settings, workout CRUD or
  workout sync; spoofed-header API tests return `401`.
- avatars use database-backed shared storage in production Database mode.
- AI jobs use an atomic claim/lease and a controlled worker, so two backend
  replicas cannot process the same job concurrently.
- `production-gate` runs for the actual release branch and a native Android
  release build is part of the required gate.
- The 2026-07-21 security follow-up is recorded in
  `docs/security-audit-2026-07-21.md`; production health details are hidden,
  GitHub Actions are commit-pinned, the published APK flow requires HTTPS and
  the npm gate has no high/critical advisories.
- The 2026-07-22 security follow-up is recorded in
  `docs/security-audit-2026-07-22.md`; avatar bearer headers are same-origin,
  auth and purchase verification have independent IP/account limits, public AI
  job failures are sanitized and completed AI jobs have bounded retention.
- The 2026-07-28 production follow-up added a repository-wide tracked-secret
  gate. It scans every tracked text file, rejects release signing/service-account
  files and known token/key formats, and runs before mobile tests and in
  `production-gate`.

Public release still requires the deployment-owned backup/restore,
multi-replica and device smoke checks listed below.

## Backend production readiness

- `ASPNETCORE_ENVIRONMENT=Production`.
- `Gymmin:Storage:Provider=Database`.
- `Gymmin:Storage:DatabaseProvider=PostgreSQL`.
- Production connection string is supplied by environment variables or a secret
  manager, not committed config.
- EF migrations are run explicitly before app startup.
- `Gymmin:Storage:ApplyMigrationsOnStartup=false`.
- `Gymmin:Storage:RequireCurrentSchema=true`; a deliberately outdated test
  database produces startup failure and readiness `503`.
- `/health/live` returns `200` and `/health/ready` returns `200` after deployment;
  alerting treats readiness `503` as unavailable without restarting a live process.
  Readiness covers both database connectivity and pending EF migrations.
- Production `/api/health` exposes only readiness status and does not reveal the
  storage provider, database engine or migration state.
- `/api/diagnostics` is disabled or protected in Production.
- HTTPS/reverse proxy is configured.
- Forwarded headers are enabled only for explicitly trusted proxy IPs, so registration and AI rate limits use the real client IP.
- Authentication SMTP is configured and a real registration/verification email has been delivered; Production intentionally fails startup without complete SMTP credentials.
- CORS is configured intentionally for the deployed mobile/backend setup.
- Production CORS contains only intended web origins; HSTS/HTTPS redirect and API
  security headers are verified through the deployed proxy. API responses default
  to `no-store` unless an endpoint explicitly uses authenticated `private` caching,
  and neither Kestrel nor the proxy discloses a software version.
- Auth rate limiting is enabled.
- Verify the deployed limits for login IP/account, password-change user/IP,
  password-reset request IP/account, password-reset confirmation IP/token and
  purchase-verification user/IP. Confirm two backend replicas share the same
  database-backed buckets.
- Account deletion requires the current password on the server, and oversized/chunked payloads return `413` instead of reaching JSON/form processing.
- Registration is limited per IP/email, AI is limited per user/IP, and Database provider shares counters through `AbuseRateLimitBuckets`.
- New accounts cannot use AI before confirming the six-digit email code; existing accounts remain verified after migration.
- Release build stores bearer tokens in OS SecureStore/Keychain and removes legacy plaintext tokens from AsyncStorage.
- JSON console logs are collected with retention and alerts for readiness, 5xx,
  SMTP outbox, RTDN and backup failures; request bodies and auth headers are excluded.
- Log access is restricted; public AI job errors stay generic while diagnostic
  exceptions remain server-side only.
- Automatic cleanup of expired reset tokens, sessions, rate-limit buckets,
  verification codes, RTDN inbox events and completed/failed workout-creator
  jobs is enabled. `WorkoutCreatorJobDays` matches the privacy policy (default
  90 days); business/legal retention periods for ledgers, bug reports and admin
  audits are documented separately.
- PostgreSQL backups are stored encrypted outside the application host, their
  SHA256 manifests are retained, and `verify-postgres-restore.ps1` has passed on
  the target PostgreSQL major version.

## Secrets and integrations

- OpenAI API key is configured if AI creator/rewrite should work.
- SMTP is configured for bug reports and password reset.
- Google Play service account credentials are supplied through secrets only.
- Service account JSON, upload keystore and passwords are not committed.
- `npm run security:secrets` passes. If it ever reports a real credential,
  removing the file is not sufficient: revoke/rotate the credential and review
  repository history before releasing.
- System status config is set intentionally:
  - `SystemStatus:Kind=ok` for normal operation,
  - `maintenance`, `update` or `degraded` only during controlled events.
- If admin API is enabled, the panel keeps the raw admin key server-side only;
  backend configuration contains its SHA256 hash and all write actions appear in
  `AdminAuditEvents`.

## Credits and Google Play Billing

- User-facing name is `Kredyty` / `Credits`; technical code/API name remains
  `AiCredits`.
- Current credit packs are:
  - `ai_tokens_1` = 1 credit,
  - `ai_tokens_3` = 3 credits,
  - `ai_tokens_10` = 10 credits.
- Play Console one-time products exist and are active for the same product IDs.
- Prices are configured in Play Console.
- License testers are configured.
- Internal Testing opt-in link has been accepted by testers.
- Backend Google Play validation is enabled for the test/prod environment.
- Purchase token is validated only by backend; mobile never grants credits
  locally.
- Duplicate verify of the same purchase token does not grant credits twice.
- Server-side consume is retry-safe.
- Authenticated RTDN push uses the exact configured OIDC audience and service-account
  email; duplicate Pub/Sub `messageId` values create one inbox event and plaintext
  purchase tokens are never persisted.
- Mobile sends a stable opaque account identifier to Google Play; backend rejects
  a different `obfuscatedExternalAccountId` when Google returns it.
- Voided Purchases reconciliation is enabled, its checkpoint advances, and
  `manual_review`, `partial_clawback`, `unmatched` and polling failures are monitored.
- A refund/chargeback removes only still-unused credits and never makes the balance
  negative; `UnrecoveredCredits` is reviewed manually.

## Android builds

- Android SDK is installed and `ANDROID_HOME` or `ANDROID_SDK_ROOT` is set.
- GitHub APK is built with the intended test backend `ApiBaseUrl`.
- GitHub APK build command:

  ```powershell
  npm run mobile:github:apk:oneclick -- -ApiBaseUrl "https://your-backend-url.example.com"
  ```

- Dedicated `x86_64` / universal emulator wrapper is not part of the release
  process. The phone-test artifact remains the signed `arm64-v8a` APK above.

- Store AAB uses release upload-key signing, not debug signing.
- Store/EAS production build rejects Cloudflare/ngrok/local API URLs and embeds the permanent HTTPS backend URL through `EXPO_PUBLIC_API_BASE_URL`.
- Release manifest sets `usesCleartextTraffic=false` and references the
  production network-security config. Only debug source sets use the explicit
  cleartext exception required for a local HTTP backend.
- `allowBackup=false` is reinforced with Android 11 backup rules and Android
  12+ extraction rules that exclude private storage from both cloud backup and
  device-to-device transfer.
- The merged release manifest passes `security:android-components`: every
  activity, service, receiver and provider declares `android:exported`
  explicitly, and every exported component matches the reviewed allowlist and
  required permission.
- Release does not request camera permission. Avatar selection currently uses
  the media library; reintroducing direct camera capture requires an explicit
  product/privacy review and an intentional manifest change.
- Notifications are local-only. Release contains the local Expo notification
  receiver and boot action used to restore reminders, but removes FCM messaging
  services, the Firebase instance-ID receiver and the C2DM receive permission.
  Introducing remote push requires an explicit architecture/privacy review and
  an intentional allowlist update.
- Release contains no legacy OEM badge-counter permissions. Gymmin never calls
  the Expo badge API and explicitly disables badge changes in its foreground
  handler. The component/permission gate rejects all 16 removed launcher
  read/write permissions if a dependency adds them again.
- Android `<queries>` package visibility matches the reviewed five-intent
  allowlist: HTTPS browsing, `GET_CONTENT image/*`, legacy Downloads directory
  selection and the two Google Play Billing bindings. Camera/video capture and
  wildcard MIME queries are absent.
- Store signing env vars are set:
  - `GYMMIN_UPLOAD_STORE_FILE`,
  - `GYMMIN_UPLOAD_STORE_PASSWORD`,
  - `GYMMIN_UPLOAD_KEY_ALIAS`,
  - `GYMMIN_UPLOAD_KEY_PASSWORD`.
- Store AAB build command:

  ```powershell
  npm run mobile:store:aab -- -ApiBaseUrl "https://your-production-backend.example.com"
  ```

- AAB signature is verified:

  ```powershell
  jarsigner -verify -verbose -certs .artifacts/Gymmin-release-latest.aab
  ```

- Certificate owner is not `CN=Android Debug`.
- Expo Go is not used as the primary release smoke path.

## Automated test gate

Run before publishing a package:

```powershell
npm run security:secrets
npm --prefix apps/mobile run test
npm --prefix apps/mobile run typecheck
npm --prefix apps/mobile run security:android
npm --prefix apps/mobile run security:android-components
cd apps/mobile
npx expo-doctor
npx expo export --platform android --output-dir .expo-release-smoke
cd ../..
dotnet test backend/Gymmin.Api.Tests/Gymmin.Api.Tests.csproj
dotnet build backend/Gymmin.Api/Gymmin.Api.csproj
```

`expo-doctor` must report all checks passing. The Android export verifies Metro
and Hermes bundling, but it does not replace the signed AAB build or device smoke.
The tracked-secret and Android security validations are also run by the mobile
test pre-hook and the production gate; the gate additionally inspects the merged
release manifest.
The exported-component command requires a processed release manifest, so run it
after `processReleaseResources`, `bundleRelease` or the Store AAB build.

## Manual smoke required

Automated tests do not render the full React Native UI and do not exercise real
native Android services. Smoke these flows manually on the standalone APK/dev
build:

- Register/login/logout and active sessions.
- Avatar upload, avatar replacement and avatar delete; verify that a large
  camera image is reduced before upload, survives an app restart and renders
  from the authenticated account-scoped cache in both the header and Profile.
- Account details and account deletion with strong confirmation.
- Public `/privacy` and `/account-deletion` pages in PL and EN without login.
- External deletion mail link opens with the expected recipient and subject;
  complete one request using the registered account email and verify the support
  procedure never asks for a password or verification code.
- AI creator submit remains disabled until explicit sensitive-data consent is
  selected; a direct API request without consent returns
  `sensitive_data_consent_required` without consuming a credit.
- Workout details do not expose the intentionally hidden `Modify with AI` action.
- Anonymous local workouts, login and anonymous-to-account merge.
- Workout list, workout details and Exercise Detail Page.
- Active workout execution:
  - guided mode,
  - inline table mode,
  - read-only then fill-after mode,
  - keyboard/input stability,
  - finish with incomplete values warning,
  - abandon/delete active session.
- Workout history detail table, horizontal scroll and native portrait/landscape auto-rotation behavior.
- Exercise picker performance and favorite toggle.
- Progress dashboard search, filters and exercise progress details.
- Achievements unlock, sync, image popup and no re-lock after history delete.
- Credits balance, package list, insufficient credits handling and blocked AI
  actions when server status is not healthy.
- Google Play purchase in Internal Testing, duplicate verify and pending restore.
- Local workout reminders:
  - default disabled state,
  - per-weekday enable/time,
  - notification vibration,
  - logout/account switching does not leave wrong-owner reminders active.
- System status homepage callout for offline, degraded, maintenance and update.
- Bug report submission with correlation id, durable database record and optional reporter linkage.
- Bug report remains stored when SMTP delivery fails, with `EmailDeliveryStatus=failed`.
- Bug-report retries with the same `X-Idempotency-Key` return one report id, oversized requests return `413`, and the 11th report per user/IP in an hour returns `429` under default production limits.
- Account deletion removes reporter linkage and account identifiers from nested bug-report diagnostics.
- Apply all pending EF migrations before deploying the API/SMTP worker; verify
  `BugReports`, `BugReportRewardTransactions`, `AbuseRateLimitBuckets`,
  `GooglePlayRtdnEvents`, `GooglePlayVoidedPurchases`,
  `IntegrationCheckpoints`, `AdminAuditEvents`, database avatar content and
  workout-creator lease columns exist.
- Backend offline behavior: local-first data remains visible and safe.

## External production work before public launch

- Choose real hosting and domain.
- Connect the JSON log stream and mobile crash reporting to the selected provider,
  then verify a synthetic backend exception and a non-release mobile crash alert.
- Schedule and monitor `backup-postgres.ps1`; periodically run and record a real
  `verify-postgres-restore.ps1` result against production-compatible PostgreSQL.
- Complete Google Play Internal Testing purchase smoke.
- Enable and monitor the implemented Voided Purchases reconciliation; perform a
  sandbox refund smoke and verify both the ledger clawback and manual-review path.
- Keep the `production-gate` GitHub Actions workflow required on the release
  branch; it applies all migrations to a real PostgreSQL 16 service container.
- Verify branch protection requires `production-gate` on the repository release
  branch (`master` at the time of the 2026-07-16 audit).
- Deploy and verify the public `/privacy` and `/account-deletion` pages, then enter
  their production HTTPS URLs in Google Play Console.
- Decide documentation language policy and clean up legacy docs if needed.
