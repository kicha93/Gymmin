# Gymmin achievements

Stage 13B completes the mobile-first achievements system with backend sync for
signed-in accounts.

## Scope

- Achievements are evaluated on the mobile app.
- Definitions are static and shipped with the app.
- Unlocked achievements are stored in account-scoped AsyncStorage.
- Signed-in users sync unlocked achievement state and app usage stats to the
  backend.
- Anonymous users and signed-in users have separate achievement storage.
- Leaderboards, public profiles, social sharing and anti-cheat are out of scope.

## Storage

Achievements use the existing per-user local storage pattern:

```text
gymmin.account.anonymous.achievements
gymmin.account.{userId}.achievements
gymmin.account.anonymous.appUsageStats
gymmin.account.{userId}.appUsageStats
gymmin.account.anonymous.achievementsSync
gymmin.account.{userId}.achievementsSync
```

Logout does not delete achievements. Switching accounts does not merge achievements from another user.

## Backend sync

The backend stores only user achievement state, not achievement definitions:

- `UserAchievements`: `UserId`, `AchievementId`, `UnlockedAt`,
  `ProgressAtUnlock`, `CreatedAt`, `UpdatedAt`.
- `UserAppUsageStats`: `UserId`, `TotalForegroundSeconds`, `UpdatedAt`.

Endpoints:

- `GET /api/achievements`
- `POST /api/sync/achievements`

Both require bearer auth. The sync endpoint accepts local unlocked achievements,
optional app usage stats and `lastPulledAt`, then returns the merged state and
`serverTime`.

Merge rules:

- unlocked achievements are unioned by `achievementId`,
- duplicate achievements keep the earliest `unlockedAt`,
- `progressAtUnlock` keeps the larger value,
- achievements are never deleted or revoked,
- app usage uses `max(totalForegroundSeconds)` rather than summing across
  devices, so it is safe and best-effort,
- invalid/empty achievement IDs and oversized requests are rejected.

File provider fallback stores the same data in `App_Data/user-achievements.json`
and `App_Data/user-app-usage-stats.json`. Database provider stores it in EF Core
tables created by the `AddUserAchievements` migration.

Anonymous achievements participate in the existing anonymous data flow. Choosing
`Merge` moves anonymous unlocked achievements and app usage stats into the
account storage and triggers account sync. `Not now` keeps them separate.
`Delete local data` removes anonymous achievement data with the other anonymous
account-scoped data.

## Metrics

Achievement metrics are calculated from local `WorkoutSession` data and app usage stats:

- completed workouts,
- total workout duration,
- total training volume,
- unique workout days,
- weekly streaks,
- max completed workouts in a single calendar week,
- unique completed exercises,
- foreground app usage time.

Only `completed` sessions count for training achievements. Sessions with `deletedAt` are ignored. `active` and `abandoned` sessions do not affect training achievement progress.

Volume uses the same local session volume logic as history/progress: actual weight multiplied by actual repetitions.

`maxCompletedWorkoutsInSingleWeek` groups completed sessions by the same
Monday-based local week convention used by weekly streaks. Deleted, active and
abandoned sessions are ignored.

## Unlock policy

Once an achievement is unlocked, it stays unlocked locally. Removing a workout history entry can reduce progress for locked achievements, but it does not revoke achievements already unlocked.

## Initial achievements

The app currently ships 30 achievements:

- First workout
- Warm-up complete
- Finding your rhythm
- Regular lifter
- Training machine
- Iron consistency
- First ton
- Ten tons
- Heavy work
- Steel reserve
- 10 hours of work
- 50 training hours
- Seven active days
- A month of activity
- Three-week streak
- Exercise explorer
- Movement library
- 10 hours with Gymmin
- Gym legend
- One thousand percent
- Iron blacksmith
- Heavy hauler
- One hundred hours
- One hundred active days
- Quarter of consistency
- A year without excuses
- Exercise atlas
- Movement master
- Training week
- Strong week

Each definition has Polish and English title/description fields plus an
`imageKey` mapped to a PNG asset in `apps/mobile/assets/achievements`.

## UI

The Profile screen shows an achievements summary card with:

- unlocked count / total count,
- progress bar,
- latest unlocked achievement,
- link to the full Achievements screen.

The Achievements screen has filters for all, unlocked and locked achievements. Each card shows the achievement image, title, description, progress, progress bar, status and unlock date when available.

When a new achievement is unlocked locally, the app shows a lightweight
achievement banner. Achievements received from backend sync are shown on the
list, but they do not replay old unlock banners.

## TODO

- Backend-side achievement definition versioning, if definitions need to become
  server-managed.
- Anti-cheat / server-side validation for public or competitive features.
- Public profile / leaderboards / sharing.
- E2E/UI tests for the achievements screens.
- Optional AI-specific achievements once AI-created workout metrics are persisted clearly.
