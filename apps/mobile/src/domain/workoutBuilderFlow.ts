import { groupWorkoutBuilderSteps } from "./workoutEditor";
import type { WorkoutDraft, WorkoutStep } from "./workouts";

export type WorkoutEditorStep = "details" | "stages" | "summary";

export type WorkoutEditorFocus =
  | { type: "stage"; stageId: string }
  | { type: "set"; stageId: string; setId: string }
  | { type: "exercise"; stageId: string; setId: string; itemId: string };

export type WorkoutBuilderValidationCode =
  | "exercise-required"
  | "name-required"
  | "nonnegative-values-required"
  | "set-required"
  | "stage-required";

export type WorkoutBuilderValidationIssue = {
  code: WorkoutBuilderValidationCode;
  stepId?: string;
};

export function getWorkoutBuilderSummary(draft: WorkoutDraft) {
  const stages = groupWorkoutBuilderSteps(draft.steps).map(({ stage, series }, index) => ({
    exerciseCount: series.reduce((total, item) => total + item.elements.length, 0),
    id: stage.id,
    name: stage.label.trim() || `Stage ${index + 1}`,
    setCount: series.length
  }));

  return {
    exerciseCount: stages.reduce((total, stage) => total + stage.exerciseCount, 0),
    setCount: stages.reduce((total, stage) => total + stage.setCount, 0),
    stageCount: stages.length,
    stages
  };
}

export function getWorkoutBuilderValidationIssues(draft: WorkoutDraft): WorkoutBuilderValidationIssue[] {
  const issues: WorkoutBuilderValidationIssue[] = [];
  const groups = groupWorkoutBuilderSteps(draft.steps);

  if (!draft.name.trim()) {
    issues.push({ code: "name-required" });
  }

  if (groups.length === 0) {
    issues.push({ code: "stage-required" });
  }

  groups.forEach(({ stage, series }) => {
    if (series.length === 0) {
      issues.push({ code: "set-required", stepId: stage.id });
    }

    series.forEach(({ elements, set }) => {
      if (elements.length === 0) {
        issues.push({ code: "exercise-required", stepId: set.id });
      }

      elements.forEach((element) => {
        if (requiresCatalogExercise(element) && !element.exerciseName.trim()) {
          issues.push({ code: "exercise-required", stepId: element.id });
        }
      });
    });
  });

  const hasNegativeValue = draft.steps.some((step) =>
    [step.loadKg, step.setCount, step.goalType === "time" ? "" : step.targetValue]
      .some(isNegativeNumericValue)
  );
  if (hasNegativeValue) {
    issues.push({ code: "nonnegative-values-required" });
  }

  return issues;
}

export function getUniqueWorkoutBuilderValidationCodes(draft: WorkoutDraft) {
  return Array.from(new Set(getWorkoutBuilderValidationIssues(draft).map((issue) => issue.code)));
}

export function requiresCatalogExercise(step: WorkoutStep) {
  return step.kind === "exercise" && Boolean(step.stageType) && step.stageType !== "rest" && step.stageType !== "warmup";
}

function isNegativeNumericValue(value: string) {
  const normalized = value.trim().replace(",", ".");
  if (!normalized) {
    return false;
  }

  const numericValue = Number(normalized);
  return Number.isFinite(numericValue) && numericValue < 0;
}
