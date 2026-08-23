import AsyncStorage from "@react-native-async-storage/async-storage";
import { beforeEach, describe, expect, it } from "vitest";

import {
  formatWeekRange,
  getActiveWeeklyPlanWorkouts,
  getCurrentWeekRange,
  getDefaultWeeklyPlanSettings,
  getWeeklyPlanSummary,
  loadWeeklyPlan,
  mergeWeeklyPlans,
  removeWeeklyPlanItem,
  saveWeeklyPlan,
  sortWeeklyPlanItemsForDisplay,
  toggleWeeklyPlanItemDay,
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
  beforeEach(async () => {
    await AsyncStorage.clear();
  });

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

  it("supports multiple weekdays for one workout without duplicating a day", () => {
    let plan = getDefaultWeeklyPlanSettings();
    plan = upsertWeeklyPlanItem(plan, "workout-a", "monday");
    plan = upsertWeeklyPlanItem(plan, "workout-a", "friday");
    plan = upsertWeeklyPlanItem(plan, "workout-a", "friday");
    expect(plan.items.map((item) => item.day)).toEqual(["monday", "friday"]);

    plan = toggleWeeklyPlanItemDay(plan, "workout-a", "monday");
    expect(plan.items.map((item) => item.day)).toEqual(["friday"]);
    expect(removeWeeklyPlanItem(plan, "workout-a").items).toEqual([]);
  });

  it("sorts plan display from Monday to Sunday and then by workout name", () => {
    const items = sortWeeklyPlanItemsForDisplay([
      { completed: false, day: "friday", order: 0, workout: { id: "friday", name: "Nogi" }, workoutId: "friday" },
      { completed: false, day: "monday", order: 1, workout: { id: "push", name: "Push" }, workoutId: "push" },
      { completed: false, day: "wednesday", order: 2, workout: { id: "zulu", name: "Zulu" }, workoutId: "zulu" },
      { completed: false, day: "wednesday", order: 3, workout: { id: "alpha", name: "Alpha" }, workoutId: "alpha" }
    ]);

    expect(items.map((item) => item.workoutId)).toEqual(["push", "alpha", "zulu", "friday"]);
  });

  it("returns every unique active planned workout in plan order", () => {
    let plan = getDefaultWeeklyPlanSettings();
    plan = upsertWeeklyPlanItem(plan, "workout-b", "monday");
    plan = upsertWeeklyPlanItem(plan, "workout-a", "wednesday");
    plan = upsertWeeklyPlanItem(plan, "workout-b", "friday");
    plan = upsertWeeklyPlanItem(plan, "workout-c", "sunday");

    expect(getActiveWeeklyPlanWorkouts(plan, [
      ...workouts.slice(0, 2),
      { ...workouts[2], archivedAt: "2026-07-27T10:00:00.000Z" }
    ]).map((workout) => workout.id)).toEqual(["workout-b", "workout-a"]);
  });

  it("returns no homepage workouts when the weekly plan is disabled", () => {
    expect(getActiveWeeklyPlanWorkouts(getDefaultWeeklyPlanSettings(), workouts)).toEqual([]);
  });

  it("merges anonymous and account plans without duplicate workout days", () => {
    let accountPlan = upsertWeeklyPlanItem(getDefaultWeeklyPlanSettings(), "workout-a", "monday");
    accountPlan = upsertWeeklyPlanItem(accountPlan, "workout-b", "wednesday");
    let anonymousPlan = upsertWeeklyPlanItem(getDefaultWeeklyPlanSettings(), "workout-a", "monday");
    anonymousPlan = upsertWeeklyPlanItem(anonymousPlan, "workout-a", "friday");

    expect(mergeWeeklyPlans(accountPlan, anonymousPlan).items).toEqual([
      { day: "monday", order: 0, workoutId: "workout-a" },
      { day: "wednesday", order: 1, workoutId: "workout-b" },
      { day: "friday", order: 2, workoutId: "workout-a" }
    ]);
  });

  it("requires one completed session for each planned weekday occurrence", () => {
    let plan = getDefaultWeeklyPlanSettings();
    plan = upsertWeeklyPlanItem(plan, "workout-a", "monday");
    plan = upsertWeeklyPlanItem(plan, "workout-a", "friday");

    const oneCompletion = getWeeklyPlanSummary(plan, workouts, [session({ id: "first" })], new Date(2026, 5, 3, 12));
    expect(oneCompletion.completed).toBe(1);
    expect(oneCompletion.remaining).toBe(1);
    expect(oneCompletion.total).toBe(2);

    const twoCompletions = getWeeklyPlanSummary(plan, workouts, [
      session({ id: "first" }),
      session({ id: "second", startedAt: "2026-06-05T10:00:00.000Z" })
    ], new Date(2026, 5, 3, 12));
    expect(twoCompletions.completed).toBe(2);
    expect(twoCompletions.remaining).toBe(0);
  });

  it("keeps one persisted plan across auth owner changes", async () => {
    const plan = upsertWeeklyPlanItem(getDefaultWeeklyPlanSettings(), "workout-a", "monday");
    await saveWeeklyPlan(plan);

    await expect(loadWeeklyPlan()).resolves.toMatchObject({
      enabled: true,
      items: [{ day: "monday", workoutId: "workout-a" }]
    });
    await expect(loadWeeklyPlan()).resolves.toMatchObject({
      enabled: true,
      items: [{ day: "monday", workoutId: "workout-a" }]
    });
  });
});
