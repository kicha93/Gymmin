import { exerciseCatalogDataSource } from "./exerciseCatalogDataSource";
import { getRequiredEquipment } from "./exercises";
import type { SavedWorkout } from "./savedWorkouts";
import type { WorkoutCreatorDraft } from "./workoutCreator";
import { parseWorkoutDurationSeconds } from "./workouts";

export type AiWorkoutPlanQualityIssue =
  | { code: "duration"; workoutName: string }
  | { code: "duplicate"; exerciseName: string; workoutName: string }
  | { code: "equipment"; exerciseName: string; workoutName: string }
  | { code: "weeklyDuplicate"; exerciseName: string; workoutNames: string[] }
  | { code: "categoryConcentration"; exerciseNames: string[]; workoutNames: string[] }
  | { code: "workoutCount"; actual: number; expected: number };

const strengthAnchorCategories = new Set([
  "BENCH_PRESS", "DEADLIFT", "OLYMPIC_LIFT", "PULL_UP", "ROW", "SHOULDER_PRESS", "SQUAT"
]);

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
  const weeklyExercises = new Map<string, {
    category: string;
    exerciseName: string;
    workoutNames: Set<string>;
  }>();
  const categoryExercises = new Map<string, Array<{ exerciseName: string; workoutName: string }>>();
  let weeklyMainExerciseCount = 0;

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
        const catalogExercise = catalog.get(step.exerciseId);
        if (catalogExercise) {
          weeklyMainExerciseCount += 1;
          const occurrence = weeklyExercises.get(step.exerciseId) ?? {
            category: catalogExercise.category,
            exerciseName: step.exerciseName,
            workoutNames: new Set<string>()
          };
          occurrence.workoutNames.add(workout.name);
          weeklyExercises.set(step.exerciseId, occurrence);
          categoryExercises.set(catalogExercise.category, [
            ...(categoryExercises.get(catalogExercise.category) ?? []),
            { exerciseName: step.exerciseName, workoutName: workout.name }
          ]);
        }
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

  const strengthGoal = draft.primaryGoal === "strength";
  for (const occurrence of weeklyExercises.values()) {
    const allowedWorkoutCount = strengthGoal && strengthAnchorCategories.has(occurrence.category) ? 2 : 1;
    if (occurrence.workoutNames.size > allowedWorkoutCount) {
      issues.push({
        code: "weeklyDuplicate",
        exerciseName: occurrence.exerciseName,
        workoutNames: [...occurrence.workoutNames]
      });
    }
  }

  if (workouts.length > 1 && weeklyMainExerciseCount >= 8) {
    for (const occurrences of categoryExercises.values()) {
      const workoutNames = [...new Set(occurrences.map((item) => item.workoutName))];
      const exerciseNames = [...new Set(occurrences.map((item) => item.exerciseName))];
      if (occurrences.length >= 4 && occurrences.length / weeklyMainExerciseCount >= 0.35 && exerciseNames.length > 1) {
        issues.push({ code: "categoryConcentration", exerciseNames, workoutNames });
      }
    }
  }
  return issues;
}

export function isBlockingAiWorkoutPlanQualityIssue(issue: AiWorkoutPlanQualityIssue) {
  return issue.code !== "weeklyDuplicate" && issue.code !== "categoryConcentration";
}

export function formatAiWorkoutPlanQualityIssue(issue: AiWorkoutPlanQualityIssue, language: "pl" | "en") {
  if (language === "pl") {
    if (issue.code === "workoutCount") return `Plan ma ${issue.actual} treningów zamiast wymaganych ${issue.expected}.`;
    if (issue.code === "duration") return `Trening „${issue.workoutName}” prawdopodobnie przekracza zadany czas sesji.`;
    if (issue.code === "equipment") return `Ćwiczenie „${issue.exerciseName}” w treningu „${issue.workoutName}” wymaga niezadeklarowanego sprzętu.`;
    if (issue.code === "weeklyDuplicate") return `Ćwiczenie „${issue.exerciseName}” powtarza się w kilku treningach tygodnia (${issue.workoutNames.join(", ")}). Możesz zapisać plan, ale warto rozważyć inny wariant w jednym z dni.`;
    if (issue.code === "categoryConcentration") return `Plan mocno koncentruje się na jednej grupie podobnych ruchów (${issue.exerciseNames.slice(0, 4).join(", ")}) w treningach: ${issue.workoutNames.join(", ")}.`;
    return `Ćwiczenie „${issue.exerciseName}” powtarza się w części głównej treningu „${issue.workoutName}”.`;
  }
  if (issue.code === "workoutCount") return `The plan has ${issue.actual} workouts instead of the requested ${issue.expected}.`;
  if (issue.code === "duration") return `Workout “${issue.workoutName}” is likely to exceed the requested session duration.`;
  if (issue.code === "equipment") return `Exercise “${issue.exerciseName}” in “${issue.workoutName}” requires equipment that was not declared.`;
  if (issue.code === "weeklyDuplicate") return `Exercise “${issue.exerciseName}” appears in multiple weekly workouts (${issue.workoutNames.join(", ")}). You can save the plan, but consider a different variation on one day.`;
  if (issue.code === "categoryConcentration") return `The plan is heavily concentrated on one group of similar movements (${issue.exerciseNames.slice(0, 4).join(", ")}) across: ${issue.workoutNames.join(", ")}.`;
  return `Exercise “${issue.exerciseName}” is duplicated in the main part of “${issue.workoutName}”.`;
}
