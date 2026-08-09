# Android build

Gymmin builds directly from the normal repository path. The historical short-path copy and backend/tunnel bootstrap were removed after IAP/Nitro removal.

## Requirements

- Node.js 22, JDK 17, Android SDK (`ANDROID_HOME` or `ANDROID_SDK_ROOT`)
- release upload key configured with `GYMMIN_UPLOAD_STORE_FILE`, `GYMMIN_UPLOAD_STORE_PASSWORD`, `GYMMIN_UPLOAD_KEY_ALIAS`, `GYMMIN_UPLOAD_KEY_PASSWORD`
- authenticated GitHub CLI for the one-click APK upload

Release signing is fail-closed in `android/app/build.gradle`; missing values stop every release task and cannot fall back to the debug key.

## Debug APK

```powershell
npm run mobile:build:android-apk -- -Variant debug
```

## Phone release APK + GitHub Release

```powershell
npm run mobile:github:apk:oneclick
```

The command runs mobile gates, builds `arm64-v8a` by default, writes `.artifacts/Gymmin-arm64-v8a-release-latest.apk`, and uploads it to the configured private GitHub Release. It takes no URL and performs no health/tunnel check.

## Google Play AAB

```powershell
npm run mobile:store:aab
```

The artifact is `.artifacts/Gymmin-release-latest.aab`. The store script builds the production `arm64-v8a` ABI by default; override `-Architectures` only for an explicitly tested distribution requirement.

## Direct native checks

```powershell
cd apps/mobile/android
.\gradlew.bat assembleDebug -PreactNativeArchitectures=arm64-v8a --no-daemon
.\gradlew.bat bundleRelease -PreactNativeArchitectures=arm64-v8a --no-daemon
```

The second command must fail when upload signing is absent. No `ApiBaseUrl`, tunnel, Cloudflare, ngrok, backend, or debug-signing fallback is supported.

The post-cleanup experiment on 2026-08-09 confirmed that debug APK, signed release APK and signed release AAB build from the normal repository path. The old short-path workaround is no longer required. Generated `.cxx` caches from pre-cutover IAP/Nitro builds must be deleted once when upgrading a developer checkout.
