# Achievements

Achievements are a fully local product feature.

- definitions ship statically with the app;
- unlock state and app-usage counters are stored under `gymmin.local.v1.achievements` and `gymmin.local.v1.appUsageStats`;
- evaluation uses local workouts, completed sessions and local usage events;
- no account, backend validation, sync, public leaderboard, credits or billing is involved;
- backup/import preserves local achievement state;
- “Delete all data” removes unlock state and counters.

Historical parsers can still read account-scoped achievement fixtures for regression coverage, but normal product startup neither imports nor merges those test namespaces. New runtime writes never recreate account or sync metadata.

Achievements must remain motivational only. They do not unlock premium features or grant monetary/credit value.
