import { describe, expect, it } from "vitest";

import {
  createSavedWorkoutsFromApiResponse,
  getWorkoutCreatorPlanText
} from "../workoutCreatorImport";

const workout = { nazwa: "Plan A", cwiczenia: [{ nazwaCwiczenia: "Przysiad", liczbaSerii: "3", liczbaPowtorzen: "8", restSeconds: 90 }] };

describe("workoutCreatorImport", () => {
  it("imports direct and wrapped workout arrays", () => {
    expect(createSavedWorkoutsFromApiResponse([workout], "none", 1)).toHaveLength(1);
    expect(createSavedWorkoutsFromApiResponse({ result: { workouts: [workout] } }, "none", 1)).toHaveLength(1);
  });

  it("extracts JSON from fenced plan text", () => {
    const result = createSavedWorkoutsFromApiResponse({
      planText: `Plan:\n\`\`\`json\n${JSON.stringify([workout])}\n\`\`\``
    }, "none", 1);
    expect(result[0]).toMatchObject({ name: "Plan A", draft: { steps: expect.any(Array) } });
  });

  it("adds configured warmup and normalized rest targets", () => {
    const ready = createSavedWorkoutsFromApiResponse([workout], "ready", 1)[0];
    const button = createSavedWorkoutsFromApiResponse([workout], "button", 1)[0];
    expect(ready.draft.steps.some((step) => step.id.includes("warmup"))).toBe(true);
    expect(ready.draft.steps.some((step) => step.stageType === "rest" && step.targetValue === "00:01:30")).toBe(true);
    expect(button.draft.steps.some((step) => step.goalType === "buttonPress")).toBe(true);
  });

  it("returns readable plan text and ignores malformed payloads", () => {
    expect(getWorkoutCreatorPlanText({ planText: "Plan text" })).toBe("Plan text");
    expect(getWorkoutCreatorPlanText({ status: "completed" })).toContain("completed");
    expect(createSavedWorkoutsFromApiResponse({ workouts: [{ name: "Empty", exercises: [] }] }, "none", 1)).toEqual([]);
  });
});
