import { describe, expect, it } from "vitest";

import {
  formatExerciseSetTarget,
  getExerciseDetails,
  getExerciseProgressKeyForDetails,
  getExerciseTargetDisplay,
  getWorkoutStepMuscleGroups,
  resolveWorkoutStartExecutionMode
} from "../workoutExerciseSummary";
import type { WorkoutStep } from "../workouts";

const baseStep: WorkoutStep = {
  exerciseId: "",
  exerciseName: "Bench Press",
  goalType: "repetitions",
  id: "step-1",
  intensity: "moderate",
  kind: "exercise",
  label: "",
  loadKg: "",
  notes: "",
  parentSetId: "set-1",
  setCount: "3",
  stageType: "exercise",
  targetComparator: "",
  targetValue: "8"
};

function step(overrides: Partial<WorkoutStep>): WorkoutStep {
  return {
    ...baseStep,
    ...overrides
  };
}

describe("workoutExerciseSummary", () => {
  it("formats set and rep targets for summary tiles", () => {
    expect(formatExerciseSetTarget(step({ setCount: "3", targetValue: "8" }))).toBe("3 x 8");
    expect(formatExerciseSetTarget(step({ setCount: "4", targetValue: "8-10" }))).toBe("4 x 8-10");
    expect(formatExerciseSetTarget(step({ setCount: "3", targetValue: "AMRAP" }))).toBe("3 x AMRAP");
  });

  it("formats time targets and missing values defensively", () => {
    expect(formatExerciseSetTarget(step({ goalType: "time", setCount: "3", targetValue: "00:00:45" }))).toBe("3 x 45s");
    expect(getExerciseTargetDisplay(step({ goalType: "time", targetValue: "00:02:00" }))).toBe("2m");
    expect(formatExerciseSetTarget(step({ setCount: "3", targetValue: "" }))).toBe("3 x -");
    expect(formatExerciseSetTarget(step({ setCount: "", targetValue: "8" }))).toBe("- x 8");
  });

  it("returns muscle groups for catalog exercises and empty data for unknown exercises", () => {
    const known = getWorkoutStepMuscleGroups(step({ exerciseName: "Bench Press" }));

    expect(known.exercise?.name).toBe("Bench Press");
    expect(known.primary.length + known.secondary.length).toBeGreaterThan(0);

    const unknown = getWorkoutStepMuscleGroups(step({ exerciseId: "", exerciseName: "Unknown Movement" }));
    expect(unknown.exercise).toBeUndefined();
    expect(unknown.primary).toEqual([]);
    expect(unknown.secondary).toEqual([]);
  });

  it("returns exercise detail data for known catalog exercises", () => {
    const details = getExerciseDetails(step({ exerciseName: "Bench Press" }), "en");
    const muscleGroups = getWorkoutStepMuscleGroups(step({ exerciseName: "Bench Press" }));

    expect(details?.displayName).toBe("Bench Press");
    expect(details?.exercise?.id).toBeTruthy();
    expect(details?.primary).toEqual(muscleGroups.primary);
    expect(details?.secondary).toEqual(muscleGroups.secondary);
    expect(details?.hasAnimation).toBe(false);
    expect(details?.animationUrl).toBeNull();
    expect(getExerciseProgressKeyForDetails(details)).toBe(`id:${details?.exercise?.id.toLowerCase()}`);
  });

  it("returns null exercise details for missing or unknown catalog mapping", () => {
    expect(getExerciseDetails({ exerciseId: "", exerciseName: "" }, "en")).toBeNull();
    expect(getExerciseDetails({ exerciseId: "missing-id", exerciseName: "Unknown Movement" }, "pl")).toBeNull();
    expect(getExerciseProgressKeyForDetails(null)).toBeNull();
  });

  it("handles damaged imported exercise data without crashing", () => {
    expect(formatExerciseSetTarget({
      goalType: "repetitions",
      setCount: undefined,
      targetValue: undefined
    })).toBe("- x -");

    const damaged = getWorkoutStepMuscleGroups({
      exerciseId: undefined,
      exerciseName: undefined
    });

    expect(damaged.exercise).toBeUndefined();
    expect(damaged.primary).toEqual([]);
    expect(damaged.secondary).toEqual([]);
  });

  it("resolves start execution mode from settings with a default fallback", () => {
    expect(resolveWorkoutStartExecutionMode("inline-table")).toBe("inline-table");
    expect(resolveWorkoutStartExecutionMode(null)).toBe("guided");
    expect(resolveWorkoutStartExecutionMode(undefined, "readonly-post-workout")).toBe("readonly-post-workout");
  });
});
