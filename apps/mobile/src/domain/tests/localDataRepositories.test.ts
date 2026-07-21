import AsyncStorage from "@react-native-async-storage/async-storage";
import { beforeEach, describe, expect, it } from "vitest";

import {
  hasAnonymousAccountData,
  hasAnonymousMergeHandled,
  loadActiveWorkoutSessionForOwner,
  loadCreatorJobForOwner,
  loadSettingsForOwner,
  loadWorkoutsForOwner,
  markAnonymousMergeHandled,
  mergeCreatorProfilesById,
  saveActiveWorkoutSessionForOwner,
  saveCreatorJobForOwner,
  saveSettingsForOwner,
  saveWorkoutsForOwner
} from "../../storage/localDataRepositories";
import { getAccountStorageKey } from "../accountStorage";
import type { AppSettings } from "../appSettings";

describe("localDataRepositories", () => {
  beforeEach(async () => {
    await AsyncStorage.clear();
  });

  it("round-trips normalized workouts per owner", async () => {
    await saveWorkoutsForOwner("user-a", [{
      draft: { name: "Plan", notes: "", sport: "strength", steps: [] },
      id: "plan-1",
      name: "Plan"
    }], "plan-1", { direction: "asc", field: "name" });

    const stored = await loadWorkoutsForOwner("user-a");
    expect(stored.selectedWorkoutId).toBe("plan-1");
    expect(stored.sort).toEqual({ direction: "asc", field: "name" });
    expect(stored.workouts).toHaveLength(1);
  });

  it("distinguishes missing settings from an existing account-scoped record", async () => {
    const panels = { "settings-training": true };
    const missing = await loadSettingsForOwner("user-a", panels);
    expect(missing.exists).toBe(false);

    await saveSettingsForOwner("user-a", missing.settings);

    const stored = await loadSettingsForOwner("user-a", panels);
    expect(stored.exists).toBe(true);
    expect(stored.settings.showRestTimer).toBe(true);
  });

  it("round-trips every account setting without dropping fields", async () => {
    const panels = {
      "settings-notifications": false,
      "settings-preferences": true,
      "settings-training": false
    };
    const settings: AppSettings = {
      collapsedPanels: panels,
      defaultSetCount: "5",
      defaultStageType: "exercise",
      defaultWorkoutExecutionMode: "inline-table",
      defaultWorkoutTableOrientation: "horizontal",
      defaultWeight: "82.5",
      isAuthPanelDismissed: true,
      language: "pl",
      showRestTimer: false,
      themeName: "dark",
      updatedAt: "2026-07-21T15:00:00.000Z",
      workoutReminders: {
        description: "Zrób zaplanowany trening.",
        enabled: true,
        message: "Czas na trening",
        onlyIfNoWorkoutToday: false,
        updatedAt: "2026-07-21T14:59:00.000Z",
        weeklySchedule: [
          { day: "monday", enabled: true, time: "06:30" },
          { day: "tuesday", enabled: false, time: "18:00" },
          { day: "wednesday", enabled: true, time: "19:15" },
          { day: "thursday", enabled: false, time: "18:00" },
          { day: "friday", enabled: true, time: "17:45" },
          { day: "saturday", enabled: false, time: "10:00" },
          { day: "sunday", enabled: true, time: "09:00" }
        ]
      }
    };

    await saveSettingsForOwner("user-all-settings", settings);

    await expect(loadSettingsForOwner("user-all-settings", panels)).resolves.toEqual({
      exists: true,
      settings
    });
  });

  it("detects invalid or populated anonymous data", async () => {
    await AsyncStorage.setItem(getAccountStorageKey("broken", null), "{invalid");
    await expect(hasAnonymousAccountData(["broken"])).resolves.toBe(true);
    await expect(hasAnonymousAccountData(["missing"])).resolves.toBe(false);
  });

  it("stores the anonymous merge decision per account", async () => {
    await expect(hasAnonymousMergeHandled("user-a")).resolves.toBe(false);
    await markAnonymousMergeHandled("user-a", "merged");
    await expect(hasAnonymousMergeHandled("user-a")).resolves.toBe(true);
  });

  it("merges creator profiles without duplicate ids", () => {
    const draft = {};
    expect(mergeCreatorProfilesById(
      [{ id: "a", name: "Account", draft }],
      [{ id: "a", name: "Anonymous duplicate", draft }, { id: "b", name: "Anonymous", draft }]
    ).map((profile) => profile.name)).toEqual(["Account", "Anonymous"]);
  });

  it("round-trips and clears active workout progress per owner", async () => {
    await saveActiveWorkoutSessionForOwner("user-a", "session-1", 3);
    await expect(loadActiveWorkoutSessionForOwner("user-a")).resolves.toEqual({
      entryIndex: 3,
      sessionId: "session-1"
    });
    await expect(loadActiveWorkoutSessionForOwner("user-b")).resolves.toEqual({
      entryIndex: undefined,
      sessionId: null
    });

    await saveActiveWorkoutSessionForOwner("user-a", null, 0);
    await expect(loadActiveWorkoutSessionForOwner("user-a")).resolves.toEqual({
      entryIndex: undefined,
      sessionId: null
    });
  });

  it("round-trips and clears a pending creator job per owner", async () => {
    await saveCreatorJobForOwner("user-a", {
      createdAt: "2026-07-17T08:00:00.000Z",
      jobId: "job-1",
      profileId: null,
      type: "plan",
      version: 1
    });

    await expect(loadCreatorJobForOwner("user-a")).resolves.toMatchObject({ jobId: "job-1" });
    await expect(loadCreatorJobForOwner("user-b")).resolves.toBeNull();
    await saveCreatorJobForOwner("user-a", null);
    await expect(loadCreatorJobForOwner("user-a")).resolves.toBeNull();
  });
});
