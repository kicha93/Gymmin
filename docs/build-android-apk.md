# Android APK builds

Use this when you want to test Gymmin as a standalone Android app.

The current preferred phone-testing path is local `arm64-v8a` release APK build plus GitHub Release upload.
Expo Go and EAS cloud builds are no longer the default testing flow.

## Prerequisites

- JDK 17 available as `java`.
- Android SDK installed.
- `ANDROID_HOME` or `ANDROID_SDK_ROOT` set, or the workspace-local `.android-sdk` exists.

On Windows, a local Android SDK install can use the standard user path:

```powershell
$env:ANDROID_HOME = "$env:LOCALAPPDATA\Android\Sdk"
$env:ANDROID_SDK_ROOT = "$env:LOCALAPPDATA\Android\Sdk"
$env:Path = "$env:ANDROID_HOME\platform-tools;$env:ANDROID_HOME\cmdline-tools\latest\bin;$env:Path"
```

## Build a local APK

Prerequisites:

- JDK 17 available as `java`.
- Android SDK installed.
- `ANDROID_HOME` or `ANDROID_SDK_ROOT` set.

Build debug APK locally:

```powershell
npm run mobile:build:android-apk:local -- -ApiBaseUrl "https://your-backend-url.example.com"
```

Expected output:

```text
apps/mobile/android/app/build/outputs/apk/debug/app-debug.apk
```

Build release APK locally:

```powershell
npm run mobile:build:android-apk:local -- -ApiBaseUrl "https://your-backend-url.example.com" -Variant release
```

For the phone/GitHub flow, use the release APK command below rather than the debug APK. This is the variant that was verified to download and install reliably on Android.

## Build a local AAB for Google Play Internal Testing / Store

Google Play Internal Testing should use an Android App Bundle. The local AAB
script copies the repo to a short temporary path before running Gradle because
`react-native-iap` / Nitro generates long native C++ paths that can exceed
Windows CMake/Ninja limits when built from a deep workspace path.

Release AAB builds must be signed with the Google Play upload key. They no
longer fall back to the Android debug keystore. Configure signing through
environment variables, or through the local ignored file
`apps/mobile/android/upload-keystore.properties`.

Generate an upload key once and keep it outside the repository:

```powershell
keytool -genkeypair -v -keystore C:\secure\gymmin-upload-key.jks -alias gymmin-upload -keyalg RSA -keysize 2048 -validity 10000
```

Set signing variables in PowerShell before building:

```powershell
$env:GYMMIN_UPLOAD_STORE_FILE = "C:\secure\gymmin-upload-key.jks"
$env:GYMMIN_UPLOAD_STORE_PASSWORD = "<password>"
$env:GYMMIN_UPLOAD_KEY_ALIAS = "gymmin-upload"
$env:GYMMIN_UPLOAD_KEY_PASSWORD = "<password>"
```

Alternative local file, not committed:

```properties
GYMMIN_UPLOAD_STORE_FILE=C:\secure\gymmin-upload-key.jks
GYMMIN_UPLOAD_STORE_PASSWORD=<password>
GYMMIN_UPLOAD_KEY_ALIAS=gymmin-upload
GYMMIN_UPLOAD_KEY_PASSWORD=<password>
```

```powershell
npm run mobile:store:aab -- -ApiBaseUrl "https://your-backend-url.example.com"
```

Output artifact:

```text
.artifacts/Gymmin-release-latest.aab
```

Default short build folder:

```text
C:\gymmin-aab
```

Use a different short folder when needed:

```powershell
npm run mobile:store:aab -- -ApiBaseUrl "https://your-backend-url.example.com" -ShortBuildRoot "D:\g"
```

Verify the bundle signature before uploading to Play Console:

```powershell
jarsigner -verify -verbose -certs .artifacts/Gymmin-release-latest.aab
```

The certificate owner must not be `CN=Android Debug`. If the signing variables
are missing, `bundleRelease` fails with a clear error instead of producing a
debug-signed release.

## Build and publish a release APK for phone download

This is the preferred ad-hoc phone testing flow when Expo Go is not enough.
It builds an `arm64-v8a` release APK, copies it to `.artifacts`, uploads it to the private GitHub release repository, and prints the release link.

Rule of thumb:

- GitHub Release gets the `arm64-v8a` release APK that was verified on Android.
- Google Play / Store gets release AABs signed with the upload key.

Use the public backend URL printed by `scripts/start-expo-tunnel.ps1` or another currently running backend tunnel:

