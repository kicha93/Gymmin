import { describe, expect, it } from "vitest";

import { muscleKeys, type InfluenceScore, type MuscleKey } from "../../domain/exercises";
import {
  getWorkoutAdvancedMuscleOverview,
  getWorkoutMuscleLegendCategories,
  getWorkoutMusclesForSide,
  toggleWorkoutMuscleLegendScore
} from "../workoutMuscleOverview";
import type { WorkoutDraft } from "../../domain/workouts";

function createUsage(overrides: Partial<Record<MuscleKey, InfluenceScore>> = {}) {
  return Object.fromEntries(
    muscleKeys.map((muscle) => [muscle, overrides[muscle] ?? 0])
  ) as Record<MuscleKey, InfluenceScore>;
}

function workoutWithExercise(exerciseId: string, exerciseName: string): WorkoutDraft {
  return {
    name: "Test",
    notes: "",
    sport: "strength",
    steps: [{
      exerciseId,
      exerciseName,
      goalType: "repetitions",
      id: "exercise",
      intensity: "moderate",
      kind: "exercise",
      label: exerciseName,
      loadKg: "",
      notes: "",
      setCount: "3",
      stageType: "exercise",
      targetValue: "10"
    }]
  };
}

describe("workout muscle overview", () => {
  it("uses the existing anatomy maps to filter front and back muscles", () => {
    const front = getWorkoutMusclesForSide("front");
    const back = getWorkoutMusclesForSide("back");

    expect(front).toHaveLength(9);
    expect(front).toContain("chest");
    expect(front).toContain("hips");
    expect(front).not.toContain("adductors");
    expect(front).not.toContain("glutes");
    expect(back).toHaveLength(9);
    expect(back).toContain("glutes");
    expect(back).not.toContain("chest");
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
    expect(categories.reduce((sum, category) => sum + category.count, 0)).toBe(
      getWorkoutMusclesForSide("front").length
    );
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

  it("uses detailed subdivisions and anatomy regions in advanced mode", () => {
    const overview = getWorkoutAdvancedMuscleOverview(
      workoutWithExercise("bench-press-barbell-bench-press-76", "Barbell Bench Press"),
      "front"
    );
    const detailedIds = overview.categories.flatMap((category) => category.items.map((item) => item.subdivisionId));

    expect(detailedIds).toContain("chest.clavicular");
    expect(detailedIds).toContain("chest.sternocostal");
    expect(overview.regionLevels.left_pectoralis_major_sternocostal).toBeGreaterThan(0);
    expect(overview.categories.flatMap((category) => category.items)).toContainEqual(
      expect.objectContaining({
        anatomyRegionIds: expect.arrayContaining(["left_pectoralis_major_sternocostal"]),
        isAnatomyVisible: true,
        subdivisionId: "chest.sternocostal"
      })
    );
    expect(overview.categories.reduce((sum, category) => sum + category.count, 0)).toBeGreaterThan(9);
  });

  it("keeps a high-level fallback for groups without subdivisions", () => {
    const overview = getWorkoutAdvancedMuscleOverview(
      workoutWithExercise("pull-up-pull-up-918", "Pull-up"),
      "back"
    );
    const items = overview.categories.flatMap((category) => category.items);

    expect(items).toContainEqual(expect.objectContaining({ muscle: "lats" }));
  });
});
