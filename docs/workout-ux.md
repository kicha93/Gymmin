# Workout UX notes

This note tracks the current workout-view UX decisions.

## Exercise rows

- Read-only workout details use compact exercise rows.
- The right side of an exercise row shows set and target tiles, for example `[3] x [8]`.
- Time targets are shortened for display when possible, for example `00:00:45` becomes `45s`.
- Long exercise names can wrap to two lines while the set/target tiles keep stable dimensions.

## Per-exercise muscles

- Catalog exercises show a `body-outline` button on the right side of the row.
- The button opens a worked-muscles modal.
- The modal also offers a `Show details` action.
- The modal reuses the same front/back SVG anatomy map as the whole-workout overview.
- The modal builds muscle highlights from the selected exercise only.
- Exercises without catalog muscle data show a safe empty state.

## Exercise detail page

- Tapping an exercise row opens a dedicated exercise detail page.
- The page is backed by the catalog exercise id when available, with best-effort fallback by exercise name.
- Sections currently include header metadata, animation placeholder, worked muscles, technique description, tips, common mistakes and exercise history/progress.
- The animation area is a placeholder until licensed local GIF/video assets are mapped by `exerciseId`.
- The worked-muscles section reuses the same SVG anatomy map as the workout overview and muscle modal.
- Unknown or unmapped exercises show a safe empty state instead of crashing.
- TODO: map `exerciseId` to animation assets, add local video/GIF support, cache animation assets and define the licensed animation source.

## Starting a workout

- Starting a workout no longer opens an execution-mode picker.
- New sessions use `defaultWorkoutExecutionMode` from Settings.
- Existing active sessions keep their own stored `executionMode` when resumed.
- Users can still change the default mode in Settings before starting the next workout.
