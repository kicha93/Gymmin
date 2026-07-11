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

## Backend production readiness

- `ASPNETCORE_ENVIRONMENT=Production`.
- `Gymmin:Storage:Provider=Database`.
- `Gymmin:Storage:DatabaseProvider=PostgreSQL`.
- Production connection string is supplied by environment variables or a secret
  manager, not committed config.
- EF migrations are run explicitly before app startup.
- `Gymmin:Storage:ApplyMigrationsOnStartup=false`.
- `/health` and `/api/health` are checked after deployment.
- `/api/diagnostics` is disabled or protected in Production.
- HTTPS/reverse proxy is configured.
- CORS is configured intentionally for the deployed mobile/backend setup.
- Auth rate limiting is enabled.
- Logs are collected by the hosting platform.
- PostgreSQL backups are configured.

## Secrets and integrations

- OpenAI API key is configured if AI creator/rewrite should work.
- SMTP is configured for bug reports and password reset.
- Google Play service account credentials are supplied through secrets only.
- Service account JSON, upload keystore and passwords are not committed.
- System status config is set intentionally:
  - `SystemStatus:Kind=ok` for normal operation,
  - `maintenance`, `update` or `degraded` only during controlled events.

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

## Android builds

- Android SDK is installed and `ANDROID_HOME` or `ANDROID_SDK_ROOT` is set.
- GitHub APK is built with the intended test backend `ApiBaseUrl`.
- GitHub APK build command:

  ```powershell
  npm run mobile:apk:share -- -ApiBaseUrl "https://your-backend-url.example.com"
  ```

- Store AAB uses release upload-key signing, not debug signing.
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
npm --prefix apps/mobile run test
npm --prefix apps/mobile run typecheck
dotnet test backend/Gymmin.Api.Tests/Gymmin.Api.Tests.csproj
dotnet build backend/Gymmin.Api/Gymmin.Api.csproj
```

## Manual smoke required

Automated tests do not render the full React Native UI and do not exercise real
native Android services. Smoke these flows manually on the standalone APK/dev
build:

- Register/login/logout and active sessions.
- Avatar upload, avatar replacement and avatar delete.
- Account details and account deletion with strong confirmation.
- Anonymous local workouts, login and anonymous-to-account merge.
- Workout list, workout details and Exercise Detail Page.
- Active workout execution:
  - guided mode,
  - inline table mode,
  - read-only then fill-after mode,
  - keyboard/input stability,
  - finish with incomplete values warning,
  - abandon/delete active session.
- Workout history detail table, horizontal scroll and table orientation behavior.
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
- Bug report submission with correlation id.
- Backend offline behavior: local-first data remains visible and safe.

## Production TODO before public launch

- Choose real hosting and domain.
- Configure production log aggregation and crash/error monitoring.
- Configure database backup/restore process and test restore.
- Complete Google Play Internal Testing purchase smoke.
- Add RTDN/PubSub handling for refund, chargeback, cancellation and pending
  purchase lifecycle.
- Add CI service-container smoke for PostgreSQL.
- Finalize privacy policy and account deletion support text.
- Decide documentation language policy and clean up legacy docs if needed.
