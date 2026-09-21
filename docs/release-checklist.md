# Gymmin release checklist

Gymmin is a mobile-only, local-only application. This checklist contains no backend deployment, account, synchronization, billing, credits, or remote AI steps.

Product availability invariants: the top-right local profile action is always visible, no login panel exists, and the workout creator is available from Workouts without an account or internet connection. Home does not duplicate the creator action. Saved-workout AI rewrite is not part of the product.

## Code gates

- [ ] `npm run docs:validate`
- [ ] `npm ci --prefix apps/mobile`
- [ ] `npm --prefix apps/mobile run test`
- [ ] `npm --prefix apps/mobile run typecheck`
- [ ] `npm run mobile:catalog:check`
- [ ] `npm run exercise:media:validate`
- [ ] `npm run mobile:guard:local-only`
- [ ] `npm run mobile:guard:local-product`
- [ ] `npm run google-play:validate`
- [ ] `npm run security:secrets`
- [ ] `npm run security:dependencies`
- [ ] `npm run mobile:security:android`
- [ ] `npm run mobile:security:android-components`
- [ ] `Push-Location apps/mobile; npx expo-doctor; Pop-Location`
- [ ] `Push-Location apps/mobile; npx expo export --platform android --output-dir .expo-ci-export; Pop-Location`
- [ ] native debug APK builds from the normal repository path
- [ ] signed release APK/AAB builds from the normal repository path
- [ ] build without `GYMMIN_UPLOAD_*` fails; there is no debug-keystore fallback
- [ ] final merged manifest has no `INTERNET`, Billing, cleartext, overlay, or broad storage permission
- [ ] release artifact contains no backend URL, OpenAI key/URL, bearer secret, or obsolete auth transport
- [ ] `git diff --check`

Do not run `npm audit fix --force`. Review every documented upstream audit exception after Expo dependency updates.

## Functional smoke — physical Android device

Record exactly one status for every scenario: `PASS`, `FAIL`, or `NOT TESTED`. A `FAIL` must include reproduction notes before any code change is considered. Do not treat automated gates as a substitute for this matrix. Results below apply only to a candidate identified by commit, versionCode, build date and device; historical verbal confirmation must not be silently copied to a newer candidate.

Current candidate record: **not assigned**. Fill in `commit / versionCode / build date / device` before changing any row to `PASS`.

| Scenario | Priority | Result (`PASS` / `FAIL` / `NOT TESTED`) | Device / Android / build | Notes |
| --- | --- | --- | --- | --- |
| A. Fresh install | P1 | NOT TESTED |  |  |
| B. Upgrade from an old installation | P1 | NOT TESTED |  | Pre-release account data is intentionally ignored; no customer accounts exist. |
| C. Upgrade with an active workout | P0 | NOT TESTED |  |  |
| D. Obsolete account namespaces do not block startup | P1 | NOT TESTED |  | Automated emulator coverage passed; physical smoke remains optional. |
| E. Backup and restore | P0 | NOT TESTED |  |  |
| F. Avatar | P1 | NOT TESTED |  |  |
| G. AI create | P0 | NOT TESTED |  |  |
| H. Invalid AI response | P1 | NOT TESTED |  |  |
| J. Reminders | P1 | NOT TESTED |  |  |
| K. Report Bug | P1 | NOT TESTED |  |  |
| L. Buy Me a Coffee | P1 | NOT TESTED |  |  |
| M. Delete all local data | P0 | NOT TESTED |  |  |

Exercise media visual smoke: **PASS** on a physical Android device (2026-08-10). The approved sample compared original PNG against Balanced WebP Q90, max 900 x 1140, without crop. This result does not change the status of unrelated A-M scenarios.

P0 execution order: C → E → G → M. P1 follows after P0 or in parallel on a separate prepared device. If a smoke test fails, preserve the exact candidate commit and artifact, document the failure and root cause, and make any approved fix in a separate commit.

### A. Fresh install

- [ ] install without restoring app data and launch successfully
- [ ] confirm no legacy migration screen appears
- [ ] create and edit a workout
- [ ] assign workouts in the weekly plan and restart the app
- [ ] start and complete a workout
- [ ] confirm the completed session in history and progress
- [ ] confirm the expected achievement is unlocked
- [ ] configure a reminder and verify persistence
- [ ] restart the app and confirm all data remains
- [ ] open Profile and confirm the localized local-profile fallback, zero derived counters, empty achievement state, and no `undefined`/blank identity field
- [ ] expand weekly muscle analysis and confirm both segmented controls share one row on a normal phone
- [ ] switch Completed/Plan and Front/Back, then toggle individual muscle rows and confirm only presentation/anatomy coloring changes

### B. Upgrade from an old pre-release installation

- [ ] prepare an old Gymmin version with workouts, history, favorites, weekly plan, creator profile, and achievements
- [ ] install the new APK over it without uninstalling
- [ ] confirm the app starts without a source-selection screen
- [ ] confirm obsolete `gymmin.account.*` test data is not imported or merged
- [ ] create local-only data, restart, and verify it persists

### C. Upgrade with an active workout

- [ ] start but do not finish a workout in the old version
- [ ] install the new APK over it without uninstalling
- [ ] resume and complete the active workout
- [ ] verify resulting history and progress

