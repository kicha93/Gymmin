# Achievements

Achievements are a fully local product feature.

- definitions ship statically with the app;
- unlock state and app-usage counters are stored under `gymmin.local.v1.achievements` and `gymmin.local.v1.appUsageStats`;
- evaluation uses local workouts, completed sessions and local usage events;
- no account, backend validation, sync, public leaderboard, credits or billing is involved;
- backup/import preserves local achievement state;
- “Delete all data” removes unlock state and counters.

Legacy parsers/migration can read historical account-scoped achievement records and copy validated state into the neutral namespace. New runtime writes never recreate account or sync metadata.

Achievements must remain motivational only. They do not unlock premium features or grant monetary/credit value.
