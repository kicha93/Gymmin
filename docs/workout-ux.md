# Workout UX notes

> Current architecture: every workflow below is local-only. Gymmin has no account, backend, sync, credits, billing, or remote AI request. Historical account-shaped readers remain isolated for regression fixtures, but normal startup ignores those namespaces.

Profile/avatar, creator profiles, weekly plan and settings persist in the neutral `gymmin.local.v1.*` namespace (with avatar bytes in private files). They do not synchronize between devices; device transfer is performed explicitly with `.gymmin.json` backup/import.

The profile/avatar action is permanently visible in the top-right application header and opens the local profile directly. There is no login panel. The workout creator is permanently available from the product UI; it is not hidden after saving a workout and has no account or network availability gate.

## Local AI creator

- The creator uses four local steps: prepare a prompt, copy it to an external AI chosen by the user, paste JSON, then review and save.
- Unknown exercises block Save and offer canonical catalog replacements. There is no saved-workout AI rewrite or Apply flow.
- Prompts use the current validated exercise catalog, canonical IDs and `restSeconds` on exercises; no standalone rest elements are generated.
- Plain JSON, fenced JSON and a recoverable text wrapper are supported. Malformed, oversized and schema-invalid responses are rejected.
- Auth, credits, billing, consent-to-upload, job status and polling are absent from the product flow.
- Gymmin does not send creator-profile or workout data to an AI service.

## Local profile dashboard

- The global header avatar remains the entry point to Profile; it never opens authentication.
- The profile card combines a large private avatar, a compact image-picker overlay, responsive change/remove actions and the localized `Local profile` / `Profil lokalny` fallback. Gymmin does not collect or persist a display name.
- `Completed sessions` is derived from completed, non-deleted workout sessions. Active, abandoned and deleted sessions are excluded.
- `Active plans` is derived from saved, non-archived workout definitions. Neither counter is stored separately or added to the backup schema.
- The achievements card retains the existing progress calculation and adapts cleanly to zero, partial and complete states.
- The Actions section contains a compact Report Bug row with its description and chevron. Support/author content remains under Settings rather than being duplicated on Profile.

This note tracks the current workout-view UX decisions.

## Manual workout builder

- The workout library never renders an unexplained empty panel: it distinguishes a fresh library, no search matches, and a library containing only hidden archived workouts with localized empty-state guidance.
- Creating and editing a manual workout uses a three-step wizard: `Details -> Stages -> Save` (`Dane -> Etapy -> Zapis` in Polish).
- The Details step contains only the workout name and optional notes. A name is required before continuing.
- Automatically supplied editor values are localized: a new Polish draft starts as `Nowy trening`, while an English draft starts as `New workout`. User-entered workout and stage names are never translated automatically.
- The Stages step shows horizontal stage pills and only one active editing context at a time. The stage view contains a compact set list; selecting a set replaces it with the set editor, and selecting an exercise replaces that with the exercise form.
- Rows in `Sets in stage` identify their actual exercises and show each
  set/target pair, for example `Barbell squat` with `4×12`, instead of an
  ambiguous exercise count. Multiple elements are listed vertically. A simple
  button-confirmed warm-up shows only its name and omits the meaningless `1×-`.
- Stage, set and exercise ordering/removal remain available only for the active item. Destructive actions require confirmation.
- New exercises are edited as a temporary UI draft. Cancel discards that draft; Save exercise inserts or updates the original `WorkoutDraft` element.
- A compact exercise preview replaces the full nested forms previously shown below every stage and set.
- The Save step shows workout/stage/set/exercise counts, stage summaries and validation errors. Critical errors disable the final save action.
- Context actions replace the old global `+ Stage / + Set / Save workout` bar. The app bottom navigation remains unchanged and does not overlap editor controls.
- Rest between sets is edited directly on an exercise with hour/minute/second
  controls. The value is persisted locally as `restSeconds` and populated by
  the local AI JSON importer.
