import { describe, expect, it } from "vitest";

import { getWorkoutCatalogMatchSummary } from "../workoutAi";
import { createDefaultWorkout, createStep } from "../workouts";

describe("workout AI helpers", () => {
  it("counts matched and unmatched catalog exercises", () => {
    const draft = createDefaultWorkout();
    draft.steps = [
      createStep({ exerciseId: "exercise-1", exerciseName: "Exercise one", kind: "exercise" }),
      createStep({ exerciseId: "", exerciseName: "Exercise two", kind: "exercise" })
    ];

    expect(getWorkoutCatalogMatchSummary(draft)).toEqual({
      matched: 1,
      total: 2,
      unmatched: 1
    });
  });

  it("ignores rest entries and exercises without a display name", () => {
    const draft = createDefaultWorkout();
    draft.steps = [
      createStep({ exerciseId: "rest", exerciseName: "Rest", kind: "exercise", stageType: "rest" }),
      createStep({ exerciseId: "exercise-2", exerciseName: "   ", kind: "exercise" })
    ];

    expect(getWorkoutCatalogMatchSummary(draft)).toEqual({
      matched: 0,
      total: 0,
      unmatched: 0
    });
  });
});
