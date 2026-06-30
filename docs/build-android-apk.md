# Android APK builds

Use this when you want to test Gymmin as a standalone Android app.

The current preferred path is local release APK build plus GitHub Release upload.
Expo Go and EAS cloud builds are no longer the default testing flow.

## Prerequisites

- JDK 17 available as `java`.
- Android SDK installed.
- `ANDROID_HOME` or `ANDROID_SDK_ROOT` set, or the workspace-local `.android-sdk` exists.

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

## Build and publish an APK for phone download

This is the preferred ad-hoc phone testing flow when Expo Go is not enough.
It builds a smaller release APK for `arm64-v8a`, copies it to `.artifacts`, uploads it to the private GitHub release repository, and prints the release link.

Use the public backend URL printed by `scripts/start-expo-tunnel.ps1` or another currently running backend tunnel:

```powershell
npm run mobile:build:android-apk:phone -- -ApiBaseUrl "https://your-backend-url.example.com"
```

Short alias:

```powershell
npm run mobile:apk:share -- -ApiBaseUrl "https://your-backend-url.example.com"
```

Equivalent direct script call:

```powershell
.\scripts\build-and-publish-android-apk.ps1 -ApiBaseUrl "https://your-backend-url.example.com"
```

By default the APK is published to GitHub:

```powershell
npm run mobile:apk:share -- -ApiBaseUrl "https://your-backend-url.example.com" -PublishProvider GitHub
```

Current default GitHub target:

```text
kicha93/gymmin-apk
release: v1.0
```

The repository is private. Downloading from a phone requires being signed in to the GitHub account that has access.

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

Ngrok remains available as a fallback for a direct temporary download link:

```powershell
npm run mobile:apk:share -- -ApiBaseUrl "https://your-backend-url.example.com" -PublishProvider Ngrok
```

Cloudflare can still be used as a fallback:

```powershell
npm run mobile:apk:share -- -ApiBaseUrl "https://your-backend-url.example.com" -PublishProvider Cloudflare
```

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

- `arm64-v8a` works for modern Android phones and keeps the APK much smaller than a universal debug APK.
- Release APK avoids Expo Go limitations and development-only local notification warnings.
- Workout reminder local notifications were manually verified in the standalone Android APK / development build.
- GitHub Release is now the default distribution path because Android downloads repeatedly stalled at 100% through temporary tunnels.
- The generated release URL is stable for the current version and works well from a phone browser.
- The tunnel download server is still kept as a fallback and supports `HEAD`, `Range`, `Content-Length`, and closes the connection after transfer.
- If you use ngrok fallback, this ngrok account exposes one endpoint at a time. Publishing APK through ngrok can stop the public backend tunnel. After installing the APK, rerun `scripts/start-expo-tunnel.ps1` if the backend tunnel is needed again.

To publish an already-built APK without rebuilding:

```powershell
npm run mobile:apk:publish-github
```

Equivalent direct script call:

```powershell
.\scripts\publish-apk-github.ps1 -ApkPath .\.artifacts\Gymmin-arm64-v8a-release-latest.apk
```

This uploads the APK to `kicha93/gymmin-apk` release `v1.0`, prints `APK_DOWNLOAD_URL=...`, and writes the same value to `.artifacts/latest-apk-download-url.txt`.

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
