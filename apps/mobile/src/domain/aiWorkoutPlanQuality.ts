import { exerciseCatalogDataSource } from "./exerciseCatalogDataSource";
import { getRequiredEquipment } from "./exercises";
import type { SavedWorkout } from "./savedWorkouts";
import type { WorkoutCreatorDraft } from "./workoutCreator";
import { parseWorkoutDurationSeconds } from "./workouts";

export type AiWorkoutPlanQualityIssue =
  | { code: "duration"; workoutName: string }
  | { code: "duplicate"; exerciseName: string; workoutName: string }
  | { code: "equipment"; exerciseName: string; workoutName: string }
  | { code: "workoutCount"; actual: number; expected: number };

const equipmentGroups: Record<string, string[]> = {
  bands: ["band"],
  barbell: ["barbell", "ezBar", "plate", "squatRack"],
  bench: ["bench"],
  bodyweight: [],
  cables: ["cableMachine"],
  dumbbells: ["dumbbell"],
  kettlebells: ["kettlebell"],
  machines: ["machine", "smithMachine"],
  pullupBar: ["pullupBar"]
};

export function auditAiWorkoutPlan(workouts: SavedWorkout[], draft: WorkoutCreatorDraft) {
  const issues: AiWorkoutPlanQualityIssue[] = [];
  const expectedWorkoutCount = Number(draft.trainingDaysPerWeek);
  if (Number.isInteger(expectedWorkoutCount) && workouts.length !== expectedWorkoutCount) {
    issues.push({ code: "workoutCount", actual: workouts.length, expected: expectedWorkoutCount });
  }

  const sessionMinutes = Number(draft.sessionDuration);
  const fullGym = draft.gymAccess === "yes";
  const selectedEquipment = new Set(Array.isArray(draft.availableEquipment)
    ? draft.availableEquipment.flatMap((key) => equipmentGroups[key] ?? [])
    : []);
  const catalog = new Map(exerciseCatalogDataSource.getAvailableExercises().map((exercise) => [exercise.id, exercise]));

  for (const workout of workouts) {
    const stageTypes = new Map(workout.draft.steps.filter((step) => step.kind === "stage").map((step) => [step.id, step.stageType]));
    const sets = new Map(workout.draft.steps.filter((step) => step.kind === "set").map((step) => [step.id, Number(step.setCount) || 1]));
    const seen = new Set<string>();
    let estimatedSeconds = 0;
    for (const step of workout.draft.steps.filter((candidate) => candidate.kind === "exercise")) {
      const setCount = sets.get(step.parentSetId ?? "") ?? 1;
      const executionSeconds = step.goalType === "time"
        ? parseWorkoutDurationSeconds(step.targetValue) ?? 30
        : 40;
      estimatedSeconds += setCount * (executionSeconds + (Number(step.restSeconds) || 0));

      if (stageTypes.get(step.parentStageId ?? "") === "exercise" && step.exerciseId) {
        if (seen.has(step.exerciseId)) {
          issues.push({ code: "duplicate", exerciseName: step.exerciseName, workoutName: workout.name });
        }
        seen.add(step.exerciseId);
      }

      const exercise = step.exerciseId ? catalog.get(step.exerciseId) : undefined;
      if (!fullGym && exercise) {
        const required = getRequiredEquipment(exercise);
        if (required.some((equipment) => !selectedEquipment.has(equipment))) {
          issues.push({ code: "equipment", exerciseName: step.exerciseName, workoutName: workout.name });
        }
      }
    }
    if (Number.isFinite(sessionMinutes) && sessionMinutes > 0 && estimatedSeconds > sessionMinutes * 60 * 1.25) {
      issues.push({ code: "duration", workoutName: workout.name });
    }
  }
  return issues;
}

export function formatAiWorkoutPlanQualityIssue(issue: AiWorkoutPlanQualityIssue, language: "pl" | "en") {
  if (language === "pl") {
    if (issue.code === "workoutCount") return `Plan ma ${issue.actual} treningów zamiast wymaganych ${issue.expected}.`;
    if (issue.code === "duration") return `Trening „${issue.workoutName}” prawdopodobnie przekracza zadany czas sesji.`;
    if (issue.code === "equipment") return `Ćwiczenie „${issue.exerciseName}” w treningu „${issue.workoutName}” wymaga niezadeklarowanego sprzętu.`;
    return `Ćwiczenie „${issue.exerciseName}” powtarza się w części głównej treningu „${issue.workoutName}”.`;
  }
  if (issue.code === "workoutCount") return `The plan has ${issue.actual} workouts instead of the requested ${issue.expected}.`;
  if (issue.code === "duration") return `Workout “${issue.workoutName}” is likely to exceed the requested session duration.`;
  if (issue.code === "equipment") return `Exercise “${issue.exerciseName}” in “${issue.workoutName}” requires equipment that was not declared.`;
  return `Exercise “${issue.exerciseName}” is duplicated in the main part of “${issue.workoutName}”.`;
}
