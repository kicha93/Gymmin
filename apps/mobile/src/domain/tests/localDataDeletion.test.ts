import AsyncStorage from "@react-native-async-storage/async-storage";
import { beforeEach, describe, expect, it } from "vitest";

import { assertLocalDataDeletionAllowed, deleteAllGymminUserData } from "../localDataDeletion";
import { LOCAL_ONLY_MIGRATION_STATE_KEY } from "../localOnlyStorageMigration";

describe("deleteAllGymminUserData", () => {
  beforeEach(async () => AsyncStorage.clear());

  it("refuses deletion while legacy migration is incomplete", async () => {
    await AsyncStorage.setItem("gymmin.account.user-a.workouts", "important");
    await expect(assertLocalDataDeletionAllowed()).rejects.toThrow(/migration/i);
    await expect(deleteAllGymminUserData()).rejects.toThrow(/migration/i);
    await expect(AsyncStorage.getItem("gymmin.account.user-a.workouts")).resolves.toBe("important");
  });

  it("removes local and legacy user namespaces only after completed migration", async () => {
    await Promise.all([
      [LOCAL_ONLY_MIGRATION_STATE_KEY, JSON.stringify({ copiedBaseKeys: [], sourceId: null, startedAt: "2026-01-01T00:00:00.000Z", status: "complete", version: 1 })],
      ["gymmin.local.v1.localWorkouts.v1", "local"],
      ["gymmin.account.user-a.workouts", "legacy"],
      ["unrelated.library.key", "keep"]
    ].map(([key, value]) => AsyncStorage.setItem(key, value)));
    await deleteAllGymminUserData();
    expect([...(await AsyncStorage.getAllKeys())].sort()).toEqual(["unrelated.library.key"]);
  });
});
