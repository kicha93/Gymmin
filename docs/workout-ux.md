# Workout UX notes

This note tracks the current workout-view UX decisions.

## Exercise rows

- Read-only workout details use compact exercise rows.
- The right side of an exercise row shows set and target tiles, for example `[3] x [8]`.
- Rest elements use a single target tile, for example `[2m]`, instead of repeating a set multiplier.
- Time targets are shortened for display when possible, for example `00:00:45` becomes `45s`.
- Long exercise names can wrap to two lines while the set/target tiles keep stable dimensions.
- Repeated textual set-count labels are intentionally hidden when the same value is already represented in the target tiles.

## Per-Exercise Muscles

- Catalog exercises show a `body-outline` button on the right side of the row.
- The button opens the exercise detail page, matching the row tap action.
- The worked-muscles modal remains available as an internal/shared anatomy component, but exercise rows no longer open it directly.
- The modal reuses the same front/back SVG anatomy map as the whole-workout overview.
- The modal builds muscle highlights from the selected exercise only.
- Exercises without catalog muscle data show a safe empty state.

## Exercise Detail Page

- Tapping an exercise row opens a dedicated exercise detail page.
- Opening the exercise detail page resets the screen scroll to the top.
- The page is backed by the catalog exercise id when available, with best-effort fallback by exercise name.
- The page uses a compact panel layout: hero, media, worked muscles, technique steps, tips, common mistakes and exercise history/progress.
- The hero panel shows the exercise name, category/equipment tags and primary muscle summary with an icon.
- The animation/media panel is hidden when an exercise has no mapped local images yet.
- The worked-muscles panel reuses the same SVG anatomy map as the workout overview and muscle modal, shows one body side at a time with a Front/Back segmented toggle below the panel title, and defaults to Front.
- Technique instructions are rendered as numbered steps. Tips, common mistakes and exercise history are collapsible panels.
- Exercise history is collapsed by default when no data exists and shows a clear empty state.
- Unknown or unmapped exercises show a safe empty state instead of crashing.
- TODO: add broader local image/video coverage for catalog exercises and define the licensed animation source.

## Progress Dashboard

- The Progress screen uses a dashboard layout.
- A search input stays at the top of the screen.
- Three compact summary cards show tracked exercises, record/best-result count and current-month completed workout volume.
- Filter chips allow switching between all exercises, strength-oriented sorting and volume-oriented sorting.
- Exercise progress cards show the exercise name, workout count, latest result, best weight and best volume in compact metric columns.
- Missing metric values are rendered as `—` instead of long empty-state text inside each card.
- A lightweight SVG sparkline is shown when an exercise has enough local history data.

## Exercise Progress History

- The per-exercise Progress view groups completed entries by workout session instead of rendering every set as a separate history card; repeated placements of the selected exercise remain within that session card.
- The newest execution is expanded by default; older executions are collapsed and show best weight, most reps and total volume.
- An expanded execution shows compact rows with set badge, reps, weight, abbreviated volume and a total-volume footer.
- History can be filtered to all results, 3 months, 6 months or 1 year. Initially five groups are rendered, with an explicit action to reveal older results.
- Deleted, active and abandoned sessions remain excluded through the existing progress helpers. Missing values render as `—`.

## Starting A Workout

- Starting a workout no longer opens an execution-mode picker.
- New sessions use `defaultWorkoutExecutionMode` from Settings.
- Existing active sessions keep their own stored `executionMode` when resumed.
- Users can still change the default mode in Settings before starting the next workout.
- Guided active workout sessions use a compact header time display: the page title stays `Workout` / `Trening`, followed by a clock icon and elapsed time without a `Time:` / `Czas:` prefix.
- Guided active workout sessions show a compact exercise progress card with `Exercises X/Y`, a progress bar and a percentage.
- The current exercise card shows the exercise number, name, details/anatomy action, technical notes, rest duration as a clock pill and set/target tiles such as `[4] x [6]`.
- The rest timer remains a separate lightweight card and uses the same elapsed-time formatting helpers as the header.
- Execution entries use compact headers like `[2] Squat` or `[2] Rest` instead of repeating a separate `Set N` label.
- Workout tables use the device/system orientation without a manual toggle or `rotate(90deg)` transform. With system auto-rotate enabled, portrait and landscape layouts are detected from the current window dimensions and table widths adapt automatically.
## Timer odpoczynku

W `Ustawienia -> Trening` użytkownik może włączyć albo wyłączyć widoczność timera odpoczynku podczas aktywnego treningu. Ustawienie jest domyślnie włączone, zapisuje się per konto lokalnie oraz synchronizuje przez ustawienia konta. Wyłączenie ukrywa wyłącznie kontrolkę timera; planowany odpoczynek pozostaje widoczny w karcie ćwiczenia.

## Plan tygodnia

Plan tygodnia jest lokalny i przypisany do aktualnego ownera storage. Każdy zapisany trening można dodać do wielu dni tygodnia, a homepage pokazuje zakres bieżącego tygodnia, wykonane/do wykonania oraz najbliższy trening na dziś. Każdy zaplanowany dzień jest osobnym wykonaniem; ukończona sesja zalicza jedno z nich nawet wtedy, gdy została wykonana w innym dniu niż zaplanowany.
