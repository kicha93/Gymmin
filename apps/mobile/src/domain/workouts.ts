export type IntensityTarget = "light" | "moderate" | "heavy" | "max";
export type WorkoutStepKind = "stage" | "set" | "exercise";
export type StageType = "warmup" | "exercise" | "recovery" | "rest" | "cooldown" | "other";
export type GoalType = "repetitions" | "time" | "buttonPress" | "calories" | "heartRate";
export type TargetComparator = "below" | "above";

export type WorkoutStep = {
  exerciseId?: string;
  exerciseName: string;
  goalType: GoalType | "";
  id: string;
  kind: WorkoutStepKind;
  label: string;
  loadKg: string;
  intensity: IntensityTarget;
  notes: string;
  parentStageId?: string;
  parentSetId?: string;
  restSeconds?: string;
  setCount: string;
  stageType: StageType | "";
  targetComparator: TargetComparator | "";
  targetValue: string;
};

export type WorkoutDraft = {
  name: string;
  notes: string;
  sport: "strength";
  steps: WorkoutStep[];
};

export function createStep(overrides: Partial<WorkoutStep> = {}): WorkoutStep {
  const kind = overrides.kind ?? "stage";

  return {
    exerciseId: "",
    exerciseName: "",
    goalType: "",
    id: String(Date.now() + Math.random()),
    kind,
    label: "",
    loadKg: "",
    intensity: "moderate",
    notes: "",
    restSeconds: "",
    setCount: "",
    stageType: "",
    targetComparator: "",
    targetValue: "",
    ...overrides
  };
}

export function createDefaultWorkout(name = "Nowy trening"): WorkoutDraft {
  return {
    name,
    notes: "",
    sport: "strength",
    steps: []
  };
}

export function parseWorkoutDurationSeconds(value: unknown): number | null {
  if (typeof value !== "string" && typeof value !== "number") {
    return null;
  }

  const normalized = String(value).trim();
  if (!normalized) {
    return null;
  }

  const parts = normalized.split(":");
  if (parts.length === 1) {
    const seconds = Number(parts[0].replace(",", "."));
    return Number.isFinite(seconds) && seconds >= 0 ? Math.round(seconds) : null;
  }

  if (parts.length !== 2 && parts.length !== 3) {
    return null;
  }

  const numericParts = parts.map(Number);
  if (numericParts.some((part) => !Number.isFinite(part) || part < 0)) {
    return null;
  }

  const [hours, minutes, seconds] = parts.length === 3
    ? numericParts
    : [0, numericParts[0], numericParts[1]];
  return Math.round(hours * 3600 + minutes * 60 + seconds);
}

export function formatWorkoutDuration(totalSeconds: number): string {
  const seconds = Math.max(0, Math.round(totalSeconds));
  return [Math.floor(seconds / 3600), Math.floor((seconds % 3600) / 60), seconds % 60]
    .map((part) => String(part).padStart(2, "0"))
    .join(":");
}

/**
 * Moves legacy standalone rest elements onto the preceding exercise in the
 * same series. Invalid/orphaned legacy elements are retained to avoid data loss.
 */
export function normalizeWorkoutRestBetweenSets(draft: WorkoutDraft): WorkoutDraft {
  const steps: WorkoutStep[] = [];

  draft.steps.forEach((rawStep) => {
    const step: WorkoutStep = {
      ...rawStep,
      restSeconds: typeof rawStep.restSeconds === "string" ? rawStep.restSeconds : ""
    };

    if (step.kind !== "exercise" || step.stageType !== "rest" || !step.parentSetId) {
      steps.push(step);
      return;
    }

    const restSeconds = parseWorkoutDurationSeconds(step.targetValue);
    if (!restSeconds) {
      steps.push(step);
      return;
    }

    let previousExerciseIndex = -1;
    for (let index = steps.length - 1; index >= 0; index -= 1) {
      const candidate = steps[index];
      if (
        candidate.kind === "exercise"
        && candidate.parentSetId === step.parentSetId
        && candidate.stageType !== "rest"
      ) {
        previousExerciseIndex = index;
        break;
      }
    }
    if (previousExerciseIndex < 0) {
      steps.push(step);
      return;
    }

    const previousExercise = steps[previousExerciseIndex];
    if (previousExercise.restSeconds?.trim()) {
      const existingRestSeconds = parseWorkoutDurationSeconds(previousExercise.restSeconds);
      if (existingRestSeconds !== restSeconds) {
        steps.push(step);
      }
      return;
    }

    steps[previousExerciseIndex] = {
      ...previousExercise,
      restSeconds: String(restSeconds)
    };
  });

  return { ...draft, steps };
}

export function normalizeWorkoutDraftExerciseIds(draft: WorkoutDraft): WorkoutDraft {
  return {
    ...draft,
    steps: draft.steps.map((step) => ({
      ...step,
      exerciseId: step.exerciseId?.trim() ? resolveExerciseId(step.exerciseId.trim()) : step.exerciseId
    }))
  };
}
import { resolveExerciseId } from "./exercises";
