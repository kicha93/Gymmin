import { describe, expect, it } from "vitest";

import {
  getExerciseElementTypeOptions,
  getGoalTypeOptions,
  getStageTypeOptions,
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
    expect(getGoalTypeOptions(translate).map((option) => option.value)).toEqual(["repetitions", "time", "buttonPress"]);
    expect(getExerciseElementTypeOptions(translate).map((option) => option.value)).not.toContain("rest");
  });

  it("normalizes set count to a safe two-digit maximum", () => {
    expect(normalizeSetCountInput("abc")).toBe("");
    expect(normalizeSetCountInput("07 sets")).toBe("7");
    expect(normalizeSetCountInput("999")).toBe("20");
  });
});
