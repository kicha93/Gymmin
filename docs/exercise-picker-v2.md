# Exercise Picker V2

Exercise Picker V2 is the only picker used by the workout builder. The former picker was removed after V2 stabilization; there is no user switch, dormant route or automatic fallback to V1.

## Data and privacy

The picker is fully local-only. It searches the 729 canonical catalog exercises, reads existing local favorites, and derives recent/frequent use from completed `WorkoutSession` records. It does not add storage, telemetry, network calls, or custom exercises.

## Search pipeline

The catalog is normalized and tokenized once when the V2 feature module loads. Query-time work uses the prepared index and the following ranking order:

1. exact current-language name,
2. exact alternate-language name,
3. exact alias,
4. name prefix,
5. token prefixes,
6. name/alias substring,
7. supporting muscle/equipment/category terms,
8. conservative edit-distance fallback when ordinary matching returns fewer than five results.

Polish diacritics, case, whitespace, PL/EN names, canonical IDs, and existing aliases are searchable. Favorite and local usage boosts are intentionally small and cannot overtake a strong text match.

The input updates immediately. Result calculation uses a 140 ms debounce plus React deferred rendering. The synchronous pipeline has no stale-result race. Results render through a virtualized `FlatList`.

## Filters and recent exercises

Muscle filtering uses the existing high-level muscle taxonomy and includes meaningful catalog involvement (level 2 or higher). Equipment and movement filters use existing catalog metadata. Multiple choices within one dimension are OR-ed; dimensions are combined with AND.

Recent use counts one canonical exercise at most once per completed session, regardless of its number of sets. Active, abandoned, deleted sessions and incomplete entries are ignored. Aliases are resolved before usage is aggregated.

## Validation and performance

`npm --prefix apps/mobile run validate:exercise-search` verifies index coverage, canonical uniqueness, normalization, aliases, ranking, filters, fuzzy fallback, and session-derived usage. The controlled benchmark covers repeated one-character, multi-character, typo, PL, and EN queries. Actual low-end-device interaction remains a manual release smoke test.
