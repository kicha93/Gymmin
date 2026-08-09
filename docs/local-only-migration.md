# Legacy-to-local-only migration

This is a permanent backward-compatible import bridge for users who upgrade directly from any pre-local-only Gymmin version. It is not account storage and requires neither auth nor a backend.

## Compatibility freeze

This layer imports data produced by the former account/auth/synchronization architecture into the final local-only namespace. It must not be removed or refactored merely because accounts no longer exist in the product. Removal is allowed only after an explicitly agreed compatibility window has ended; no end date is currently defined.

## Destination

Canonical product data uses `gymmin.local.v1.<baseKey>`. Existing valid destination data is never overwritten by legacy data.

## Sources

The migration discovers supported old anonymous keys and every meaningful `gymmin.account.<owner>.*` namespace. When several account namespaces contain data, the user chooses the source. Labels may use non-sensitive cached legacy metadata, but credentials and backend access are not required.

Supported domain readers cover workouts, settings, creator profiles, active/completed sessions, favorites, achievements/usage stats and weekly plan. The obsolete technical creator-job key is intentionally ignored, because it is neither workout data nor part of the copy/paste workflow.

## Safety protocol

1. discover and inventory sources;
2. ask for source selection when ambiguous;
3. validate/normalize every domain independently;
4. preserve any already populated `gymmin.local.v1.*` destination;
5. copy data first;
6. persist progress after each copied base key;
7. write the completion marker last;
8. resume from the marker after an interrupted launch.

Legacy data is not automatically deleted during migration in this release. A completed user-triggered “Delete all data” action does remove both local and legacy Gymmin namespaces to produce a true fresh-install state. Deletion is blocked while migration is incomplete.

## Credentials

Legacy bearer credentials are unrelated to domain migration. A separate one-time best-effort cleanup removes known old AsyncStorage/SecureStore auth keys and writes its own marker. Failure does not block local data migration or app startup. `expo-secure-store` remains for this compatibility release only.

## Backup compatibility

Backup schema remains v1. `profile` is optional. Importing an older v1 backup without `profile` preserves the current local profile/avatar; it must not clear them. Backups never include auth tokens, API data, sync metadata or obsolete creator jobs.

## Regression coverage

Tests cover anonymous and account sources, multiple-account selection inventory, migration without auth/backend, interrupted recovery, destination precedence, exact legacy key mapping, backup without profile, and deletion safety.
