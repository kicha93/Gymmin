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
          setCount: "3",
          stageType: "exercise",
          targetComparator: "above",
          targetValue: "8"
        }]
      }
    });

    expect(value).toMatchObject({
      clientWorkoutId: "plan-1",
      steps: [{ clientStepId: "step-1", exerciseId: "squat" }]
    });
  });

  it("maps validated API workouts back to local data", () => {
    const value = mapApiWorkoutToSavedWorkout({
      clientWorkoutId: "plan-1",
      name: "Plan",
      sport: "strength",
      steps: [{ clientStepId: "step-1", exerciseName: "Squat", kind: "exercise" }]
    });

    expect(value).toMatchObject({
      id: "plan-1",
      name: "Plan",
      draft: { steps: [{ id: "step-1", kind: "exercise" }] }
    });
  });

  it("merges by stable id with account data taking precedence", () => {
    expect(mergeWorkoutsById(
      [workout("plan-1", "Account")],
      [workout("plan-1", "Local duplicate"), workout("plan-2", "Local")]
    ).map((item) => item.name)).toEqual(["Account", "Local"]);
  });
});
