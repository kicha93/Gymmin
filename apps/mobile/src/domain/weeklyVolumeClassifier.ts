import { muscleKeys, type Exercise, type MuscleKey } from "./exercises";
import type { ExerciseCategory } from "./stageExerciseCategories";
import policy from "./weeklyVolumeRolePolicy.json";

export type WeeklyVolumeRole =
  | "direct"
  | "indirect"
  | "stabilizationOnly"
  | "notApplicable";

export type WeeklyVolumeClassifierCoverage = Record<WeeklyVolumeRole, number> & {
  needsReview: number;
  total: number;
};

const coreMuscles = new Set<MuscleKey>(["abs", "obliques"]);
const coreVolumeCategories = new Set<ExerciseCategory>(policy.coreVolumeCategories as ExerciseCategory[]);
const forearmVolumeCategories = new Set<ExerciseCategory>(policy.forearmVolumeCategories as ExerciseCategory[]);
const lowerBackDirectCategories = new Set<ExerciseCategory>(policy.lowerBackDirectCategories as ExerciseCategory[]);
const lowerBackIndirectCategories = new Set<ExerciseCategory>(policy.lowerBackIndirectCategories as ExerciseCategory[]);
const trapsStabilizationCategories = new Set<ExerciseCategory>(policy.trapsStabilizationCategories as ExerciseCategory[]);
const validRoles = new Set<WeeklyVolumeRole>(["direct", "indirect", "stabilizationOnly", "notApplicable"]);
const validMuscles = new Set<string>(muscleKeys);

const overrides = policy.overrides as Record<string, Partial<Record<MuscleKey, WeeklyVolumeRole>>>;

function roleFromInfluence(score: number): WeeklyVolumeRole {
  if (score <= 0) return "notApplicable";
  if (score <= 2) return "stabilizationOnly";
  if (score === 5) return "direct";
  return "indirect";
}

/**
 * Converts catalog involvement into a conservative weekly hypertrophy-volume
 * role. The catalog score remains descriptive; this classifier decides whether
 * a set is suitable for direct/fractional weekly-volume counting.
 */
export function getWeeklyVolumeRole(exercise: Exercise, muscle: MuscleKey): WeeklyVolumeRole {
  const override = overrides[exercise.id]?.[muscle];
  if (override) return override;

  const score = exercise.muscleImpact[muscle];
  if (score <= 0) return "notApplicable";

  if (coreMuscles.has(muscle)) {
    return coreVolumeCategories.has(exercise.category)
      ? roleFromInfluence(score)
      : "stabilizationOnly";
  }

  if (muscle === "forearm") {
    return forearmVolumeCategories.has(exercise.category)
      ? roleFromInfluence(score)
      : "stabilizationOnly";
  }

  if (muscle === "lowerBack") {
    if (lowerBackDirectCategories.has(exercise.category)) {
      return score === 5 ? "direct" : score >= 3 ? "indirect" : "stabilizationOnly";
    }
    if (lowerBackIndirectCategories.has(exercise.category)) {
      return score >= 3 ? "indirect" : "stabilizationOnly";
    }
    return "stabilizationOnly";
  }

  if (muscle === "traps" && trapsStabilizationCategories.has(exercise.category)) {
    return "stabilizationOnly";
  }

  return roleFromInfluence(score);
}

export function getWeeklyVolumeRoleWeight(role: WeeklyVolumeRole): number {
  if (role === "direct") return 1;
  if (role === "indirect") return 0.5;
  return 0;
}

export function getWeeklyVolumeRoleForMuscles(
  exercise: Exercise,
  muscles: readonly MuscleKey[]
): WeeklyVolumeRole {
  let selected: WeeklyVolumeRole = "notApplicable";
  for (const muscle of muscles) {
    const role = getWeeklyVolumeRole(exercise, muscle);
    if (getWeeklyVolumeRoleWeight(role) > getWeeklyVolumeRoleWeight(selected)) {
      selected = role;
    } else if (
      role === "stabilizationOnly"
      && selected === "notApplicable"
    ) {
      selected = role;
    }
  }
  return selected;
}

export function validateWeeklyVolumeClassifier(exercises: readonly Exercise[]) {
  const coverage: WeeklyVolumeClassifierCoverage = {
    direct: 0,
    indirect: 0,
    stabilizationOnly: 0,
    notApplicable: 0,
    needsReview: 0,
    total: 0
  };
  const invalid: string[] = [];

  for (const [exerciseId, muscleOverrides] of Object.entries(overrides)) {
    if (!exercises.some((exercise) => exercise.id === exerciseId)) {
      invalid.push(`Unknown exercise override: ${exerciseId}`);
    }
    for (const [muscle, role] of Object.entries(muscleOverrides)) {
      if (!validMuscles.has(muscle)) {
        invalid.push(`Invalid muscle ${muscle} in override for ${exerciseId}`);
      }
      if (!validRoles.has(role as WeeklyVolumeRole)) {
        invalid.push(`Invalid role ${String(role)} for ${exerciseId}/${muscle}`);
      }
    }
  }

  for (const exercise of exercises) {
    for (const muscle of Object.keys(exercise.muscleImpact) as MuscleKey[]) {
      const role = getWeeklyVolumeRole(exercise, muscle);
      coverage[role] += 1;
      coverage.total += 1;
    }
  }

  return { coverage, invalid };
}