- Standalone rest elements are no longer offered for new series elements.
  Legacy rest elements are migrated to the preceding exercise when safe;
  orphaned values remain untouched rather than being discarded.
- Legacy compatibility readers still understand older standalone rest steps.
  If an older dataset lost the value, the app can recover it from a session
  snapshot or technical rest entry and persist the repaired local workout.
- A set containing exactly two valid, non-rest exercises is shown as a planned
  superset. This reuses the existing stage/set/exercise model: there is no
  second superset field in the workout definition.
- Detailed warm-up stages containing named exercises or meaningful targets remain normal guided sequences, with every movement visible and executable. Only a truly empty/simple warm-up placeholder receives the compact representation.

## Exercise rows

- Read-only workout details use compact exercise rows.
- Under the exercise description, the read-only workout details show the same
  parameter strip as guided mode: a rest pill and set/target tiles, for example
  `Rest [2m 30s]` and `[3] x [8]`. A missing rest value is shown safely as `-`.
- Legacy rest elements remain renderable as a compatibility fallback, but new
  workout definitions store rest on the exercise.
- Time targets are shortened for display when possible, for example `00:00:45` becomes `45s`.
- Long exercise names can wrap to two lines while the set/target tiles keep stable dimensions.
- Repeated textual set-count labels are intentionally hidden when the same value is already represented in the target tiles.

## Workout definition export

- Read-only workout details show `Edit | Export`, followed by one equal-width
  `Archive | Delete` row and a full-width `Start workout` action.
  An archived workout becomes read-only: only `Unarchive | Delete` remain
  actionable, while edit, export and start are hidden.
- Saved workouts are edited only in the regular workout editor. The former
  `Modify with AI` flow and its navigation route have been removed.
- Export opens a local format sheet for CSV or Excel XLSX and shows a disabled/loading state while the file is generated.
- CSV uses UTF-8 with BOM, `;` separators, RFC-style quote escaping and neutralizes formula-like user text before it reaches a spreadsheet application.
- CSV and XLSX contain the same compact columns: stage, type, exercise, sets,
  repetitions/target, weight, notes and rest. XLSX uses one localized
  `Workout/Trening` sheet with practical column widths and a header filter.
- The saved filename is the sanitized workout name plus `.csv` or `.xlsx`;
  there is no `Gymmin_` prefix or export date suffix.
- Exercise IDs are resolved through the catalog alias map, names follow the current PL/EN language, and missing catalog entries fall back safely to their stored name or ID.
- Android 10+ saves the selected format directly to the public `Downloads/Gymmin` collection through a small local Expo/Kotlin MediaStore module. It does not open a share sheet or a folder-tree picker, whose root `Download` directory cannot be granted on Android 11+.
- After a successful save Android posts a system notification with an `Open` action and a read-granted content URI. Android 13+ asks for notification permission before the file is written. If notifications are unavailable, the in-app success dialog still offers `Open`.
- The flow needs no backend, network or broad storage permission. Exact UTF-8 CSV and XLSX bytes are written without a text conversion path.
- Only the selected workout definition is exported. Workout sessions/history, achievements, credits and account data are excluded.

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

## Guided supersets

- A user can combine the current and next exercise from the guided workout screen. The confirmation makes clear that the change applies only to the active session; the workout definition is not edited.
- Starting a guided workout also creates the same session grouping
  automatically for every saved set containing exactly two valid exercises.
  Inline-table and readonly-post-workout modes do not create this grouping.
- The MVP accepts exactly two adjacent, non-rest exercise groups. An exercise cannot belong to two supersets at the same time.
- A combined step renders `Exercises X–Y/Total`, a `Superset A` badge, both exercise cards, the `Alternate exercises` separator and one round table.
- The two exercise titles are prefixed with `Exercise A` and `Exercise B`
  (`Ćwiczenie A/B`) so they map directly to the A/B result columns below.
