import { backBodyRegionMap, frontBodyRegionMap } from "../domain/bodyMaps";
import {
  advancedMuscleSubdivisions,
  getAdvancedExerciseProfile,
  getAdvancedMuscleSubdivision,
  type AdvancedMuscleSubdivisionId
} from "../domain/advancedMuscles";
import {
  findExerciseById,
  findExerciseByName,
  muscleKeys,
  type InfluenceScore,
  type MuscleKey
} from "../domain/exercises";
import type { WorkoutDraft } from "../domain/workouts";

export type WorkoutMuscleSide = "front" | "back";

export type WorkoutMuscleLegendCategory = {
  count: number;
  muscles: MuscleKey[];
  ratio: number;
  score: InfluenceScore;
};

export type WorkoutAdvancedMuscleLegendItem = {
  anatomyRegionIds: readonly string[];
  id: string;
  isAnatomyVisible: boolean;
  muscle?: MuscleKey;
  score: InfluenceScore;
  subdivisionId?: AdvancedMuscleSubdivisionId;
};

export type WorkoutAdvancedMuscleLegendCategory = {
  count: number;
  items: WorkoutAdvancedMuscleLegendItem[];
  ratio: number;
  score: InfluenceScore;
};

export type WorkoutAdvancedMuscleOverview = {
  categories: WorkoutAdvancedMuscleLegendCategory[];
  regionLevels: Record<string, InfluenceScore>;
};

export const workoutMuscleLegendScores = [5, 4, 3, 2, 1, 0] as const;

export function getWorkoutMusclesForSide(side: WorkoutMuscleSide): MuscleKey[] {
  const regionMap = side === "front" ? frontBodyRegionMap : backBodyRegionMap;
  const muscles: MuscleKey[] = [];

  Object.keys(regionMap).forEach((regionId) => {
    const muscle = regionMap[regionId];
    if (!muscles.includes(muscle)) {
      muscles.push(muscle);
    }
  });

  return muscles;
}

export function getWorkoutMuscleLegendCategories(
  usage: Record<MuscleKey, InfluenceScore>,
  side: WorkoutMuscleSide
): WorkoutMuscleLegendCategory[] {
  const sideMuscles = getWorkoutMusclesForSide(side);
  const total = sideMuscles.length;

  return workoutMuscleLegendScores.map((score) => {
    const muscles = sideMuscles.filter((muscle) => Number(usage[muscle] ?? 0) === score);

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

export function getWorkoutAdvancedMuscleOverview(
  workout: WorkoutDraft,
  side: WorkoutMuscleSide
): WorkoutAdvancedMuscleOverview {
  const subdivisionLevels = new Map<AdvancedMuscleSubdivisionId, InfluenceScore>();
  const fallbackLevels = new Map<MuscleKey, InfluenceScore>();
  const standardUsage = new Map<MuscleKey, InfluenceScore>(muscleKeys.map((muscle) => [muscle, 0]));

  workout.steps.forEach((step) => {
    if (step.kind !== "exercise") return;
    const exercise = step.exerciseId
      ? findExerciseById(step.exerciseId) ?? (step.exerciseName ? findExerciseByName(step.exerciseName) : undefined)
      : step.exerciseName
        ? findExerciseByName(step.exerciseName)
        : undefined;
    if (!exercise) return;

    const parents = new Map(
      (getAdvancedExerciseProfile(exercise.id)?.parents ?? []).map((parent) => [parent.standardParentMuscle, parent])
    );

    muscleKeys.forEach((muscle) => {
      const level = Number(exercise.muscleImpact[muscle] ?? 0) as InfluenceScore;
      standardUsage.set(muscle, Math.max(standardUsage.get(muscle) ?? 0, level) as InfluenceScore);
      if (level <= 0) return;

      const parent = parents.get(muscle);
      if (parent?.status === "mapped") {
        parent.engagement.forEach(([subdivisionId, subdivisionLevel]) => {
          subdivisionLevels.set(
            subdivisionId,
            Math.max(subdivisionLevels.get(subdivisionId) ?? 0, subdivisionLevel) as InfluenceScore
          );
        });
      } else {
        fallbackLevels.set(muscle, Math.max(fallbackLevels.get(muscle) ?? 0, level) as InfluenceScore);
      }
    });
  });

  const sideMuscles = getWorkoutMusclesForSide(side);
  const sideSubdivisions = advancedMuscleSubdivisions.filter(
    (subdivision) => subdivision.side === "both" || subdivision.side === side
  );
  const detailedParents = new Set(sideSubdivisions.map((subdivision) => subdivision.standardParentMuscle));
  const items: WorkoutAdvancedMuscleLegendItem[] = sideSubdivisions.map((subdivision) => ({
    anatomyRegionIds: subdivision.anatomyRegionIds,
    id: subdivision.id,
    isAnatomyVisible: subdivision.isAnatomyVisible,
    score: subdivisionLevels.get(subdivision.id) ?? 0,
    subdivisionId: subdivision.id
  }));

  sideMuscles.forEach((muscle) => {
    const fallbackLevel = fallbackLevels.get(muscle) ?? 0;
    if (!detailedParents.has(muscle) || fallbackLevel > 0) {
      items.push({
        anatomyRegionIds: [],
        id: `muscle:${muscle}`,
        isAnatomyVisible: false,
        muscle,
        score: fallbackLevel || standardUsage.get(muscle) || 0
      });
    }
  });

  const regionLevels: Record<string, InfluenceScore> = {};
  sideSubdivisions.forEach((subdivision) => {
    if (!subdivision.isAnatomyVisible) return;
    const level = subdivisionLevels.get(subdivision.id) ?? 0;
    subdivision.anatomyRegionIds.forEach((regionId) => {
      regionLevels[regionId] = Math.max(regionLevels[regionId] ?? 0, level) as InfluenceScore;
    });
  });

  return {
    categories: workoutMuscleLegendScores.map((score) => {
      const categoryItems = items.filter((item) => item.score === score);
      return {
        count: categoryItems.length,
        items: categoryItems,
        ratio: items.length ? categoryItems.length / items.length : 0,
        score
      };
    }),
    regionLevels
  };
}