### D. Obsolete account namespaces do not block startup

- [ ] prepare multiple synthetic `gymmin.account.*` namespaces
- [ ] confirm no source-selection screen appears
- [ ] confirm no silent import or merge occurs
- [ ] confirm Home opens and local-only data can be created normally

### E. Backup and restore

- [ ] create a `.gymmin.json` backup
- [ ] modify workouts/profile/settings
- [ ] select the backup, review it, and confirm restore
- [ ] restart and verify restored data
- [ ] import a v1 backup without `profile` and confirm the current local profile is preserved
- [ ] restore a valid v1 backup containing a weekly-plan reference to a removed workout; confirm restore succeeds, the orphan reference is omitted, and all other data survives restart
- [ ] delete a workout assigned to the weekly plan, create a new backup, and confirm the deleted workout ID is absent from the exported plan

### F. Avatar

- [ ] select an avatar and restart
- [ ] replace the avatar
- [ ] delete the avatar
- [ ] create a backup containing an avatar and restore it
- [ ] confirm Profile counters include only completed non-deleted sessions and non-archived plans
- [ ] confirm the avatar actions remain usable on a small phone without clipping or overlapping the counters

### Profile and achievements dashboard

- [ ] confirm Profile stores no display name and uses the localized `Local profile` / `Profil lokalny` label
- [ ] confirm active, abandoned and deleted sessions do not increment Completed sessions
- [ ] confirm archived workout definitions do not increment Active plans
- [ ] verify achievements at zero, partial progress and all-unlocked states
- [ ] open Report Bug from the compact Actions row

### Detailed warm-up execution

- [ ] create a warm-up stage with several named movements and targets
- [ ] start guided execution and confirm every warm-up movement is visible as its own step
- [ ] confirm only an actually empty/simple warm-up uses the compact placeholder presentation

### G. AI create

- [ ] fill in the local creator form
- [ ] copy the generated prompt
- [ ] manually select Deep research in ChatGPT, paste the generated prompt, answer any clarification questions and obtain importable JSON
- [ ] paste from clipboard, review, and save
- [ ] repeat using manual text paste

### H. Invalid AI response

- [ ] paste malformed JSON and verify a useful validation error
- [ ] paste an unknown exercise and select a catalog replacement
- [ ] confirm Save remains disabled until all critical errors are fixed

### J. Reminders

- [ ] configure a reminder and grant notification permission when requested
- [ ] restart the application and device
- [ ] verify the scheduled notification appears at the expected time

### K. Report Bug

- [ ] confirm the mail client opens with `kontakt@gymmin.app`
- [ ] confirm the CTA says it opens an email rather than claiming the report was already sent
- [ ] confirm sending still requires explicit confirmation in the system email app
- [ ] confirm the no-mail-client fallback copies both the address and prepared report
- [ ] confirm neither Bug Report nor Contact performs an HTTP request
- [ ] confirm subject/body are readable and bounded
- [ ] confirm no workout/history/weight/profile/prompt/AI response is included
- [ ] on a device without a mail handler, verify copying the address and prepared report

### L. Buy Me a Coffee

- [ ] confirm the exact external URL `https://buymeacoffee.com/atomicjumpr`
- [ ] confirm it opens in an external browser/application
- [ ] return to Gymmin and confirm state is preserved

### M. Delete all local data

- [ ] create a backup first
- [ ] select Delete all data and accept both confirmations
- [ ] confirm avatar removal and reminder cancellation
- [ ] confirm workouts, history, profile, settings, favorites, and achievements are cleared
- [ ] restart and confirm fresh-install behavior

## Google Play release

- [ ] generate the final signed AAB with `npm run mobile:store:aab`
- [ ] verify AAB signature and upload certificate
- [ ] verify package/application ID is `com.gymmin.app`
- [ ] increment and verify `versionCode`
- [ ] verify user-facing `versionName`
- [x] publish the canonical `docs/privacy/` files through the dedicated public `kicha93/gymmin-privacy` repository
- [x] verify the deployed privacy URL: `https://kicha93.github.io/gymmin-privacy/`
- [x] verify PL policy at the deployment root and EN policy under `/en/`
- [x] verify deletion instructions under `/delete-data/` and `/en/delete-data/`
- [x] enter the verified public privacy URL in Play Console
- [x] complete Data safety using the actual local-only behavior
- [ ] prepare phone/tablet screenshots; icon and feature graphic are already present under `docs/google-play/assets`
- [x] prepare PL/EN short and full store descriptions
- [x] complete ads, content rating, target audience, health-app, and other required declarations truthfully
- [ ] verify author `Paweł Kaliszewski`, contact `kontakt@gymmin.app`, and voluntary support disclosure
- [x] run an internal-testing release for version 1.0 / versionCode 2
- [ ] repeat the internal-test upload and smoke test for the next candidate after source changes

## Retained legacy data safety

Ignored `backend/Gymmin.Api/App_Data` may contain old private data and is not part of the application or commit. Do not inspect its contents unnecessarily, publish it, or delete it without an explicit retention/decommission decision. Repository cleanup is not authorization to destroy a deployed database.
