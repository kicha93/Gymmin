# Gymmin architecture

## Supported system

Gymmin is one local-only mobile application. The repository contains no supported backend service and the product runtime has no HTTP client, API base URL, auth restore, background synchronization, OpenAI transport, credits, or Google Play Billing.

```text
UI / navigation
      ↓
local hooks and repositories
      ↓
gymmin.local.v1.* + private app files + scheduled local notifications
```

External operations are explicit user intents only: email, HTTPS links, clipboard hand-off, and Android document/export surfaces.

## Local data

The canonical namespace is `gymmin.local.v1.*`. It contains workouts, settings, creator profiles, active and completed sessions, favorites, achievements/usage stats, weekly plan, local avatar metadata, migration state, and other local product records. The avatar is a file in private app storage; AsyncStorage stores only its metadata/path. Gymmin does not collect or store a profile display name.

Profile counters are derived selectors, not stored records: completed sessions include only completed, non-deleted sessions, and active plans include only non-archived workout definitions. The same local source records continue to power history, progress and achievements.

New runtime mutations do not create sync tombstones or remote metadata. Parsers may accept historical `deletedAt`/timestamps for backward compatibility.

## Legacy upgrade bridge

The runtime opens `gymmin.local.v1.*` directly. Because the account-backed builds were used only for internal testing and no customer account data exists, old `gymmin.account.*` namespaces are not discovered, merged, or offered for selection. They remain untouched until the user explicitly uses “Delete all data”, so obsolete test data cannot block startup.

`legacyAuthCleanup.ts` performs a separate one-time best-effort removal of obsolete credential keys. `expo-secure-store` remains only for this compatibility cleanup and can be reconsidered after the supported upgrade window.

## AI

Workout creation builds a prompt locally. The user copies it into an external assistant and pastes JSON back. Gymmin validates/matches the result before a workout is saved. Prompts, responses, and creator profiles are not transmitted by Gymmin. Saved workouts are modified only through the regular local editor; the AI rewrite flow has been removed.

## Backup and deletion

Backup v1 covers local product data and optional profile/avatar. A v1 backup without `profile` preserves the current profile. During creation and import, weekly-plan entries are normalized against the included workout definitions: an orphan reference is dropped while the rest of a valid backup is preserved. Deleting a workout also prunes its live weekly-plan assignment, preventing new orphan references. Broken active-session references remain a strict validation error because silently changing an in-progress workout would risk user data. “Delete all data” is allowed only after legacy migration is complete, cancels reminders, removes the avatar and all Gymmin namespaces (including consciously retained legacy sources), clears transient AI state, and returns to fresh-install state.

## Network and Android

The main Android manifest explicitly removes `INTERNET` and `com.android.vending.BILLING` from the merged manifest. Minimal package visibility remains for user-triggered HTTPS, mailto, image selection, and document operations. Cleartext is disabled and Android cloud/device backups are excluded.

## Delivery

Production Gate is mobile-only: secret and documentation checks, catalog/media validation, local-only/product guards, Android source security, tests, typecheck, Expo Doctor/export, diff check, native debug APK, signed release AAB, merged-manifest checks, signature verification, and exported-component validation. Unsigned iOS builds use separate manually triggered GitHub Actions or Codemagic workflows and are not App Store releases.
