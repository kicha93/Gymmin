import AsyncStorage from "@react-native-async-storage/async-storage";
import * as Notifications from "expo-notifications";
import { describe, expect, it, vi } from "vitest";

import { getAccountStorageKey } from "../accountStorage";
import {
  WORKOUT_REMINDER_NOTIFICATION_IDS_BASE_KEY,
  cancelWorkoutReminders,
  createDefaultWeeklySchedule,
  formatReminderDayTime,
  getReminderScheduleForDay,
  getUpcomingReminderDates,
  getWorkoutReminderNotificationContent,
  hasCompletedWorkoutOnDate,
  normalizeWorkoutReminderSettings,
  normalizeWorkoutReminderTime,
  shouldScheduleReminderForDay,
  updateReminderDaySchedule,
  type WorkoutReminderSettings
} from "../workoutReminders";
import type { WorkoutSession } from "../workoutSessions";

const monday = new Date("2026-06-29T09:00:00.000Z");

const baseSettings: WorkoutReminderSettings = {
  description: "Open Gymmin",
  enabled: true,
  message: "Time to train",
  onlyIfNoWorkoutToday: true,
  weeklySchedule: createDefaultWeeklySchedule([1, 3, 5], "18:00")
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
  it("normalizes settings, migrates legacy days/time and keeps seven weekdays", () => {
    expect(normalizeWorkoutReminderTime("7:05")).toBe("07:05");
    expect(normalizeWorkoutReminderTime("24:00")).toBe("18:00");

    const migrated = normalizeWorkoutReminderSettings({
      daysOfWeek: [7, 1, 1, 9, "2"],
      description: "  Open the app  ",
      enabled: true,
      message: "  Go  ",
      onlyIfNoWorkoutToday: false,
      time: "6:30"
    });

    expect(migrated).toMatchObject({
      description: "Open the app",
      enabled: true,
      message: "Go",
      onlyIfNoWorkoutToday: false
    });
    expect(migrated.weeklySchedule).toHaveLength(7);
    expect(getReminderScheduleForDay(migrated, 1)).toMatchObject({ enabled: true, time: "06:30" });
    expect(getReminderScheduleForDay(migrated, 2)).toMatchObject({ enabled: false, time: "06:30" });
    expect(getReminderScheduleForDay(migrated, 7)).toMatchObject({ enabled: true, time: "06:30" });

    expect(normalizeWorkoutReminderSettings({
      enabled: true,
      message: "Time to train"
    }, "en")).toMatchObject({
      description: "Open Gymmin and complete your planned workout."
    });
  });

  it("supports per-day enabled/time without changing other days", () => {
    const updatedMonday = updateReminderDaySchedule(baseSettings, "monday", { time: "07:30" });
    const disabledMonday = updateReminderDaySchedule(updatedMonday, "monday", { enabled: false });

    expect(getReminderScheduleForDay(updatedMonday, 1)).toMatchObject({ enabled: true, time: "07:30" });
    expect(getReminderScheduleForDay(updatedMonday, 3)).toMatchObject({ enabled: true, time: "18:00" });
    expect(getReminderScheduleForDay(disabledMonday, 1)).toMatchObject({ enabled: false, time: "07:30" });
    expect(formatReminderDayTime(getReminderScheduleForDay(disabledMonday, 1))).toBe("—");
    expect(formatReminderDayTime(getReminderScheduleForDay(updatedMonday, 1))).toBe("07:30");
  });

  it("blocks only today's completed workout when onlyIfNoWorkoutToday is enabled", () => {
    const completedToday = completedOn("2026-06-29T07:00:00.000Z");
    const activeToday = { ...completedToday, id: "active", status: "active" as const, finishedAt: undefined };

    expect(hasCompletedWorkoutOnDate([completedToday], monday)).toBe(true);
    expect(shouldScheduleReminderForDay(baseSettings, new Date("2026-06-29T18:00:00.000Z"), [completedToday], monday)).toBe(false);
    expect(shouldScheduleReminderForDay(baseSettings, new Date("2026-06-29T18:00:00.000Z"), [activeToday], monday)).toBe(true);
    expect(shouldScheduleReminderForDay(baseSettings, new Date("2026-07-01T18:00:00.000Z"), [completedToday], monday)).toBe(true);
  });

  it("returns future dates that match selected reminder days and per-day times", () => {
    const settings = updateReminderDaySchedule(baseSettings, "wednesday", { time: "19:30" });
    const dates = getUpcomingReminderDates(settings, [], monday);

    expect(dates.every((date) => date > monday)).toBe(true);
    expect(dates.map((date) => date.getUTCDay())).toEqual([1, 3, 5, 1, 3, 5]);
    expect(dates[1].getHours()).toBe(19);
    expect(dates[1].getMinutes()).toBe(30);
  });

  it("does not schedule reminders when globally disabled or without enabled days", () => {
    expect(getUpcomingReminderDates({ ...baseSettings, enabled: false }, [], monday)).toHaveLength(0);
    expect(getUpcomingReminderDates({ ...baseSettings, weeklySchedule: createDefaultWeeklySchedule([], "18:00") }, [], monday)).toHaveLength(0);
  });

  it("uses message as notification title and description as body", () => {
    expect(getWorkoutReminderNotificationContent({
      ...baseSettings,
      description: "Open Gymmin and start your planned workout.",
      message: "Time to train"
    })).toMatchObject({
      body: "Open Gymmin and start your planned workout.",
      data: {
        gymminType: "workout-reminder"
      },
      title: "Time to train"
    });
  });

  it("cancels saved and orphaned workout reminder notifications", async () => {
    await AsyncStorage.setItem(getAccountStorageKey(WORKOUT_REMINDER_NOTIFICATION_IDS_BASE_KEY, "user-a"), JSON.stringify(["saved-id"]));
    vi.mocked(Notifications.getAllScheduledNotificationsAsync).mockResolvedValueOnce([
      {
        content: { data: { gymminType: "workout-reminder" } },
        identifier: "orphan-marker",
        trigger: {}
      } as never,
      {
        content: { data: {} },
        identifier: "orphan-channel",
        trigger: { channelId: "workout-reminders" }
      } as never,
      {
        content: { data: {} },
        identifier: "creator-notification",
        trigger: { channelId: "workout-creator" }
      } as never
    ]);

    await cancelWorkoutReminders("user-a");

    expect(Notifications.cancelScheduledNotificationAsync).toHaveBeenCalledWith("saved-id");
    expect(Notifications.cancelScheduledNotificationAsync).toHaveBeenCalledWith("orphan-marker");
    expect(Notifications.cancelScheduledNotificationAsync).toHaveBeenCalledWith("orphan-channel");
    expect(Notifications.cancelScheduledNotificationAsync).not.toHaveBeenCalledWith("creator-notification");
    await expect(AsyncStorage.getItem(getAccountStorageKey(WORKOUT_REMINDER_NOTIFICATION_IDS_BASE_KEY, "user-a"))).resolves.toBe("[]");
  });
});
