import { backBodyRegionMap, frontBodyRegionMap } from "../domain/bodyMaps";
import type { InfluenceScore, MuscleKey } from "../domain/exercises";

export type WorkoutMuscleSide = "front" | "back";

export type WorkoutMuscleLegendCategory = {
  count: number;
  muscles: MuscleKey[];
  ratio: number;
  score: InfluenceScore;
};

export const workoutMuscleLegendScores = [5, 4, 3, 2, 1, 0] as const;

export function getWorkoutMusclesForSide(side: WorkoutMuscleSide): MuscleKey[] {
  const regionMap = side === "front" ? frontBodyRegionMap : backBodyRegionMap;
  return [...new Set(Object.values(regionMap))];
}

export function getWorkoutMuscleLegendCategories(
  usage: Record<MuscleKey, InfluenceScore>,
  side: WorkoutMuscleSide
): WorkoutMuscleLegendCategory[] {
  const sideMuscles = getWorkoutMusclesForSide(side);
  const total = sideMuscles.length;

  return workoutMuscleLegendScores.map((score) => {
    const muscles = sideMuscles.filter((muscle) => usage[muscle] === score);

    return {
      count: muscles.length,
      muscles,
      ratio: total ? muscles.length / total : 0,
      score
    };
  });
}

export function toggleWorkoutMuscleLegendScore(
  current: InfluenceScore | null,
  selected: InfluenceScore
): InfluenceScore | null {
  return current === selected ? null : selected;
}
