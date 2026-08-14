import { describe, expect, it } from "vitest";

import { exerciseCatalogDataSource } from "../exerciseCatalogDataSource";
import type { MuscleKey } from "../exercises";
import { weeklyMuscleVolumeGroups } from "../weeklyMuscleVolume";
import {
  getWeeklyVolumeRoleForMuscles,
  getWeeklyVolumeRole,
  validateWeeklyVolumeClassifier,
  type WeeklyVolumeRole
} from "../weeklyVolumeClassifier";

describe("weekly volume classifier validation", () => {
  it("classifies every catalog relation deterministically", () => {
    const exercises = exerciseCatalogDataSource.getAvailableExercises();
    const validation = validateWeeklyVolumeClassifier(exercises);
    const roles: WeeklyVolumeRole[] = ["direct", "indirect", "stabilizationOnly", "notApplicable"];
    const dashboardGroups = Object.fromEntries(weeklyMuscleVolumeGroups.map((group) => {
      const counts = Object.fromEntries(roles.map((role) => [role, 0])) as Record<WeeklyVolumeRole, number>;
      for (const exercise of exercises) {
        counts[getWeeklyVolumeRoleForMuscles(exercise, group.muscleKeys)] += 1;
      }
      return [group.id, counts];
    }));
    const priorityMuscles = Object.fromEntries(([
      "abs", "obliques", "forearm", "lowerBack"
    ] as const satisfies readonly MuscleKey[]).map((muscle) => {
      const counts = Object.fromEntries(roles.map((role) => [role, 0])) as Record<WeeklyVolumeRole, number>;
      for (const exercise of exercises) {
        counts[getWeeklyVolumeRole(exercise, muscle)] += 1;
      }
      return [muscle, counts];
    }));

    console.info("Weekly volume classifier:", JSON.stringify({
      exercises: exercises.length,
      relations: validation.coverage,
      dashboardGroups,
      priorityMuscles
    }));

    expect(validation.invalid).toEqual([]);
    expect(validation.coverage.needsReview).toBe(0);
    expect(validation.coverage.total).toBe(exercises.length * 17);
  });
});
