import AsyncStorage from "@react-native-async-storage/async-storage";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { getAccountStorageKey } from "../accountStorage";
import {
  LOCAL_ONLY_MIGRATION_STATE_KEY,
  discoverLocalOnlyStorageSources,
  getLocalOnlyStorageKey,
  prepareLocalOnlyStorageMigration,
  selectLocalOnlyStorageMigrationSource
} from "../localOnlyStorageMigration";

const baseKeys = [
  "localWorkouts.v1",
  "workoutSessions",
  "activeWorkoutSession.v1",
  "localCreatorProfiles.v1",
  "favoriteExercises",
  "achievements",
  "appUsageStats",
  "weeklyPlan.v1"
];

const legacyMappings = [
  { baseKey: "localWorkouts.v1", legacyKey: "gymmin.workouts" },
  { baseKey: "workoutSessions", legacyKey: "gymmin.workoutSessions" }
];

function workouts(count: number, updatedAt = "2026-08-01T10:00:00.000Z") {
  return JSON.stringify({
    updatedAt,
    version: 1,
    workouts: Array.from({ length: count }, (_, index) => ({ id: `workout-${index}` }))
  });
}

function sessions(count: number) {
  return JSON.stringify({
    sessions: Array.from({ length: count }, (_, index) => ({ id: `session-${index}` })),
    updatedAt: "2026-08-02T10:00:00.000Z",
    version: 1
  });
}

