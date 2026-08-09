import AsyncStorage from "@react-native-async-storage/async-storage";
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("expo-file-system", () => ({ Directory: class {}, File: class {}, Paths: { document: "file:///documents" } }));
vi.mock("expo-image-manipulator", () => ({ ImageManipulator: {}, SaveFormat: { JPEG: "jpeg", PNG: "png", WEBP: "webp" } }));

import { createDefaultAppSettings } from "../appSettings";
import { getLocalOnlyStorageKey } from "../localOnlyStorageMigration";
import { LOCAL_USER_PROFILE_STORAGE_BASE_KEY } from "../localUserProfile";
import { createGymminBackup, type GymminBackupSnapshot } from "../localBackup/gymminBackup";
import {
  loadLocalSettings,
  loadLocalWorkouts
} from "../../storage/localDataRepositories";
import {
  GYMMIN_BACKUP_IMPORT_JOURNAL_KEY,
  importGymminBackupTransaction,
  recoverInterruptedGymminBackupImport
} from "../localBackup/gymminBackupStorage";

function emptySnapshot(): GymminBackupSnapshot {
  const settings = createDefaultAppSettings({}, "2026-08-09T10:00:00.000Z");
  const { updatedAt: _updatedAt, ...stableSettings } = settings;
  return {
    achievements: { appUsage: { totalForegroundSeconds: 0 }, unlocked: [] },
    creatorProfiles: { items: [], selectedProfileId: null },
    favoriteExercises: [],
    settings: stableSettings,
    weeklyPlan: { enabled: false, items: [] },
    workoutSessions: { active: null, items: [] },
    workouts: { items: [], selectedWorkoutId: null, sort: { direction: "desc", field: "createdAt" } }
  };
}

describe("Gymmin backup transactional storage", () => {
  beforeEach(async () => { vi.restoreAllMocks(); await AsyncStorage.clear(); });

  it("writes only the neutral runtime snapshot", async () => {
    const backup = createGymminBackup(emptySnapshot(), { appVersion: "1", now: new Date("2026-08-09T10:00:00Z") });
    await AsyncStorage.setItem("gymmin.account.user-1.localWorkouts.v1", "legacy");
    await importGymminBackupTransaction(backup);
    const neutral = await AsyncStorage.getItem(getLocalOnlyStorageKey("localWorkouts.v1"));
    expect(neutral).toContain('"workouts":[]');
    expect(await AsyncStorage.getItem("gymmin.account.user-1.localWorkouts.v1")).toBe("legacy");
    expect(await AsyncStorage.getItem(GYMMIN_BACKUP_IMPORT_JOURNAL_KEY)).toBeNull();
  });

  it("does not touch current data when import is cancelled before transaction", async () => {
    await AsyncStorage.setItem(getLocalOnlyStorageKey("localWorkouts.v1"), "current");
    expect(await AsyncStorage.getItem(getLocalOnlyStorageKey("localWorkouts.v1"))).toBe("current");
  });

  it("hydrates imported data from the same local-only repositories after restart", async () => {
    const snapshot = emptySnapshot();
    snapshot.settings.language = "pl";
    snapshot.workouts.items = [{
      draft: { name: "Imported plan", notes: "offline", sport: "strength", steps: [] },
      id: "imported-plan",
      name: "Imported plan"
    }];
    snapshot.workouts.selectedWorkoutId = "imported-plan";

    await importGymminBackupTransaction(createGymminBackup(snapshot, { appVersion: "1" }));

    const hydratedWorkouts = await loadLocalWorkouts();
    const hydratedSettings = await loadLocalSettings({});
    expect(hydratedWorkouts.selectedWorkoutId).toBe("imported-plan");
    expect(hydratedWorkouts.workouts.map((workout) => workout.id)).toEqual(["imported-plan"]);
    expect(hydratedSettings.settings.language).toBe("pl");
  });

  it("preserves the current local profile when importing a v1 backup without profile", async () => {
    const profileKey = getLocalOnlyStorageKey(LOCAL_USER_PROFILE_STORAGE_BASE_KEY);
    const currentProfile = JSON.stringify({ displayName: "Current user", updatedAt: "2026-08-09T10:00:00.000Z", version: 1 });
    await AsyncStorage.setItem(profileKey, currentProfile);

    await importGymminBackupTransaction(createGymminBackup(emptySnapshot(), { appVersion: "1" }));

    expect(await AsyncStorage.getItem(profileKey)).toBe(currentProfile);
  });

  it("rolls back every key after an import write failure", async () => {
    const key = getLocalOnlyStorageKey("localWorkouts.v1");
    await AsyncStorage.setItem(key, "before");
    const setItem = vi.mocked(AsyncStorage.setItem);
    const originalImplementation = setItem.getMockImplementation();
    if (!originalImplementation) throw new Error("Missing AsyncStorage test implementation");
    let failed = false;
    setItem.mockImplementation(async (candidate, value) => {
      if (!failed && candidate === getLocalOnlyStorageKey("localSettings.v1")) {
        failed = true;
        throw new Error("simulated write failure");
      }
      return originalImplementation(candidate, value);
    });
    const backup = createGymminBackup(emptySnapshot(), { appVersion: "1" });
    await expect(importGymminBackupTransaction(backup)).rejects.toThrow("simulated write failure");
    vi.restoreAllMocks();
    expect(await AsyncStorage.getItem(key)).toBe("before");
  });

  it("recovers an interrupted transaction before startup migration", async () => {
    const key = getLocalOnlyStorageKey("localWorkouts.v1");
    const rollbackKey = "gymmin.localImportRollback.v1.0";
    await AsyncStorage.setItem(key, "half-written");
    await AsyncStorage.setItem(rollbackKey, "original");
    await AsyncStorage.setItem(GYMMIN_BACKUP_IMPORT_JOURNAL_KEY, JSON.stringify({ entries: [{ key, rollbackKey }], status: "applying", version: 1 }));
    await expect(recoverInterruptedGymminBackupImport()).resolves.toBe(true);
    expect(await AsyncStorage.getItem(key)).toBe("original");
    expect(await AsyncStorage.getItem(GYMMIN_BACKUP_IMPORT_JOURNAL_KEY)).toBeNull();
    expect(await AsyncStorage.getItem(rollbackKey)).toBeNull();
  });
});
