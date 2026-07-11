import { describe, expect, it } from "vitest";

import {
  formatWeekRange,
  getCurrentWeekRange,
  getDefaultWeeklyPlanSettings,
  getWeeklyPlanSummary,
  removeWeeklyPlanItem,
  upsertWeeklyPlanItem
} from "../weeklyPlan";
import type { WorkoutSession } from "../workoutSessions";

const workouts = [
  { id: "workout-a", name: "FBW A" },
  { id: "workout-b", name: "FBW B" },
  { id: "workout-c", name: "FBW C" }
];

function session(overrides: Partial<WorkoutSession>): WorkoutSession {
  return {
    deletedAt: null,
    entries: [],
    executionMode: "guided",
    id: "session-1",
    planSnapshot: { name: "Workout", notes: "", sport: "strength", steps: [] },
    sourceWorkoutId: "workout-a",
    sourceWorkoutName: "FBW A",
    startedAt: "2026-06-03T10:00:00.000Z",
    status: "completed",
    ...overrides
  };
}

describe("weeklyPlan", () => {
  it("starts the local week on Monday and formats ranges across months", () => {
    const range = getCurrentWeekRange(new Date(2026, 5, 3, 12));
    expect(range.start.getDay()).toBe(1);
    expect(formatWeekRange(range, "pl")).toBe("1 - 7 czerwca");
    const crossMonth = getCurrentWeekRange(new Date(2026, 5, 30, 12));
    expect(formatWeekRange(crossMonth, "pl")).toBe("29 czerwca - 5 lipca");
    expect(formatWeekRange(crossMonth, "en")).toBe("June 29 - July 5");
  });

  it("counts only completed, current-week, non-deleted plan workouts", () => {
    let plan = getDefaultWeeklyPlanSettings(new Date("2026-06-03T12:00:00.000Z"));
    plan = upsertWeeklyPlanItem(plan, "workout-a", "monday");
    plan = upsertWeeklyPlanItem(plan, "workout-b", "wednesday");
    plan = upsertWeeklyPlanItem(plan, "workout-c", "friday");
    const summary = getWeeklyPlanSummary(plan, workouts, [
      session({ sourceWorkoutId: "workout-a" }),
      session({ id: "active", sourceWorkoutId: "workout-b", status: "active" }),
      session({ deletedAt: "2026-06-03T11:00:00.000Z", id: "deleted", sourceWorkoutId: "workout-c" }),
      session({ id: "old", sourceWorkoutId: "workout-b", startedAt: "2026-05-20T10:00:00.000Z" })
    ], new Date(2026, 5, 3, 12));

    expect(summary.completed).toBe(1);
    expect(summary.remaining).toBe(2);
    expect(summary.percent).toBe(33);
  });

  it("counts a planned workout even when it was completed on a different weekday", () => {
    let plan = getDefaultWeeklyPlanSettings(new Date("2026-06-03T12:00:00.000Z"));
    plan = upsertWeeklyPlanItem(plan, "workout-a", "monday");
    const summary = getWeeklyPlanSummary(plan, workouts, [session({ startedAt: "2026-06-05T10:00:00.000Z" })], new Date(2026, 5, 3, 12));
    expect(summary.completed).toBe(1);
  });

  it("updates and removes plan items without duplicates", () => {
    let plan = getDefaultWeeklyPlanSettings();
    plan = upsertWeeklyPlanItem(plan, "workout-a", "monday");
    plan = upsertWeeklyPlanItem(plan, "workout-a", "friday");
    expect(plan.items).toHaveLength(1);
    expect(plan.items[0].day).toBe("friday");
    expect(removeWeeklyPlanItem(plan, "workout-a").items).toEqual([]);
  });
});