describe("local-only storage migration", () => {
  beforeEach(async () => {
    vi.restoreAllMocks();
    await AsyncStorage.clear();
  });

  it("marks a fresh install ready without creating user data", async () => {
    await expect(prepareLocalOnlyStorageMigration(baseKeys, legacyMappings)).resolves.toEqual({
      sourceId: null,
      status: "ready"
    });

    expect(await AsyncStorage.getItem(getLocalOnlyStorageKey("localWorkouts.v1"))).toBeNull();
    expect(await AsyncStorage.getItem(LOCAL_ONLY_MIGRATION_STATE_KEY)).toContain('"status":"complete"');
  });

  it("automatically copies one account source and preserves every source key", async () => {
    const workoutValue = workouts(2);
    const sessionValue = sessions(3);
    await AsyncStorage.setItem(getAccountStorageKey("localWorkouts.v1", "user-a"), workoutValue);
    await AsyncStorage.setItem(getAccountStorageKey("workoutSessions", "user-a"), sessionValue);
    await AsyncStorage.setItem(getAccountStorageKey("activeWorkoutSession.v1", "user-a"), JSON.stringify({ sessionId: "session-0" }));

    await expect(prepareLocalOnlyStorageMigration(baseKeys, legacyMappings)).resolves.toEqual({
      sourceId: "account:user-a",
      status: "ready"
    });

    expect(await AsyncStorage.getItem(getLocalOnlyStorageKey("localWorkouts.v1"))).toBe(workoutValue);
    expect(await AsyncStorage.getItem(getLocalOnlyStorageKey("workoutSessions"))).toBe(sessionValue);
    expect(await AsyncStorage.getItem(getAccountStorageKey("localWorkouts.v1", "user-a"))).toBe(workoutValue);
    expect(await AsyncStorage.getItem(getAccountStorageKey("workoutSessions", "user-a"))).toBe(sessionValue);
  });

  it("never overwrites newer local-only data after cutover", async () => {
    await AsyncStorage.setItem(getAccountStorageKey("localWorkouts.v1", "user-a"), workouts(1));
    await AsyncStorage.setItem(getAccountStorageKey("activeWorkoutSession.v1", "user-a"), JSON.stringify({ sessionId: "active-1" }));
    await prepareLocalOnlyStorageMigration(baseKeys, legacyMappings);

    const localOnlyWorkouts = workouts(3, "2026-08-03T10:00:00.000Z");
    await AsyncStorage.setItem(getLocalOnlyStorageKey("localWorkouts.v1"), localOnlyWorkouts);
    await AsyncStorage.setItem(getAccountStorageKey("localWorkouts.v1", "user-a"), workouts(4));
    await AsyncStorage.removeItem(getAccountStorageKey("activeWorkoutSession.v1", "user-a"));

    await prepareLocalOnlyStorageMigration(baseKeys, legacyMappings);
    expect(await AsyncStorage.getItem(getLocalOnlyStorageKey("localWorkouts.v1"))).toBe(localOnlyWorkouts);
    expect(await AsyncStorage.getItem(getLocalOnlyStorageKey("activeWorkoutSession.v1"))).toContain("active-1");
  });

  it("requires an explicit choice for multiple meaningful namespaces and does not merge them", async () => {
    await AsyncStorage.setItem(getAccountStorageKey("localWorkouts.v1", "user-a"), workouts(2));
    await AsyncStorage.setItem(getAccountStorageKey("workoutSessions", "user-a"), sessions(4));
    await AsyncStorage.setItem(getAccountStorageKey("localWorkouts.v1", "user-b"), workouts(1, "2026-07-01T10:00:00.000Z"));

    const result = await prepareLocalOnlyStorageMigration(baseKeys, legacyMappings);
    expect(result.status).toBe("selection-required");
    if (result.status !== "selection-required") throw new Error("Expected source selection");
    expect(result.sources).toHaveLength(2);
    expect(result.sources.find((source) => source.id === "account:user-a")).toMatchObject({
      sessionCount: 4,
      workoutCount: 2
    });
    expect(result.sources.find((source) => source.id === "account:user-b")).toMatchObject({ workoutCount: 1 });
    expect(await AsyncStorage.getItem(getLocalOnlyStorageKey("localWorkouts.v1"))).toBeNull();

    await selectLocalOnlyStorageMigrationSource("account:user-b", baseKeys, legacyMappings);
    expect(await AsyncStorage.getItem(getLocalOnlyStorageKey("localWorkouts.v1"))).toBe(
      await AsyncStorage.getItem(getAccountStorageKey("localWorkouts.v1", "user-b"))
    );
    expect(await AsyncStorage.getItem(getAccountStorageKey("localWorkouts.v1", "user-a"))).not.toBeNull();
  });

  it("deduplicates a legacy source already copied to anonymous storage", async () => {
    const value = workouts(1);
    await AsyncStorage.setItem("gymmin.workouts", value);
    await AsyncStorage.setItem(getAccountStorageKey("localWorkouts.v1", "anonymous"), value);

    const sources = await discoverLocalOnlyStorageSources(baseKeys, legacyMappings);
    expect(sources.map((source) => source.id)).toEqual(["account:anonymous"]);
  });

  it("resumes an interrupted copy idempotently without deleting or overwriting its source", async () => {
    const workoutValue = workouts(1);
    const sessionValue = sessions(2);
    await AsyncStorage.setItem(getAccountStorageKey("localWorkouts.v1", "user-a"), workoutValue);
    await AsyncStorage.setItem(getAccountStorageKey("workoutSessions", "user-a"), sessionValue);

    const setItemMock = vi.mocked(AsyncStorage.setItem);
    const originalSetItem = setItemMock.getMockImplementation();
    if (!originalSetItem) throw new Error("AsyncStorage test mock is missing");
    let didFail = false;
    setItemMock.mockImplementation(async (key: string, value: string) => {
      if (!didFail && key === getLocalOnlyStorageKey("workoutSessions")) {
        didFail = true;
        throw new Error("simulated interruption");
      }
      return originalSetItem(key, value);
    });

    await expect(prepareLocalOnlyStorageMigration(baseKeys, legacyMappings)).rejects.toThrow("simulated interruption");
    expect(await AsyncStorage.getItem(getLocalOnlyStorageKey("localWorkouts.v1"))).toBe(workoutValue);
    expect(await AsyncStorage.getItem(getAccountStorageKey("workoutSessions", "user-a"))).toBe(sessionValue);

    setItemMock.mockImplementation(originalSetItem);
    await expect(prepareLocalOnlyStorageMigration(baseKeys, legacyMappings)).resolves.toEqual({
      sourceId: "account:user-a",
      status: "ready"
    });
    expect(await AsyncStorage.getItem(getLocalOnlyStorageKey("workoutSessions"))).toBe(sessionValue);
  });

  it("migrates a settings-only account instead of treating it as empty", async () => {
    await AsyncStorage.setItem(getAccountStorageKey("localSettings.v1", "empty-user"), JSON.stringify({ language: "pl" }));

    await expect(prepareLocalOnlyStorageMigration([...baseKeys, "localSettings.v1"], legacyMappings)).resolves.toEqual({
      sourceId: "account:empty-user",
      status: "ready"
    });
    expect(await AsyncStorage.getItem(getLocalOnlyStorageKey("localSettings.v1"))).toContain('"language":"pl"');
  });

  it("preserves malformed user-data payloads instead of silently treating the install as empty", async () => {
    await AsyncStorage.setItem(getAccountStorageKey("localWorkouts.v1", "damaged"), "{broken-json");

    await expect(prepareLocalOnlyStorageMigration(baseKeys, legacyMappings)).resolves.toEqual({
      sourceId: "account:damaged",
      status: "ready"
    });
    expect(await AsyncStorage.getItem(getLocalOnlyStorageKey("localWorkouts.v1"))).toBe("{broken-json");
    expect(await AsyncStorage.getItem(getAccountStorageKey("localWorkouts.v1", "damaged"))).toBe("{broken-json");
  });
});
