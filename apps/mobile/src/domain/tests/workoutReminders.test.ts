import { describe, expect, it } from "vitest";

import {
  getUpcomingReminderDates,
  getWorkoutReminderNotificationContent,
  hasCompletedWorkoutOnDate,
  normalizeWorkoutReminderSettings,
  normalizeWorkoutReminderTime,
  shouldScheduleReminderForDay,
  type WorkoutReminderSettings
} from "../workoutReminders";
import type { WorkoutSession } from "../workoutSessions";

const monday = new Date("2026-06-29T09:00:00.000Z");

const baseSettings: WorkoutReminderSettings = {
  daysOfWeek: [1, 3, 5],
  description: "Open Gymmin",
  enabled: true,
  message: "Time to train",
  onlyIfNoWorkoutToday: true,
  time: "18:00"
};

function completedOn(date: string): WorkoutSession {
  return {
    id: `session-${date}`,
    sourceWorkoutId: "workout-1",
    sourceWorkoutName: "Workout",
    executionMode: "guided",
    status: "completed",
    startedAt: date,
    finishedAt: date,
    updatedAt: date,
    deletedAt: null,
    planSnapshot: { name: "Workout", notes: "", sport: "strength", steps: [] },
    entries: []
  };
}

describe("workoutReminders", () => {
  it("normalizes settings, days and HH:mm time", () => {
    expect(normalizeWorkoutReminderTime("7:05")).toBe("07:05");
    expect(normalizeWorkoutReminderTime("24:00")).toBe("18:00");

    expect(normalizeWorkoutReminderSettings({
      daysOfWeek: [7, 1, 1, 9, "2"],
      description: "  Open the app  ",
      enabled: true,
      message: "  Go  ",
      onlyIfNoWorkoutToday: false,
      time: "6:30"
    })).toMatchObject({
      daysOfWeek: [1, 7],
      description: "Open the app",
      enabled: true,
      message: "Go",
      onlyIfNoWorkoutToday: false,
      time: "06:30"
    });

    expect(normalizeWorkoutReminderSettings({
      enabled: true,
      message: "Time to train",
      time: "18:00"
    }, "en")).toMatchObject({
      description: "Open Gymmin and complete your planned workout."
    });
  });

  it("blocks only today's completed workout when onlyIfNoWorkoutToday is enabled", () => {
    const completedToday = completedOn("2026-06-29T07:00:00.000Z");
    const activeToday = { ...completedToday, id: "active", status: "active" as const, finishedAt: undefined };

    expect(hasCompletedWorkoutOnDate([completedToday], monday)).toBe(true);
    expect(shouldScheduleReminderForDay(baseSettings, new Date("2026-06-29T18:00:00.000Z"), [completedToday], monday)).toBe(false);
    expect(shouldScheduleReminderForDay(baseSettings, new Date("2026-06-29T18:00:00.000Z"), [activeToday], monday)).toBe(true);
    expect(shouldScheduleReminderForDay(baseSettings, new Date("2026-07-01T18:00:00.000Z"), [completedToday], monday)).toBe(true);
  });

  it("returns future dates that match selected reminder days", () => {
    const dates = getUpcomingReminderDates(baseSettings, [], monday);

    expect(dates.every((date) => date > monday)).toBe(true);
    expect(dates.map((date) => date.getUTCDay())).toEqual([1, 3, 5, 1, 3, 5]);
  });

  it("does not schedule reminders when disabled or without days", () => {
    expect(getUpcomingReminderDates({ ...baseSettings, enabled: false }, [], monday)).toHaveLength(0);
    expect(getUpcomingReminderDates({ ...baseSettings, daysOfWeek: [] }, [], monday)).toHaveLength(0);
  });

  it("uses message as notification title and description as body", () => {
    expect(getWorkoutReminderNotificationContent({
      ...baseSettings,
      description: "Open Gymmin and start your planned workout.",
      message: "Time to train"
    })).toMatchObject({
      body: "Open Gymmin and start your planned workout.",
      title: "Time to train"
    });
  });
});
