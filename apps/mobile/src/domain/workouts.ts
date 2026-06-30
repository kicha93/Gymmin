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
    setCount: "",
    stageType: "",
    targetComparator: "",
    targetValue: "",
    ...overrides
  };
}

export function createDefaultWorkout(): WorkoutDraft {
  return {
    name: "Nowy trening",
    notes: "",
    sport: "strength",
    steps: []
  };
}
