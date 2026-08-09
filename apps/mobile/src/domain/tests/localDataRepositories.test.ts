import AsyncStorage from "@react-native-async-storage/async-storage";
import { beforeEach, describe, expect, it } from "vitest";

import {
  LOCAL_WORKOUTS_STORAGE_BASE_KEY,
  loadLocalActiveWorkoutSession,
  loadLocalSettings,
  loadLocalWorkouts,
  saveLocalActiveWorkoutSession,
  saveLocalSettings,
  saveLocalWorkouts
} from "../../storage/localDataRepositories";
import { getLocalOnlyStorageKey } from "../localOnlyStorageMigration";
import type { AppSettings } from "../appSettings";
import { createStep } from "../workouts";

describe("localDataRepositories", () => {
  beforeEach(async () => {
    await AsyncStorage.clear();
  });

  it("round-trips normalized workouts in one local-only repository", async () => {
    await saveLocalWorkouts([{
      draft: { name: "Plan", notes: "", sport: "strength", steps: [] },
      id: "plan-1",
      name: "Plan"
    }], "plan-1", { direction: "asc", field: "name" });

    const stored = await loadLocalWorkouts();
    expect(stored.selectedWorkoutId).toBe("plan-1");
    expect(stored.sort).toEqual({ direction: "asc", field: "name" });
    expect(stored.workouts).toHaveLength(1);
  });

  it("migrates and persists legacy rest elements for existing workouts", async () => {
    const stage = createStep({ id: "stage", kind: "stage", stageType: "exercise" });
    const set = createStep({ id: "set", kind: "set", parentStageId: stage.id, setCount: "3" });
    const exercise = createStep({
      exerciseName: "Squat",
      id: "exercise",
      kind: "exercise",
      parentSetId: set.id,
      stageType: "exercise"
    });
    const rest = createStep({
      goalType: "time",
      id: "rest",
      kind: "exercise",
      parentSetId: set.id,
      stageType: "rest",
      targetValue: "00:02:00"
    });
    const storageKey = getLocalOnlyStorageKey(LOCAL_WORKOUTS_STORAGE_BASE_KEY);

    await AsyncStorage.setItem(storageKey, JSON.stringify({
      selectedWorkoutId: "legacy-plan",
      updatedAt: "2026-07-01T00:00:00.000Z",
      version: 1,
      workouts: [{
        draft: { name: "Legacy", notes: "", sport: "strength", steps: [stage, set, exercise, rest] },
        id: "legacy-plan",
        name: "Legacy"
      }]
    }));

    const loaded = await loadLocalWorkouts();
    expect(loaded.workouts[0].draft.steps).toHaveLength(3);
    expect(loaded.workouts[0].draft.steps.find((step) => step.id === "exercise")?.restSeconds).toBe("120");

    await saveLocalWorkouts(
      loaded.workouts,
      loaded.selectedWorkoutId,
      loaded.sort
    );
    const persisted = JSON.parse((await AsyncStorage.getItem(storageKey))!) as {
      workouts: Array<{ draft: { steps: Array<{ id: string; restSeconds?: string; stageType: string }> } }>;
    };
    expect(persisted.workouts[0].draft.steps.some((step) => step.stageType === "rest")).toBe(false);
    expect(persisted.workouts[0].draft.steps.find((step) => step.id === "exercise")?.restSeconds).toBe("120");
  });

  it("distinguishes missing settings from an existing local-only record", async () => {
    const panels = { "settings-training": true };
    const missing = await loadLocalSettings(panels);
    expect(missing.exists).toBe(false);

    await saveLocalSettings(missing.settings);

    const stored = await loadLocalSettings(panels);
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

    await saveLocalSettings(settings);

    await expect(loadLocalSettings(panels)).resolves.toEqual({
      exists: true,
      settings
    });
  });

  it("keeps active workout progress in the local-only namespace", async () => {
    await saveLocalActiveWorkoutSession("session-1", 3);
    await expect(loadLocalActiveWorkoutSession()).resolves.toEqual({
      entryIndex: 3,
      sessionId: "session-1"
    });
    await saveLocalActiveWorkoutSession(null, 0);
    await expect(loadLocalActiveWorkoutSession()).resolves.toEqual({
      entryIndex: undefined,
      sessionId: null
    });
  });

  it("never writes domain data to a gymmin.account namespace after cutover", async () => {
    await saveLocalWorkouts([], "");
    await saveLocalSettings((await loadLocalSettings({})).settings);
    await saveLocalActiveWorkoutSession("session-1", 0);

    const keys = await AsyncStorage.getAllKeys();
    expect(keys.filter((key) => key.startsWith("gymmin.account."))).toEqual([]);
    expect(keys.some((key) => key.startsWith("gymmin.local.v1."))).toBe(true);
  });
});
