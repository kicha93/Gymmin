# Pre-release account storage retirement

Gymmin's released architecture is mobile-only and local-only. Canonical product data uses `gymmin.local.v1.<baseKey>` and startup opens that namespace directly.

## Why account data is not imported

The former account/auth/synchronization architecture was used only in internal test builds. There are no customer accounts whose data must be migrated. Importing or merging `gymmin.account.*` values would add startup risk without protecting customer data.

The production runtime therefore:

- does not enumerate `gymmin.account.*`;
- does not show a source-selection screen;
- does not copy or merge old account values;
- leaves obsolete test namespaces untouched during normal startup;
- initializes the local-only completion marker and continues to the product.

Historical readers remain isolated in the repository for regression fixtures and forensic reference. They are not invoked by normal application startup.

## Local data and deletion

Existing `gymmin.local.v1.*` values are never overwritten during bootstrap. A user-triggered “Delete all data” action removes Gymmin-owned local and obsolete test namespaces, the local avatar, reminders, and transient AI drafts to produce a true fresh-install state.

## Credentials

A separate one-time best-effort cleanup removes known obsolete AsyncStorage/SecureStore authentication credentials. It does not read or alter workouts and it must not block application startup.

## Backup compatibility

Backup schema remains v1. `profile` is optional and contains only an optional private avatar. Importing an older v1 backup without `profile` preserves the current local avatar; obsolete `displayName` values from older backups are ignored. Backups never include auth tokens, API data, sync metadata, or obsolete creator jobs.

Weekly-plan references are normalized against the workout definitions carried by the backup. A reference to a workout that is no longer present is omitted while the remaining valid backup data is retained. The active-session reference is deliberately stricter: importing an active session whose workout is missing remains an error because silently rewriting an in-progress session could lose user data. The v1 format and the rule that a backup without `profile` preserves the current local profile are unchanged.

## Regression coverage

Tests verify that local-only bootstrap completes without importing obsolete account data, preserves those old values untouched, retains existing local-only data, supports backup recovery, and keeps the historical readers isolated from product startup.
