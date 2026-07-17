import type { ApiWorkout } from "../api/accountDataApi";
import {
  findCatalogExerciseBestEffort
} from "./exercises";
import {
  getFallbackWorkoutCreatedAt,
  normalizeDateString,
  normalizeSavedWorkoutTextFields,
  repairTextEncoding
} from "./savedWorkoutNormalization";
import type { SavedWorkout } from "./savedWorkouts";

export function mapSavedWorkoutToApiRequest(workout: SavedWorkout) {
  const normalizedWorkout = normalizeSavedWorkoutTextFields(workout);

  return {
    clientUpdatedAt: new Date().toISOString(),
    clientWorkoutId: normalizedWorkout.id,
    createdAt: normalizedWorkout.createdAt ?? getFallbackWorkoutCreatedAt(normalizedWorkout),
    name: normalizedWorkout.name || normalizedWorkout.draft.name || "Workout",
    notes: normalizedWorkout.draft.notes ?? "",
    sport: normalizedWorkout.draft.sport,
    steps: normalizedWorkout.draft.steps.map((step) => ({
      clientStepId: step.id,
      exerciseId: step.exerciseId ?? "",
      exerciseName: step.exerciseName,
      goalType: step.goalType || null,
      kind: step.kind,
      label: step.label,
      loadKg: step.loadKg,
      notes: step.notes,
      parentSetClientId: step.parentSetId ?? "",
      parentStageClientId: step.parentStageId ?? "",
      setCount: step.setCount,
      stageType: step.stageType || null,
      targetComparator: step.targetComparator || null,
      targetValue: step.targetValue
    }))
  };
}

export function mapApiWorkoutToSavedWorkout(apiWorkout: ApiWorkout): SavedWorkout {
  const name = repairTextEncoding(apiWorkout.name || "Workout");

  return normalizeSavedWorkoutTextFields({
    draft: {
      name,
      notes: repairTextEncoding(apiWorkout.notes ?? ""),
      sport: "strength",
      steps: apiWorkout.steps.map((step) => ({
        exerciseId: step.exerciseId ?? findCatalogExerciseBestEffort(step.exerciseName ?? "")?.id ?? "",
        exerciseName: repairTextEncoding(step.exerciseName ?? ""),
        goalType: step.goalType ?? "",
        id: step.clientStepId,
        intensity: "moderate",
        kind: step.kind,
        label: repairTextEncoding(step.label ?? ""),
        loadKg: repairTextEncoding(step.loadKg ?? ""),
        notes: repairTextEncoding(step.notes ?? ""),
        parentSetId: step.parentSetClientId || undefined,
        parentStageId: step.parentStageClientId || undefined,
        setCount: repairTextEncoding(step.setCount ?? ""),
        stageType: step.stageType ?? "",
        targetComparator: step.targetComparator ?? "",
        targetValue: repairTextEncoding(step.targetValue ?? "")
      }))
    },
    createdAt: normalizeDateString(apiWorkout.createdAt)
      ?? getFallbackWorkoutCreatedAt({ id: apiWorkout.clientWorkoutId }),
    id: apiWorkout.clientWorkoutId,
    name
  });
}

export function mergeWorkoutsById(primary: SavedWorkout[], fallback: SavedWorkout[]) {
  const seen = new Set<string>();
  const result: SavedWorkout[] = [];

  for (const workout of [...primary, ...fallback]) {
    if (seen.has(workout.id)) {
      continue;
    }
    seen.add(workout.id);
    result.push(normalizeSavedWorkoutTextFields(workout));
  }

  return result;
}
