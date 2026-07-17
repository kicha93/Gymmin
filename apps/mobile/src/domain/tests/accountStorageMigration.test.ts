import { describe, expect, it } from "vitest";

import { accountStorageLegacyMappings } from "../../features/storage/useAccountStorageMigration";

describe("account storage migration configuration", () => {
  it("keeps every supported legacy source mapped exactly once", () => {
    expect(accountStorageLegacyMappings).toEqual([
      { baseKey: "localWorkouts.v1", legacyKey: "gymmin.localWorkouts.v1" },
      { baseKey: "localWorkouts.v1", legacyKey: "gymmin.workouts" },
      { baseKey: "localSettings.v1", legacyKey: "gymmin.localSettings.v1" },
      { baseKey: "localSettings.v1", legacyKey: "gymmin.settings" },
      { baseKey: "localCreatorProfiles.v1", legacyKey: "gymmin.localCreatorProfiles.v1" },
      { baseKey: "localCreatorJob.v1", legacyKey: "gymmin.localCreatorJob.v1" },
      { baseKey: "workoutSessions", legacyKey: "gymmin.workoutSessions" },
      { baseKey: "workoutSessionsSync", legacyKey: "gymmin.workoutSessionsSync" },
      { baseKey: "favoriteExercises", legacyKey: "gymmin.favoriteExercises" },
      { baseKey: "favoriteExercisesSync", legacyKey: "gymmin.favoriteExercisesSync" }
    ]);

    const uniquePairs = new Set(
      accountStorageLegacyMappings.map(({ baseKey, legacyKey }) => `${baseKey}:${legacyKey}`)
    );
    expect(uniquePairs.size).toBe(accountStorageLegacyMappings.length);
  });
});
