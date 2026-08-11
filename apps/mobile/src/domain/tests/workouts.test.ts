import { describe, expect, it } from "vitest";

import { createDefaultWorkout, createStep, normalizeWorkoutDraftExerciseIds } from "../workouts";

describe("normalizeWorkoutDraftExerciseIds", () => {
  it("canonicalizes historical exercise ids when a saved workout is read", () => {
    const draft = createDefaultWorkout();
    draft.steps = [createStep({ exerciseId: "squat-back-squats-1249", exerciseName: "Back Squats" })];

    expect(normalizeWorkoutDraftExerciseIds(draft).steps[0]?.exerciseId).toBe("squat-barbell-back-squat-1251");
  });
});
