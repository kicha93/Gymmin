# Gymmin release checklist

Gymmin is a mobile-only, local-only application. This checklist contains no backend deployment, account, synchronization, billing, credits, or remote AI steps.

Product availability invariants: the top-right local profile action is always visible, no login panel exists, and the workout creator is always available without an account or internet connection.

## Code gates

- [ ] `npm ci --prefix apps/mobile`
- [ ] `npm --prefix apps/mobile run test`
- [ ] `npm --prefix apps/mobile run typecheck`
- [ ] `npm run mobile:catalog:check`
- [ ] `npm run exercise:media:validate`
- [ ] `npm run mobile:guard:local-only`
- [ ] `npm run mobile:guard:local-product`
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

Record exactly one status for every scenario: `PASS`, `FAIL`, or `NOT TESTED`. A `FAIL` must include reproduction notes before any code change is considered. Do not treat automated gates as a substitute for this matrix.

| Scenario | Priority | Result (`PASS` / `FAIL` / `NOT TESTED`) | Device / Android / build | Notes |
| --- | --- | --- | --- | --- |
| A. Fresh install | P1 | NOT TESTED |  |  |
| B. Upgrade from an old installation | P0 | PASS | Physical Android / legacy vc1 -> local-only RC vc2 | Migration and migrated data confirmed by the user on 2026-08-10. |
| C. Upgrade with an active workout | P0 | NOT TESTED |  |  |
| D. Multiple legacy account namespaces | P1 | NOT TESTED |  |  |
| E. Backup and restore | P0 | NOT TESTED |  |  |
| F. Avatar | P1 | NOT TESTED |  |  |
| G. AI create | P0 | NOT TESTED |  |  |
| H. Invalid AI response | P1 | NOT TESTED |  |  |
| I. AI rewrite | P0 | NOT TESTED |  |  |
| J. Reminders | P1 | NOT TESTED |  |  |
| K. Report Bug | P1 | NOT TESTED |  |  |
| L. Buy Me a Coffee | P1 | NOT TESTED |  |  |
| M. Delete all local data | P0 | NOT TESTED |  |  |

Exercise media visual smoke: **PASS** on a physical Android device (2026-08-10). The approved sample compared original PNG against Balanced WebP Q90, max 900 x 1140, without crop. This result does not change the status of unrelated A-M scenarios.

P0 execution order: B → C → E → G → I → M. P1 follows after P0 or in parallel on a separate prepared device. If a smoke test fails, preserve RC commit `2947f7d`, document the exact failure and root cause, and make any approved fix in a separate commit.

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

### B. Upgrade from an old installation

- [ ] prepare an old Gymmin version with workouts, history, favorites, weekly plan, creator profile, and achievements
- [ ] install the new APK over it without uninstalling
- [ ] complete the legacy-to-local migration
- [ ] verify every listed data domain after migration
- [ ] restart and verify data integrity again
- [ ] confirm migration does not run a second time

### C. Upgrade with an active workout

- [ ] start but do not finish a workout in the old version
- [ ] install the new APK over it without uninstalling
- [ ] resume and complete the active workout
- [ ] verify resulting history and progress

### D. Multiple legacy account namespaces

- [ ] prepare multiple meaningful `gymmin.account.*` namespaces
- [ ] confirm the source-selection screen appears
- [ ] confirm there is no silent merge
- [ ] select a source and verify only the intended data is imported
- [ ] restart and confirm the selection is not requested again

### E. Backup and restore

- [ ] create a `.gymmin.json` backup
- [ ] modify workouts/profile/settings
- [ ] select the backup, review it, and confirm restore
- [ ] restart and verify restored data
- [ ] import a v1 backup without `profile` and confirm the current local profile is preserved

### F. Avatar

- [ ] select an avatar and restart
- [ ] replace the avatar
- [ ] delete the avatar
- [ ] create a backup containing an avatar and restore it

### G. AI create

- [ ] fill in the local creator form
- [ ] copy the generated prompt
- [ ] manually open an external AI service and obtain JSON
- [ ] paste from clipboard, review, and save
- [ ] repeat using manual text paste

### H. Invalid AI response

- [ ] paste malformed JSON and verify a useful validation error
- [ ] paste an unknown exercise and select a catalog replacement
- [ ] confirm Save remains disabled until all critical errors are fixed

### I. AI rewrite

- [ ] choose an existing workout and copy the rewrite prompt
- [ ] paste an external AI response and review it
- [ ] cancel and confirm the original workout is unchanged
- [ ] repeat and Apply; verify only the intended workout changes

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
- [ ] manually run the `Publish privacy pages` workflow after enabling GitHub Actions as the Pages source
- [ ] copy the actual URL from the successful Pages deployment; do not infer it beforehand
- [ ] verify PL policy at the deployment root and EN policy under `/en/`
- [ ] verify optional deletion instructions under `/delete-data/` and `/en/delete-data/`
- [ ] enter the verified public privacy URL in Play Console
- [ ] complete Data safety using the actual local-only behavior
- [ ] prepare phone/tablet screenshots and final icon/feature graphic
- [ ] prepare PL/EN short and full store descriptions
- [ ] complete ads, content rating, target audience, health-app, and other required declarations truthfully
- [ ] verify author `Paweł Kaliszewski`, contact `kontakt@gymmin.app`, and voluntary support disclosure
- [ ] run an internal-testing release before production rollout

## Retained legacy data safety

Ignored `backend/Gymmin.Api/App_Data` may contain old private data and is not part of the application or commit. Do not inspect its contents unnecessarily, publish it, or delete it without an explicit retention/decommission decision. Repository cleanup is not authorization to destroy a deployed database.
