import { describe, expect, it } from "vitest";

import { addWorkoutStep, moveWorkoutStep, removeWorkoutStep } from "../workoutEditor";
import { createDefaultWorkout, createStep } from "../workouts";

describe("workout editor mutations", () => {
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
});
