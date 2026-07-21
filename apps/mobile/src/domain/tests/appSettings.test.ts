import { describe, expect, it } from "vitest";

import {
  createDefaultAppSettings,
  getSettingsTimestamp,
  normalizeAppSettings,
  resolveInitialSettingsSyncAction
} from "../appSettings";

describe("appSettings", () => {
  const panels = { account: true, info: false };

  it("creates safe defaults", () => {
    expect(createDefaultAppSettings(panels, "2026-01-01T00:00:00.000Z")).toMatchObject({
      collapsedPanels: panels,
      defaultWorkoutExecutionMode: "guided",
      defaultWorkoutTableOrientation: "vertical",
      language: "en",
      showRestTimer: true,
      themeName: "light"
    });
  });

  it("normalizes malformed persisted settings and legacy reminders", () => {
    const normalized = normalizeAppSettings({
      collapsedPanels: { account: false, broken: "yes" },
      defaultStageType: "invalid",
      defaultWorkoutExecutionMode: "inline-table",
      language: "pl",
      showRestTimer: false,
      themeName: "unknown",
      workoutReminders: {
        daysOfWeek: [1, 5],
        enabled: true,
        message: "Trening",
        onlyIfNoWorkoutToday: true,
        time: "19:30"
      }
    }, panels, "2026-01-01T00:00:00.000Z");

    expect(normalized.collapsedPanels).toEqual({ account: false, info: false });
    expect(normalized.defaultStageType).toBe("");
    expect(normalized.defaultWorkoutExecutionMode).toBe("inline-table");
    expect(normalized.themeName).toBe("light");
    expect(normalized.workoutReminders.weeklySchedule.filter((day) => day.enabled).map((day) => day.day))
      .toEqual(["monday", "friday"]);
  });

  it("compares invalid timestamps safely", () => {
    expect(getSettingsTimestamp("invalid")).toBe(0);
    expect(getSettingsTimestamp("2026-01-01T00:00:00.000Z")).toBeGreaterThan(0);
  });

  it("pulls remote settings on a fresh device instead of overwriting them with defaults", () => {
    expect(resolveInitialSettingsSyncAction({
      hasPersistedLocalSettings: false,
      localUpdatedAt: "2026-07-21T12:00:00.000Z",
      remoteUpdatedAt: "2026-07-20T12:00:00.000Z"
    })).toBe("apply-remote");
  });

  it("pushes local settings when the account has no remote settings", () => {
    expect(resolveInitialSettingsSyncAction({
      hasPersistedLocalSettings: false,
      localUpdatedAt: "2026-07-21T12:00:00.000Z",
      remoteUpdatedAt: null
    })).toBe("push-local");
  });

  it("uses timestamps only when settings already existed on the device", () => {
    expect(resolveInitialSettingsSyncAction({
      hasPersistedLocalSettings: true,
      localUpdatedAt: "2026-07-21T12:00:00.000Z",
      remoteUpdatedAt: "2026-07-20T12:00:00.000Z"
    })).toBe("push-local");
    expect(resolveInitialSettingsSyncAction({
      hasPersistedLocalSettings: true,
      localUpdatedAt: "2026-07-20T12:00:00.000Z",
      remoteUpdatedAt: "2026-07-21T12:00:00.000Z"
    })).toBe("apply-remote");
  });
});
