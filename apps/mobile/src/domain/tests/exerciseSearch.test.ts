import { describe, expect, it } from "vitest";

import { exercises } from "../exercises";
import {
  buildExerciseUsageById,
  exerciseSearchIndex,
  normalizeExerciseSearchText,
  searchExercises,
  type ExerciseSearchFilters
} from "../exerciseSearch";
import type { WorkoutSession } from "../workoutSessions";

const emptyFilters: ExerciseSearchFilters = {
  categories: new Set(),
  equipment: new Set(),
  muscles: new Set(),
  tiers: new Set()
};

function search(query: string, language: "pl" | "en" = "pl") {
  return searchExercises({
    query,
    language,
    filters: emptyFilters,
    favoriteExerciseIds: new Set(),
    usageById: new Map()
  });
}

describe("exercise picker V2 search index", () => {
  it("contains every canonical exercise exactly once", () => {
    expect(exerciseSearchIndex).toHaveLength(805);
    expect(new Set(exerciseSearchIndex.map((record) => record.exercise.id)).size).toBe(exercises.length);
  });

  it("normalizes Polish diacritics without changing display data", () => {
    expect(normalizeExerciseSearchText("  ŻOŁNIERSKIE  ")).toBe("zolnierskie");
    expect(search("zolnierskie")[0]?.exercise.polishName.toLocaleLowerCase("pl")).toContain("żołnierskie");
    expect(search("posladki").length).toBeGreaterThan(0);
  });

  it("finds English names and aliases while Polish UI is active", () => {
    expect(search("barbell bench press")[0]?.exercise.name).toBe("Barbell Bench Press");
    expect(search("bench press")[0]?.exercise.name).toBe("Barbell Bench Press");
  });

  it("ranks a strong text match over favorite and recent boosts", () => {
    const legPress = exercises.find((exercise) => exercise.name === "Leg Press");
    expect(legPress).toBeTruthy();
    const result = searchExercises({
      query: "bench press",
      language: "en",
      filters: emptyFilters,
      favoriteExerciseIds: new Set([legPress!.id]),
      usageById: new Map([[legPress!.id, { count: 99, lastUsedAt: Date.now() }]])
    });
    expect(result[0]?.exercise.name).toBe("Barbell Bench Press");
  });

  it("applies muscle and equipment filters across dimensions", () => {
    const result = searchExercises({
      query: "",
      language: "en",
      filters: { ...emptyFilters, muscles: new Set(["chest"]), equipment: new Set(["barbell"]) },
      favoriteExerciseIds: new Set(),
      usageById: new Map()
    });
    expect(result.length).toBeGreaterThan(0);
    expect(result.every((record) => record.muscles.includes("chest") && record.equipment.includes("barbell"))).toBe(true);
  });

  it("uses conservative fuzzy matching only as a fallback", () => {
    expect(search("wycisknaie").some((record) => record.exercise.polishName.toLocaleLowerCase("pl").includes("wyciskanie"))).toBe(true);
  });

  it("does not append unrelated fuzzy results when a valid query already has matches", () => {
    const names = search("wyciskanie").map((record) => record.exercise.polishName);
    expect(names).not.toContain("Spięcia brzucha");
    expect(names).not.toContain("Wypychanie nóg na suwnicy");
    expect(names).not.toContain("Prostowanie ramion na wyciągu podchwytem");
  });

  it("still resolves a complete historical alias to its canonical exercise", () => {
    expect(search("wyciskanie nóg na suwnicy")[0]?.exercise.polishName).toBe("Wypychanie nóg na suwnicy");
  });
});

describe("exercise picker V2 usage", () => {
  it("derives recency and frequency from completed local sessions without duplicate sets", () => {
    const bench = exercises.find((exercise) => exercise.name === "Barbell Bench Press")!;
    const session: WorkoutSession = {
      id: "session-1", sourceWorkoutId: "w", sourceWorkoutName: "Workout", executionMode: "guided", status: "completed",
      startedAt: "2026-08-20T10:00:00.000Z", finishedAt: "2026-08-20T11:00:00.000Z", planSnapshot: { name: "Workout", notes: "", sport: "strength", steps: [] },
      entries: [1, 2, 3].map((setIteration) => ({ id: `e-${setIteration}`, exerciseId: bench.id, stageIndex: 0, seriesIndex: 0, setIteration, elementIndex: 0, type: "exercise", isCompleted: true }))
    };
    expect(buildExerciseUsageById([session]).get(bench.id)).toEqual({ count: 1, lastUsedAt: Date.parse(session.finishedAt!) });
  });

  it("ignores active, abandoned, deleted, and incomplete entries", () => {
    const base = { id: "s", sourceWorkoutId: "w", sourceWorkoutName: "W", executionMode: "guided" as const, startedAt: "2026-08-20T10:00:00Z", planSnapshot: { name: "W", notes: "", sport: "strength" as const, steps: [] }, entries: [{ id: "e", exerciseId: exercises[0].id, stageIndex: 0, seriesIndex: 0, setIteration: 0, elementIndex: 0, type: "exercise", isCompleted: false }] };
    expect(buildExerciseUsageById([{ ...base, status: "active" }, { ...base, id: "a", status: "abandoned" }, { ...base, id: "d", status: "completed", deletedAt: "2026-08-21T00:00:00Z" }] as WorkoutSession[]).size).toBe(0);
  });
});
