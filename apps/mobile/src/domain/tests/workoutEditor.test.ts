import { describe, expect, it } from "vitest";

import {
  addWorkoutStep,
  getWorkoutStageExerciseNumber,
  groupWorkoutBuilderSteps,
  isSimpleWarmupStageGroup,
  moveWorkoutStep,
  removeWorkoutStep
} from "../workoutEditor";
import { createDefaultWorkout, createStep } from "../workouts";

describe("workout editor mutations", () => {
  it("hides only a simple warm-up placeholder", () => {
    const stage = createStep({ id: "warmup", kind: "stage", label: "Warm-up", stageType: "warmup" });
    const set = createStep({ id: "warmup-set", kind: "set", parentStageId: stage.id, setCount: "1" });
    const placeholder = createStep({ id: "placeholder", goalType: "buttonPress", kind: "exercise", parentSetId: set.id, stageType: "warmup" });
    const [simpleGroup] = groupWorkoutBuilderSteps([stage, set, placeholder]);

    expect(isSimpleWarmupStageGroup(simpleGroup)).toBe(true);
    expect(isSimpleWarmupStageGroup({ ...simpleGroup, stage: { ...stage, targetValue: "00:05:00" } })).toBe(false);

    const movement = { ...placeholder, exerciseName: "Jumping jacks", stageType: "exercise" as const };
    const [detailedGroup] = groupWorkoutBuilderSteps([stage, set, movement]);

    expect(isSimpleWarmupStageGroup(detailedGroup)).toBe(false);
    expect(isSimpleWarmupStageGroup({ ...detailedGroup, stage: { ...stage, stageType: "exercise" } })).toBe(false);
  });

  it("groups stages, sets and exercises in their original order", () => {
    const firstStage = createStep({ kind: "stage" });
    const firstSet = createStep({ kind: "set", parentStageId: firstStage.id });
    const firstExercise = createStep({ kind: "exercise", parentSetId: firstSet.id });
    const secondSet = createStep({ kind: "set", parentStageId: firstStage.id });
    const secondExercise = createStep({ kind: "exercise", parentSetId: secondSet.id });
    const secondStage = createStep({ kind: "stage" });

    const groups = groupWorkoutBuilderSteps([
      firstStage,
      firstSet,
      firstExercise,
      secondSet,
      secondExercise,
      secondStage
    ]);

    expect(groups.map((group) => group.stage.id)).toEqual([firstStage.id, secondStage.id]);
    expect(groups[0]?.series.map((series) => series.set.id)).toEqual([firstSet.id, secondSet.id]);
    expect(groups[0]?.series.map((series) => series.elements.map((element) => element.id)))
      .toEqual([[firstExercise.id], [secondExercise.id]]);
  });

  it("numbers every exercise in a stage while excluding rest targets", () => {
    const stage = createStep({ kind: "stage", stageType: "warmup" });
    const firstSet = createStep({ kind: "set", parentStageId: stage.id });
    const firstExercise = createStep({ kind: "exercise", parentSetId: firstSet.id, stageType: "warmup" });
    const rest = createStep({ kind: "exercise", parentSetId: firstSet.id, stageType: "rest" });
    const secondExercise = createStep({ kind: "exercise", parentSetId: firstSet.id, stageType: "warmup" });
    const secondSet = createStep({ kind: "set", parentStageId: stage.id });
    const thirdExercise = createStep({ kind: "exercise", parentSetId: secondSet.id, stageType: "warmup" });
    const [group] = groupWorkoutBuilderSteps([
      stage,
      firstSet,
      firstExercise,
      rest,
      secondExercise,
      secondSet,
      thirdExercise
    ]);

    expect(getWorkoutStageExerciseNumber(group.series, 0, 0)).toBe(1);
    expect(getWorkoutStageExerciseNumber(group.series, 0, 1)).toBeUndefined();
    expect(getWorkoutStageExerciseNumber(group.series, 0, 2)).toBe(2);
    expect(getWorkoutStageExerciseNumber(group.series, 1, 0)).toBe(3);
  });

  it("removes a stage together with nested sets and exercises", () => {
    const stage = createStep({ kind: "stage" });
    const set = createStep({ kind: "set", parentStageId: stage.id });
    const exercise = createStep({ kind: "exercise", parentStageId: stage.id, parentSetId: set.id });
    const otherStage = createStep({ kind: "stage" });
    const draft = { ...createDefaultWorkout(), steps: [stage, set, exercise, otherStage] };

    expect(removeWorkoutStep(draft, stage.id).steps).toEqual([otherStage]);
  });

  it("moves complete stage groups and creates a parent stage when adding to an empty draft", () => {
    const firstStage = createStep({ kind: "stage" });
    const firstSet = createStep({ kind: "set", parentStageId: firstStage.id });
    const secondStage = createStep({ kind: "stage" });
    const draft = { ...createDefaultWorkout(), steps: [firstStage, firstSet, secondStage] };

    expect(moveWorkoutStep(draft, secondStage.id, -1).steps.map((step) => step.id))
      .toEqual([secondStage.id, firstStage.id, firstSet.id]);

    const added = addWorkoutStep(createDefaultWorkout(), "set", "warmup", "4");
    expect(added.steps.map((step) => step.kind)).toEqual(["stage", "set"]);
    expect(added.steps[1].parentStageId).toBe(added.steps[0].id);
  });

  it("moves complete set and exercise groups without losing nested data", () => {
    const stage = createStep({ kind: "stage" });
    const firstSet = createStep({ kind: "set", parentStageId: stage.id });
    const firstExercise = createStep({ kind: "exercise", parentSetId: firstSet.id });
    const secondExercise = createStep({ kind: "exercise", parentSetId: firstSet.id });
    const secondSet = createStep({ kind: "set", parentStageId: stage.id });
    const thirdExercise = createStep({ kind: "exercise", parentSetId: secondSet.id });
    const draft = {
      ...createDefaultWorkout(),
      steps: [stage, firstSet, firstExercise, secondExercise, secondSet, thirdExercise]
    };

    const reorderedExercises = moveWorkoutStep(draft, secondExercise.id, -1);
    expect(reorderedExercises.steps.map((step) => step.id)).toEqual([
      stage.id,
      firstSet.id,
      secondExercise.id,
      firstExercise.id,
      secondSet.id,
      thirdExercise.id
    ]);

    const reorderedSets = moveWorkoutStep(draft, secondSet.id, -1);
    expect(reorderedSets.steps.map((step) => step.id)).toEqual([
      stage.id,
      secondSet.id,
      thirdExercise.id,
      firstSet.id,
      firstExercise.id,
      secondExercise.id
    ]);
  });
});
