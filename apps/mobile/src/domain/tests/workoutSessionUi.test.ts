import { describe, expect, it } from "vitest";

import {
  formatRestDuration,
  formatWorkoutElapsedTime,
  formatWorkoutProgressPercent,
  getWorkoutProgress
} from "../workoutSessionUi";

describe("workoutSessionUi", () => {
  it("formats active workout elapsed time without a text prefix", () => {
    expect(formatWorkoutElapsedTime(550)).toBe("9:10");
    expect(formatWorkoutElapsedTime(3670)).toBe("1:01:10");
    expect(formatWorkoutElapsedTime(-5)).toBe("0:00");
  });

  it("calculates workout progress safely", () => {
    expect(getWorkoutProgress(3, 8)).toMatchObject({
      current: 3,
      percent: 38,
      total: 8
    });
    expect(formatWorkoutProgressPercent(3, 8)).toBe("38%");
    expect(formatWorkoutProgressPercent(3, 0)).toBe("0%");
  });

  it("formats rest duration compactly", () => {
    expect(formatRestDuration(150)).toBe("2m 30s");
    expect(formatRestDuration(60)).toBe("1m");
    expect(formatRestDuration(0)).toBe("-");
  });
});
