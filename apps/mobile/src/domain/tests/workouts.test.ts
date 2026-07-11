import { describe, expect, it } from "vitest";

import { hasUserDefinedWorkouts } from "../workouts";

describe("hasUserDefinedWorkouts", () => {
  it("keeps the homepage creator visible when only seeded examples exist", () => {
    expect(hasUserDefinedWorkouts([{ id: "sample-full-body" }])).toBe(false);
    expect(hasUserDefinedWorkouts([{ id: "sample-warmup" }, { id: "sample-full-body" }])).toBe(false);
  });

  it("hides the homepage creator after the user has a saved workout", () => {
    expect(hasUserDefinedWorkouts([{ id: "sample-full-body" }, { id: "workout-123" }])).toBe(true);
  });

  it("does not treat an empty workout list as user-defined workouts", () => {
    expect(hasUserDefinedWorkouts([])).toBe(false);
  });
});
