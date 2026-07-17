import { createStep, type StageType, type WorkoutDraft, type WorkoutStep, type WorkoutStepKind } from "./workouts";

export function updateWorkoutStep(draft: WorkoutDraft, stepId: string, nextStep: WorkoutStep): WorkoutDraft {
  return { ...draft, steps: draft.steps.map((step) => step.id === stepId ? nextStep : step) };
}

export function removeWorkoutStep(draft: WorkoutDraft, stepId: string): WorkoutDraft {
  return {
    ...draft,
    steps: draft.steps.filter((step) => {
      if (step.id === stepId || step.parentStageId === stepId || step.parentSetId === stepId) return false;
      const parentSet = draft.steps.find((item) => item.id === step.parentSetId);
      return parentSet?.parentStageId !== stepId;
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
    const groups = draft.steps
      .filter((step) => step.kind === "set" && step.parentStageId === movedStep.parentStageId)
      .map((set) => ({ set, elements: draft.steps.filter((step) => step.kind === "exercise" && step.parentSetId === set.id) }));
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

  const groups = draft.steps.filter((step) => step.kind === "stage").map((stage) => ({
    stage,
    series: draft.steps
      .filter((step) => step.kind === "set" && step.parentStageId === stage.id)
      .flatMap((set) => [set, ...draft.steps.filter((step) => step.kind === "exercise" && step.parentSetId === set.id)])
  }));
  const currentIndex = groups.findIndex((group) => group.stage.id === stepId);
  const nextIndex = currentIndex + direction;
  if (currentIndex < 0 || nextIndex < 0 || nextIndex >= groups.length) return draft;
  const reordered = [...groups];
  const [group] = reordered.splice(currentIndex, 1);
  reordered.splice(nextIndex, 0, group);
  return { ...draft, steps: reordered.flatMap((item) => [item.stage, ...item.series]) };
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