```powershell
npm run mobile:build:android-apk:phone -- -ApiBaseUrl "https://your-backend-url.example.com"
```

Short alias:

```powershell
npm run mobile:apk:share -- -ApiBaseUrl "https://your-backend-url.example.com"
```

Explicit GitHub alias:

```powershell
npm run mobile:github:apk -- -ApiBaseUrl "https://your-backend-url.example.com"
```

Equivalent direct script call:

```powershell
.\scripts\build-and-publish-android-apk.ps1 -ApiBaseUrl "https://your-backend-url.example.com"
```

Current default GitHub target:

```text
kicha93/gymmin-apk
release: v1.0
```

The repository is private. Downloading from a phone requires being signed in to the GitHub account that has access.

### How to generate the phone APK yourself

1. Make sure the backend is available through a public URL, for example a production/staging URL or a currently running tunnel.
2. Make sure Android SDK is configured:

```powershell
$env:ANDROID_HOME = "$env:LOCALAPPDATA\Android\Sdk"
$env:ANDROID_SDK_ROOT = "$env:LOCALAPPDATA\Android\Sdk"
```

3. Load release signing variables. Use your local secure file if it exists:

```powershell
. C:\secure\gymmin-upload-key-codex-20260701.env.ps1
```

Or set them manually:

```powershell
$env:GYMMIN_UPLOAD_STORE_FILE = "C:\secure\gymmin-upload-key.jks"
$env:GYMMIN_UPLOAD_STORE_PASSWORD = "<password>"
$env:GYMMIN_UPLOAD_KEY_ALIAS = "gymmin-upload"
$env:GYMMIN_UPLOAD_KEY_PASSWORD = "<password>"
```

4. Make sure GitHub CLI is logged in and has access to `kicha93/gymmin-apk`:

```powershell
gh auth status
```

If needed:

```powershell
gh auth login --hostname github.com --git-protocol https --web --scopes repo
```

5. Build and publish with the one-command wrapper:

```powershell
npm run mobile:github:apk:oneclick -- -ApiBaseUrl "https://your-current-backend-url.example.com"
```

This wrapper:

- loads the local signing env file from `C:\secure\gymmin-upload-key-codex-20260701.env.ps1` when it exists,
- stops existing Gradle daemons for the main and short-path Android projects,
- requires an explicit backend URL through `-ApiBaseUrl` or `GYMMIN_APK_API_BASE_URL`,
- checks `GET /health` before building, so a stale ngrok/tunnel URL cannot be embedded silently,
- builds the `arm64-v8a` release APK,
- uploads it to `kicha93/gymmin-apk` release `v1.0`.

Alternative with an environment variable:

```powershell
$env:GYMMIN_APK_API_BASE_URL = "https://your-current-backend-url.example.com"
npm run mobile:github:apk:oneclick
```

If `/health` does not return `{"status":"ok"}`, the wrapper fails before the
APK build. Start the backend/tunnel again, copy the fresh public backend URL,
and rerun the command. This matters for account features such as login, avatar
upload and AI credits because the API URL is baked into the installed APK.

The lower-level command is still available when you want to pass every option manually:

```powershell
npm run mobile:github:apk -- -ApiBaseUrl "https://your-backend-url.example.com"
```

The script writes:

```text
.artifacts/Gymmin-arm64-v8a-release-latest.apk
```

and uploads it to:

```text
https://github.com/kicha93/gymmin-apk/releases/tag/v1.0
```

Direct APK URL:

```text
https://github.com/kicha93/gymmin-apk/releases/download/v1.0/Gymmin-arm64-v8a-release-latest.apk
```

To only build locally without uploading:

```powershell
npm run mobile:github:apk -- -ApiBaseUrl "https://your-backend-url.example.com" -SkipPublish
```

Debug APK is kept only as an emergency/development option:

```powershell
npm run mobile:apk:share:debug -- -ApiBaseUrl "https://your-backend-url.example.com"
```

Do not use the debug APK as the default phone-distribution artifact.

## Store release script

Use this for Google Play / Store release artifacts:

```powershell
npm run mobile:store:aab -- -ApiBaseUrl "https://your-backend-url.example.com"
```

Equivalent direct script call:

```powershell
.\scripts\build-store-android-aab.ps1 -ApiBaseUrl "https://your-backend-url.example.com"
```

This always delegates to the release AAB flow and writes:

```text
.artifacts/Gymmin-release-latest.aab
```

