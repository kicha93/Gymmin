import {
  findCatalogExerciseBestEffort,
  findExerciseById,
  getPrimaryMuscles,
  getRequiredEquipment,
  getSecondaryMuscles,
  type Exercise,
  type ExerciseLanguage,
  type MuscleKey
} from "./exercises";
import { getExerciseImageAssetKeys, type ExerciseImageAssetKey } from "./exerciseImageAssets";
import { getExerciseTechniqueContent } from "./exerciseTechniqueContent";
import type { WorkoutExecutionMode } from "./workoutSessions";
import type { WorkoutStep } from "./workouts";

export type ExerciseMuscleGroups = {
  exercise?: Exercise;
  primary: MuscleKey[];
  secondary: MuscleKey[];
};

export type ExerciseDetails = ExerciseMuscleGroups & {
  animationUrl: string | null;
  category: string;
  displayName: string;
  equipment: string[];
  hasAnimation: boolean;
  imageAssetKeys: ExerciseImageAssetKey[];
  commonMistakes: string[];
  instructions: string[];
  techniqueTips: string[];
};

function safeTrim(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

function normalizeSetCount(value: unknown): string {
  const trimmed = safeTrim(value);
  return trimmed || "-";
}

function formatTimeTarget(value: string): string {
  const match = value.trim().match(/^(\d{1,2}):(\d{1,2}):(\d{1,2})$/);
  if (!match) {
    return value.trim();
  }

  const hours = Number.parseInt(match[1], 10);
  const minutes = Number.parseInt(match[2], 10);
  const seconds = Number.parseInt(match[3], 10);
  if (![hours, minutes, seconds].every(Number.isFinite)) {
    return value.trim();
  }

  const totalSeconds = hours * 3600 + minutes * 60 + seconds;
  if (totalSeconds <= 0) {
    return "-";
  }

  if (totalSeconds < 60) {
    return `${totalSeconds}s`;
  }

  const wholeMinutes = Math.floor(totalSeconds / 60);
  const remainingSeconds = totalSeconds % 60;
  return remainingSeconds ? `${wholeMinutes}m ${remainingSeconds}s` : `${wholeMinutes}m`;
}

export function getExerciseTargetDisplay(step: Pick<WorkoutStep, "goalType"> & { targetValue?: unknown }): string {
  const target = safeTrim(step.targetValue);
  if (!target) {
    return "-";
  }

  return step.goalType === "time" ? formatTimeTarget(target) || "-" : target;
}

export function isRestTargetStep(step: { stageType?: unknown }): boolean {
  return safeTrim(step.stageType) === "rest";
}

export function formatExerciseSetTarget(step: Pick<WorkoutStep, "goalType"> & { setCount?: unknown; stageType?: unknown; targetValue?: unknown }): string {
  const sets = normalizeSetCount(step.setCount);
  const target = getExerciseTargetDisplay(step);

  if (isRestTargetStep(step)) {
    return target;
  }

  return `${sets} x ${target}`;
}

export function getWorkoutStepCatalogExercise(step: { exerciseId?: unknown; exerciseName?: unknown }): Exercise | undefined {
  const exerciseId = safeTrim(step.exerciseId);
  if (exerciseId) {
    const byId = findExerciseById(exerciseId);
    if (byId) {
      return byId;
    }
  }

  const exerciseName = safeTrim(step.exerciseName);
  return exerciseName ? findCatalogExerciseBestEffort(exerciseName) : undefined;
}

export function getWorkoutStepMuscleGroups(step: { exerciseId?: unknown; exerciseName?: unknown }): ExerciseMuscleGroups {
  const exercise = getWorkoutStepCatalogExercise(step);

  if (!exercise) {
    return {
      primary: [],
      secondary: []
    };
  }

  return {
    exercise,
    primary: getPrimaryMuscles(exercise),
    secondary: getSecondaryMuscles(exercise)
  };
}

function formatCodeLabel(value: string) {
  return value
    .toLowerCase()
    .split("_")
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

export function getExerciseDetails(
  step: { exerciseId?: unknown; exerciseName?: unknown },
  language: ExerciseLanguage
): ExerciseDetails | null {
  const muscleGroups = getWorkoutStepMuscleGroups(step);
  const exercise = muscleGroups.exercise;

  if (!exercise) {
    return null;
  }

  const techniqueContent = getExerciseTechniqueContent(exercise.id);
  const imageAssetKeys = getExerciseImageAssetKeys(exercise.id);
  const localizeList = (items: readonly { en: string; pl: string }[] | undefined) =>
    (items ?? [])
      .map((item) => item[language]?.trim() || item.en?.trim() || item.pl?.trim() || "")
      .filter(Boolean);

  return {
    ...muscleGroups,
    animationUrl: null,
    category: formatCodeLabel(exercise.garminCategory),
    commonMistakes: localizeList(techniqueContent?.commonMistakes),
    displayName: language === "pl" ? exercise.polishName : exercise.name,
    equipment: getRequiredEquipment(exercise).map(formatCodeLabel),
    hasAnimation: imageAssetKeys.length > 0,
    imageAssetKeys,
    instructions: localizeList(techniqueContent?.instructions),
    techniqueTips: localizeList(techniqueContent?.techniqueTips)
  };
}

export function getExerciseProgressKeyForDetails(details: ExerciseDetails | null): string | null {
  return details?.exercise?.id ? `id:${details.exercise.id.toLowerCase()}` : null;
}

export function resolveWorkoutStartExecutionMode(
  savedMode: WorkoutExecutionMode | null | undefined,
  fallback: WorkoutExecutionMode = "guided"
): WorkoutExecutionMode {
  return savedMode ?? fallback;
}
