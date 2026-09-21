import { describe, expect, it } from "vitest";

import {
  auditAiWorkoutPlan,
  isBlockingAiWorkoutPlanQualityIssue
} from "../aiWorkoutPlanQuality";
import { exerciseCatalogDataSource } from "../exerciseCatalogDataSource";
import type { SavedWorkout } from "../savedWorkouts";
import { createStep } from "../workouts";

const availableExercises = exerciseCatalogDataSource.getAvailableExercises();
const exercise = availableExercises[0];
const strengthAnchor = availableExercises.find((candidate) => candidate.category === "SQUAT")!;
const accessory = availableExercises.find((candidate) => candidate.category === "LATERAL_RAISE")!;

function workout(
  exerciseIds = [exercise.id],
  name = "Plan A",
  stageType: "exercise" | "warmup" = "exercise"
): SavedWorkout {
  const stageId = `stage-${name}`;
  const setId = `set-${name}`;
  return {
    createdAt: "2026-01-01T00:00:00.000Z",
    id: `workout-${name}`,
    name,
    draft: {
      name,
      notes: "",
      sport: "strength",
      steps: [
        createStep({ id: stageId, kind: "stage", label: "Main", stageType }),
        createStep({ id: setId, kind: "set", parentStageId: stageId, setCount: "4", stageType }),
        ...exerciseIds.map((exerciseId, index) => createStep({
          exerciseId,
          exerciseName: availableExercises.find((candidate) => candidate.id === exerciseId)?.name ?? exercise.name,
          goalType: "repetitions",
          id: `exercise-${index}`,
          kind: "exercise",
          parentSetId: setId,
          parentStageId: stageId,
          restSeconds: "180",
          stageType,
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

  it("reports an exact accessory repeated across weekly workouts as a non-blocking warning", () => {
    const issue = auditAiWorkoutPlan([
      workout([accessory.id], "Plan A"),
      workout([accessory.id], "Plan B")
    ], {
      gymAccess: "yes",
      primaryGoal: "muscleGain",
      sessionDuration: "120",
      trainingDaysPerWeek: "2"
    }).find((candidate) => candidate.code === "weeklyDuplicate");

    expect(issue).toBeDefined();
    expect(isBlockingAiWorkoutPlanQualityIssue(issue!)).toBe(false);
  });

  it("allows one strength anchor in two workouts but warns when it appears in three", () => {
    const draft = {
      gymAccess: "yes",
      primaryGoal: "strength",
      sessionDuration: "120",
      trainingDaysPerWeek: "3"
    };
    expect(auditAiWorkoutPlan([
      workout([strengthAnchor.id], "Plan A"),
      workout([strengthAnchor.id], "Plan B")
    ], { ...draft, trainingDaysPerWeek: "2" }).map((issue) => issue.code)).not.toContain("weeklyDuplicate");
    expect(auditAiWorkoutPlan([
      workout([strengthAnchor.id], "Plan A"),
      workout([strengthAnchor.id], "Plan B"),
      workout([strengthAnchor.id], "Plan C")
    ], draft).map((issue) => issue.code)).toContain("weeklyDuplicate");
  });

  it("does not treat a repeated warm-up exercise as weekly monotony", () => {
    expect(auditAiWorkoutPlan([
      workout([exercise.id], "Plan A", "warmup"),
      workout([exercise.id], "Plan B", "warmup")
    ], {
      gymAccess: "yes",
      primaryGoal: "muscleGain",
      sessionDuration: "120",
      trainingDaysPerWeek: "2"
    }).map((issue) => issue.code)).not.toContain("weeklyDuplicate");
  });

  it("warns when one family of similar movements dominates the week", () => {
    const dominantCategory = availableExercises.find((candidate) =>
      availableExercises.filter((item) => item.category === candidate.category).length >= 4
    )!.category;
    const dominant = availableExercises.filter((candidate) => candidate.category === dominantCategory).slice(0, 4);
    const otherCategories = new Set<string>();
    const others = availableExercises.filter((candidate) => {
      if (candidate.category === dominantCategory || otherCategories.has(candidate.category)) return false;
      otherCategories.add(candidate.category);
      return true;
    }).slice(0, 4);

    expect(auditAiWorkoutPlan([
      workout([...dominant.slice(0, 2), ...others.slice(0, 2)].map((item) => item.id), "Plan A"),
      workout([...dominant.slice(2), ...others.slice(2)].map((item) => item.id), "Plan B")
    ], {
      gymAccess: "yes",
      primaryGoal: "muscleGain",
      sessionDuration: "120",
      trainingDaysPerWeek: "2"
    }).map((issue) => issue.code)).toContain("categoryConcentration");
  });

  it("accepts a basic plan matching declared logistics", () => {
    expect(auditAiWorkoutPlan([workout()], {
      gymAccess: "yes",
      sessionDuration: "120",
      trainingDaysPerWeek: "1"
    })).toEqual([]);
  });
});
