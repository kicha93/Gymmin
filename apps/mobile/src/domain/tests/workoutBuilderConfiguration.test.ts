import { describe, expect, it } from "vitest";

import {
  getExerciseElementTypeOptions,
  getGoalTypeOptions,
  getStageTypeOptions,
  getTargetComparatorOptions,
  normalizeSetCountInput
} from "../workoutBuilderConfiguration";

describe("workoutBuilderConfiguration", () => {
  const translate = (key: string) => `translated:${key}`;

  it("provides stable typed option values", () => {
    expect(getStageTypeOptions(translate).map((option) => option.value)).toEqual([
      "warmup",
      "exercise",
      "recovery",
      "rest",
      "cooldown",
      "other"
    ]);
    expect(getGoalTypeOptions(translate).map((option) => option.value)).toContain("heartRate");
    expect(getExerciseElementTypeOptions(translate).map((option) => option.value)).not.toContain("rest");
    expect(getTargetComparatorOptions(translate).map((option) => option.value)).toEqual(["below", "above"]);
  });

  it("normalizes set count to a safe two-digit maximum", () => {
    expect(normalizeSetCountInput("abc")).toBe("");
    expect(normalizeSetCountInput("07 sets")).toBe("7");
    expect(normalizeSetCountInput("999")).toBe("20");
  });
});
