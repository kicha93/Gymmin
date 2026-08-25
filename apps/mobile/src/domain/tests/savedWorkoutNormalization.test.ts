import { describe, expect, it } from "vitest";

import {
  compareWorkouts,
  defaultWorkoutSort,
  normalizeSavedWorkoutTextFields,
  normalizeWorkoutSortSettings,
  repairTextEncoding
} from "../savedWorkoutNormalization";
import type { SavedWorkout } from "../savedWorkouts";
import { createStep } from "../workouts";

function workout(id: string, name: string, createdAt?: string): SavedWorkout {
  return {
    createdAt,
    draft: {
      name,
      notes: "",
      sport: "strength",
      steps: []
    },
    id,
    name
  };
}

describe("savedWorkoutNormalization", () => {
  it("repairs known mojibake without changing clean text", () => {
    expect(repairTextEncoding("ZaÅ¼Ã³Å‚Ä‡")).toBe("Zażółć");
    expect(repairTextEncoding("Clean text")).toBe("Clean text");
  });

  it("normalizes invalid sort settings", () => {
    expect(normalizeWorkoutSortSettings(null)).toEqual(defaultWorkoutSort);
    expect(normalizeWorkoutSortSettings({ direction: "asc", field: "name" })).toEqual({
      direction: "asc",
      field: "name"
    });
  });

  it("normalizes workout dates and sorts deterministically", () => {
    const first = normalizeSavedWorkoutTextFields(workout("workout-1000000000", "B", "broken"));
    const second = workout("workout-2000", "A", "2026-01-01T00:00:00.000Z");

    expect(first.createdAt).toBe("1970-01-12T13:46:40.000Z");
    expect(compareWorkouts(first, second, { direction: "asc", field: "name" })).toBeGreaterThan(0);
  });

  it("durably replaces a removed exercise variant with its canonical catalog reference", () => {
    const legacyWorkout = workout("workout-banded", "Pull");
    legacyWorkout.draft.steps = [createStep({
      exerciseId: "banded-exercises-deadlift-8",
      exerciseName: "Banded Deadlift",
      kind: "exercise"
    })];

    const normalized = normalizeSavedWorkoutTextFields(legacyWorkout);

    expect(normalized.draft.steps[0]).toMatchObject({
      exerciseId: "deadlift-barbell-deadlift-371",
      exerciseName: "Barbell Deadlift"
    });
  });
});
