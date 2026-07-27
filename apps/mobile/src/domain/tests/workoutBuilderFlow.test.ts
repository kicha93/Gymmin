import { describe, expect, it } from "vitest";

import {
  formatWorkoutBuilderPreviewTarget,
  getUniqueWorkoutBuilderValidationCodes,
  getWorkoutBuilderStagePreviewRows,
  getWorkoutBuilderSummary,
  getWorkoutBuilderValidationCodesForStage
} from "../workoutBuilderFlow";
import { addWorkoutStep, removeWorkoutStep, updateWorkoutStep } from "../workoutEditor";
import { createDefaultWorkout, createStep } from "../workouts";

describe("workoutBuilderFlow", () => {
  it("starts with the existing default workout data without changing the persisted model", () => {
    expect(createDefaultWorkout()).toEqual({
      name: "Nowy trening",
      notes: "",
      sport: "strength",
      steps: []
    });
  });

  it("updates stage, set and exercise counters as the draft grows", () => {
    const withStage = addWorkoutStep(createDefaultWorkout(), "stage", "exercise", "4");
    expect(getWorkoutBuilderSummary(withStage)).toMatchObject({ stageCount: 1, setCount: 0, exerciseCount: 0 });

    const withSet = addWorkoutStep(withStage, "set", "exercise", "4");
    expect(getWorkoutBuilderSummary(withSet)).toMatchObject({ stageCount: 1, setCount: 1, exerciseCount: 0 });

    const set = withSet.steps.find((step) => step.kind === "set")!;
    const exercise = createStep({
      exerciseName: "Barbell Back Squat",
      goalType: "repetitions",
      kind: "exercise",
      parentSetId: set.id,
      stageType: "exercise",
      targetValue: "8"
    });
    const complete = { ...withSet, steps: [...withSet.steps, exercise] };
    expect(getWorkoutBuilderSummary(complete)).toMatchObject({ stageCount: 1, setCount: 1, exerciseCount: 1 });
  });

  it("edits the intended exercise and removes only that element", () => {
    const stage = createStep({ kind: "stage", stageType: "exercise" });
    const set = createStep({ kind: "set", parentStageId: stage.id, setCount: "4" });
    const first = createStep({ exerciseName: "First", kind: "exercise", parentSetId: set.id, stageType: "exercise" });
    const second = createStep({ exerciseName: "Second", kind: "exercise", parentSetId: set.id, stageType: "exercise" });
    const draft = { ...createDefaultWorkout(), steps: [stage, set, first, second] };

    const edited = updateWorkoutStep(draft, second.id, { ...second, targetValue: "12" });
    expect(edited.steps.find((step) => step.id === first.id)?.targetValue).toBe("");
    expect(edited.steps.find((step) => step.id === second.id)?.targetValue).toBe("12");

    const removed = removeWorkoutStep(edited, first.id);
    expect(removed.steps.some((step) => step.id === first.id)).toBe(false);
    expect(removed.steps.some((step) => step.id === second.id)).toBe(true);
  });

  it("blocks empty names and incomplete workout structures", () => {
    expect(getUniqueWorkoutBuilderValidationCodes({ ...createDefaultWorkout(), name: "" }))
      .toEqual(["name-required", "stage-required"]);

    const withStage = addWorkoutStep(createDefaultWorkout(), "stage", "exercise", "4");
    expect(getUniqueWorkoutBuilderValidationCodes(withStage)).toContain("set-required");

    const withSet = addWorkoutStep(withStage, "set", "exercise", "4");
    expect(getUniqueWorkoutBuilderValidationCodes(withSet)).toContain("exercise-required");
  });

  it("rejects a physical exercise without a catalog selection and negative values", () => {
    const stage = createStep({ kind: "stage", stageType: "exercise" });
    const set = createStep({ kind: "set", parentStageId: stage.id, setCount: "-1" });
    const exercise = createStep({ kind: "exercise", loadKg: "-5", parentSetId: set.id, stageType: "exercise" });
    const draft = { ...createDefaultWorkout(), steps: [stage, set, exercise] };
    const issues = getUniqueWorkoutBuilderValidationCodes(draft);

    expect(issues).toContain("exercise-required");
    expect(issues).toContain("nonnegative-values-required");
  });

  it("shows missing-set validation only for the stage that is actually empty", () => {
    const firstStage = createStep({ kind: "stage", stageType: "exercise" });
    const firstSet = createStep({ kind: "set", parentStageId: firstStage.id, setCount: "4" });
    const secondStage = createStep({ kind: "stage", stageType: "exercise" });
    const draft = { ...createDefaultWorkout(), steps: [firstStage, firstSet, secondStage] };

    expect(getUniqueWorkoutBuilderValidationCodes(draft)).toContain("set-required");
    expect(getWorkoutBuilderValidationCodesForStage(draft, firstStage.id)).not.toContain("set-required");
    expect(getWorkoutBuilderValidationCodesForStage(draft, secondStage.id)).toContain("set-required");
  });

  it("returns every exercise in the stage preview with its parent set target", () => {
    const stage = createStep({ kind: "stage", stageType: "exercise" });
    const firstSet = createStep({ kind: "set", parentStageId: stage.id, setCount: "4" });
    const secondSet = createStep({ kind: "set", parentStageId: stage.id, setCount: "3" });
    const exercises = Array.from({ length: 5 }, (_, index) => createStep({
      exerciseName: `Exercise ${index + 1}`,
      goalType: "repetitions",
      kind: "exercise",
      parentSetId: index < 3 ? firstSet.id : secondSet.id,
      stageType: "exercise",
      targetValue: index < 3 ? "12" : "8"
    }));
    const draft = { ...createDefaultWorkout(), steps: [stage, firstSet, ...exercises.slice(0, 3), secondSet, ...exercises.slice(3)] };

    const preview = getWorkoutBuilderStagePreviewRows(draft, stage.id);

    expect(preview).toHaveLength(5);
    expect(preview.map((row) => row.target)).toEqual(["4×12", "4×12", "4×12", "3×8", "3×8"]);
  });

  it("does not show a meaningless one-times target for a simple warmup", () => {
    const warmup = createStep({
      goalType: "buttonPress",
      kind: "exercise",
      stageType: "warmup",
      targetValue: ""
    });

    expect(formatWorkoutBuilderPreviewTarget(warmup, "1")).toBe("");
  });
});
