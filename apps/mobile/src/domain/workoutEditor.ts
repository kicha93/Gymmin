import { createStep, type StageType, type WorkoutDraft, type WorkoutStep, type WorkoutStepKind } from "./workouts";

export type WorkoutStageGroup = {
  stage: WorkoutStep;
  series: Array<{
    elements: WorkoutStep[];
    set: WorkoutStep;
  }>;
};

export function groupWorkoutBuilderSteps(steps: readonly WorkoutStep[]): WorkoutStageGroup[] {
  const stages = steps.filter((step) => step.kind === "stage");
  const seriesByStageId = new Map<string, WorkoutStageGroup["series"]>();
  const seriesBySetId = new Map<string, WorkoutStageGroup["series"][number]>();

  for (const step of steps) {
    if (step.kind !== "set" || !step.parentStageId) {
      continue;
    }

    const series = { elements: [], set: step };
    const stageSeries = seriesByStageId.get(step.parentStageId) ?? [];
    stageSeries.push(series);
    seriesByStageId.set(step.parentStageId, stageSeries);
    seriesBySetId.set(step.id, series);
  }

  for (const step of steps) {
    if (step.kind === "exercise" && step.parentSetId) {
      seriesBySetId.get(step.parentSetId)?.elements.push(step);
    }
  }

  return stages.map((stage) => ({
    stage,
    series: seriesByStageId.get(stage.id) ?? []
  }));
}

export function getWorkoutStageExerciseNumber(
  series: WorkoutStageGroup["series"],
  setIndex: number,
  elementIndex: number
): number | undefined {
  const element = series[setIndex]?.elements[elementIndex];
  if (!element || element.stageType === "rest") {
    return undefined;
  }

  const precedingExercises = series
    .slice(0, setIndex)
    .reduce(
      (total, item) => total + item.elements.filter((itemElement) => itemElement.stageType !== "rest").length,
      0
    );
  const positionInSet = series[setIndex].elements
    .slice(0, elementIndex + 1)
    .filter((itemElement) => itemElement.stageType !== "rest")
    .length;

  return precedingExercises + positionInSet;
}

export function isSimpleWarmupStageGroup(group: WorkoutStageGroup): boolean {
  if (group.stage.stageType !== "warmup") {
    return false;
  }

  const hasStageDetails = Boolean(
    group.stage.notes.trim()
    || group.stage.targetValue.trim()
    || group.stage.loadKg.trim()
  );
  const hasDetailedElement = group.series.some(({ elements }) => elements.some((element) => Boolean(
    element.exerciseId?.trim()
    || element.exerciseName.trim()
    || element.label.trim()
    || element.targetValue.trim()
    || element.loadKg.trim()
    || element.notes.trim()
    || element.restSeconds?.trim()
    || (element.goalType && element.goalType !== "buttonPress")
  )));

  return !hasStageDetails && !hasDetailedElement;
}

/**
 * A set containing exactly two executable exercises is the persistent workout
 * definition of a superset. Its session grouping remains removable, so
 * splitting a running superset never mutates the saved workout.
 */
export function isWorkoutSeriesSuperset(elements: readonly WorkoutStep[]): boolean {
  return elements.length === 2 && elements.every((element) =>
    element.kind === "exercise"
    && element.stageType !== "rest"
    && Boolean(element.exerciseId?.trim() || element.exerciseName.trim())
  );
}

export function updateWorkoutStep(draft: WorkoutDraft, stepId: string, nextStep: WorkoutStep): WorkoutDraft {
  return { ...draft, steps: draft.steps.map((step) => step.id === stepId ? nextStep : step) };
}

export function removeWorkoutStep(draft: WorkoutDraft, stepId: string): WorkoutDraft {
  const parentStageIdBySetId = new Map<string, string>();
  for (const step of draft.steps) {
    if (step.kind === "set" && step.parentStageId) {
      parentStageIdBySetId.set(step.id, step.parentStageId);
    }
  }

  return {
    ...draft,
    steps: draft.steps.filter((step) => {
      if (step.id === stepId || step.parentStageId === stepId || step.parentSetId === stepId) return false;
      return !step.parentSetId || parentStageIdBySetId.get(step.parentSetId) !== stepId;
    })
  };
}

export function moveWorkoutStep(draft: WorkoutDraft, stepId: string, direction: -1 | 1): WorkoutDraft {
  const movedStep = draft.steps.find((step) => step.id === stepId);
  if (!movedStep) return draft;

  if (movedStep.kind === "exercise") {
    const elements = draft.steps.filter((step) => step.kind === "exercise" && step.parentSetId === movedStep.parentSetId);
    const currentIndex = elements.findIndex((step) => step.id === stepId);
    const nextIndex = currentIndex + direction;
    if (currentIndex < 0 || nextIndex < 0 || nextIndex >= elements.length) return draft;
    const reordered = [...elements];
    const [element] = reordered.splice(currentIndex, 1);
    reordered.splice(nextIndex, 0, element);
    return {
      ...draft,
      steps: draft.steps.map((step) => step.kind === "exercise" && step.parentSetId === movedStep.parentSetId
        ? reordered.shift() ?? step
        : step)
    };
  }

  if (movedStep.kind === "set") {
    const groups = groupWorkoutBuilderSteps(draft.steps)
      .find(({ stage }) => stage.id === movedStep.parentStageId)
      ?.series ?? [];
    const currentIndex = groups.findIndex((group) => group.set.id === stepId);
    const nextIndex = currentIndex + direction;
    if (currentIndex < 0 || nextIndex < 0 || nextIndex >= groups.length) return draft;
    const reordered = [...groups];
    const [group] = reordered.splice(currentIndex, 1);
    reordered.splice(nextIndex, 0, group);
    const reorderedIds = new Set(groups.map((item) => item.set.id));
    return {
      ...draft,
      steps: draft.steps.flatMap((step) => {
        if (step.kind !== "set" || step.parentStageId !== movedStep.parentStageId) {
          return step.kind === "exercise" && step.parentSetId && reorderedIds.has(step.parentSetId) ? [] : [step];
        }
        const nextGroup = reordered.shift();
        return nextGroup ? [nextGroup.set, ...nextGroup.elements] : [step];
      })
    };
  }

  const groups = groupWorkoutBuilderSteps(draft.steps);
  const currentIndex = groups.findIndex((group) => group.stage.id === stepId);
  const nextIndex = currentIndex + direction;
  if (currentIndex < 0 || nextIndex < 0 || nextIndex >= groups.length) return draft;
  const reordered = [...groups];
  const [group] = reordered.splice(currentIndex, 1);
  reordered.splice(nextIndex, 0, group);
  return {
    ...draft,
    steps: reordered.flatMap(({ stage, series }) => [
      stage,
      ...series.flatMap(({ elements, set }) => [set, ...elements])
    ])
  };
}

export function addWorkoutStep(
  draft: WorkoutDraft,
  kind: WorkoutStepKind,
  defaultStageType: StageType,
  defaultSetCount: string
): WorkoutDraft {
  if (kind === "stage") {
    return { ...draft, steps: [...draft.steps, createStep({ kind, stageType: defaultStageType })] };
  }
  const lastStage = [...draft.steps].reverse().find((step) => step.kind === "stage");
  if (lastStage) {
    return { ...draft, steps: [...draft.steps, createStep({ kind, parentStageId: lastStage.id, setCount: defaultSetCount })] };
  }
  const stage = createStep({ kind: "stage", stageType: defaultStageType });
  return { ...draft, steps: [stage, createStep({ kind, parentStageId: stage.id, setCount: defaultSetCount })] };
}