## Versioning

Current mobile version starts at:

```text
versionName: 1.0
versionCode: 1
```

Large product changes should increment the app version by `0.1`:

```text
1.0 -> 1.1 -> 1.2
```

Do not move to `2.0` until that is explicitly requested.

Output artifact:

```text
.artifacts/Gymmin-arm64-v8a-release-latest.apk
```

The public download URL is printed as:

```text
APK_DOWNLOAD_URL=https://...
```

It is also saved to:

```text
.artifacts/latest-apk-download-url.txt
```

Why this flow:

- The GitHub APK defaults to `arm64-v8a` to avoid a very large universal APK.
- Release APK is the verified phone-download artifact. Store upload still uses the AAB flow.
- Standalone APK avoids Expo Go limitations and development-only local notification warnings.
- Workout reminder local notifications were manually verified in the standalone Android APK / development build.
- GitHub Release is now the default distribution path because Android downloads repeatedly stalled at 100% through temporary tunnels.
- The generated release URL is stable for the current version and works well from a phone browser.
- The tunnel download server is still kept as a fallback for already-built artifacts and supports `HEAD`, `Range`, `Content-Length`, and closes the connection after transfer.
- If you use ngrok fallback directly through `scripts/start-apk-download.ps1`, this ngrok account exposes one endpoint at a time. Publishing APK through ngrok can stop the public backend tunnel. After installing the APK, rerun `scripts/start-expo-tunnel.ps1` if the backend tunnel is needed again.

To publish an already-built APK without rebuilding:

```powershell
npm run mobile:apk:publish-github
```

Equivalent direct script call:

```powershell
.\scripts\publish-apk-github.ps1 -ApkPath .\.artifacts\Gymmin-arm64-v8a-release-latest.apk
```

This uploads the release APK to `kicha93/gymmin-apk` release `v1.0`, prints `APK_DOWNLOAD_URL=...`, and writes the same value to `.artifacts/latest-apk-download-url.txt`.

To expose an already-built APK through a temporary tunnel instead:

```powershell
.\scripts\start-apk-download.ps1 -ApkPath .\.artifacts\Gymmin-arm64-v8a-release-latest.apk
```

This command also prints `APK_DOWNLOAD_URL=...` and writes the same value to `.artifacts/latest-apk-download-url.txt`.

To force Cloudflare for an already-built APK:

```powershell
.\scripts\start-apk-download.ps1 -ApkPath .\.artifacts\Gymmin-arm64-v8a-release-latest.apk -TunnelProvider Cloudflare
```

## Dry run

To validate the local setup without starting a remote build:

```powershell
npm run mobile:build:android-apk -- -ApiBaseUrl "https://your-backend-url.example.com" -ValidateOnly
```

## Notes

- The `preview-apk` profile creates an `.apk` for direct installation on Android.
- The `production` profile is configured for an Android App Bundle (`.aab`) for future store distribution.
- Local notifications should be tested in a standalone Android APK or development build, because Expo Go can behave differently from an installed Android app.
- Google Play Billing cannot be tested in Expo Go. AI credit purchases require a native Android build with the billing module, package name `com.gymmin.app`, Play Console one-time products (`ai_tokens_1`, `ai_tokens_3`, `ai_tokens_10`) and license testers/internal testing.
- Direct APK sideload is useful for app QA, but real Google Play purchase lifecycle should be verified through Play Console internal testing or another Google-supported test track.
- `react-native-iap` and its peer dependency `react-native-nitro-modules` are the native Google Play Billing stack. After changing either dependency, rebuild Android; Expo Go will only show the controlled billing-unavailable fallback.
- Local Android build smoke requires `ANDROID_HOME` or `ANDROID_SDK_ROOT`. On this machine Android SDK command-line tools were installed under `%LOCALAPPDATA%\Android\Sdk`, and Android APK plus release AAB build smoke were verified after adding the Billing/Nitro stack.
- The verified smoke build used `react-native-iap@15.3.4`, `react-native-nitro-modules@0.35.x`, package `com.gymmin.app`, Android billing permission `com.android.vending.BILLING`, and the OpenIAP Google dependency.
- `react-dom@19.1.0` is also installed because release bundling pulls a React Aria utility through Gluestack that imports `react-dom`.
- If no emulator or physical device is connected, the build smoke can confirm native linking only. Runtime purchase checks still require an Android device/build with Google Play services; real purchases require Play Console internal testing.
