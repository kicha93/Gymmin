import { describe, expect, it } from "vitest";

import { auditAiWorkoutPlan } from "../aiWorkoutPlanQuality";
import { exerciseCatalogDataSource } from "../exerciseCatalogDataSource";
import type { SavedWorkout } from "../savedWorkouts";
import { createStep } from "../workouts";

const exercise = exerciseCatalogDataSource.getAvailableExercises()[0];

function workout(exerciseIds = [exercise.id]): SavedWorkout {
  const stageId = "stage";
  const setId = "set";
  return {
    createdAt: "2026-01-01T00:00:00.000Z",
    id: "workout",
    name: "Plan A",
    draft: {
      name: "Plan A",
      notes: "",
      sport: "strength",
      steps: [
        createStep({ id: stageId, kind: "stage", label: "Main", stageType: "exercise" }),
        createStep({ id: setId, kind: "set", parentStageId: stageId, setCount: "4", stageType: "exercise" }),
        ...exerciseIds.map((exerciseId, index) => createStep({
          exerciseId,
          exerciseName: exercise.name,
          goalType: "repetitions",
          id: `exercise-${index}`,
          kind: "exercise",
          parentSetId: setId,
          parentStageId: stageId,
          restSeconds: "180",
          stageType: "exercise",
          targetValue: "8"
        }))
      ]
    }
  };
}

describe("AI workout plan quality audit", () => {
  it("detects a wrong weekly workout count and implausible duration", () => {
    expect(auditAiWorkoutPlan([workout()], {
      availableEquipment: ["bodyweight"],
      gymAccess: "yes",
      sessionDuration: "5",
      trainingDaysPerWeek: "3"
    }).map((issue) => issue.code)).toEqual(expect.arrayContaining(["workoutCount", "duration"]));
  });

  it("detects duplicated main exercises", () => {
    expect(auditAiWorkoutPlan([workout([exercise.id, exercise.id])], {
      gymAccess: "yes",
      sessionDuration: "120",
      trainingDaysPerWeek: "1"
    }).map((issue) => issue.code)).toContain("duplicate");
  });

  it("accepts a basic plan matching declared logistics", () => {
    expect(auditAiWorkoutPlan([workout()], {
      gymAccess: "yes",
      sessionDuration: "120",
      trainingDaysPerWeek: "1"
    })).toEqual([]);
  });
});
