# ARCHIVED — Correctness and performance audit - 2026-07-23

## Scope

The review covered the current mobile and backend diff, account settings
synchronization, creator profiles, the homepage weekly plan, manual workout
editing, workout presentation/session creation, CSV/XLSX export and the Android
production bundle.

## Findings fixed

### Settings auto-save could skip the first user change

Applying settings received from the backend reset the auto-save baseline. The
first later user edit could then become a new baseline instead of being sent.
The controller now observes every change key explicitly: remote state is not
echoed, while the first subsequent local edit is scheduled normally. A
regression test covers both decisions.

### Large settings payload was serialized on unrelated renders

The settings change key includes creator profiles and the weekly plan. It was
previously serialized on every root render, including workout timer renders.
The key is now memoized from its actual settings dependencies. Pending settings
also persist only the base settings in their regular local key; profiles and
the weekly plan keep their dedicated account-scoped stores instead of being
duplicated.

### Workout hierarchy processing repeatedly scanned the whole draft

Workout details, AI proposal presentation, read-only sessions, session entry
creation, export mapping and editor reorder/remove operations repeatedly
filtered the complete flat step list for nested stages, sets and exercises.
They now reuse `groupWorkoutBuilderSteps`, which builds indexed stage/set groups
in linear passes. Existing ordering and persisted `WorkoutDraft` data remain
unchanged.

### XLSX binary conversion built one growing string

Base64 conversion of XLSX bytes repeatedly appended to a single growing
JavaScript string. It now emits bounded chunks and joins them once, lowering
copying pressure for larger exports. A large-input regression test crosses the
chunk boundary.

### Weekly-plan load performed an immediate redundant write

Loading an account-scoped weekly plan triggered its persistence effect even
when the user had not changed anything. The initial persistence after each
owner load is now skipped; later local or synchronized updates are still
saved.

## Verification

- Mobile tests: 284 passed across 59 files.
- Backend tests: 110 passed.
- Mobile TypeScript check: passed.
- Expo Doctor: 19/19 checks passed.
- Android Hermes export: passed (2,525 modules, 6.8 MB bundle).
- Exercise catalog validation: 964 records, 0 errors, 0 warnings.
- NuGet vulnerable-package scan: no known vulnerable packages.
- npm audit: no critical or high advisories. Ten moderate advisories remain in
  the Expo/Xcode build-only chain (`xcode -> uuid`). npm proposes an
  incompatible Expo 57 to 46 downgrade, so no unsafe forced fix was applied.
- `git diff --check`: passed.

## Residual checks

- Physical-device smoke tests are still required for account switching,
  cross-device settings/profile/weekly-plan restoration and large XLSX files.
- Exercise image assets remain the dominant package-size cost. They were left
  unchanged because the project is intentionally replacing them with exercise
  videos.
- The moderate Expo build-tool advisory should be rechecked after Expo patches
  provide an upstream-compatible dependency update.
