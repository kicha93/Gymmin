import { describe, expect, it } from "vitest";

import {
  createWorkoutSessionFromWorkout,
  recoverWorkoutRestSecondsFromSessions
} from "../workoutSessions";
import {
  createStep,
  normalizeWorkoutRestBetweenSets,
  parseWorkoutDurationSeconds,
  type WorkoutDraft
} from "../workouts";

function workoutWithLegacyRest(): WorkoutDraft {
  const stage = createStep({ id: "stage", kind: "stage", stageType: "exercise" });
  const set = createStep({ id: "set", kind: "set", parentStageId: stage.id, setCount: "2" });
  const exercise = createStep({
    exerciseId: "squat-barbell-back-squat-1251",
    exerciseName: "Barbell Back Squat",
    goalType: "repetitions",
    id: "exercise",
    kind: "exercise",
    parentSetId: set.id,
    stageType: "exercise",
    targetValue: "8"
  });
  const rest = createStep({
    goalType: "time",
    id: "rest",
    kind: "exercise",
    parentSetId: set.id,
    stageType: "rest",
    targetValue: "00:01:30"
  });

  return {
    name: "Plan",
    notes: "",
    sport: "strength",
    steps: [stage, set, exercise, rest]
  };
}

describe("rest between workout sets", () => {
  it("parses numeric and clock duration values safely", () => {
    expect(parseWorkoutDurationSeconds("90")).toBe(90);
    expect(parseWorkoutDurationSeconds("01:30")).toBe(90);
    expect(parseWorkoutDurationSeconds("00:02:30")).toBe(150);
    expect(parseWorkoutDurationSeconds("invalid")).toBeNull();
  });

  it("migrates a legacy rest element onto the preceding exercise", () => {
    const normalized = normalizeWorkoutRestBetweenSets(workoutWithLegacyRest());
    const exercises = normalized.steps.filter((step) => step.kind === "exercise");

    expect(exercises).toHaveLength(1);
    expect(exercises[0]).toMatchObject({ id: "exercise", restSeconds: "90" });
  });

  it("retains an orphaned legacy rest element rather than losing data", () => {
    const draft = workoutWithLegacyRest();
    const rest = draft.steps.find((step) => step.id === "rest")!;
    const normalized = normalizeWorkoutRestBetweenSets({
      ...draft,
      steps: draft.steps.filter((step) => step.id !== "exercise")
    });

    expect(normalized.steps).toContainEqual(expect.objectContaining({ id: rest.id, stageType: "rest" }));
  });

  it("retains a conflicting legacy rest instead of overwriting an explicit value", () => {
    const draft = workoutWithLegacyRest();
    const normalized = normalizeWorkoutRestBetweenSets({
      ...draft,
      steps: draft.steps.map((step) => step.id === "exercise"
        ? { ...step, restSeconds: "120" }
        : step)
    });

    expect(normalized.steps.find((step) => step.id === "exercise")?.restSeconds).toBe("120");
    expect(normalized.steps.some((step) => step.id === "rest")).toBe(true);
  });

  it("creates technical rest entries for the guided timer without storing them in the plan", () => {
    const normalized = normalizeWorkoutRestBetweenSets(workoutWithLegacyRest());
    const session = createWorkoutSessionFromWorkout(normalized, "workout-1", "guided");
    const exerciseEntries = session.entries.filter((entry) => entry.type !== "rest");
    const restEntries = session.entries.filter((entry) => entry.type === "rest");

    expect(session.planSnapshot.steps.some((step) => step.stageType === "rest")).toBe(false);
    expect(exerciseEntries).toHaveLength(2);
    expect(restEntries).toHaveLength(2);
    expect(restEntries.every((entry) => entry.plannedTarget === "00:01:30")).toBe(true);
  });

  it("recovers a lost rest value from an existing workout session", () => {
    const normalized = normalizeWorkoutRestBetweenSets(workoutWithLegacyRest());
    const session = createWorkoutSessionFromWorkout(normalized, "workout-1", "guided");
    const lostDraft = {
      ...normalized,
      steps: normalized.steps.map((step) => step.id === "exercise"
        ? { ...step, restSeconds: "" }
        : step)
    };

    const recovered = recoverWorkoutRestSecondsFromSessions(lostDraft, "workout-1", [session]);

    expect(recovered.steps.find((step) => step.id === "exercise")?.restSeconds).toBe("90");
  });
});
