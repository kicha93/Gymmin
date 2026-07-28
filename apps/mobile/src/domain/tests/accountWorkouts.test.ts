import { describe, expect, it } from "vitest";

import {
  mapApiWorkoutToSavedWorkout,
  mapSavedWorkoutToApiRequest,
  mergeWorkoutsById
} from "../accountWorkouts";
import type { SavedWorkout } from "../savedWorkouts";

function workout(id: string, name: string): SavedWorkout {
  return {
    draft: { name, notes: "", sport: "strength", steps: [] },
    id,
    name
  };
}

describe("accountWorkouts", () => {
  it("maps a saved workout to the account API contract", () => {
    const value = mapSavedWorkoutToApiRequest({
      ...workout("plan-1", "Plan"),
      draft: {
        name: "Plan",
        notes: "Notes",
        sport: "strength",
        steps: [{
          exerciseId: "squat",
          exerciseName: "Squat",
          goalType: "repetitions",
          id: "step-1",
          intensity: "moderate",
          kind: "exercise",
          label: "Squat",
          loadKg: "50",
          notes: "",
          restSeconds: "120",
          setCount: "3",
          stageType: "exercise",
          targetComparator: "above",
          targetValue: "8"
        }]
      }
    });

    expect(value.clientWorkoutId).toBe("plan-1");
    expect(value.steps[0]).toMatchObject({
      clientStepId: "step-1",
      exerciseId: "squat",
      restSeconds: "120"
    });
    expect(value.steps[1]).toMatchObject({
      clientStepId: "step-1-rest-compat",
      stageType: "rest",
      targetValue: "00:02:00"
    });
  });

  it("maps validated API workouts back to local data", () => {
    const value = mapApiWorkoutToSavedWorkout({
      clientWorkoutId: "plan-1",
      name: "Plan",
      sport: "strength",
      steps: [{ clientStepId: "step-1", exerciseName: "Squat", kind: "exercise", restSeconds: "90" }]
    });

    expect(value).toMatchObject({
      id: "plan-1",
      name: "Plan",
      draft: { steps: [{ id: "step-1", kind: "exercise", restSeconds: "90" }] }
    });
  });

  it("round-trips the synchronized archive state", () => {
    const archivedAt = "2026-07-27T10:00:00.000Z";
    const request = mapSavedWorkoutToApiRequest({
      ...workout("plan-archived", "Archived"),
      archivedAt
    });

    expect(request).toMatchObject({ archivedAt, isArchived: true });
    expect(mapApiWorkoutToSavedWorkout({
      archivedAt,
      clientWorkoutId: "plan-archived",
      name: "Archived",
      sport: "strength",
      steps: []
    }).archivedAt).toBe(archivedAt);
    expect(mapSavedWorkoutToApiRequest(workout("plan-active", "Active")))
      .toMatchObject({ archivedAt: null, isArchived: false });
  });

  it("sends an explicit zero when an exercise has no rest", () => {
    const value = mapSavedWorkoutToApiRequest({
      ...workout("plan-no-rest", "No rest"),
      draft: {
        name: "No rest",
        notes: "",
        sport: "strength",
        steps: [{
          exerciseName: "Squat",
          goalType: "repetitions",
          id: "step-no-rest",
          intensity: "moderate",
          kind: "exercise",
          label: "Squat",
          loadKg: "",
          notes: "",
          restSeconds: "",
          setCount: "3",
          stageType: "exercise",
          targetComparator: "above",
          targetValue: "8"
        }]
      }
    });

    expect(value.steps).toHaveLength(1);
    expect(value.steps[0].restSeconds).toBe("0");
  });

  it("merges by stable id with account data taking precedence", () => {
    expect(mergeWorkoutsById(
      [workout("plan-1", "Account")],
      [workout("plan-1", "Local duplicate"), workout("plan-2", "Local")]
    ).map((item) => item.name)).toEqual(["Account", "Local"]);
  });
});