- The round count is the larger set count of exercise A and B. If one exercise has fewer sets, its missing cells are rendered disabled rather than creating synthetic result entries.
- Weight and reps inputs update the original entries of exercise A or B. The existing previous-weight and previous-reps prefill actions remain visible separately for both sides.
- The round checkbox completes the entries which actually exist in that round. Splitting the superset removes only the grouping and preserves all entered values.
- Back/Next navigates between logical groups: a superset covering exercises 2–3 moves back to 1 and forward to 4. After splitting, standard 2 → 3 → 4 navigation returns.
- The superset uses one rest timer with the larger planned rest value from A/B. Each exercise still shows its own planned rest pill.
- Supersets persist in the local active `WorkoutSession`, survive app restart/resume and are safely ignored by inline-table and readonly-post-workout modes.
- Splitting a planned superset affects only that active session. The saved
  two-exercise set remains unchanged, so a later workout starts with the
  planned superset again.
- On narrow screens the round table scrolls horizontally, keeping inputs and checkboxes at usable touch sizes.

## Timer odpoczynku

W `Ustawienia -> Trening` użytkownik może włączyć albo wyłączyć widoczność timera odpoczynku podczas aktywnego treningu. Ustawienie jest domyślnie włączone i zapisuje się w neutralnym lokalnym storage. Wyłączenie ukrywa wyłącznie kontrolkę timera; planowany odpoczynek pozostaje widoczny w karcie ćwiczenia.

## Plan tygodnia

The expandable muscle-volume dashboard keeps `Completed | Plan` and `Front | Back` in one compact row on typical phones. The list uses the flexible left column and the existing anatomy SVG fills a width-aware right column; screens narrower than 340 dp safely stack the segmented controls. Each visible muscle row can be toggled: a disabled row and its anatomy regions are grayed, while enabling it restores the color derived from the current status. This selection is transient presentation state and never changes calculations, weekly-plan data, storage or backup.

Deleting a workout definition removes its assignments from the live weekly plan. Backup creation/import also normalizes the plan against included workouts, so an orphan assignment is skipped without rejecting the rest of an otherwise valid backup.

Na stronie głównej plan tygodnia można rozwinąć o lokalną analizę objętości mięśni. Widok przełącza `Wykonane` i prognozę `Plan` oraz jedną sylwetkę `Przód` albo `Tył`. Wykonane opiera się na rzeczywiście ukończonych wpisach serii w zakończonych sesjach bieżącego tygodnia. Plan dodaje wyłącznie pozostałe, jeszcze niezrealizowane wystąpienia z planu tygodnia, więc trening nie jest liczony podwójnie.

Metryką są orientacyjne fractional working sets: główny wpływ katalogowy liczy 1 serię, duży lub znaczący wpływ pomocniczy 0,5, a mniejsze role nie są sztucznie punktowane. Powtórzenia i ciężar nie są mnożnikiem tej metryki. Wszystkie grupy mają wspólny szeroki zakres referencyjny 10–20; nie jest to indywidualna recepta treningowa. Pełne założenia i źródła opisuje [weekly-muscle-volume.md](weekly-muscle-volume.md).

Plan tygodnia jest lokalny i przypisany do aktualnego ownera storage. Każdy zapisany trening można dodać do wielu dni tygodnia, a homepage pokazuje zakres bieżącego tygodnia, wykonane/do wykonania oraz najbliższy trening na dziś. Każdy zaplanowany dzień jest osobnym wykonaniem; ukończona sesja zalicza jedno z nich nawet wtedy, gdy została wykonana w innym dniu niż zaplanowany.

Panel `Treningi` na homepage pokazuje wszystkie unikalne treningi przypisane do
aktywnego planu tygodnia, bez limitu i bez przycisku `Zobacz wszystkie`.
Zarchiwizowane treningi są pomijane. Biblioteka treningów ukrywa je domyślnie,
ale filtr pozwala dołączyć je do listy i otworzyć w celu odarchiwizowania.
Archiwizacja nie usuwa historii ani przypisań tygodnia.
