import { describe, expect, it, vi } from "vitest";

vi.mock("expo-file-system", () => ({
  Directory: class {},
  File: class {},
  Paths: { document: "file:///documents" }
}));

vi.mock("expo-image-manipulator", () => ({
  ImageManipulator: { manipulate: vi.fn() },
  SaveFormat: { JPEG: "jpeg" }
}));

import {
  accountStorageLegacyMappings,
  localOnlyStorageBaseKeys
} from "../../features/storage/useAccountStorageMigration";

describe("account storage migration configuration", () => {
  it("keeps every supported legacy source mapped exactly once", () => {
    expect(accountStorageLegacyMappings).toEqual([
      { baseKey: "localWorkouts.v1", legacyKey: "gymmin.localWorkouts.v1" },
      { baseKey: "localWorkouts.v1", legacyKey: "gymmin.workouts" },
      { baseKey: "localSettings.v1", legacyKey: "gymmin.localSettings.v1" },
      { baseKey: "localSettings.v1", legacyKey: "gymmin.settings" },
      { baseKey: "localCreatorProfiles.v1", legacyKey: "gymmin.localCreatorProfiles.v1" },
      { baseKey: "workoutSessions", legacyKey: "gymmin.workoutSessions" },
      { baseKey: "favoriteExercises", legacyKey: "gymmin.favoriteExercises" }
    ]);

    const uniquePairs = new Set(
      accountStorageLegacyMappings.map(({ baseKey, legacyKey }) => `${baseKey}:${legacyKey}`)
    );
    expect(uniquePairs.size).toBe(accountStorageLegacyMappings.length);
  });

  it("registers domain data but excludes sync metadata and device-only notification ids", () => {
    expect(localOnlyStorageBaseKeys).toEqual([
      "localWorkouts.v1",
      "localSettings.v1",
      "localCreatorProfiles.v1",
      "activeWorkoutSession.v1",
      "workoutSessions",
      "favoriteExercises",
      "achievements",
      "appUsageStats",
      "weeklyPlan.v1"
    ]);
    expect(new Set(localOnlyStorageBaseKeys).size).toBe(localOnlyStorageBaseKeys.length);
  });
});
