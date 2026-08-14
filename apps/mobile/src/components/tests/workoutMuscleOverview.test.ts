import { describe, expect, it } from "vitest";

import { muscleKeys, type InfluenceScore, type MuscleKey } from "../../domain/exercises";
import {
  getWorkoutMuscleLegendCategories,
  getWorkoutMusclesForSide,
  toggleWorkoutMuscleLegendScore
} from "../workoutMuscleOverview";

function createUsage(overrides: Partial<Record<MuscleKey, InfluenceScore>> = {}) {
  return Object.fromEntries(
    muscleKeys.map((muscle) => [muscle, overrides[muscle] ?? 0])
  ) as Record<MuscleKey, InfluenceScore>;
}

describe("workout muscle overview", () => {
  it("uses the existing anatomy maps to filter front and back muscles", () => {
    expect(getWorkoutMusclesForSide("front")).toContain("chest");
    expect(getWorkoutMusclesForSide("front")).not.toContain("glutes");
    expect(getWorkoutMusclesForSide("back")).toContain("glutes");
    expect(getWorkoutMusclesForSide("back")).not.toContain("chest");
  });

  it("calculates count badges and progress ratios for the selected side", () => {
    const categories = getWorkoutMuscleLegendCategories(
      createUsage({ chest: 5, quads: 5, shoulders: 3 }),
      "front"
    );
    const primary = categories.find((category) => category.score === 5);
    const significant = categories.find((category) => category.score === 3);

    expect(primary?.muscles).toEqual(["chest", "quads"]);
    expect(primary?.count).toBe(2);
    expect(primary?.ratio).toBeCloseTo(2 / getWorkoutMusclesForSide("front").length);
    expect(significant?.muscles).toEqual(["shoulders"]);
  });

  it("keeps an empty category at zero and includes inactive muscles", () => {
    const categories = getWorkoutMuscleLegendCategories(createUsage({ glutes: 5 }), "back");

    expect(categories.find((category) => category.score === 4)?.count).toBe(0);
    expect(categories.find((category) => category.score === 4)?.ratio).toBe(0);
    expect(categories.find((category) => category.score === 0)?.muscles).not.toContain("glutes");
    expect(categories.find((category) => category.score === 0)?.count).toBeGreaterThan(0);
  });

  it("opens one category at a time and collapses it when selected again", () => {
    expect(toggleWorkoutMuscleLegendScore(null, 5)).toBe(5);
    expect(toggleWorkoutMuscleLegendScore(5, 3)).toBe(3);
    expect(toggleWorkoutMuscleLegendScore(3, 3)).toBeNull();
  });
});
