import type { WorkoutDraft } from "./workouts";

export type WorkoutCatalogMatchSummary = {
  matched: number;
  total: number;
  unmatched: number;
};

export function getWorkoutCatalogMatchSummary(draft: WorkoutDraft): WorkoutCatalogMatchSummary {
  const exerciseSteps = draft.steps.filter(
    (step) =>
      step.kind === "exercise" &&
      step.stageType !== "rest" &&
      Boolean(step.exerciseName.trim())
  );
  const matched = exerciseSteps.filter((step) => Boolean(step.exerciseId?.trim())).length;

  return {
    matched,
    total: exerciseSteps.length,
    unmatched: Math.max(0, exerciseSteps.length - matched)
  };
}
